const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { emitToAll } = require('../utils/socket');
const { sendSuccess, sendError } = require('../utils/response');

// Returns the latest messages (oldest first). Pass ?after=<ISO date> to fetch only
// messages newer than the last one the client already has (used for polling).
const listMessages = async (req, res) => {
  const { after } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);
  const filter = {};
  if (after) {
    const afterDate = new Date(after);
    if (!Number.isNaN(afterDate.getTime())) filter.createdAt = { $gt: afterDate };
  }

  const messages = await ChatMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'name role')
    .lean();

  return sendSuccess(res, 'Messages fetched', messages.reverse());
};

const sendMessage = async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) return sendError(res, 'Message cannot be empty', null, 400);
  if (body.length > 1000) return sendError(res, 'Message is too long (max 1000 characters)', null, 400);

  const message = await ChatMessage.create({ sender: req.user._id, body });
  await message.populate('sender', 'name role');

  try { emitToAll('chat:new', message); } catch (_) {}

  return sendSuccess(res, 'Message sent', message, 201);
};

// Everyone who can currently sign in is part of the chat — including members who were
// approved moments ago.
const listMembers = async (req, res) => {
  const members = await User.find({ isDeleted: false, status: 'active' })
    .select('name role')
    .sort({ name: 1 })
    .limit(1000)
    .lean();
  return sendSuccess(res, 'Members fetched', members);
};

module.exports = { listMessages, sendMessage, listMembers };
