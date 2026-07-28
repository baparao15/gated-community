const Joi = require('joi');

const createFacilitySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  type: Joi.string().valid('gym', 'pool', 'clubhouse', 'tennis-court', 'playground', 'party-hall', 'conference-room', 'other').required(),
  description: Joi.string().max(500).optional(),
  capacity: Joi.number().integer().min(1).required(),
  openHours: Joi.array().items(
    Joi.object({
      start: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
      end: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    })
  ).min(1).optional(),
  bookingRules: Joi.object({
    maxSlotHours: Joi.number().optional(),
    advanceBookingDays: Joi.number().optional(),
    cancellationHours: Joi.number().optional(),
    requiresApproval: Joi.boolean().optional(),
  }).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
});

const bookingSchema = Joi.object({
  facilityId: Joi.string().hex().length(24).required(),
  slotStart: Joi.date().iso().min('now').required(),
  slotEnd: Joi.date().iso().greater(Joi.ref('slotStart')).required(),
  attendees: Joi.number().integer().min(1).optional(),
  purpose: Joi.string().max(200).optional(),
  specialRequirements: Joi.string().max(500).optional(),
});

const approveBookingSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  reason: Joi.string().max(500).optional(),
});

module.exports = { createFacilitySchema, bookingSchema, approveBookingSchema };
