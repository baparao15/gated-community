const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const complaintSchema = new mongoose.Schema(
  {
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'cleaning', 'security', 'elevator', 'parking', 'noise', 'other'],
      required: true,
    },
    scope: {
      type: String,
      enum: ['personal', 'community'],
      default: 'personal',
    },
    description: { type: String, required: true },
    images: [{ type: String }],
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    // Personal maintenance jobs go through a quote: staff price the work, the resident
    // accepts/rejects it, and once the work is done the resident pays through it.
    // Community-scoped issues never get a quote — there's no single payer.
    quote: {
      amount: { type: Number },
      note: { type: String },
      quotedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      quotedAt: { type: Date },
      status: { type: String, enum: ['none', 'pending', 'accepted', 'rejected'], default: 'none' },
      respondedAt: { type: Date },
      paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
      paymentMethod: { type: String },
      paymentReference: { type: String },
      paidAt: { type: Date },
      workerPayoutStatus: { type: String, enum: ['pending', 'paid_out'], default: 'pending' },
      workerPaidAt: { type: Date },
      workerPaidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    internalComments: [commentSchema],
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

complaintSchema.index({ raisedBy: 1, status: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ unit: 1 });
complaintSchema.index({ status: 1, priority: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;
