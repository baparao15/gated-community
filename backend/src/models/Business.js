const mongoose = require('mongoose');

// A resident-run storefront inside the community marketplace. A resident creates a
// business once (e.g. "Priya's Bakes") and lists every product they sell under it,
// instead of listing products under their personal identity.
const businessSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 1000 },
    // Snapshotted as free text (pre-filled from the resident's unit) so it survives even
    // if the owner's formal unit record changes later.
    apartment: { type: String, required: true, trim: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    contactPhone: { type: String, trim: true },
    logo: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

businessSchema.index({ owner: 1 });

const Business = mongoose.model('Business', businessSchema);
module.exports = Business;
