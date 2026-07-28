const Product = require('../models/Product');
const Business = require('../models/Business');
const Notification = require('../models/Notification');
const { emitToUser } = require('../utils/socket');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// Create a listing under one of the seller's own businesses.
const createProduct = async (req, res) => {
  const { business, category, title, description, price } = req.body;

  const owned = await Business.findOne({ _id: business, owner: req.user._id });
  if (!owned) return sendError(res, 'Business not found', null, 404);

  const images = req.files ? req.files.map((f) => f.path) : [];

  const product = await Product.create({
    business: owned._id,
    seller: req.user._id,
    category,
    title,
    description,
    price,
    images,
  });

  return sendSuccess(res, 'Product listed', product, 201);
};

// Public browse of every available listing, newest first. Supports category + text search.
const listProducts = async (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query;
  const filter = { available: true };
  if (category) filter.category = category;
  if (search) filter.title = { $regex: String(search).trim(), $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [products, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 })
      .select('-orders')
      .populate('seller', 'name avatar')
      .populate('business', 'name logo apartment contactPhone'),
    Product.countDocuments(filter),
  ]);

  return sendPaginated(res, 'Products fetched', products, {
    total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
  });
};

// The seller's own listings, including sold-out / unavailable ones and their orders.
// Optionally scoped to a single business via ?business=<id>.
const getMyListings = async (req, res) => {
  const filter = { seller: req.user._id };
  if (req.query.business) filter.business = req.query.business;

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .populate('orders.buyer', 'name phone')
    .populate('business', 'name logo apartment contactPhone');

  return sendSuccess(res, 'My listings fetched', products);
};

const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('seller', 'name avatar phone')
    .populate('business', 'name logo apartment contactPhone');
  if (!product) return sendError(res, 'Product not found', null, 404);
  return sendSuccess(res, 'Product fetched', product);
};

const updateProduct = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
  if (!product) return sendError(res, 'Product not found', null, 404);

  // Business is fixed at creation time — a listing can't be moved between storefronts.
  const fields = ['category', 'title', 'description', 'price', 'available'];
  fields.forEach((f) => { if (req.body[f] !== undefined) product[f] = req.body[f]; });
  if (req.files && req.files.length) product.images = req.files.map((f) => f.path);
  await product.save();

  return sendSuccess(res, 'Listing updated', product);
};

const deleteProduct = async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, seller: req.user._id });
  if (!product) return sendError(res, 'Product not found', null, 404);
  return sendSuccess(res, 'Listing removed', { _id: product._id });
};

// A neighbour places an order. Sellers can't order from themselves, and the seller is
// notified so they can arrange the handover.
const placeOrder = async (req, res) => {
  const { quantity = 1, note } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) return sendError(res, 'Product not found', null, 404);
  if (!product.available) return sendError(res, 'This item is no longer available', null, 400);
  if (product.seller.toString() === req.user._id.toString()) {
    return sendError(res, 'You cannot order your own listing', null, 400);
  }

  product.orders.push({ buyer: req.user._id, quantity, note });
  await product.save();
  const order = product.orders[product.orders.length - 1];

  try {
    emitToUser(product.seller.toString(), 'marketplace:order', {
      message: `${req.user.name} ordered "${product.title}"`,
      productId: product._id,
    });
    await Notification.create({
      recipient: product.seller,
      type: 'marketplace_order',
      title: 'New order',
      message: `${req.user.name} ordered ${quantity} × "${product.title}"`,
      relatedEntity: { model: 'Product', id: product._id },
    });
  } catch (_) {}

  return sendSuccess(res, 'Order placed', order, 201);
};

// Orders the current user has placed across all listings.
const getMyOrders = async (req, res) => {
  const products = await Product.find({ 'orders.buyer': req.user._id })
    .sort({ 'orders.createdAt': -1 })
    .populate('seller', 'name phone')
    .populate('business', 'name logo apartment contactPhone');

  const orders = [];
  products.forEach((p) => {
    p.orders
      .filter((o) => o.buyer.toString() === req.user._id.toString())
      .forEach((o) => orders.push({
        _id: o._id,
        quantity: o.quantity,
        note: o.note,
        status: o.status,
        createdAt: o.createdAt,
        product: {
          _id: p._id, title: p.title, category: p.category, price: p.price,
          images: p.images, seller: p.seller, business: p.business,
        },
      }));
  });
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return sendSuccess(res, 'My orders fetched', orders);
};

// Seller confirms / completes / cancels an order on one of their listings.
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  const product = await Product.findOne({ _id: req.params.id, seller: req.user._id })
    .populate('orders.buyer', 'name');
  if (!product) return sendError(res, 'Product not found', null, 404);

  const order = product.orders.id(req.params.orderId);
  if (!order) return sendError(res, 'Order not found', null, 404);

  order.status = status;
  await product.save();

  try {
    const buyerId = order.buyer._id ? order.buyer._id.toString() : order.buyer.toString();
    emitToUser(buyerId, 'marketplace:order', {
      message: `Your order for "${product.title}" was ${status}`,
      productId: product._id,
    });
    await Notification.create({
      recipient: buyerId,
      type: 'marketplace_order',
      title: 'Order update',
      message: `Your order for "${product.title}" was ${status}`,
      relatedEntity: { model: 'Product', id: product._id },
    });
  } catch (_) {}

  return sendSuccess(res, 'Order updated', order);
};

module.exports = {
  createProduct, listProducts, getMyListings, getProductById, updateProduct, deleteProduct,
  placeOrder, getMyOrders, updateOrderStatus,
};
