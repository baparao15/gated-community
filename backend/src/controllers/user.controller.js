const User = require('../models/User');
const Unit = require('../models/Unit');
const ResidentProfile = require('../models/ResidentProfile');
const AuditLog = require('../models/AuditLog');
const { sendApprovalEmail } = require('../utils/email');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// ── Admin: list users ──────────────────────────────────────────────────────────
const listUsers = async (req, res) => {
  const { role, status, unit, search, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: false };
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Users fetched', users, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / parseInt(limit)),
  });
};

const createUser = async (req, res) => {
  const { name, email, phone, password, role = 'Resident', status = 'active', unitNumber } = req.body;

  const allowedRoles = ['Admin', 'Resident', 'Guard', 'Staff'];
  if (!allowedRoles.includes(role)) return sendError(res, 'Invalid role', null, 400);
  if (!['active', 'pending', 'suspended', 'deactivated'].includes(status)) {
    return sendError(res, 'Invalid status value', null, 400);
  }

  const existing = await User.findOne({ email });
  if (existing) return sendError(res, 'Email already registered', null, 409);

  const passwordHash = await User.hashPassword(password || 'password123');
  const user = await User.create({ name, email, phone, passwordHash, role, status });

  if (role === 'Resident' && unitNumber) {
    let unit = null;
    unit = await Unit.findOne({ unitNumber, isActive: true });
    if (unit) {
      await ResidentProfile.create({ user: user._id, unit: unit._id });
    }
    if (unit && !unit.owner) {
      unit.owner = user._id;
      unit.occupancyStatus = 'owner-occupied';
      await unit.save();
    }
  }

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'CREATE_USER',
    entity: 'User',
    entityId: user._id,
    ip: req.ip,
  });

  return sendSuccess(res, 'User created', user, 201);
};

const getUserById = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) return sendError(res, 'User not found', null, 404);
  return sendSuccess(res, 'User fetched', user);
};

const approveUser = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, status: 'pending', isDeleted: false },
    { status: 'active' },
    { new: true }
  );
  if (!user) return sendError(res, 'User not found or not in pending state', null, 404);

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'APPROVE_USER',
    entity: 'User',
    entityId: user._id,
    ip: req.ip,
  });

  // Best-effort — a slow/unconfigured mail server should never block the approval itself.
  sendApprovalEmail(user).catch(() => {});

  return sendSuccess(res, 'User approved', user);
};

const updateUserStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'pending', 'suspended', 'deactivated'];
  if (!allowed.includes(status)) return sendError(res, 'Invalid status value', null, 400);

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { status },
    { new: true }
  );
  if (!user) return sendError(res, 'User not found', null, 404);

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: `STATUS_CHANGE_${status.toUpperCase()}`,
    entity: 'User',
    entityId: user._id,
    ip: req.ip,
  });

  return sendSuccess(res, 'User status updated', user);
};

const updateUserRole = async (req, res) => {
  const { role } = req.body;
  const allowed = ['SuperAdmin', 'Admin', 'Resident', 'Guard', 'Staff'];
  if (!allowed.includes(role)) return sendError(res, 'Invalid role', null, 400);

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { role },
    { new: true }
  );
  if (!user) return sendError(res, 'User not found', null, 404);

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: `ROLE_CHANGE_${role.toUpperCase()}`,
    entity: 'User',
    entityId: user._id,
    ip: req.ip,
  });

  return sendSuccess(res, 'User role updated', user);
};

const deleteUser = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true, status: 'deactivated' },
    { new: true }
  );
  if (!user) return sendError(res, 'User not found', null, 404);

  await AuditLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'DELETE_USER',
    entity: 'User',
    entityId: user._id,
    ip: req.ip,
  });

  return sendSuccess(res, 'User deleted');
};

// ── Resident: own profile ──────────────────────────────────────────────────────
const getMyProfile = async (req, res) => {
  const profile = await ResidentProfile.findOne({ user: req.user._id })
    .populate('user', '-passwordHash -refreshToken')
    .populate('unit');
  if (!profile) return sendError(res, 'Resident profile not found', null, 404);
  return sendSuccess(res, 'Profile fetched', profile);
};

const updateMyProfile = async (req, res) => {
  const { familyMembers, emergencyContact, moveInDate } = req.body;
  const update = {};
  if (familyMembers !== undefined) update.familyMembers = familyMembers;
  if (emergencyContact !== undefined) update.emergencyContact = emergencyContact;
  if (moveInDate !== undefined) update.moveInDate = moveInDate;

  // Allow updating own name/phone on User
  const { name, phone } = req.body;
  const PHONE_REGEX = /^[0-9]{7,15}$/;
  if (phone && !PHONE_REGEX.test(String(phone).trim())) {
    return sendError(res, 'Enter a valid phone number (digits only, 7–15 digits)', null, 400);
  }
  if (emergencyContact?.phone && !PHONE_REGEX.test(String(emergencyContact.phone).trim())) {
    return sendError(res, 'Enter a valid emergency contact phone number (digits only, 7–15 digits)', null, 400);
  }
  if (name || phone) {
    await User.findByIdAndUpdate(req.user._id, { ...(name && { name }), ...(phone && { phone }) });
  }

  const profile = await ResidentProfile.findOneAndUpdate({ user: req.user._id }, update, {
    new: true,
    upsert: true,
    runValidators: true,
  }).populate('unit');

  return sendSuccess(res, 'Profile updated', profile);
};

const addTenant = async (req, res) => {
  const tenant = req.body;
  const profile = await ResidentProfile.findOneAndUpdate(
    { user: req.user._id },
    { $push: { tenants: tenant } },
    { new: true, runValidators: true }
  );
  if (!profile) return sendError(res, 'Resident profile not found', null, 404);
  return sendSuccess(res, 'Tenant added', profile.tenants.at(-1), 201);
};

// ── Admin: units ───────────────────────────────────────────────────────────────
const listUnits = async (req, res) => {
  const { occupancyStatus, blockName, page = 1, limit = 50 } = req.query;
  const filter = { isActive: true };
  if (occupancyStatus) filter.occupancyStatus = occupancyStatus;
  if (blockName) filter.blockName = new RegExp(blockName, 'i');

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [units, total] = await Promise.all([
    Unit.find(filter).populate('owner', 'name email phone').skip(skip).limit(parseInt(limit)),
    Unit.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Units fetched', units, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

const createUnit = async (req, res) => {
  const unit = await Unit.create(req.body);
  return sendSuccess(res, 'Unit created', unit, 201);
};

const updateUnit = async (req, res) => {
  const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!unit) return sendError(res, 'Unit not found', null, 404);
  return sendSuccess(res, 'Unit updated', unit);
};

module.exports = {
  listUsers, createUser, getUserById, approveUser, updateUserStatus, updateUserRole, deleteUser,
  getMyProfile, updateMyProfile, addTenant,
  listUnits, createUnit, updateUnit,
};
