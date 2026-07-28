const Joi = require('joi');

const createBusinessSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  description: Joi.string().max(1000).allow('').optional(),
  apartment: Joi.string().max(60).required(),
  contactPhone: Joi.string().max(20).allow('').optional(),
});

const updateBusinessSchema = Joi.object({
  name: Joi.string().min(2).max(120).optional(),
  description: Joi.string().max(1000).allow('').optional(),
  apartment: Joi.string().max(60).optional(),
  contactPhone: Joi.string().max(20).allow('').optional(),
  active: Joi.boolean().optional(),
}).min(1);

module.exports = { createBusinessSchema, updateBusinessSchema };
