const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'visitor_arrived', 'visitor_approved', 'visitor_denied',
        'complaint_updated', 'complaint_assigned', 'complaint_resolved',
        'announcement', 'emergency',
        'booking_status', 'invoice_generated', 'invoice_overdue',
        'payment_received', 'marketplace_order', 'general',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    relatedEntity: {
      model: { type: String, enum: ['Visitor', 'Complaint', 'Announcement', 'Booking', 'Invoice', 'Payment', 'Product'] },
      id: { type: mongoose.Schema.Types.ObjectId },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
