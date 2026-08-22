const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const ResidentProfile = require('../models/ResidentProfile');
const { emitToUser, emitToRole } = require('../utils/socket');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const createComplaint = async (req, res) => {
  const { category, description, priority, scope } = req.body;

  const profile = await ResidentProfile.findOne({ user: req.user._id });
  const images = req.files ? req.files.map((f) => f.path) : [];

  const complaint = await Complaint.create({
    raisedBy: req.user._id,
    unit: profile?.unit,
    category,
    scope: scope || 'personal',
    description,
    priority: priority || 'medium',
    images,
    statusHistory: [{ status: 'open', changedBy: req.user._id }],
  });

  // Notify admin
  try {
    emitToRole('Admin', 'complaint:updated', { message: 'New complaint raised', complaintId: complaint._id });
  } catch (_) {}

  return sendSuccess(res, 'Complaint raised', complaint, 201);
};

const getMyComplaints = async (req, res) => {
  const { status, category, scope, page = 1, limit = 20 } = req.query;
  const filter = { raisedBy: req.user._id };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (scope) filter.scope = scope;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [complaints, total] = await Promise.all([
    Complaint.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 })
      .populate('assignedTo', 'name')
      .populate('unit', 'blockName unitNumber'),
    Complaint.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Complaints fetched', complaints, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

// Community-scoped issues (e.g. a dirty shared pool) are visible to every resident,
// not just the person who reported them, so neighbours can see it's already flagged.
const getCommunityComplaints = async (req, res) => {
  const { status, category, page = 1, limit = 20 } = req.query;
  const filter = { scope: 'community' };
  if (status) filter.status = status;
  if (category) filter.category = category;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [complaints, total] = await Promise.all([
    Complaint.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 })
      .populate('raisedBy', 'name')
      .populate('unit', 'blockName unitNumber'),
    Complaint.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Community issues fetched', complaints, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

const listComplaints = async (req, res) => {
  const { status, category, priority, assignedTo, scope, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (scope) filter.scope = scope;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [complaints, total] = await Promise.all([
    Complaint.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 })
      .populate('raisedBy', 'name email')
      .populate('assignedTo', 'name')
      .populate('unit', 'blockName unitNumber'),
    Complaint.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Complaints fetched', complaints, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

const getComplaintById = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('raisedBy', 'name email phone')
    .populate('assignedTo', 'name email')
    .populate('unit', 'blockName unitNumber')
    .populate('statusHistory.changedBy', 'name');

  if (!complaint) return sendError(res, 'Complaint not found', null, 404);

  // Ownership check for residents
  if (req.user.role === 'Resident' && complaint.raisedBy._id.toString() !== req.user._id.toString()) {
    return sendError(res, 'Forbidden', null, 403);
  }

  return sendSuccess(res, 'Complaint fetched', complaint);
};

const assignComplaint = async (req, res) => {
  const { staffId } = req.body;
  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    {
      assignedTo: staffId,
      status: 'assigned',
      assignedAt: new Date(),
      $push: { statusHistory: { status: 'assigned', changedBy: req.user._id } },
    },
    { new: true }
  ).populate('assignedTo', 'name email').populate('raisedBy', 'name');

  if (!complaint) return sendError(res, 'Complaint not found', null, 404);

  try {
    emitToUser(staffId, 'complaint:updated', { message: 'Complaint assigned to you', complaintId: complaint._id });
    await Notification.create({
      recipient: staffId,
      type: 'complaint_assigned',
      title: 'Complaint Assigned',
      message: `Complaint #${complaint._id} has been assigned to you`,
      relatedEntity: { model: 'Complaint', id: complaint._id },
    });
  } catch (_) {}

  return sendSuccess(res, 'Complaint assigned', complaint);
};

const updateComplaintStatus = async (req, res) => {
  const { status, note } = req.body;
  const allowed = ['in-progress', 'resolved'];
  if (!allowed.includes(status)) return sendError(res, 'Invalid status transition', null, 400);

  const update = {
    status,
    $push: { statusHistory: { status, changedBy: req.user._id, note } },
  };
  if (status === 'resolved') update.resolvedAt = new Date();

  const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true })
    .populate('raisedBy', 'name');

  if (!complaint) return sendError(res, 'Complaint not found', null, 404);

  try {
    emitToUser(complaint.raisedBy._id.toString(), 'complaint:updated', {
      message: `Your complaint status updated to ${status}`,
      complaintId: complaint._id,
    });
    await Notification.create({
      recipient: complaint.raisedBy._id,
      type: 'complaint_updated',
      title: 'Complaint Updated',
      message: `Your complaint has been updated to "${status}"`,
      relatedEntity: { model: 'Complaint', id: complaint._id },
    });
  } catch (_) {}

  return sendSuccess(res, 'Status updated', complaint);
};

const updatePriority = async (req, res) => {
  const { priority } = req.body;
  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    { priority },
    { new: true, runValidators: true }
  );
  if (!complaint) return sendError(res, 'Complaint not found', null, 404);
  return sendSuccess(res, 'Priority updated', complaint);
};

// Staff/Admin price a personal maintenance job. Re-submitting (e.g. after a rejection)
// overwrites the previous quote and resets it back to 'pending'.
const submitQuote = async (req, res) => {
  const { amount, note } = req.body;

  const complaint = await Complaint.findById(req.params.id).populate('raisedBy', 'name');
  if (!complaint) return sendError(res, 'Complaint not found', null, 404);
  if (complaint.scope !== 'personal') return sendError(res, 'Only personal maintenance requests can be quoted', null, 400);

  complaint.quote = {
    amount,
    note,
    quotedBy: req.user._id,
    quotedAt: new Date(),
    status: 'pending',
    paymentStatus: 'unpaid',
  };
  await complaint.save();

  try {
    emitToUser(complaint.raisedBy._id.toString(), 'complaint:updated', {
      message: `A quote of ₹${amount} has been sent for your maintenance request`,
      complaintId: complaint._id,
    });
    await Notification.create({
      recipient: complaint.raisedBy._id,
      type: 'complaint_updated',
      title: 'Quote received',
      message: `A quote of ₹${amount} has been sent for your maintenance request`,
      relatedEntity: { model: 'Complaint', id: complaint._id },
    });
  } catch (_) {}

  return sendSuccess(res, 'Quote sent', complaint);
};

// Resident accepts or rejects the staff's quote. Accepting moves the job into progress;
// rejecting leaves it open for staff to send a revised quote.
const respondToQuote = async (req, res) => {
  const { action } = req.body;

  const complaint = await Complaint.findOne({ _id: req.params.id, raisedBy: req.user._id });
  if (!complaint) return sendError(res, 'Complaint not found', null, 404);
  if (complaint.quote?.status !== 'pending') return sendError(res, 'No quote is awaiting your response', null, 400);

  complaint.quote.status = action === 'accept' ? 'accepted' : 'rejected';
  complaint.quote.respondedAt = new Date();
  if (action === 'accept' && ['open', 'assigned'].includes(complaint.status)) {
    complaint.status = 'in-progress';
    complaint.statusHistory.push({ status: 'in-progress', changedBy: req.user._id, note: 'Quote accepted' });
  }
  await complaint.save();

  try {
    if (complaint.quote.quotedBy) {
      emitToUser(complaint.quote.quotedBy.toString(), 'complaint:updated', {
        message: `The resident ${action === 'accept' ? 'accepted' : 'rejected'} your quote`,
        complaintId: complaint._id,
      });
    }
  } catch (_) {}

  return sendSuccess(res, `Quote ${complaint.quote.status}`, complaint);
};

// Resident pays for an accepted quote once the work is actually done (status === 'resolved'),
// or Admin marks it paid if resident paid in cash at the management desk.
const payQuote = async (req, res) => {
  const { method = 'upi', reference } = req.body;
  const isStaffAdmin = ['Admin', 'SuperAdmin'].includes(req.user.role);

  const query = isStaffAdmin ? { _id: req.params.id } : { _id: req.params.id, raisedBy: req.user._id };
  const complaint = await Complaint.findOne(query).populate('assignedTo', 'name email').populate('raisedBy', 'name');
  if (!complaint) return sendError(res, 'Complaint not found', null, 404);
  if (complaint.quote?.status !== 'accepted') return sendError(res, 'This request has no accepted quote', null, 400);
  if (!['resolved', 'closed'].includes(complaint.status)) return sendError(res, 'Payment is due once the work is marked resolved', null, 400);
  if (complaint.quote.paymentStatus === 'paid') return sendError(res, 'This quote has already been paid', null, 400);

  complaint.quote.paymentStatus = 'paid';
  complaint.quote.paymentMethod = method;
  complaint.quote.paymentReference = reference || `PAY-${Date.now()}`;
  complaint.quote.paidAt = new Date();
  complaint.quote.workerPayoutStatus = 'pending';
  await complaint.save();

  const workerId = complaint.assignedTo?._id || complaint.quote.quotedBy;
  try {
    if (workerId) {
      emitToUser(workerId.toString(), 'payment_received', {
        message: `Payment of ₹${complaint.quote.amount} received by Admin for completed maintenance job. Added to your payout balance!`,
        complaintId: complaint._id,
      });
      await Notification.create({
        recipient: workerId,
        type: 'payment_received',
        title: 'Earnings Balance Updated',
        message: `Payment of ₹${complaint.quote.amount} collected by Admin for maintenance #${complaint._id.toString().slice(-6)}. Balance available for payout.`,
        relatedEntity: { model: 'Complaint', id: complaint._id },
      });
    }
  } catch (_) {}

  return sendSuccess(res, 'Payment recorded successfully', complaint);
};

// Staff view: Get earnings balance and list of quoted maintenance jobs
const getStaffEarnings = async (req, res) => {
  const staffId = req.user._id;
  const jobs = await Complaint.find({
    assignedTo: staffId,
    'quote.paymentStatus': 'paid',
  }).populate('raisedBy', 'name').populate('unit', 'blockName unitNumber').sort({ 'quote.paidAt': -1 });

  let totalEarned = 0;
  let totalPaidOut = 0;
  let pendingPayout = 0;

  jobs.forEach((j) => {
    const amt = j.quote?.amount || 0;
    totalEarned += amt;
    if (j.quote?.workerPayoutStatus === 'paid_out') {
      totalPaidOut += amt;
    } else {
      pendingPayout += amt;
    }
  });

  return sendSuccess(res, 'Staff earnings fetched', {
    summary: { totalEarned, totalPaidOut, pendingPayout },
    jobs,
  });
};

// Admin view: Get list of all worker payouts and summary per worker
const listWorkerPayouts = async (req, res) => {
  const jobs = await Complaint.find({
    'quote.paymentStatus': 'paid',
  })
    .populate('assignedTo', 'name email phone')
    .populate('raisedBy', 'name phone')
    .populate('unit', 'blockName unitNumber')
    .populate('quote.workerPaidBy', 'name')
    .sort({ 'quote.paidAt': -1 });

  let totalCollectedByAdmin = 0;
  let totalSettledToWorkers = 0;
  let totalPendingToWorkers = 0;

  jobs.forEach((j) => {
    const amt = j.quote?.amount || 0;
    totalCollectedByAdmin += amt;
    if (j.quote?.workerPayoutStatus === 'paid_out') {
      totalSettledToWorkers += amt;
    } else {
      totalPendingToWorkers += amt;
    }
  });

  return sendSuccess(res, 'Worker payouts fetched', {
    summary: { totalCollectedByAdmin, totalSettledToWorkers, totalPendingToWorkers },
    jobs,
  });
};

// Admin: Settle cash or bank transfer payout to worker
const settleWorkerPayout = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id).populate('assignedTo', 'name email');
  if (!complaint) return sendError(res, 'Complaint not found', null, 404);
  if (complaint.quote?.paymentStatus !== 'paid') {
    return sendError(res, 'Cannot settle payout: resident has not paid yet', null, 400);
  }
  if (complaint.quote?.workerPayoutStatus === 'paid_out') {
    return sendError(res, 'Worker payout already settled', null, 400);
  }

  complaint.quote.workerPayoutStatus = 'paid_out';
  complaint.quote.workerPaidAt = new Date();
  complaint.quote.workerPaidBy = req.user._id;
  await complaint.save();

  try {
    if (complaint.assignedTo?._id) {
      emitToUser(complaint.assignedTo._id.toString(), 'payout:settled', {
        message: `Admin settled payout of ₹${complaint.quote.amount} in cash/transfer for job #${complaint._id.toString().slice(-6)}`,
      });
      await Notification.create({
        recipient: complaint.assignedTo._id,
        type: 'payment_received',
        title: 'Payout Settled',
        message: `Admin has paid/settled ₹${complaint.quote.amount} for maintenance job #${complaint._id.toString().slice(-6)}`,
        relatedEntity: { model: 'Complaint', id: complaint._id },
      });
    }
  } catch (_) {}

  return sendSuccess(res, 'Worker payout settled', complaint);
};

const submitFeedback = async (req, res) => {
  const { rating, feedback } = req.body;
  const complaint = await Complaint.findOne({ _id: req.params.id, raisedBy: req.user._id, status: 'resolved' });
  if (!complaint) return sendError(res, 'Complaint not found or not yet resolved', null, 404);

  complaint.rating = rating;
  complaint.feedback = feedback;
  complaint.status = 'closed';
  complaint.closedAt = new Date();
  complaint.statusHistory.push({ status: 'closed', changedBy: req.user._id });
  await complaint.save();

  return sendSuccess(res, 'Feedback submitted', complaint);
};

const getAssignedToMe = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { assignedTo: req.user._id };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [complaints, total] = await Promise.all([
    Complaint.find(filter).skip(skip).limit(parseInt(limit)).sort({ priority: -1, createdAt: -1 })
      .populate('raisedBy', 'name phone')
      .populate('unit', 'blockName unitNumber'),
    Complaint.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Assigned complaints', complaints, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

module.exports = {
  createComplaint, getMyComplaints, getCommunityComplaints, listComplaints, getComplaintById,
  assignComplaint, updateComplaintStatus, updatePriority, submitQuote, respondToQuote, payQuote,
  getStaffEarnings, listWorkerPayouts, settleWorkerPayout,
  submitFeedback, getAssignedToMe,
};
