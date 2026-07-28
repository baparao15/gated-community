const Business = require('../models/Business');
const Product = require('../models/Product');
const ResidentProfile = require('../models/ResidentProfile');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// Create a storefront. The apartment is captured on the business itself (pre-filled
// on the client from the resident's unit) so buyers always know where to collect from.
const createBusiness = async (req, res) => {
  const { name, description, apartment, contactPhone } = req.body;

  const profile = await ResidentProfile.findOne({ user: req.user._id });
  const logo = req.file ? req.file.path : undefined;

  const business = await Business.create({
    owner: req.user._id,
    name,
    description,
    apartment,
    unit: profile?.unit,
    contactPhone: contactPhone || req.user.phone,
    logo,
  });

  return sendSuccess(res, 'Business created', business, 201);
};

// Public browse of every open storefront, like a list of restaurants — newest first,
// each tagged with the categories and number of items it currently has available.
// Supports a name search so "search for a business" works from the same box.
const listBusinesses = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = { active: true };
  if (search) filter.name = { $regex: String(search).trim(), $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [businesses, total] = await Promise.all([
    Business.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          let: { bid: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$business', '$$bid'] }, { $eq: ['$available', true] }] } } },
            { $project: { category: 1 } },
          ],
          as: 'products',
        },
      },
      { $addFields: { productCount: { $size: '$products' }, categories: { $setUnion: ['$products.category', []] } } },
      { $project: { products: 0 } },
    ]),
    Business.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Businesses fetched', businesses, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

// The current resident's own storefronts.
const getMyBusinesses = async (req, res) => {
  const businesses = await Business.find({ owner: req.user._id }).sort({ createdAt: -1 });
  return sendSuccess(res, 'Businesses fetched', businesses);
};

// Public storefront view: the business plus its currently available products.
const getBusinessById = async (req, res) => {
  const business = await Business.findById(req.params.id).populate('owner', 'name avatar');
  if (!business) return sendError(res, 'Business not found', null, 404);

  const products = await Product.find({ business: business._id, available: true })
    .sort({ createdAt: -1 })
    .select('-orders');

  return sendSuccess(res, 'Business fetched', { business, products });
};

const updateBusiness = async (req, res) => {
  const business = await Business.findOne({ _id: req.params.id, owner: req.user._id });
  if (!business) return sendError(res, 'Business not found', null, 404);

  const fields = ['name', 'description', 'apartment', 'contactPhone', 'active'];
  fields.forEach((f) => { if (req.body[f] !== undefined) business[f] = req.body[f]; });
  if (req.file) business.logo = req.file.path;
  await business.save();

  return sendSuccess(res, 'Business updated', business);
};

// Businesses can only be removed once every product under them is gone, so orders
// already placed against those products never dangle without a storefront.
const deleteBusiness = async (req, res) => {
  const hasProducts = await Product.exists({ business: req.params.id });
  if (hasProducts) {
    return sendError(res, 'Remove all products from this business before deleting it', null, 400);
  }

  const business = await Business.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!business) return sendError(res, 'Business not found', null, 404);

  return sendSuccess(res, 'Business removed', { _id: business._id });
};

module.exports = {
  createBusiness, listBusinesses, getMyBusinesses, getBusinessById, updateBusiness, deleteBusiness,
};
