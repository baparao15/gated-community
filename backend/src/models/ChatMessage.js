const mongoose = require('mongoose');

// Single community-wide room: every active member (including newly approved ones)
// reads and writes the same stream, so there is no per-member membership list to
// keep in sync.
const chatMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

chatMessageSchema.index({ createdAt: -1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
module.exports = ChatMessage;
