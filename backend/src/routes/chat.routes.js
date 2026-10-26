const router = require('express').Router();
const ctrl = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth');

router.get('/chat/messages', protect, ctrl.listMessages);
router.post('/chat/messages', protect, ctrl.sendMessage);
router.get('/chat/members', protect, ctrl.listMembers);

module.exports = router;
