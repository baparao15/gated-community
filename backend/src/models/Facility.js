const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['gym', 'pool', 'clubhouse', 'tennis-court', 'playground', 'party-hall', 'conference-room', 'other'],
      required: true,
    },
    description: { type: String },
    capacity: { type: Number, required: true },
    // An array so a facility can have more than one daily shift (e.g. a gym open
    // 5:30-11:00 and again 16:00-23:00, closed for maintenance in between).
    openHours: {
      type: [{ start: { type: String, required: true }, end: { type: String, required: true }, _id: false }],
      default: [{ start: '06:00', end: '22:00' }],
    },
    bookingRules: {
      maxSlotHours: { type: Number, default: 2 },
      advanceBookingDays: { type: Number, default: 7 },
      cancellationHours: { type: Number, default: 24 },
      requiresApproval: { type: Boolean, default: true },
    },
    images: [{ type: String }],
    amenities: [{ type: String }],
    isActive: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Facility = mongoose.model('Facility', facilitySchema);
module.exports = Facility;
