const Facility = require('../models/Facility');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const ResidentProfile = require('../models/ResidentProfile');
const { emitToUser } = require('../utils/socket');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const SLOT_MINUTES = 40;

// Generates every SLOT_MINUTES-wide slot across all of a facility's shifts for one
// calendar day (e.g. a gym with a 5:30-11:00 and a 16:00-23:00 shift gets two runs of slots).
const buildDailySlots = (dateStr, openHours) => {
  const slots = [];
  for (const shift of openHours) {
    const [startH, startM] = shift.start.split(':').map(Number);
    const [endH, endM] = shift.end.split(':').map(Number);
    const shiftStart = new Date(dateStr);
    shiftStart.setHours(startH, startM, 0, 0);
    const shiftEnd = new Date(dateStr);
    shiftEnd.setHours(endH, endM, 0, 0);

    let cursor = new Date(shiftStart);
    while (cursor.getTime() + SLOT_MINUTES * 60000 <= shiftEnd.getTime()) {
      const start = new Date(cursor);
      const end = new Date(cursor.getTime() + SLOT_MINUTES * 60000);
      slots.push({ start, end });
      cursor = end;
    }
  }
  return slots;
};

// A booking must fit entirely inside one of the facility's open shifts on its day.
const isWithinOpenHours = (facility, start, end) => facility.openHours.some((shift) => {
  const [startH, startM] = shift.start.split(':').map(Number);
  const [endH, endM] = shift.end.split(':').map(Number);
  const shiftStart = new Date(start);
  shiftStart.setHours(startH, startM, 0, 0);
  const shiftEnd = new Date(start);
  shiftEnd.setHours(endH, endM, 0, 0);
  return start >= shiftStart && end <= shiftEnd;
});

// ── Facilities ─────────────────────────────────────────────────────────────────
const listFacilities = async (req, res) => {
  const { type } = req.query;
  const filter = { isActive: true, maintenanceMode: false };
  if (type) filter.type = type;

  const facilities = await Facility.find(filter);
  return sendSuccess(res, 'Facilities fetched', facilities);
};

const createFacility = async (req, res) => {
  const facility = await Facility.create(req.body);
  return sendSuccess(res, 'Facility created', facility, 201);
};

const updateFacility = async (req, res) => {
  const facility = await Facility.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!facility) return sendError(res, 'Facility not found', null, 404);
  return sendSuccess(res, 'Facility updated', facility);
};

const checkAvailability = async (req, res) => {
  const { date } = req.query;
  if (!date) return sendError(res, 'Date query parameter required', null, 400);

  const facility = await Facility.findById(req.params.id);
  if (!facility) return sendError(res, 'Facility not found', null, 404);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookedSlots = await Booking.find({
    facility: req.params.id,
    status: { $in: ['approved', 'pending'] },
    slotStart: { $gte: dayStart },
    slotEnd: { $lte: dayEnd },
  }).select('slotStart slotEnd status bookedBy');

  const now = new Date();
  const availableSlots = buildDailySlots(date, facility.openHours).filter((slot) => {
    if (slot.start < now) return false;
    return !bookedSlots.some((b) => slot.start < b.slotEnd && slot.end > b.slotStart);
  });

  return sendSuccess(res, 'Availability fetched', {
    facility: { id: facility._id, name: facility.name, openHours: facility.openHours },
    date,
    slotMinutes: SLOT_MINUTES,
    availableSlots,
    bookedSlots,
    rules: facility.bookingRules,
  });
};

// ── Bookings ───────────────────────────────────────────────────────────────────
const requestBooking = async (req, res) => {
  const { facilityId, slotStart, slotEnd, attendees, purpose, specialRequirements } = req.body;

  const facility = await Facility.findOne({ _id: facilityId, isActive: true, maintenanceMode: false });
  if (!facility) return sendError(res, 'Facility not available', null, 404);

  const start = new Date(slotStart);
  const end = new Date(slotEnd);

  // Duration check
  const hours = (end - start) / 3600000;
  if (hours <= 0) return sendError(res, 'Invalid slot times', null, 400);
  if (hours > facility.bookingRules.maxSlotHours) {
    return sendError(res, `Maximum booking duration is ${facility.bookingRules.maxSlotHours} hours`, null, 400);
  }

  if (!isWithinOpenHours(facility, start, end)) {
    return sendError(res, `Selected time is outside ${facility.name}'s operating hours`, null, 400);
  }

  // Advance booking check
  const daysAhead = (start - new Date()) / 86400000;
  if (daysAhead > facility.bookingRules.advanceBookingDays) {
    return sendError(res, `Cannot book more than ${facility.bookingRules.advanceBookingDays} days in advance`, null, 400);
  }

  // Conflict check
  const conflict = await Booking.findOne({
    facility: facilityId,
    status: { $in: ['approved', 'pending'] },
    $or: [{ slotStart: { $lt: end }, slotEnd: { $gt: start } }],
  });
  if (conflict) return sendError(res, 'Slot already booked or pending', null, 409);

  const profile = await ResidentProfile.findOne({ user: req.user._id });

  const booking = await Booking.create({
    facility: facilityId,
    bookedBy: req.user._id,
    unit: profile?.unit,
    slotStart: start,
    slotEnd: end,
    attendees: attendees || 1,
    purpose,
    specialRequirements,
    status: facility.bookingRules.requiresApproval ? 'pending' : 'approved',
  });

  if (!facility.bookingRules.requiresApproval) {
    booking.approvedAt = new Date();
    await booking.save();
  }

  return sendSuccess(res, 'Booking requested', booking, 201);
};

const getMyBookings = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { bookedBy: req.user._id };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [bookings, total] = await Promise.all([
    Booking.find(filter).populate('facility', 'name type').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Booking.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Bookings fetched', bookings, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

const listBookings = async (req, res) => {
  const { status, facilityId, date, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (facilityId) filter.facility = facilityId;
  if (date) {
    const d = new Date(date);
    filter.slotStart = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('facility', 'name type')
      .populate('bookedBy', 'name email')
      .populate('unit', 'blockName unitNumber')
      .skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Booking.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Bookings fetched', bookings, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

const approveBooking = async (req, res) => {
  const { action, reason } = req.body;
  if (!['approve', 'reject'].includes(action)) return sendError(res, 'Action must be approve or reject', null, 400);

  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: req.user._id,
      approvedAt: new Date(),
      ...(action === 'reject' && { rejectedReason: reason }),
    },
    { new: true }
  ).populate('bookedBy', 'name').populate('facility', 'name');

  if (!booking) return sendError(res, 'Booking not found or not pending', null, 404);

  try {
    emitToUser(booking.bookedBy._id.toString(), 'booking:status', {
      message: `Your booking for ${booking.facility.name} has been ${action}d`,
      bookingId: booking._id,
    });
    await Notification.create({
      recipient: booking.bookedBy._id,
      type: 'booking_status',
      title: `Booking ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your booking for ${booking.facility.name} has been ${action}d`,
      relatedEntity: { model: 'Booking', id: booking._id },
    });
  } catch (_) {}

  return sendSuccess(res, `Booking ${action}d`, booking);
};

const cancelBooking = async (req, res) => {
  const filter = { _id: req.params.id, status: { $in: ['pending', 'approved'] } };

  // Residents can only cancel their own; admin can cancel any
  if (req.user.role === 'Resident') filter.bookedBy = req.user._id;

  const booking = await Booking.findOneAndUpdate(
    filter,
    { status: 'cancelled', cancelledAt: new Date(), cancelledBy: req.user._id },
    { new: true }
  );
  if (!booking) return sendError(res, 'Booking not found or cannot be cancelled', null, 404);

  return sendSuccess(res, 'Booking cancelled', booking);
};

module.exports = {
  listFacilities, createFacility, updateFacility, checkAvailability,
  requestBooking, getMyBookings, listBookings, approveBooking, cancelBooking,
};
