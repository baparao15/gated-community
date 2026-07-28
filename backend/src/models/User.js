const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    googleId: { type: String, select: false },
    role: {
      type: String,
      enum: ['SuperAdmin', 'Admin', 'Resident', 'Guard', 'Staff'],
      default: 'Resident',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'deactivated'],
      default: 'pending',
    },
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    avatar: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1, status: 1 });

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = async (plain) => bcrypt.hash(plain, 12);

const User = mongoose.model('User', userSchema);
module.exports = User;
