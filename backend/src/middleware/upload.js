const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const { sendError } = require('../utils/response');

// ── Cloudinary config ──────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Cloudinary storage (images & PDFs) ────────────────────────────────────────
// Files are uploaded directly to Cloudinary; req.file.path / f.path will be
// the full HTTPS URL returned by Cloudinary — no local disk writes at all.
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    return {
      folder: 'smart-community',
      resource_type: isPdf ? 'raw' : 'image',
      // Use the original filename (without extension) as the public ID base
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '').replace(/\s+/g, '_')}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
    };
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
  storage: cloudinaryStorage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE) || 5) * 1024 * 1024 },
  fileFilter,
});

// Voice clips are transcribed and discarded, not persisted — kept in memory.
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
