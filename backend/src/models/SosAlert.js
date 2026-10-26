const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    phone: { type: String },
    category: { type: String, enum: ['medical', 'fire', 'security', 'other'], default: 'other' },
    message: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

sosAlertSchema.index({ status: 1, createdAt: -1 });

const SosAlert = mongoose.model('SosAlert', sosAlertSchema);
module.exports = SosAlert;
