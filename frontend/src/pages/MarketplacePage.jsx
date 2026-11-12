import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import {
  ArrowLeft, Building2, Check, CheckCircle2, ChevronRight, Clock,
  Eye, Heart, MapPin, MessageCircle, Minus, Package, Palette, Pencil,
  Phone, Plus, Search, Share2, ShoppingBag, ShoppingCart, SlidersHorizontal,
  Sparkles, Star, Store, Trash2, UtensilsCrossed, X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ImageUploader from '../components/ImageUploader';
import api from '../services/api';
import { marketplaceAPI } from '../services/marketplaceAPI';
import { businessAPI } from '../services/businessAPI';
import { showToast } from '../store/uiSlice';
import { asList, currency, unitLabel, uploadUrl } from '../utils/apiData';

const CATEGORIES = [
  { value: 'food', label: 'Food & Bakes', icon: UtensilsCrossed, color: 'from-amber-500 to-orange-600', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300' },
  { value: 'art', label: 'Art & Crafts', icon: Palette, color: 'from-violet-500 to-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' },
];

const catMeta = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES[0];

const emptyForm = { business: '', category: 'food', title: '', description: '', price: '' };
const emptyBusinessForm = { name: '', description: '', apartment: '', contactPhone: '' };

const TABS = [
  { value: 'browse', label: 'Marketplace', icon: Store },
  { value: 'businesses', label: 'My Stores', icon: Building2 },
  { value: 'listings', label: 'My Listings', icon: ShoppingBag },
  { value: 'orders', label: 'My Orders', icon: ShoppingCart },
];

const statusPill = (status) => {
  const map = {
    placed: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300',
  };
  return `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${map[status] || 'bg-slate-100 text-slate-600'}`;
};

const productImage = (product) => (product?.images?.length ? uploadUrl(product.images[0]) : null);

/* ── Modern Product Card ─────────────────────────────────────────── */
function ProductCard({ product, user, isLiked, onToggleLike, onOrder, onQuickView }) {
  const Meta = catMeta(product.category);
  const img = productImage(product);
  const own = product.seller?._id === user?.id || product.seller === user?.id;

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-earth-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-brand-300 dark:border-earth-700/80 dark:bg-earth-900">
      <div>
        {/* Image Container with Badges */}
        <div className="relative h-48 w-full cursor-pointer overflow-hidden bg-earth-100 dark:bg-earth-800" onClick={onQuickView}>
          {img ? (
            <img src={img} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${Meta.color} opacity-85`}>
              <Meta.icon size={48} className="text-white drop-shadow-md" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

          {/* Category Tag */}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold capitalize text-earth-800 shadow-sm backdrop-blur-md dark:bg-earth-900/90 dark:text-earth-100">
            <Meta.icon size={13} className="text-brand-600 dark:text-brand-400" /> {product.category}
          </span>

          {/* Like / Wishlist Button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleLike(product._id); }}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-earth-600 shadow-sm backdrop-blur-md transition hover:scale-110 active:scale-95 dark:bg-earth-900/90"
            aria-label="Wishlist"
          >
            <Heart size={15} className={isLiked ? 'fill-red-500 text-red-500' : 'text-slate-500 hover:text-red-500'} />
          </button>

          {/* Quick View Button on Image Hover */}
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <Eye size={13} /> Quick view
            </span>
          </div>

          {!product.available && (
            <span className="absolute inset-0 grid place-items-center bg-slate-900/70 font-bold text-white text-sm backdrop-blur-xs">
              Sold Out / Paused
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={onQuickView}
              className="cursor-pointer font-display text-base font-extrabold text-ink transition hover:text-brand-600 dark:text-earth-50 dark:hover:text-brand-400 line-clamp-1"
            >
              {product.title}
            </h3>
            <span className="shrink-0 font-display text-lg font-black text-brand-600 dark:text-brand-400">
              {currency(product.price)}
            </span>
          </div>

          {product.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {product.description}
            </p>
          )}

          {/* Store & Apartment Badge */}
          <div className="mt-3 flex items-center justify-between border-t border-earth-100 pt-3 text-xs text-slate-500 dark:border-earth-800 dark:text-slate-400">
            <div className="flex items-center gap-1.5 truncate font-semibold text-earth-700 dark:text-earth-200">
              <Building2 size={13} className="shrink-0 text-brand-600 dark:text-brand-400" />
              <span className="truncate">{product.business?.name || 'Neighbour Store'}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 rounded-md bg-earth-100 px-2 py-0.5 text-[11px] font-bold text-earth-700 dark:bg-earth-800 dark:text-earth-300">
              <MapPin size={11} /> {product.business?.apartment ? (product.business.apartment.toLowerCase().startsWith('apt') ? product.business.apartment : `Apt ${product.business.apartment}`) : 'Community'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 pt-0 sm:p-5 sm:pt-0">
        <button
          onClick={onOrder}
          disabled={own || !product.available}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {own ? (
            'Your Listing'
          ) : !product.available ? (
            'Unavailable'
          ) : (
            <>
              <ShoppingCart size={15} /> Order now
            </>
          )}
        </button>
      </div>
    </article>
  );
}

/* ── Modern Storefront Card ──────────────────────────────────────── */
function StoreCard({ business, onClick }) {
  return (
    <article
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-earth-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-brand-400 dark:border-earth-700 dark:bg-earth-900"
    >
      {/* Cover Banner */}
      <div className="relative h-28 overflow-hidden bg-gradient-to-r from-brand-600/25 via-amber-500/20 to-indigo-600/20 dark:from-brand-900/40 dark:to-indigo-900/40">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur-sm dark:bg-earth-900/90 dark:text-emerald-400">
          <CheckCircle2 size={12} /> Resident Verified
        </span>
      </div>

      {/* Info & Avatar */}
      <div className="relative px-5 pb-5">
        <div className="relative -mt-9 mb-3 flex items-end justify-between">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white bg-white text-brand-600 shadow-md ring-1 ring-earth-200 dark:border-earth-900 dark:bg-earth-800 dark:ring-earth-700">
            {business.logo ? (
              <img src={uploadUrl(business.logo)} alt={business.name} className="h-full w-full object-cover" />
            ) : (
              <Building2 size={30} />
            )}
          </div>
          <span className="rounded-full border border-earth-200 bg-earth-50 px-3 py-1 text-xs font-extrabold text-earth-700 shadow-sm dark:border-earth-700 dark:bg-earth-800 dark:text-earth-200">
            {business.productCount || 0} listing{business.productCount === 1 ? '' : 's'}
          </span>
        </div>

        <h3 className="font-display text-lg font-extrabold text-ink dark:text-earth-50 group-hover:text-brand-600 transition">
          {business.name}
        </h3>

        {business.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {business.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-earth-100 px-2.5 py-1 text-xs font-bold text-earth-700 dark:bg-earth-800 dark:text-earth-300">
            <MapPin size={12} className="text-brand-600" /> Apt {business.apartment}
          </span>
          {business.contactPhone && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Phone size={11} /> {business.contactPhone}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-earth-100 pt-3 text-xs font-bold text-brand-600 dark:border-earth-800 dark:text-brand-400">
          <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Visit storefront <ChevronRight size={14} />
          </span>
          <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
            <Star size={13} className="fill-amber-400 text-amber-400" /> 4.9
          </span>
        </div>
      </div>
    </article>
  );
}

/* ── Empty State Helper ──────────────────────────────────────────── */
function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-earth-300 bg-earth-50/60 px-6 py-16 text-center dark:border-earth-700 dark:bg-earth-900/30">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-earth-100 text-earth-400 dark:bg-earth-800">
        <Icon size={32} />
      </div>
      <div className="font-display text-lg font-bold text-earth-800 dark:text-earth-200">{title}</div>
      {subtitle && <p className="mt-1.5 max-w-sm text-sm text-earth-500 dark:text-slate-400">{subtitle}</p>}
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN MARKETPLACE COMPONENT
═════════════════════════════════════════════════════════════════════ */
export default function MarketplacePage() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [tab, setTab] = useState('browse');
  const [browseView, setBrowseView] = useState('products'); // 'products' | 'stores'
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price_asc' | 'price_desc'
  const searchRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [browseBusinesses, setBrowseBusinesses] = useState([]);
  const [activeStore, setActiveStore] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wishlist / Liked IDs stored in localStorage
  const [wishlist, setWishlist] = useState(() => {
    try {
      const stored = localStorage.getItem(`market_wishlist_${user?._id || 'guest'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleWishlist = (id) => {
    setWishlist((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(`market_wishlist_${user?._id || 'guest'}`, JSON.stringify(next));
      } catch {}
      dispatch(showToast({ message: exists ? 'Removed from saved items' : 'Saved to favorites ❤️' }));
      return next;
    });
  };

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [voiceFilled, setVoiceFilled] = useState(false);

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  // Order Placement Modal
  const [orderTarget, setOrderTarget] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNote, setOrderNote] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Business Modal
  const [businessOpen, setBusinessOpen] = useState(false);
  const [businessForm, setBusinessForm] = useState(emptyBusinessForm);
  const [businessLogo, setBusinessLogo] = useState([]);
  const [editingBusiness, setEditingBusiness] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  /* ── Load Products (All available across community) ────────────── */
  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (catFilter !== 'all') params.category = catFilter;
      if (search.trim()) params.search = search.trim();
      const { data } = await marketplaceAPI.list(params);
      setProducts(asList(data.data ?? data));
    } catch (_) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Load Stores ───────────────────────────────────────────────── */
  const loadStores = async () => {
    setLoading(true);
    try {
      const { data } = await businessAPI.list();
      setBrowseBusinesses(asList(data.data ?? data));
    } catch (_) {
      setBrowseBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const openStore = async (id) => {
    setLoading(true);
    try {
      const { data } = await businessAPI.get(id);
      setActiveStore(data.data ?? data);
    } catch (_) {
      dispatch(showToast({ message: 'Could not open this business', severity: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const closeStore = () => setActiveStore(null);

  const clearSearch = () => {
    setSearch('');
    searchRef.current?.focus();
  };

  const loadBusinesses = async () => {
    try {
      const { data } = await businessAPI.mine();
      setBusinesses(asList(data.data ?? data));
    } catch (_) {
      setBusinesses([]);
    }
  };

  const loadListings = async () => {
    setLoading(true);
    try {
      const { data } = await marketplaceAPI.mine();
      setListings(asList(data.data ?? data));
    } catch (_) {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data } = await marketplaceAPI.myOrders();
      setOrders(asList(data.data ?? data));
    } catch (_) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBusinesses(); }, []);

  useEffect(() => {
    if (tab === 'browse') {
      setActiveStore(null);
      loadProducts();
      loadStores();
    } else if (tab === 'businesses') {
      loadBusinesses();
    } else if (tab === 'listings') {
      loadListings();
    } else {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== 'browse') return;
    const t = setTimeout(() => {
      loadProducts();
      if (browseView === 'stores') loadStores();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catFilter, search, browseView]);

  /* ── Filtered and Sorted Products ──────────────────────────────── */
  const displayProducts = useMemo(() => {
    let list = [...products];
    if (catFilter !== 'all') {
      list = list.filter((p) => p.category === catFilter);
    }
    if (sortBy === 'price_asc') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      // newest
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [products, catFilter, sortBy]);

  const visibleBrowseBusinesses = useMemo(() => {
    let list = [...browseBusinesses];
    if (catFilter !== 'all') {
      list = list.filter((b) => (b.categories || []).includes(catFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((b) => b.name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q) || b.apartment?.toLowerCase().includes(q));
    }
    return list;
  }, [browseBusinesses, catFilter, search]);

  /* ── Business Form Operations ──────────────────────────────────── */
  const fetchApartment = async () => {
    try {
      const { data } = await api.get('/residents/profile');
      const apartment = unitLabel((data.data ?? data)?.unit) || '';
      return apartment === '-' ? '' : apartment;
    } catch (_) { return ''; }
  };

  const openCreateBusiness = async () => {
    const apartment = await fetchApartment();
    setBusinessForm({ ...emptyBusinessForm, apartment, contactPhone: user?.phone || '' });
    setBusinessLogo([]);
    setEditingBusiness(null);
    setBusinessOpen(true);
  };

  const openEditBusiness = (business) => {
    setBusinessForm({
      name: business.name,
      description: business.description || '',
      apartment: business.apartment,
      contactPhone: business.contactPhone || '',
    });
    setBusinessLogo([]);
    setEditingBusiness(business);
    setBusinessOpen(true);
  };

  const submitBusiness = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(businessForm).forEach(([k, v]) => fd.append(k, v));
    if (businessLogo[0]) fd.append('logo', businessLogo[0]);
    try {
      if (editingBusiness) {
        await businessAPI.update(editingBusiness._id, fd);
        dispatch(showToast({ message: 'Storefront updated successfully' }));
      } else {
        await businessAPI.create(fd);
        dispatch(showToast({ message: 'Storefront created! Now list your first product.' }));
      }
      setBusinessOpen(false);
      loadBusinesses();
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not save storefront', severity: 'error' }));
    }
  };

  const removeBusiness = async (business) => {
    if (!window.confirm(`Are you sure you want to remove ${business.name}?`)) return;
    try {
      await businessAPI.remove(business._id);
      setBusinesses((prev) => prev.filter((b) => b._id !== business._id));
      dispatch(showToast({ message: 'Storefront removed' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not remove storefront', severity: 'error' }));
    }
  };

  /* ── Product Create / Order Operations ─────────────────────────── */
  const openCreate = async (overrides = {}) => {
    if (!businesses.length) {
      dispatch(showToast({ message: 'Create a storefront first, then list products under it.' }));
      openCreateBusiness();
      return;
    }
    setForm({ ...emptyForm, business: businesses[0]._id, ...overrides });
    setImages([]);
    setVoiceFilled(false);
    setCreateOpen(true);
  };

  useEffect(() => {
    const prefill = location.state?.voicePrefill;
    if (prefill?.type !== 'marketplace') return;
    navigate(location.pathname, { replace: true, state: null });
    (async () => {
      await openCreate({ category: prefill.category || 'food', title: prefill.title || '', price: prefill.price || '' });
      setVoiceFilled(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const create = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    images.forEach((file) => fd.append('images', file));
    try {
      await marketplaceAPI.create(fd);
      setCreateOpen(false);
      dispatch(showToast({ message: 'Your product is now live for your neighbours!' }));
      setTab('listings');
      loadListings();
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not list product', severity: 'error' }));
    }
  };

  const startOrder = (product) => {
    setOrderTarget(product);
    setOrderQuantity(1);
    setOrderNote('');
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    try {
      const { data: res } = await marketplaceAPI.order(orderTarget._id, {
        quantity: Number(orderQuantity) || 1,
        note: orderNote,
      });
      const placedOrder = res.data ?? res;
      setOrderSuccess({
        order: placedOrder,
        product: orderTarget,
        quantity: Number(orderQuantity) || 1,
        note: orderNote,
      });
      setOrderTarget(null);
      setQuickViewProduct(null);
      dispatch(showToast({ message: 'Order placed! Seller notified.' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Order could not be placed', severity: 'error' }));
    }
  };

  const toggleAvailable = async (product) => {
    try {
      const { data } = await marketplaceAPI.update(product._id, { available: !product.available });
      const updated = data.data ?? data;
      setListings((prev) => prev.map((p) => (p._id === product._id ? { ...p, available: updated.available } : p)));
      dispatch(showToast({ message: updated.available ? 'Product is now visible' : 'Product is hidden' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not update listing', severity: 'error' }));
    }
  };

  const removeListing = async (product) => {
    if (!window.confirm(`Delete "${product.title}"?`)) return;
    try {
      await marketplaceAPI.remove(product._id);
      setListings((prev) => prev.filter((p) => p._id !== product._id));
      dispatch(showToast({ message: 'Listing removed' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not remove listing', severity: 'error' }));
    }
  };

  const setOrderState = async (product, order, status) => {
    try {
      await marketplaceAPI.updateOrder(product._id, order._id, { status });
      setListings((prev) => prev.map((p) => (p._id === product._id
        ? { ...p, orders: p.orders.map((o) => (o._id === order._id ? { ...o, status } : o)) }
        : p)));
      dispatch(showToast({ message: `Order marked as ${status}` }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not update order', severity: 'error' }));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Community marketplace"
        title="Neighbourhood Hub"
        description="Buy & sell home-made food, bakes, and goods directly with your verified neighbours."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openCreateBusiness} className="btn-secondary !px-4 text-xs sm:text-sm">
              <Building2 size={16} /> Open Store
            </button>
            <button onClick={() => openCreate()} className="btn-primary !px-4 text-xs sm:text-sm shadow-md shadow-brand-600/20">
              <Plus size={17} /> Sell an Item
            </button>
          </div>
        }
      />

      {/* ── Community Welcome Banner ──────────────────────────────── */}
      <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-earth-800 to-amber-900 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-amber-200">
              <Sparkles size={13} /> Fresh from your building
            </div>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Home-cooked food
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-amber-100/90 max-w-xl">
              Zero delivery fees, instant neighbour-to-neighbour handovers, and 100% verified community sellers.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur-md">
              <div className="font-display text-xl font-extrabold text-amber-300">{products.length}</div>
              <div className="text-[11px] font-semibold text-white/80">Active Items</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur-md">
              <div className="font-display text-xl font-extrabold text-amber-300">{browseBusinesses.length}</div>
              <div className="text-[11px] font-semibold text-white/80">Neighbour Stores</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Toolbar: Navigation Tabs & Search ──────────────── */}
      <div className="sticky top-16 z-20 -mx-3 mb-6 border-b border-earth-200 bg-white/95 px-3 py-3 backdrop-blur-md dark:border-earth-700 dark:bg-earth-900/95 md:top-20 md:-mx-8 md:px-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === value
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                  : 'bg-earth-100 text-earth-700 hover:bg-earth-200 dark:bg-earth-800 dark:text-earth-100 dark:hover:bg-earth-700'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Browse Controls (Only in Browse tab) */}
        {tab === 'browse' && !activeStore && (
          <div className="mt-3 space-y-3">
            {/* View Switcher: Products vs Stores */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center rounded-xl bg-earth-100 p-1 dark:bg-earth-800">
                <button
                  onClick={() => setBrowseView('products')}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                    browseView === 'products'
                      ? 'bg-white text-brand-700 shadow-sm dark:bg-earth-900 dark:text-white'
                      : 'text-slate-600 hover:text-ink dark:text-slate-300'
                  }`}
                >
                  <Package size={14} /> Browse All Items ({products.length})
                </button>
                <button
                  onClick={() => setBrowseView('stores')}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                    browseView === 'stores'
                      ? 'bg-white text-brand-700 shadow-sm dark:bg-earth-900 dark:text-white'
                      : 'text-slate-600 hover:text-ink dark:text-slate-300'
                  }`}
                >
                  <Store size={14} /> Neighbour Stores ({browseBusinesses.length})
                </button>
              </div>

              {/* Sort selector for products */}
              {browseView === 'products' && (
                <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                  <span className="font-bold text-slate-500 flex items-center gap-1">
                    <SlidersHorizontal size={13} /> Sort:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="field !py-1 !text-xs !rounded-lg !w-auto font-semibold"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>
              )}
            </div>

            {/* Search Input & Category Pills */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={browseView === 'products' ? 'Search dishes, pastries, paintings, bakes…' : 'Search stores, resident names, apartments…'}
                  className="field !pl-9 !pr-9"
                />
                {search && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-earth-400 hover:text-earth-700 dark:hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Category Filters */}
              <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  onClick={() => setCatFilter('all')}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    catFilter === 'all'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-earth-100 text-earth-700 hover:bg-earth-200 dark:bg-earth-800 dark:text-earth-100'
                  }`}
                >
                  All Categories
                </button>
                {CATEGORIES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setCatFilter(value)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      catFilter === value
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-earth-100 text-earth-700 hover:bg-earth-200 dark:bg-earth-800 dark:text-earth-100'
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BROWSE TAB VIEW ───────────────────────────────────────── */}
      {tab === 'browse' && (
        <>
          {/* Active Storefront Detail View */}
          {activeStore ? (
            <div className="space-y-6">
              <button
                onClick={closeStore}
                className="inline-flex items-center gap-2 rounded-xl border border-earth-200 bg-white px-4 py-2 text-sm font-bold text-brand-600 shadow-sm transition hover:bg-brand-50 dark:border-earth-700 dark:bg-earth-900 dark:text-brand-300"
              >
                <ArrowLeft size={16} /> Back to All Marketplace
              </button>

              {/* Store Hero Banner */}
              <div className="overflow-hidden rounded-3xl border border-earth-200 bg-white shadow-sm dark:border-earth-700 dark:bg-earth-900">
                <div className="h-32 bg-gradient-to-r from-brand-600/30 via-amber-500/20 to-indigo-600/30 dark:from-brand-900/50 dark:to-indigo-900/50" />
                <div className="relative px-6 pb-6">
                  <div className="relative -mt-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                    <div className="flex items-end gap-4">
                      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white text-brand-600 shadow-lg dark:border-earth-900 dark:bg-earth-800">
                        {activeStore.business.logo ? (
                          <img src={uploadUrl(activeStore.business.logo)} alt={activeStore.business.name} className="h-full w-full object-cover" />
                        ) : (
                          <Building2 size={36} />
                        )}
                      </div>
                      <div className="pb-1">
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-2xl font-extrabold text-ink dark:text-earth-50">
                            {activeStore.business.name}
                          </h2>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Verified Seller
                          </span>
                        </div>
                        {activeStore.business.description && (
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                            {activeStore.business.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                            <MapPin size={13} className="text-brand-600" /> Apt {activeStore.business.apartment}
                          </span>
                          {activeStore.business.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {activeStore.business.contactPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Seller Button */}
                    {activeStore.business.contactPhone && (
                      <a
                        href={`https://wa.me/91${activeStore.business.contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${activeStore.business.name}! I saw your storefront on Panchayat Marketplace.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary !px-4 !py-2 text-xs font-bold"
                      >
                        <MessageCircle size={15} className="text-emerald-600" /> Chat on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Store Products */}
              <div>
                <h3 className="mb-4 font-display text-lg font-bold text-ink dark:text-earth-100">
                  Products by {activeStore.business.name} ({activeStore.products?.length || 0})
                </h3>

                {loading ? (
                  <div className="card p-12 text-center text-sm text-slate-500">Loading products…</div>
                ) : !activeStore.products?.length ? (
                  <EmptyState icon={Package} title="No products yet" subtitle="This business has not listed any items currently." />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {activeStore.products.map((product) => {
                      const ownStore = activeStore.business.owner?._id === user?.id || activeStore.business.owner === user?.id;
                      return (
                        <ProductCard
                          key={product._id}
                          product={{ ...product, business: activeStore.business }}
                          user={ownStore ? { id: product.seller } : user}
                          isLiked={wishlist.includes(product._id)}
                          onToggleLike={toggleWishlist}
                          onOrder={() => startOrder({ ...product, business: activeStore.business })}
                          onQuickView={() => setQuickViewProduct({ ...product, business: activeStore.business })}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : browseView === 'products' ? (
            /* Products Grid View */
            loading ? (
              <div className="card p-14 text-center text-sm text-slate-500">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                Loading community products…
              </div>
            ) : !displayProducts.length ? (
              <EmptyState
                icon={Package}
                title="No items found"
                subtitle={search ? `No products match "${search}". Try searching for something else.` : 'Be the first resident to list an item or food dish!'}
                action={
                  <button onClick={() => openCreate()} className="btn-primary mt-5 !px-5">
                    <Plus size={16} /> List your first product
                  </button>
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    user={user}
                    isLiked={wishlist.includes(product._id)}
                    onToggleLike={toggleWishlist}
                    onOrder={() => startOrder(product)}
                    onQuickView={() => setQuickViewProduct(product)}
                  />
                ))}
              </div>
            )
          ) : (
            /* Storefronts Grid View */
            loading ? (
              <div className="card p-14 text-center text-sm text-slate-500">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                Loading resident stores…
              </div>
            ) : !visibleBrowseBusinesses.length ? (
              <EmptyState
                icon={Store}
                title="No stores found"
                subtitle="Open your own neighbourhood storefront and start selling to residents."
                action={
                  <button onClick={openCreateBusiness} className="btn-primary mt-5 !px-5">
                    <Plus size={16} /> Open a Store
                  </button>
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleBrowseBusinesses.map((business) => (
                  <StoreCard key={business._id} business={business} onClick={() => openStore(business._id)} />
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* ── MY BUSINESSES TAB ─────────────────────────────────────── */}
      {tab === 'businesses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Your Storefronts</h2>
              <p className="text-xs text-slate-500">Manage your business profiles, contact information, and listings.</p>
            </div>
            <button onClick={openCreateBusiness} className="btn-primary !px-4 text-sm shadow-sm">
              <Plus size={16} /> New Store
            </button>
          </div>

          {!businesses.length ? (
            <EmptyState
              icon={Building2}
              title="No storefronts created yet"
              subtitle="Create your store once, and list all your home-cooked foods or items under it."
              action={
                <button onClick={openCreateBusiness} className="btn-primary mt-5 !px-5">
                  <Plus size={16} /> Create your first store
                </button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {businesses.map((business) => (
                <article key={business._id} className="card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start gap-4">
                      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-earth-100 text-brand-600 shadow-sm ring-1 ring-earth-200 dark:bg-earth-800">
                        {business.logo ? (
                          <img src={uploadUrl(business.logo)} alt={business.name} className="h-full w-full object-cover" />
                        ) : (
                          <Building2 size={28} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display text-xl font-bold text-ink dark:text-white truncate">
                            {business.name}
                          </h3>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">
                            Active
                          </span>
                        </div>
                        {business.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {business.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                            <MapPin size={12} /> Apt {business.apartment}
                          </span>
                          {business.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {business.contactPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-earth-100 pt-4 dark:border-earth-800">
                    <button
                      onClick={() => openCreate({ business: business._id })}
                      className="btn-primary !px-3.5 !py-2 text-xs font-bold"
                    >
                      <Plus size={14} /> Add Product
                    </button>
                    <button
                      onClick={() => openStore(business._id)}
                      className="btn-secondary !px-3.5 !py-2 text-xs font-bold"
                    >
                      <Eye size={14} /> View Store
                    </button>
                    <button
                      onClick={() => openEditBusiness(business)}
                      className="btn-secondary !px-3 !py-2 text-xs font-bold"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => removeBusiness(business)}
                      className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400"
                      title="Delete Store"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MY LISTINGS TAB ───────────────────────────────────────── */}
      {tab === 'listings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Your Products & Orders</h2>
              <p className="text-xs text-slate-500">Manage item inventory, toggle availability, and track incoming buyer orders.</p>
            </div>
            <button onClick={() => openCreate()} className="btn-primary !px-4 text-sm shadow-sm">
              <Plus size={16} /> New Product
            </button>
          </div>

          {loading ? (
            <div className="card p-12 text-center text-sm text-slate-500">Loading your listings…</div>
          ) : !listings.length ? (
            <EmptyState
              icon={ShoppingBag}
              title="You haven't listed any products"
              subtitle="Share your cooking, baking, paintings or products with fellow residents."
              action={
                <button onClick={() => openCreate()} className="btn-primary mt-5 !px-5">
                  <Plus size={16} /> Sell a product
                </button>
              }
            />
          ) : (
            <div className="grid gap-5">
              {listings.map((product) => {
                const Meta = catMeta(product.category);
                const allOrders = product.orders || [];
                const activeOrders = allOrders.filter((o) => o.status !== 'cancelled' && o.status !== 'completed');

                return (
                  <article key={product._id} className="card p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-earth-100 text-brand-600 shadow-sm dark:bg-earth-800">
                          {product.images?.length ? (
                            <img src={uploadUrl(product.images[0])} alt={product.title} className="h-full w-full object-cover" />
                          ) : (
                            <Meta.icon size={26} />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-bold text-ink dark:text-white">
                              {product.title}
                            </h3>
                            <span className="inline-flex items-center gap-1 rounded-full bg-earth-100 px-2.5 py-0.5 text-xs font-bold text-earth-700 dark:bg-earth-800 dark:text-earth-200">
                              <Meta.icon size={12} /> {product.category}
                            </span>
                            <span className={product.available ? 'inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500'}>
                              {product.available ? 'Available' : 'Paused / Sold out'}
                            </span>
                          </div>
                          <div className="mt-1 font-display text-base font-extrabold text-brand-600 dark:text-brand-400">
                            {currency(product.price)}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{product.business?.name}</span>
                            <span>•</span>
                            <span>Apt {product.business?.apartment}</span>
                          </div>
                        </div>
                      </div>

                      {/* Listing Actions */}
                      <div className="flex items-center gap-2 self-start">
                        <button
                          onClick={() => toggleAvailable(product)}
                          className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                            product.available
                              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-earth-800 dark:text-slate-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {product.available ? 'Pause sales' : 'Resume sales'}
                        </button>
                        <button
                          onClick={() => removeListing(product)}
                          className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400"
                          title="Delete Listing"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Received Orders from Neighbours */}
                    {allOrders.length > 0 && (
                      <div className="mt-5 border-t border-earth-100 pt-4 dark:border-earth-800">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Buyer Orders ({activeOrders.length} active, {allOrders.length} total)
                          </span>
                        </div>
                        <div className="space-y-2">
                          {allOrders.map((order) => (
                            <div
                              key={order._id}
                              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl p-3 text-xs transition ${
                                order.status === 'placed'
                                  ? 'bg-amber-50/70 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40'
                                  : 'bg-earth-50 border border-earth-200/60 dark:bg-earth-800/40 dark:border-earth-700/50'
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-bold text-ink dark:text-white">
                                  {order.buyer?.name || 'Resident Buyer'}
                                </span>
                                <span className="rounded-md bg-white dark:bg-earth-700 px-2 py-0.5 font-bold text-brand-600">
                                  Qty: {order.quantity} · {currency(product.price * order.quantity)}
                                </span>
                                {order.note && (
                                  <span className="italic text-slate-500">
                                    "{order.note}"
                                  </span>
                                )}
                                <span className={statusPill(order.status)}>{order.status}</span>
                              </div>

                              {/* Order Workflow Actions */}
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {order.buyer?.phone && (
                                  <a
                                    href={`tel:${order.buyer.phone}`}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-brand-600 dark:border-slate-700 dark:bg-earth-800"
                                  >
                                    Call Buyer
                                  </a>
                                )}
                                {order.status === 'placed' && (
                                  <button
                                    onClick={() => setOrderState(product, order, 'confirmed')}
                                    className="rounded-lg bg-blue-600 px-3 py-1 font-bold text-white hover:bg-blue-700"
                                  >
                                    Confirm
                                  </button>
                                )}
                                {order.status !== 'completed' && order.status !== 'cancelled' && (
                                  <button
                                    onClick={() => setOrderState(product, order, 'completed')}
                                    className="rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700"
                                  >
                                    Handover Complete
                                  </button>
                                )}
                                {order.status === 'placed' && (
                                  <button
                                    onClick={() => setOrderState(product, order, 'cancelled')}
                                    className="rounded-lg border border-red-200 px-2.5 py-1 font-bold text-red-600 hover:bg-red-50"
                                  >
                                    Decline
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MY ORDERS TAB (Buyer View) ────────────────────────────── */}
      {tab === 'orders' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold">Your Orders</h2>
            <p className="text-xs text-slate-500">Track orders you placed from neighbour businesses and coordinate pickups.</p>
          </div>

          {loading ? (
            <div className="card p-12 text-center text-sm text-slate-500">Loading your orders…</div>
          ) : !orders.length ? (
            <EmptyState
              icon={ShoppingCart}
              title="No orders placed yet"
              subtitle="Browse the community marketplace to find fresh home cooking or lovely items."
              action={
                <button onClick={() => setTab('browse')} className="btn-primary mt-5 !px-5">
                  <Store size={16} /> Explore Marketplace
                </button>
              }
            />
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => {
                const Meta = catMeta(order.product?.category);
                const isCompleted = order.status === 'completed';
                const isConfirmed = order.status === 'confirmed';
                const isCancelled = order.status === 'cancelled';

                return (
                  <article key={order._id} className="card p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-earth-100 text-brand-600 dark:bg-earth-800">
                          {order.product?.images?.length ? (
                            <img src={uploadUrl(order.product.images[0])} alt={order.product.title} className="h-full w-full object-cover" />
                          ) : (
                            <Meta.icon size={28} />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-base font-bold text-ink dark:text-white">
                              {order.product?.title || 'Community Item'}
                            </h3>
                            <span className={statusPill(order.status)}>{order.status}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Quantity: <span className="font-bold text-ink dark:text-white">{order.quantity}</span> · Total:{' '}
                            <span className="font-display font-black text-brand-600 dark:text-brand-400">
                              {currency((order.product?.price || 0) * order.quantity)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                            <span>From: <strong className="text-slate-700 dark:text-slate-200">{order.product?.business?.name || 'Seller'}</strong></span>
                            <span>•</span>
                            <span className="font-semibold text-brand-600 dark:text-brand-400">
                              <MapPin size={11} className="inline mr-0.5" /> Apt {order.product?.business?.apartment || '-'}
                            </span>
                          </div>
                          {order.note && (
                            <div className="mt-2 text-xs italic text-slate-400">
                              Your note: "{order.note}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress / Contact Actions */}
                      <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                        <span className="text-[11px] text-slate-400">
                          Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </span>
                        {order.product?.business?.contactPhone && (
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/91${order.product.business.contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I placed order #${order._id.slice(-4)} for ${order.product.title} on Panchayat.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            >
                              <MessageCircle size={13} /> WhatsApp Seller
                            </a>
                            <a
                              href={`tel:${order.product.business.contactPhone}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-brand-600 dark:border-slate-700 dark:bg-earth-800"
                            >
                              <Phone size={13} /> Call
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Step Bar */}
                    <div className="mt-4 border-t border-earth-100 pt-3 dark:border-earth-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span className={order.status ? 'text-brand-600 font-extrabold' : ''}>1. Order Placed ✓</span>
                        <span className={isConfirmed || isCompleted ? 'text-blue-600 font-extrabold' : ''}>2. Confirmed by Seller</span>
                        <span className={isCompleted ? 'text-emerald-600 font-extrabold' : ''}>3. Handover / Completed</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-earth-100 dark:bg-earth-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCancelled
                              ? 'w-full bg-red-500'
                              : isCompleted
                              ? 'w-full bg-emerald-500'
                              : isConfirmed
                              ? 'w-2/3 bg-blue-500'
                              : 'w-1/3 bg-brand-500'
                          }`}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── QUICK VIEW PRODUCT MODAL ──────────────────────────────── */}
      <Dialog
        open={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          className: '!rounded-3xl dark:!bg-earth-900 dark:!text-earth-50 !bg-white !text-earth-900 !shadow-2xl overflow-hidden',
        }}
      >
        <DialogContent className="!p-0">
          {quickViewProduct && (
            <div>
              {/* Product Cover Gallery */}
              <div className="relative h-60 w-full overflow-hidden bg-earth-100 dark:bg-earth-800">
                {productImage(quickViewProduct) ? (
                  <img
                    src={productImage(quickViewProduct)}
                    alt={quickViewProduct.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${catMeta(quickViewProduct.category).color} opacity-90`}>
                    <UtensilsCrossed size={56} className="text-white" />
                  </div>
                )}
                <button
                  onClick={() => setQuickViewProduct(null)}
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
                <span className="absolute left-4 bottom-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold capitalize text-earth-800 shadow-md backdrop-blur-md">
                  {quickViewProduct.category}
                </span>
              </div>

              {/* Product Information */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-extrabold text-ink dark:text-white">
                      {quickViewProduct.title}
                    </h2>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Listed under: <strong>{quickViewProduct.business?.name || 'Store'}</strong></span>
                      <span>•</span>
                      <span className="font-bold text-brand-600">Apt {quickViewProduct.business?.apartment}</span>
                    </div>
                  </div>
                  <div className="font-display text-2xl font-black text-brand-600 dark:text-brand-400">
                    {currency(quickViewProduct.price)}
                  </div>
                </div>

                {quickViewProduct.description && (
                  <div className="mt-4 border-t border-earth-100 pt-4 dark:border-earth-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</span>
                    <p className="mt-1.5 text-sm leading-relaxed text-earth-700 dark:text-earth-200 whitespace-pre-wrap">
                      {quickViewProduct.description}
                    </p>
                  </div>
                )}

                {/* Seller & Pickup info card */}
                <div className="mt-5 rounded-2xl border border-earth-200 bg-earth-50 p-4 dark:border-earth-800 dark:bg-earth-800/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-600 font-bold">
                        <Store size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink dark:text-white">{quickViewProduct.business?.name}</div>
                        <div className="text-[11px] text-slate-500">Handover at Apt {quickViewProduct.business?.apartment}</div>
                      </div>
                    </div>

                    {quickViewProduct.business?.contactPhone && (
                      <a
                        href={`https://wa.me/91${quickViewProduct.business.contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I'm interested in ordering ${quickViewProduct.title} on Panchayat.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => {
                      const prod = quickViewProduct;
                      setQuickViewProduct(null);
                      startOrder(prod);
                    }}
                    disabled={!quickViewProduct.available}
                    className="btn-primary flex-1 !py-3 text-sm shadow-lg shadow-brand-600/20"
                  >
                    <ShoppingCart size={17} /> Proceed to Order
                  </button>
                  <button
                    onClick={() => setQuickViewProduct(null)}
                    className="btn-secondary !py-3 px-5 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── ORDER PLACEMENT MODAL ──────────────────────────────────── */}
      <Dialog
        open={Boolean(orderTarget)}
        onClose={() => setOrderTarget(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          className: '!rounded-3xl dark:!bg-earth-900 dark:!text-earth-50 !bg-white !text-earth-900 !shadow-2xl overflow-hidden',
        }}
      >
        <DialogContent className="!p-0">
          {orderTarget && (
            <div>
              {/* Product Header */}
              <div className="relative h-32 w-full overflow-hidden bg-earth-100 dark:bg-earth-800">
                {productImage(orderTarget) ? (
                  <img src={productImage(orderTarget)} alt={orderTarget.title} className="h-full w-full object-cover" />
                ) : (
                  <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${catMeta(orderTarget.category).color} opacity-85`}>
                    <UtensilsCrossed size={36} className="text-white" />
                  </div>
                )}
                <button
                  onClick={() => setOrderTarget(null)}
                  className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-6">
                <div className="eyebrow">Neighbour Order</div>
                <h2 className="mt-1 font-display text-xl font-extrabold text-ink dark:text-white">
                  {orderTarget.title}
                </h2>

                {/* Price & Unit Details */}
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-earth-100/70 p-3.5 dark:bg-earth-800/60">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-earth-500">Price per unit</span>
                    <span className="font-display text-xl font-black text-brand-600 dark:text-brand-400">
                      {currency(orderTarget.price || 0)}
                    </span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="block font-bold text-ink dark:text-white">{orderTarget.business?.name || 'Neighbour'}</span>
                    <span className="text-slate-500">Apt {orderTarget.business?.apartment || 'Community'}</span>
                  </div>
                </div>

                <form onSubmit={submitOrder} className="mt-5 space-y-4">
                  {/* Quantity Counter with + and - */}
                  <div>
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Select Quantity
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-earth-300 bg-white font-bold text-earth-700 hover:bg-earth-100 active:scale-95 dark:border-earth-700 dark:bg-earth-800 dark:text-white"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                        className="field !h-10 !w-20 text-center font-display text-base font-extrabold"
                      />
                      <button
                        type="button"
                        onClick={() => setOrderQuantity(Math.min(99, orderQuantity + 1))}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-earth-300 bg-white font-bold text-earth-700 hover:bg-earth-100 active:scale-95 dark:border-earth-700 dark:bg-earth-800 dark:text-white"
                      >
                        <Plus size={16} />
                      </button>
                      <span className="text-xs text-slate-400">
                        ({orderQuantity} × {currency(orderTarget.price || 0)})
                      </span>
                    </div>
                  </div>

                  {/* Note to Seller */}
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Note to Seller (Optional)
                    </span>
                    <textarea
                      rows="2"
                      className="field !text-xs"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="e.g. Please make it mild spicy, pickup at 6 PM"
                    />
                  </label>

                  {/* Live Total Calculation */}
                  <div className="rounded-2xl border border-earth-200 bg-earth-50/80 p-3.5 dark:border-earth-700 dark:bg-earth-800/40">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Item total</span>
                      <span>{currency((orderTarget.price || 0) * orderQuantity)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span>Delivery / Pickup</span>
                      <span className="font-bold text-emerald-600">FREE (Resident Handover)</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-earth-200/80 pt-2 font-bold dark:border-earth-700">
                      <span className="text-sm">Total Payable</span>
                      <span className="font-display text-xl font-black text-brand-600 dark:text-brand-400">
                        {currency((orderTarget.price || 0) * orderQuantity)}
                      </span>
                    </div>
                  </div>

                  {/* Pickup notice */}
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
                    <MapPin size={15} className="shrink-0 text-amber-600" />
                    <span>Pay at pickup directly from Apt {orderTarget.business?.apartment}</span>
                  </div>

                  <button className="btn-primary w-full !py-3 text-sm font-bold shadow-lg shadow-brand-600/25">
                    <CheckCircle2 size={17} /> Confirm Order ({currency((orderTarget.price || 0) * orderQuantity)})
                  </button>
                </form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── ORDER SUCCESS CELEBRATION MODAL ───────────────────────── */}
      <Dialog
        open={Boolean(orderSuccess)}
        onClose={() => setOrderSuccess(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          className: '!rounded-3xl dark:!bg-earth-900 dark:!text-earth-50 !bg-white !text-earth-900 !shadow-2xl text-center p-7',
        }}
      >
        <DialogContent className="!p-0">
          {orderSuccess && (
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="mt-4 font-display text-2xl font-extrabold text-ink dark:text-white">
                Order Placed! 🎉
              </h2>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Your order for <strong>{orderSuccess.quantity} × {orderSuccess.product.title}</strong> has been sent to {orderSuccess.product.business?.name}.
              </p>

              <div className="mt-5 rounded-2xl bg-earth-50 p-4 text-xs dark:bg-earth-800/40 border border-earth-200 dark:border-earth-700">
                <div className="font-bold text-ink dark:text-white">Handover Location</div>
                <div className="mt-0.5 text-brand-600 font-semibold">
                  Apt {orderSuccess.product.business?.apartment}
                </div>
                <div className="mt-2 text-slate-400">
                  Total: {currency((orderSuccess.product.price || 0) * orderSuccess.quantity)} · Pay upon pickup
                </div>
              </div>

              {orderSuccess.product.business?.contactPhone && (
                <a
                  href={`https://wa.me/91${orderSuccess.product.business.contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${orderSuccess.product.business.name}! I just ordered ${orderSuccess.quantity} × "${orderSuccess.product.title}" on Panchayat. Please let me know when it's ready!`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
                >
                  <MessageCircle size={15} /> Message Seller on WhatsApp
                </a>
              )}

              <button
                onClick={() => {
                  setOrderSuccess(null);
                  setTab('orders');
                }}
                className="btn-secondary mt-3 w-full !py-2.5 text-xs font-bold"
              >
                View in My Orders
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── CREATE / EDIT BUSINESS MODAL ──────────────────────────── */}
      <Dialog open={businessOpen} onClose={() => setBusinessOpen(false)} fullWidth maxWidth="sm">
        <DialogContent className="!p-7">
          <div className="eyebrow">{editingBusiness ? 'Edit Storefront' : 'New Storefront'}</div>
          <h2 className="mt-1 font-display text-2xl font-extrabold">
            {editingBusiness ? editingBusiness.name : 'Open your community store'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Give your business a name and unit address — all your items will be listed under it.
          </p>

          <form onSubmit={submitBusiness} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Store name</span>
              <input
                className="field"
                required
                maxLength={120}
                value={businessForm.name}
                onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                placeholder="e.g. Priya's Kitchen, Kavita's Art Studio"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">Short description (Optional)</span>
              <textarea
                className="field"
                rows="2"
                value={businessForm.description}
                onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })}
                placeholder="e.g. Authentic South Indian breakfast, fresh cakes, art"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-sm font-bold">Apartment / Unit</span>
                <input
                  className="field"
                  required
                  value={businessForm.apartment}
                  onChange={(e) => setBusinessForm({ ...businessForm, apartment: e.target.value })}
                  placeholder="e.g. A-1203"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">Contact Phone (10 digits)</span>
                <input
                  className="field"
                  inputMode="tel"
                  maxLength={10}
                  value={businessForm.contactPhone}
                  onChange={(e) => setBusinessForm({ ...businessForm, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="e.g. 9876543210"
                />
              </label>
            </div>

            <ImageUploader
              images={businessLogo}
              setImages={(files) => setBusinessLogo(files.slice(-1))}
              hint="Upload an optional store logo or photo."
            />

            <button className="btn-primary w-full !py-3 text-sm font-bold shadow-md shadow-brand-600/20">
              <Building2 size={16} /> {editingBusiness ? 'Save changes' : 'Create Storefront'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── CREATE PRODUCT LISTING MODAL ──────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogContent className="!p-7">
          <div className="eyebrow">List a product</div>
          <h2 className="mt-1 font-display text-2xl font-extrabold">Sell to your neighbours</h2>
          <p className="mt-1 text-xs text-slate-500">
            Publish dishes or crafted items for verified community members.
          </p>

          <form onSubmit={create} className="mt-6 space-y-4">
            {businesses.length > 1 && (
              <label className="block">
                <span className="mb-2 block text-sm font-bold">Storefront</span>
                <select
                  className="field"
                  required
                  value={form.business}
                  onChange={(e) => setForm({ ...form, business: e.target.value })}
                >
                  {businesses.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </label>
            )}

            {/* Category selection */}
            <div>
              <span className="mb-2 block text-sm font-bold">Category</span>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, category: value })}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                      form.category === value
                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                        : 'border-earth-200 text-earth-600 hover:border-earth-300 dark:border-earth-700 dark:text-earth-300'
                    }`}
                  >
                    <Icon size={17} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">Product name</span>
              <input
                className="field"
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={form.category === 'food' ? 'e.g. Homemade Hyderabadi Dum Biryani' : 'e.g. Hand-painted Ceramic Vase'}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">Description</span>
              <textarea
                className="field"
                rows="3"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Details, ingredients, spice level, available portion size, materials…"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">Price (₹)</span>
              <input
                className="field"
                type="number"
                min="0"
                step="1"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 250"
              />
            </label>

            <ImageUploader
              images={images}
              setImages={setImages}
              highlight={voiceFilled}
              hint="A clear, appealing photo helps your item sell much faster."
            />

            <button className="btn-primary w-full !py-3 text-sm font-bold shadow-md shadow-brand-600/20">
              <Store size={16} /> Publish Listing
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
