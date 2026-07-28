const mongoose = require('mongoose');

// A community marketplace listing, always published under a resident's Business
// (e.g. "Priya's Bakes"). Neighbours browse and order; buyers reach out via the
// business's contact details.
const orderSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, min: 1, default: 1 },
    note: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'completed', 'cancelled'],
      default: 'placed',
    },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    // Denormalized from business.owner so ownership/order checks don't need a join.
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: ['food', 'art'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 2000 },
    price: { type: Number, required: true, min: 0 },
    images: [{ type: String }],
    available: { type: Boolean, default: true },
    orders: [orderSchema],
  },
  { timestamps: true }
);

productSchema.index({ available: 1, category: 1, createdAt: -1 });
productSchema.index({ business: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ 'orders.buyer': 1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
