const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]{7,20}$/).optional(),
  password: Joi.string().min(8).max(64).required(),
  unitId: Joi.string().hex().length(24).optional(),
  unitNumber: Joi.string().max(50).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const googleAuthSchema = Joi.object({
  credential: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(64).required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(64).required(),
});

module.exports = {
  registerSchema, loginSchema, googleAuthSchema, refreshSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema,
};
