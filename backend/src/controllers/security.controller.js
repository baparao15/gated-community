const Vehicle = require('../models/Vehicle');
const Visitor = require('../models/Visitor');
const ResidentProfile = require('../models/ResidentProfile');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const EmergencyContact = require('../models/EmergencyContact');
const SosAlert = require('../models/SosAlert');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToRole } = require('../utils/socket');

const DEFAULT_EMERGENCY_CONTACTS = [
  { name: 'Community security', phone: '+91 90000 10001', type: 'security' },
  { name: 'Ambulance', phone: '108', type: 'emergency' },
  { name: 'Fire & rescue', phone: '101', type: 'emergency' },
  { name: 'Police emergency', phone: '112', type: 'emergency' },
  { name: 'Community medical room', phone: '+91 90000 10009', type: 'medical' },
];
const PHONE_REGEX = /^[0-9+\-\s()]{3,20}$/;

// ── Vehicles ───────────────────────────────────────────────────────────────────
const registerVehicle = async (req, res) => {
  const profile = await ResidentProfile.findOne({ user: req.user._id });
  if (!profile) return sendError(res, 'Resident profile not found', null, 404);

  const vehicle = await Vehicle.create({
    ...req.body,
    owner: req.user._id,
    unit: profile.unit,
  });

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'REGISTER_VEHICLE',
    entity: 'Vehicle',
    entityId: vehicle._id,
    ip: req.ip,
  });

  return sendSuccess(res, 'Vehicle registered', vehicle, 201);
};

const getMyVehicles = async (req, res) => {
  const vehicles = await Vehicle.find({ owner: req.user._id, isActive: true }).populate('unit', 'blockName unitNumber');
  return sendSuccess(res, 'Vehicles fetched', vehicles);
};

const searchVehicles = async (req, res) => {
  const { vehicleNumber, page = 1, limit = 20 } = req.query;
  const filter = { isActive: true };
  if (vehicleNumber) filter.vehicleNumber = new RegExp(vehicleNumber, 'i');

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [vehicles, total] = await Promise.all([
    Vehicle.find(filter)
      .populate('owner', 'name phone')
      .populate('unit', 'blockName unitNumber')
      .skip(skip).limit(parseInt(limit)),
    Vehicle.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Vehicles fetched', vehicles, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

const deleteVehicle = async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role === 'Resident') filter.owner = req.user._id;

  const vehicle = await Vehicle.findOneAndUpdate(filter, { isActive: false }, { new: true });
  if (!vehicle) return sendError(res, 'Vehicle not found', null, 404);

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'REMOVE_VEHICLE',
    entity: 'Vehicle',
    entityId: vehicle._id,
    ip: req.ip,
  });

  return sendSuccess(res, 'Vehicle removed');
};

// ── Security Dashboard ─────────────────────────────────────────────────────────
const getSecurityDashboard = async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeVisitors, todayCheckIns, todayCheckOuts, pendingApprovals] = await Promise.all([
    Visitor.find({ status: 'checked-in' })
      .populate('host', 'name phone')
      .populate('unit', 'blockName unitNumber')
      .sort({ checkInAt: -1 })
      .limit(50),
    Visitor.countDocuments({ checkInAt: { $gte: todayStart } }),
    Visitor.countDocuments({ checkOutAt: { $gte: todayStart } }),
    Visitor.find({ status: 'pending', entryType: 'walk-in' })
      .populate('host', 'name phone')
      .populate('unit', 'blockName unitNumber')
      .sort({ createdAt: -1 }),
  ]);

  return sendSuccess(res, 'Security dashboard', {
    activeVisitors,
    todayStats: { checkIns: todayCheckIns, checkOuts: todayCheckOuts },
    pendingApprovals,
  });
};

// ── Emergency Contacts ─────────────────────────────────────────────────────────
const listEmergencyContacts = async (req, res) => {
  if (!(await EmergencyContact.estimatedDocumentCount())) {
    await EmergencyContact.insertMany(DEFAULT_EMERGENCY_CONTACTS);
  }
  const contacts = await EmergencyContact.find().sort({ createdAt: 1 });
  return sendSuccess(res, 'Emergency contacts', contacts);
};

const addEmergencyContact = async (req, res) => {
  const { name, phone, type } = req.body;
  if (!name?.trim()) return sendError(res, 'Name is required', null, 400);
  if (!phone || !PHONE_REGEX.test(String(phone).trim())) return sendError(res, 'Enter a valid phone number', null, 400);

  const contact = await EmergencyContact.create({ name: name.trim(), phone: String(phone).trim(), type, createdBy: req.user._id });

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'ADD_EMERGENCY_CONTACT',
    entity: 'EmergencyContact',
    entityId: contact._id,
    ip: req.ip,
  });

  return sendSuccess(res, 'Emergency contact added', contact, 201);
};

const deleteEmergencyContact = async (req, res) => {
  const contact = await EmergencyContact.findByIdAndDelete(req.params.id);
  if (!contact) return sendError(res, 'Contact not found', null, 404);

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'REMOVE_EMERGENCY_CONTACT',
    entity: 'EmergencyContact',
    entityId: contact._id,
    ip: req.ip,
  });

  return sendSuccess(res, 'Emergency contact removed');
};

// ── SOS ────────────────────────────────────────────────────────────────────────
// A resident raises an SOS; guards and admins are notified straight away with the
// resident's name, unit and phone so they can respond without a callback.
const triggerSos = async (req, res) => {
  const { category = 'other', message, location } = req.body;
  const profile = await ResidentProfile.findOne({ user: req.user._id }).populate('unit', 'blockName unitNumber');
  const me = await User.findById(req.user._id).select('name phone');

  const loc = location || (profile?.unit ? `${profile.unit.blockName}-${profile.unit.unitNumber}` : 'Community');
  const fullMessage = message ? String(message).slice(0, 500) : (location ? `Location: ${location}` : undefined);

  const alert = await SosAlert.create({
    user: req.user._id,
    unit: profile?.unit?._id,
    phone: me?.phone,
    category: ['medical', 'fire', 'security', 'other'].includes(category) ? category : 'other',
    message: fullMessage,
  });

  const title = `SOS from ${me?.name || req.user.name} (${loc})`;
  const body = `${alert.category.toUpperCase()} emergency at ${loc}${message ? `: ${message}` : ''}${me?.phone ? ` · Call ${me.phone}` : ''}`;

  const responders = await User.find({ role: { $in: ['Guard', 'Admin', 'SuperAdmin'] }, status: 'active', isDeleted: false }).select('_id');
  if (responders.length) {
    await Notification.insertMany(responders.map((r) => ({ recipient: r._id, type: 'emergency', title, message: body })));
  }
  try {
    ['Guard', 'Admin', 'SuperAdmin'].forEach((role) => emitToRole(role, 'alert:sos', { id: alert._id, title, message: body }));
  } catch (_) {}

  return sendSuccess(res, 'SOS sent. Help has been alerted.', alert, 201);
};

const listSosAlerts = async (req, res) => {
  const filter = req.user.role === 'Resident' ? { user: req.user._id } : {};
  const alerts = await SosAlert.find(filter)
    .populate('user', 'name phone')
    .populate('unit', 'blockName unitNumber')
    .sort({ status: 1, createdAt: -1 })
    .limit(50);
  return sendSuccess(res, 'SOS alerts', alerts);
};

const resolveSos = async (req, res) => {
  const alert = await SosAlert.findOneAndUpdate(
    { _id: req.params.id, status: 'active' },
    { status: 'resolved', resolvedBy: req.user._id, resolvedAt: new Date() },
    { new: true }
  );
  if (!alert) return sendError(res, 'Active SOS alert not found', null, 404);
  return sendSuccess(res, 'SOS marked as resolved', alert);
};

module.exports = {
  registerVehicle, getMyVehicles, searchVehicles, deleteVehicle,
  getSecurityDashboard, listEmergencyContacts, addEmergencyContact, deleteEmergencyContact,
  triggerSos, listSosAlerts, resolveSos,
};
