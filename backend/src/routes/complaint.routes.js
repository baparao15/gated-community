const router = require('express').Router();
const ctrl = require('../controllers/complaint.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const {
  createComplaintSchema, assignSchema, statusSchema, prioritySchema, feedbackSchema,
  quoteSchema, quoteResponseSchema, quotePaymentSchema,
} = require('../validators/complaint.validator');

router.post(
  '/',
  protect,
  authorize('Resident'),
  upload.array('images', 5),
  validate(createComplaintSchema),
  ctrl.createComplaint
);
router.get('/my', protect, authorize('Resident'), ctrl.getMyComplaints);
router.get('/community', protect, ctrl.getCommunityComplaints);
router.get('/assigned/me', protect, authorize('Staff', 'Admin', 'SuperAdmin'), ctrl.getAssignedToMe);
router.get('/', protect, authorize('Admin', 'SuperAdmin', 'Staff'), ctrl.listComplaints);
router.get('/:id', protect, ctrl.getComplaintById);
router.patch('/:id/assign', protect, authorize('Admin', 'SuperAdmin'), validate(assignSchema), ctrl.assignComplaint);
router.patch('/:id/status', protect, authorize('Staff', 'Admin', 'SuperAdmin'), validate(statusSchema), ctrl.updateComplaintStatus);
router.patch('/:id/priority', protect, authorize('Admin', 'SuperAdmin'), validate(prioritySchema), ctrl.updatePriority);
router.post('/:id/quote', protect, authorize('Staff', 'Admin', 'SuperAdmin'), validate(quoteSchema), ctrl.submitQuote);
router.patch('/:id/quote/respond', protect, authorize('Resident'), validate(quoteResponseSchema), ctrl.respondToQuote);
router.post('/:id/quote/pay', protect, authorize('Resident'), validate(quotePaymentSchema), ctrl.payQuote);
router.post('/:id/feedback', protect, authorize('Resident'), validate(feedbackSchema), ctrl.submitFeedback);

module.exports = router;
