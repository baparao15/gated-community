const Joi = require('joi');

const preApproveSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().required(),
  purpose: Joi.string().min(2).max(200).required(),
  validFrom: Joi.date().iso().optional(),
  validUntil: Joi.date().iso().min('now').optional().allow(''),
  vehicleNumber: Joi.string().allow('').optional(),
  notes: Joi.string().max(500).allow('').optional(),
});

const walkInSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().required(),
  purpose: Joi.string().min(2).max(200).required(),
  unitId: Joi.string().hex().length(24).required(),
  hostId: Joi.string().hex().length(24).required(),
  vehicleNumber: Joi.string().allow('').optional(),
  notes: Joi.string().max(500).allow('').optional(),
});

const verifySchema = Joi.object({
  otp: Joi.string().optional(),
  visitorId: Joi.string().hex().length(24).optional(),
}).or('otp', 'visitorId');

const approveWalkInSchema = Joi.object({
  action: Joi.string().valid('approve', 'deny').required(),
  reason: Joi.string().when('action', { is: 'deny', then: Joi.optional() }),
});

module.exports = { preApproveSchema, walkInSchema, verifySchema, approveWalkInSchema };
