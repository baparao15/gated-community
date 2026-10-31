const Announcement = require('../models/Announcement');
const ForumPost = require('../models/ForumPost');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToAll, emitToRole } = require('../utils/socket');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// ── Announcements ──────────────────────────────────────────────────────────────
const createAnnouncement = async (req, res) => {
  const { title, body, type, audience, eventDate, expiresAt, isPinned } = req.body;
  const attachments = req.files ? req.files.map((f) => f.path) : [];

  const announcement = await Announcement.create({
    title, body, type, audience, eventDate, expiresAt, isPinned,
    postedBy: req.user._id,
    attachments,
  });

  // Emit socket event
  try {
    if (type === 'emergency') {
      emitToAll('alert:emergency', { title, message: body, id: announcement._id });
    } else {
      emitToAll('announcement:new', { title, type, id: announcement._id });
    }
  } catch (_) {}

  return sendSuccess(res, 'Announcement created', announcement, 201);
};

const listAnnouncements = async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const roleToAudience = {
    Resident: ['all', 'residents'],
    Staff: ['all', 'staff'],
    Guard: ['all', 'guards'],
    Admin: ['all', 'residents', 'staff', 'guards'],
    SuperAdmin: ['all', 'residents', 'staff', 'guards'],
  };

  const audiences = roleToAudience[req.user.role] || ['all'];
  const filter = { isActive: true, audience: { $in: audiences } };
  if (type) filter.type = type;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .populate('postedBy', 'name')
      .skip(skip).limit(parseInt(limit)).sort({ isPinned: -1, createdAt: -1 }),
    Announcement.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Announcements fetched', announcements, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

const getAnnouncementById = async (req, res) => {
  const announcement = await Announcement.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate('postedBy', 'name');
  if (!announcement) return sendError(res, 'Announcement not found', null, 404);
  return sendSuccess(res, 'Announcement fetched', announcement);
};

const updateAnnouncement = async (req, res) => {
  const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!announcement) return sendError(res, 'Announcement not found', null, 404);
  return sendSuccess(res, 'Announcement updated', announcement);
};

const deleteAnnouncement = async (req, res) => {
  const announcement = await Announcement.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!announcement) return sendError(res, 'Announcement not found', null, 404);
  return sendSuccess(res, 'Announcement removed');
};

// Emergency alert broadcast
const triggerEmergency = async (req, res) => {
  const { title, message } = req.body;

  const announcement = await Announcement.create({
    title,
    body: message,
    type: 'emergency',
    audience: 'all',
    postedBy: req.user._id,
  });

  try {
    emitToAll('alert:emergency', { title, message, id: announcement._id, triggeredBy: req.user.name });
  } catch (_) {}

  return sendSuccess(res, 'Emergency alert broadcast', announcement, 201);
};

// ── Forum ──────────────────────────────────────────────────────────────────────
const listPosts = async (req, res) => {
  const { category, page = 1, limit = 20 } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [posts, total] = await Promise.all([
    ForumPost.find(filter)
      .populate('author', 'name role')
      .populate('comments.author', 'name role')
      .skip(skip).limit(parseInt(limit)).sort({ isPinned: -1, createdAt: -1 }),
    ForumPost.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Posts fetched', posts, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

const createPost = async (req, res) => {
  const { title, body, category } = req.body;
  const images = req.files ? req.files.map((f) => f.path) : [];
  const post = await ForumPost.create({ title, body, category, author: req.user._id, images });
  await post.populate('author', 'name role');
  return sendSuccess(res, 'Post created', post, 201);
};

const getPostComments = async (req, res) => {
  const post = await ForumPost.findById(req.params.id).populate('comments.author', 'name role');
  if (!post) return sendError(res, 'Post not found', null, 404);
  return sendSuccess(res, 'Comments fetched', post.comments || []);
};

const addComment = async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) {
    return sendError(res, 'Comment text is required', null, 400);
  }
  const post = await ForumPost.findByIdAndUpdate(
    req.params.id,
    { $push: { comments: { author: req.user._id, body: body.trim() } } },
    { new: true }
  ).populate('comments.author', 'name role');
  if (!post) return sendError(res, 'Post not found', null, 404);
  return sendSuccess(res, 'Comment added', post.comments.at(-1), 201);
};

const deleteComment = async (req, res) => {
  const { id, commentId } = req.params;
  const post = await ForumPost.findById(id);
  if (!post) return sendError(res, 'Post not found', null, 404);

  const comment = post.comments.id(commentId);
  if (!comment) return sendError(res, 'Comment not found', null, 404);

  const isAuthor = comment.author?.toString() === req.user._id.toString();
  const isAdmin = ['Admin', 'SuperAdmin'].includes(req.user.role);
  if (!isAuthor && !isAdmin) {
    return sendError(res, 'Not authorized to delete this comment', null, 403);
  }

  post.comments.pull({ _id: commentId });
  await post.save();
  return sendSuccess(res, 'Comment deleted', { commentId });
};

const likePost = async (req, res) => {
  const post = await ForumPost.findById(req.params.id);
  if (!post) return sendError(res, 'Post not found', null, 404);

  const userId = req.user._id.toString();
  const alreadyLiked = post.likes.map((l) => l.toString()).includes(userId);

  if (alreadyLiked) {
    post.likes = post.likes.filter((l) => l.toString() !== userId);
  } else {
    post.likes.push(req.user._id);
  }
  await post.save();

  return sendSuccess(res, alreadyLiked ? 'Unliked' : 'Liked', { likes: post.likes.length });
};

module.exports = {
  createAnnouncement, listAnnouncements, getAnnouncementById, updateAnnouncement, deleteAnnouncement,
  triggerEmergency,
  listPosts, createPost, getPostComments, addComment, deleteComment, likePost,
};
