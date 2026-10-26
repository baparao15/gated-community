const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, match: /^[0-9+\-\s()]{3,20}$/ },
    type: { type: String, enum: ['emergency', 'security', 'medical', 'other'], default: 'emergency' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);
module.exports = EmergencyContact;
