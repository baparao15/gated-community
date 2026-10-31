const router = require('express').Router();
const ctrl = require('../controllers/announcement.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { upload } = require('../middleware/upload');

// Announcements
router.post('/announcements', protect, authorize('Admin', 'SuperAdmin'), upload.array('attachments', 5), ctrl.createAnnouncement);
router.get('/announcements', protect, ctrl.listAnnouncements);
router.get('/announcements/:id', protect, ctrl.getAnnouncementById);
router.patch('/announcements/:id', protect, authorize('Admin', 'SuperAdmin'), ctrl.updateAnnouncement);
router.delete('/announcements/:id', protect, authorize('Admin', 'SuperAdmin'), ctrl.deleteAnnouncement);

// Emergency alert
router.post('/alerts/emergency', protect, authorize('Admin', 'SuperAdmin', 'Guard'), ctrl.triggerEmergency);

// Forum
router.get('/forum/posts', protect, authorize('Resident', 'Admin', 'SuperAdmin'), ctrl.listPosts);
router.post('/forum/posts', protect, authorize('Resident', 'Admin', 'SuperAdmin'), upload.array('images', 4), ctrl.createPost);
router.get('/forum/posts/:id/comments', protect, authorize('Resident', 'Admin', 'SuperAdmin'), ctrl.getPostComments);
router.post('/forum/posts/:id/comment', protect, authorize('Resident', 'Admin', 'SuperAdmin'), ctrl.addComment);
router.delete('/forum/posts/:id/comments/:commentId', protect, authorize('Resident', 'Admin', 'SuperAdmin'), ctrl.deleteComment);
router.post('/forum/posts/:id/like', protect, authorize('Resident', 'Admin', 'SuperAdmin'), ctrl.likePost);

module.exports = router;
