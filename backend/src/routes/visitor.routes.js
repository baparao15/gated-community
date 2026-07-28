const router = require('express').Router();
const ctrl = require('../controllers/visitor.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const { preApproveSchema, walkInSchema, verifySchema, approveWalkInSchema } = require('../validators/visitor.validator');

router.post('/preapprove', protect, authorize('Resident'), validate(preApproveSchema), ctrl.preApprove);
router.get('/my', protect, authorize('Resident'), ctrl.getMyVisitors);
router.get('/', protect, authorize('Guard', 'Admin', 'SuperAdmin'), ctrl.listAllVisitors);
router.post('/verify', protect, authorize('Guard', 'Admin', 'SuperAdmin'), validate(verifySchema), ctrl.verifyVisitor);
router.post('/:id/checkin', protect, authorize('Guard', 'Admin', 'SuperAdmin'), upload.single('photo'), ctrl.checkIn);
router.post('/:id/checkout', protect, authorize('Guard', 'Admin', 'SuperAdmin'), ctrl.checkOut);
router.post('/walkin', protect, authorize('Guard', 'Admin', 'SuperAdmin'), validate(walkInSchema), ctrl.logWalkIn);
router.patch('/:id/approve', protect, authorize('Resident'), validate(approveWalkInSchema), ctrl.approveWalkIn);
router.get('/:id', protect, authorize('Guard', 'Admin', 'SuperAdmin', 'Resident'), ctrl.getVisitorById);

module.exports = router;
