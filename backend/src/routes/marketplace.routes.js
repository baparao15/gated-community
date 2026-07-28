const router = require('express').Router();
const ctrl = require('../controllers/marketplace.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const {
  createProductSchema, updateProductSchema, orderSchema, orderStatusSchema,
} = require('../validators/marketplace.validator');

// The marketplace is open to every authenticated resident of the community —
// anyone can list something to sell and anyone can browse and order.
router.post('/', protect, upload.array('images', 4), validate(createProductSchema), ctrl.createProduct);
router.get('/', protect, ctrl.listProducts);
router.get('/mine', protect, ctrl.getMyListings);
router.get('/orders/mine', protect, ctrl.getMyOrders);
router.get('/:id', protect, ctrl.getProductById);
router.patch('/:id', protect, upload.array('images', 4), validate(updateProductSchema), ctrl.updateProduct);
router.delete('/:id', protect, ctrl.deleteProduct);
router.post('/:id/order', protect, validate(orderSchema), ctrl.placeOrder);
router.patch('/:id/orders/:orderId', protect, validate(orderStatusSchema), ctrl.updateOrderStatus);

module.exports = router;
