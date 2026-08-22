const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  generateInvoiceSchema, payInvoiceSchema, updateInvoiceSchema, updatePaymentSchema,
} = require('../validators/payment.validator');

// Invoices
router.post('/invoices', protect, authorize('Admin', 'SuperAdmin'), ctrl.createInvoice);
router.post('/invoices/generate', protect, authorize('Admin', 'SuperAdmin'), validate(generateInvoiceSchema), ctrl.generateInvoices);
router.get('/invoices/my', protect, authorize('Resident'), ctrl.getMyInvoices);
router.get('/invoices', protect, authorize('Admin', 'SuperAdmin'), ctrl.listInvoices);
router.get('/invoices/:id', protect, ctrl.getInvoiceById);
router.patch('/invoices/:id', protect, authorize('Admin', 'SuperAdmin'), validate(updateInvoiceSchema), ctrl.updateInvoice);
router.post('/invoices/:id/pay', protect, authorize('Resident', 'Admin', 'SuperAdmin'), validate(payInvoiceSchema), ctrl.payInvoice);
router.get('/invoices/:id/receipt', protect, ctrl.getReceipt);

// Razorpay Standard Checkout
router.post('/payments/razorpay/order', protect, ctrl.createRazorpayOrder);
router.post('/payments/create-order', protect, ctrl.createRazorpayOrder);
router.post('/payments/razorpay/verify', protect, ctrl.verifyRazorpayPayment);
router.post('/payments/verify-payment', protect, ctrl.verifyRazorpayPayment);

// Payments
router.get('/payments/my', protect, authorize('Resident'), ctrl.getMyPayments);
router.get('/payments', protect, authorize('Admin', 'SuperAdmin'), ctrl.listPayments);
router.patch('/payments/:id', protect, authorize('Admin', 'SuperAdmin'), validate(updatePaymentSchema), ctrl.updatePayment);

module.exports = router;
