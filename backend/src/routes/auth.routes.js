const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload, handleUploadError } = require('../middleware/upload');
const {
  registerSchema, loginSchema, googleAuthSchema, refreshSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema,
} = require('../validators/auth.validator');

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/google', validate(googleAuthSchema), ctrl.googleAuth);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', protect, ctrl.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), ctrl.resetPassword);
router.get('/me', protect, ctrl.getMe);
router.patch('/me', protect, upload.single('avatar'), handleUploadError, ctrl.updateMe);
router.post('/avatar', protect, upload.single('avatar'), handleUploadError, ctrl.uploadAvatar);
router.patch('/change-password', protect, validate(changePasswordSchema), ctrl.changePassword);

module.exports = router;
