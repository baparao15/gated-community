const User = require('../models/User');
const Unit = require('../models/Unit');
const Complaint = require('../models/Complaint');
const Visitor = require('../models/Visitor');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Facility = require('../models/Facility');
const Notification = require('../models/Notification');
const { sendSuccess, sendPaginated } = require('../utils/response');

const overview = async (req, res) => {
  const [
    totalResidents, activeResidents, pendingResidents,
    totalUnits, occupiedUnits,
    openComplaints, resolvedComplaints,
    overdueDues,
  ] = await Promise.all([
    User.countDocuments({ role: 'Resident', isDeleted: false }),
    User.countDocuments({ role: 'Resident', status: 'active', isDeleted: false }),
    User.countDocuments({ role: 'Resident', status: 'pending', isDeleted: false }),
    Unit.countDocuments({ isActive: true }),
    Unit.countDocuments({ occupancyStatus: { $ne: 'vacant' }, isActive: true }),
    Complaint.countDocuments({ status: { $in: ['open', 'assigned', 'in-progress'] } }),
    Complaint.countDocuments({ status: 'resolved' }),
    Invoice.aggregate([
      { $match: { status: 'overdue' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  return sendSuccess(res, 'Overview fetched', {
    residents: { total: totalResidents, active: activeResidents, pending: pendingResidents },
    units: { total: totalUnits, occupied: occupiedUnits, vacant: totalUnits - occupiedUnits },
    complaints: { open: openComplaints, resolved: resolvedComplaints },
    dues: { overdue: overdueDues[0]?.total || 0 },
  });
};

const financialDashboard = async (req, res) => {
  const { startDate, endDate, year = new Date().getFullYear() } = req.query;

  const matchDate = {};
  if (startDate) matchDate.$gte = new Date(startDate);
  if (endDate) matchDate.$lte = new Date(endDate);

  const [collectionStats, pendingStats, monthlyCollection] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'completed', ...(Object.keys(matchDate).length && { paidAt: matchDate }) } },
      { $group: { _id: null, totalCollected: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: { status: { $in: ['sent', 'overdue', 'partially-paid'] } } },
      { $group: { _id: '$status', totalPending: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', paidAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
      { $group: { _id: { month: { $month: '$paidAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.month': 1 } },
    ]),
  ]);

  return sendSuccess(res, 'Financial dashboard', {
    collected: collectionStats[0] || { totalCollected: 0, count: 0 },
    pending: pendingStats,
    monthlyCollection,
  });
};

const maintenanceDashboard = async (req, res) => {
  const { startDate, endDate } = req.query;
  const matchDate = {};
  if (startDate) matchDate.$gte = new Date(startDate);
  if (endDate) matchDate.$lte = new Date(endDate);
  const dateFilter = Object.keys(matchDate).length ? { createdAt: matchDate } : {};

  const [byCategory, byStatus, byPriority, avgResolutionTime] = await Promise.all([
    Complaint.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Complaint.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { ...dateFilter, status: 'resolved', resolvedAt: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgHours: {
            $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] },
          },
        },
      },
    ]),
  ]);

  return sendSuccess(res, 'Maintenance dashboard', {
    byCategory, byStatus, byPriority,
    avgResolutionHours: avgResolutionTime[0]?.avgHours?.toFixed(2) || 0,
  });
};

const visitorDashboard = async (req, res) => {
  const { startDate, endDate } = req.query;
  const matchDate = {};
  if (startDate) matchDate.$gte = new Date(startDate);
  if (endDate) matchDate.$lte = new Date(endDate);
  const dateFilter = Object.keys(matchDate).length ? { createdAt: matchDate } : {};

  const [byDay, byPurpose, byStatus, totalToday] = await Promise.all([
    Visitor.aggregate([
      { $match: dateFilter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]),
    Visitor.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Visitor.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Visitor.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
  ]);

  return sendSuccess(res, 'Visitor dashboard', { byDay, byPurpose, byStatus, totalToday });
};

const bookingDashboard = async (req, res) => {
  const { startDate, endDate } = req.query;
  const matchDate = {};
  if (startDate) matchDate.$gte = new Date(startDate);
  if (endDate) matchDate.$lte = new Date(endDate);
  const dateFilter = Object.keys(matchDate).length ? { createdAt: matchDate } : {};

  const [byFacility, byStatus, utilizationRate] = await Promise.all([
    Booking.aggregate([
      { $match: { ...dateFilter, status: 'approved' } },
      { $group: { _id: '$facility', count: { $sum: 1 }, totalHours: { $sum: { $divide: [{ $subtract: ['$slotEnd', '$slotStart'] }, 3600000] } } } },
      { $lookup: { from: 'facilities', localField: '_id', foreignField: '_id', as: 'facility' } },
      { $unwind: '$facility' },
      { $project: { facilityName: '$facility.name', count: 1, totalHours: 1 } },
      { $sort: { count: -1 } },
    ]),
    Booking.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Facility.aggregate([
      { $lookup: { from: 'bookings', localField: '_id', foreignField: 'facility', as: 'bookings', pipeline: [{ $match: { status: 'approved' } }] } },
      { $project: { name: 1, totalBookings: { $size: '$bookings' } } },
    ]),
  ]);

  return sendSuccess(res, 'Booking dashboard', { byFacility, byStatus, utilizationRate });
};

// ── Notifications ──────────────────────────────────────────────────────────────
const listNotifications = async (req, res) => {
  const { isRead, page = 1, limit = 50, includeDismissed } = req.query;
  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Automatically disappear after fixed deadline:
  // - notifications with expiresAt <= now are excluded
  // - notifications older than 30 days are excluded if no expiresAt
  const filter = {
    recipient: req.user._id,
    $or: [
      { expiresAt: { $gt: now } },
      { expiresAt: { $exists: false }, createdAt: { $gt: thirtyDaysAgo } },
    ],
  };

  if (!includeDismissed || includeDismissed !== 'true') {
    filter.isDismissed = { $ne: true };
  }

  if (isRead !== undefined) filter.isRead = isRead === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
  ]);

  return sendPaginated(res, 'Notifications fetched', notifications, {
    total, page: parseInt(page), limit: parseInt(limit),
    pages: Math.ceil(total / parseInt(limit)), unreadCount,
  });
};

const markNotificationRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) return sendSuccess(res, 'Notification not found', null);
  return sendSuccess(res, 'Notification marked as read', notification);
};

const reactNotification = async (req, res) => {
  const { reaction = 'acknowledged' } = req.body;
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { reaction, isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) return sendSuccess(res, 'Notification not found', null);
  return sendSuccess(res, `Notification reacted with ${reaction}`, notification);
};

const dismissNotification = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isDismissed: true, dismissedAt: new Date() },
    { new: true }
  );
  if (!notification) return sendSuccess(res, 'Notification not found', null);
  return sendSuccess(res, 'Notification dismissed/ignored', notification);
};

const deleteNotification = async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });
  if (!notification) return sendSuccess(res, 'Notification not found', null);
  return sendSuccess(res, 'Notification removed successfully', notification);
};

const clearNotifications = async (req, res) => {
  await Notification.deleteMany({
    recipient: req.user._id,
    $or: [{ isRead: true }, { isDismissed: true }],
  });
  return sendSuccess(res, 'Cleared read/dismissed notifications');
};

const markAllRead = async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return sendSuccess(res, 'All notifications marked as read');
};

module.exports = {
  overview, financialDashboard, maintenanceDashboard, visitorDashboard, bookingDashboard,
  listNotifications, markNotificationRead, markAllRead,
  reactNotification, dismissNotification, deleteNotification, clearNotifications,
};
