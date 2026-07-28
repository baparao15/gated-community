const router = require('express').Router();
const ctrl = require('../controllers/voice.controller');
const { protect } = require('../middleware/auth');
const { uploadAudio } = require('../middleware/upload');

router.post('/voice/transcribe', protect, uploadAudio.single('audio'), ctrl.transcribe);

module.exports = router;
