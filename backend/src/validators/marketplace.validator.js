const Joi = require('joi');

const createProductSchema = Joi.object({
  business: Joi.string().hex().length(24).required(),
  category: Joi.string().valid('food', 'art').required(),
  title: Joi.string().min(2).max(120).required(),
  description: Joi.string().max(2000).allow('').optional(),
  price: Joi.number().min(0).required(),
});

const updateProductSchema = Joi.object({
  category: Joi.string().valid('food', 'art').optional(),
  title: Joi.string().min(2).max(120).optional(),
  description: Joi.string().max(2000).allow('').optional(),
  price: Joi.number().min(0).optional(),
  available: Joi.boolean().optional(),
}).min(1);

const orderSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(99).optional(),
  note: Joi.string().max(500).allow('').optional(),
});

const orderStatusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'completed', 'cancelled').required(),
});

module.exports = { createProductSchema, updateProductSchema, orderSchema, orderStatusSchema };
