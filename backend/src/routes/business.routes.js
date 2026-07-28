const router = require('express').Router();
const ctrl = require('../controllers/business.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const { createBusinessSchema, updateBusinessSchema } = require('../validators/business.validator');

// Every authenticated resident can open a storefront and list products under it.
router.post('/', protect, upload.single('logo'), validate(createBusinessSchema), ctrl.createBusiness);
router.get('/', protect, ctrl.listBusinesses);
router.get('/mine', protect, ctrl.getMyBusinesses);
router.get('/:id', protect, ctrl.getBusinessById);
router.patch('/:id', protect, upload.single('logo'), validate(updateBusinessSchema), ctrl.updateBusiness);
router.delete('/:id', protect, ctrl.deleteBusiness);

module.exports = router;
