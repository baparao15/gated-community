const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const ResidentProfile = require('../models/ResidentProfile');
const Unit = require('../models/Unit');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateResetToken, hashToken } = require('../utils/otp');
const { sendSuccess, sendError } = require('../utils/response');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const register = async (req, res) => {
  const { name, email, phone, password, unitId, unitNumber } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return sendError(res, 'Email already registered', null, 409);

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, phone, passwordHash, role: 'Resident', status: 'pending' });

  let linkedUnitId = unitId;
  if (!linkedUnitId && unitNumber) {
    const unit = await Unit.findOne({ unitNumber, isActive: true });
    if (unit) {
      linkedUnitId = unit._id;
      if (!unit.owner) {
        unit.owner = user._id;
        unit.occupancyStatus = 'owner-occupied';
        await unit.save();
      }
    }
  }

  if (linkedUnitId) {
    await ResidentProfile.create({ user: user._id, unit: linkedUnitId });
  }

  return sendSuccess(res, 'Registration successful. Awaiting admin approval.', { userId: user._id }, 201);
};

// Sign in (or sign up, if the email hasn't been seen before) with a Google ID token
// from the frontend's Google Identity Services button. New accounts still land in
// 'pending' status — Google only verifies identity, not community membership, so
// admin approval is still required exactly like a normal registration.
const googleAuth = async (req, res) => {
  const { credential } = req.body;

  if (!process.env.GOOGLE_CLIENT_ID) {
    return sendError(res, 'Google sign-in is not configured on the server.', null, 503);
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return sendError(res, 'Invalid Google credential', null, 401);
  }

  if (!payload?.email_verified) return sendError(res, 'Google account email is not verified', null, 401);

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email, isDeleted: false }).select('+refreshToken +googleId');

  if (!user) {
    const passwordHash = await User.hashPassword(generateResetToken());
    user = await User.create({
      name: payload.name || email.split('@')[0],
      email,
      googleId: payload.sub,
      passwordHash,
      role: 'Resident',
      status: 'pending',
      avatar: payload.picture,
    });
    return sendSuccess(res, 'Registration submitted via Google. Awaiting admin approval.', { pending: true, userId: user._id }, 201);
  }

  if (!user.googleId) {
    user.googleId = payload.sub;
    await user.save();
  }

  if (user.status === 'pending') return sendError(res, 'Account pending admin approval', null, 403);
  if (user.status === 'suspended') return sendError(res, 'Account suspended', null, 403);
  if (user.status === 'deactivated') return sendError(res, 'Account deactivated', null, 403);

  const tokenPayload = { id: user._id, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  user.refreshToken = refreshToken;
  await user.save();

  return sendSuccess(res, 'Login successful', {
    accessToken,
    refreshToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, isDeleted: false }).select('+passwordHash +refreshToken');
  if (!user) return sendError(res, 'Invalid credentials', null, 401);

  const match = await user.comparePassword(password);
  if (!match) return sendError(res, 'Invalid credentials', null, 401);

  if (user.status === 'pending') return sendError(res, 'Account pending admin approval', null, 403);
  if (user.status === 'suspended') return sendError(res, 'Account suspended', null, 403);
  if (user.status === 'deactivated') return sendError(res, 'Account deactivated', null, 403);

  const payload = { id: user._id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save();

  return sendSuccess(res, 'Login successful', {
    accessToken,
    refreshToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return sendError(res, 'Refresh token required', null, 400);

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return sendError(res, 'Invalid or expired refresh token', null, 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    return sendError(res, 'Refresh token revoked', null, 401);
  }

  const payload = { id: user._id, role: user.role };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save();

  return sendSuccess(res, 'Token refreshed', { accessToken: newAccessToken, refreshToken: newRefreshToken });
};

const logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
  return sendSuccess(res, 'Logged out successfully');
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email, isDeleted: false });
  // Always respond the same way to avoid email enumeration
  if (!user) return sendSuccess(res, 'If the email exists, a reset link has been generated');

  const rawToken = generateResetToken();
  const hashedToken = hashToken(rawToken);

  await User.findByIdAndUpdate(user._id, {
    passwordResetToken: hashedToken,
    passwordResetExpires: Date.now() + parseInt(process.env.RESET_TOKEN_EXPIRES_IN || 3600000),
  });

  // In production, send via email. For now, return in response (Postman testing).
  return sendSuccess(res, 'Password reset token generated', { resetToken: rawToken });
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
    isDeleted: false,
  }).select('+passwordHash');

  if (!user) return sendError(res, 'Invalid or expired reset token', null, 400);

  user.passwordHash = await User.hashPassword(password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined;
  await user.save();

  return sendSuccess(res, 'Password reset successful');
};

const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  return sendSuccess(res, 'Profile fetched', user);
};

const updateMe = async (req, res) => {
  const { name, phone } = req.body;
  const avatar = req.file ? req.file.path : req.body.avatar;
  const update = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (avatar !== undefined) update.avatar = avatar;

  if (!Object.keys(update).length) return sendError(res, 'No profile fields provided', null, 400);
  if (update.phone && !/^[0-9]{10}$/.test(String(update.phone).trim())) {
    return sendError(res, 'Enter a valid 10-digit phone number', null, 400);
  }

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
  return sendSuccess(res, 'Profile updated', user);
};

const uploadAvatar = async (req, res) => {
  const avatar = req.file ? req.file.path : req.body.avatar;
  if (!avatar) return sendError(res, 'No avatar image file or data provided', null, 400);

  const user = await User.findByIdAndUpdate(req.user._id, { avatar }, { new: true });
  return sendSuccess(res, 'Profile photo updated', user);
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  const match = await user.comparePassword(currentPassword);
  if (!match) return sendError(res, 'Current password is incorrect', null, 400);

  user.passwordHash = await User.hashPassword(newPassword);
  user.refreshToken = undefined;
  await user.save();

  return sendSuccess(res, 'Password changed successfully');
};

module.exports = { register, login, googleAuth, refresh, logout, forgotPassword, resetPassword, getMe, updateMe, uploadAvatar, changePassword };
