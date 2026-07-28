const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { sendError } = require('../utils/response');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${unique}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only images and PDFs are allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE) || 5) * 1024 * 1024 },
  fileFilter,
});

// Voice clips are transcribed and discarded, not persisted — kept in memory, not written to /uploads.
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') return cb(null, true);
    cb(new Error('Only audio files are allowed'));
  },
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return sendError(res, err.message, null, 400);
  }
  next();
};

module.exports = { upload, uploadAudio, handleUploadError };
