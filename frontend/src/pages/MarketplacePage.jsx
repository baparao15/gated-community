import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import {
  ArrowLeft, Building2, CheckCircle2, MapPin, Package, Palette, Pencil,
  Plus, Search, ShoppingBag, ShoppingCart, Star, Store, Trash2, UtensilsCrossed, X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ImageUploader from '../components/ImageUploader';
import api from '../services/api';
import { marketplaceAPI } from '../services/marketplaceAPI';
import { businessAPI } from '../services/businessAPI';
import { showToast } from '../store/uiSlice';
import { asList, currency, unitLabel, uploadUrl } from '../utils/apiData';

const CATEGORIES = [
  { value: 'food', label: 'Food & Drinks', icon: UtensilsCrossed, color: 'from-orange-500 to-amber-500' },
  { value: 'art', label: 'Art & Crafts', icon: Palette, color: 'from-violet-500 to-purple-600' },
];
const catMeta = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES[0];

const emptyForm = { business: '', category: 'food', title: '', description: '', price: '' };
const emptyBusinessForm = { name: '', description: '', apartment: '', contactPhone: '' };

/* ── tab definition ──────────────────────────────────────────────── */
const TABS = [
  { value: 'browse', label: 'Browse', icon: Store },
  { value: 'businesses', label: 'My Businesses', icon: Building2 },
  { value: 'listings', label: 'My Listings', icon: ShoppingBag },
  { value: 'orders', label: 'My Orders', icon: ShoppingCart },
];

/* ── status pill helper ──────────────────────────────────────────── */
const statusPill = (status) => {
  const map = {
    placed: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-600',
  };
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${map[status] || 'bg-slate-100 text-slate-600'}`;
};

/* ── product image helper ────────────────────────────────────────── */
const productImage = (product) => (product?.images?.length ? uploadUrl(product.images[0]) : null);

/* ── product card ────────────────────────────────────────────────── */
function ProductCard({ product, user, onOrder }) {
  const Meta = catMeta(product.category);
  const img = productImage(product);
  const own = product.seller?._id === user?.id || product.seller === user?.id;
  return (
    <article className="group overflow-hidden rounded-2xl border border-earth-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-earth-700 dark:bg-earth-900">
      <div className="relative h-44 overflow-hidden bg-earth-100 dark:bg-earth-800">
        {img ? (
          <img src={img} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${Meta.color} opacity-80`}>
            <Meta.icon size={44} className="text-white drop-shadow" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold capitalize text-earth-800 shadow-sm backdrop-blur-sm">
          <Meta.icon size={12} /> {product.category}
        </span>
        {!product.available && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-white">Unavailable</span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold leading-snug text-ink dark:text-earth-50">{product.title}</h3>
          <span className="shrink-0 rounded-lg bg-brand-50 px-2.5 py-1 font-display text-base font-extrabold text-brand-600 dark:bg-brand-950/40">
            {currency(product.price)}
          </span>
        </div>
        {product.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{product.description}</p>
        )}
        {product.business && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Building2 size={12} /> <span className="font-semibold text-slate-500 truncate">{product.business?.name || 'Business'}</span>
            <span className="mx-0.5">·</span>
            <MapPin size={12} /> {product.business?.apartment || '-'}
          </div>
        )}
        <button
          onClick={onOrder}
          disabled={own || !product.available}
          className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {own ? 'Your listing' : !product.available ? 'Unavailable' : <><ShoppingCart size={14} className="inline mr-1.5" />Order now</>}
        </button>
      </div>
    </article>
  );
}

/* ── store card ──────────────────────────────────────────────────── */
function StoreCard({ business, onClick }) {
  return (
    <article
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-earth-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-earth-700 dark:bg-earth-900"
    >
      {/* cover strip */}
      <div className="relative h-24 overflow-hidden bg-gradient-to-br from-brand-500/20 to-indigo-500/20 dark:from-brand-900/40 dark:to-indigo-900/40">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #943D28 1px, transparent 0)', backgroundSize: '18px 18px' }} />
      </div>
      {/* logo + info */}
      <div className="relative px-5 pb-5">
        <div className="relative -mt-7 mb-3 flex items-end justify-between">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white bg-earth-100 text-brand-600 shadow-md dark:border-earth-900 dark:bg-earth-800">
            {business.logo ? (
              <img src={uploadUrl(business.logo)} alt={business.name} className="h-full w-full object-cover" />
            ) : (
              <Building2 size={26} />
            )}
          </div>
          <span className="rounded-full border border-earth-200 bg-white px-3 py-1 text-xs font-bold text-earth-600 shadow-sm dark:border-earth-700 dark:bg-earth-900 dark:text-earth-300">
            {business.productCount || 0} item{business.productCount === 1 ? '' : 's'}
          </span>
        </div>
        <h3 className="font-display text-base font-bold text-ink dark:text-earth-50">{business.name}</h3>
        {business.description && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{business.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={11} /> {business.apartment}</span>
          {business.categories?.map((c) => {
            const cat = catMeta(c);
            return (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-earth-100 px-2 py-0.5 text-[10px] font-bold capitalize text-earth-600 dark:bg-earth-800 dark:text-earth-300">
                <cat.icon size={10} /> {c}
              </span>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs font-bold text-brand-600">
          <span>View store →</span>
          <Star size={13} className="text-amber-400" />
        </div>
      </div>
    </article>
  );
}

/* ── empty state ─────────────────────────────────────────────────── */
function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-earth-300 bg-earth-50/50 px-6 py-16 text-center dark:border-earth-700 dark:bg-earth-900/30">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-earth-100 text-earth-400 dark:bg-earth-800">
        <Icon size={30} />
      </div>
      <div className="font-display text-base font-bold text-earth-700 dark:text-earth-200">{title}</div>
      {subtitle && <p className="mt-1.5 max-w-xs text-sm text-earth-500">{subtitle}</p>}
      {action}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
export default function MarketplacePage() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [tab, setTab] = useState('browse');
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [browseBusinesses, setBrowseBusinesses] = useState([]);
  const [activeStore, setActiveStore] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [voiceFilled, setVoiceFilled] = useState(false);
  const [orderTarget, setOrderTarget] = useState(null);
  const [orderForm, setOrderForm] = useState({ quantity: 1, note: '' });

  const [businessOpen, setBusinessOpen] = useState(false);
  const [businessForm, setBusinessForm] = useState(emptyBusinessForm);
  const [businessLogo, setBusinessLogo] = useState([]);
  const [editingBusiness, setEditingBusiness] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  /* ── data loaders ────────────────────────────────────────────── */
  const loadBrowse = async () => {
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

  /* Fixed: clearing search correctly resets back to store list */
  const updateSearch = (value) => {
    setActiveStore(null);
    setSearch(value);
    if (!value.trim()) loadStores();
  };

  const clearSearch = () => {
    setSearch('');
    setActiveStore(null);
    loadStores();
    searchRef.current?.focus();
  };

  const updateCatFilter = (value) => { setActiveStore(null); setCatFilter(value); };

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
      setSearch('');
      setCatFilter('all');
      loadStores();
    } else if (tab === 'businesses') loadBusinesses();
    else if (tab === 'listings') loadListings();
    else loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== 'browse') return;
    const t = setTimeout(() => {
      if (search.trim()) loadBrowse(); else loadStores();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catFilter, search]);

  const visibleBrowseBusinesses = catFilter === 'all'
    ? browseBusinesses
    : browseBusinesses.filter((b) => (b.categories || []).includes(catFilter));

  /* ── business form ───────────────────────────────────────────── */
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
    setBusinessForm({ name: business.name, description: business.description || '', apartment: business.apartment, contactPhone: business.contactPhone || '' });
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
        dispatch(showToast({ message: 'Business updated' }));
      } else {
        await businessAPI.create(fd);
        dispatch(showToast({ message: 'Business created! Now list your first product.' }));
      }
      setBusinessOpen(false);
      loadBusinesses();
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not save the business', severity: 'error' }));
    }
  };

  const removeBusiness = async (business) => {
    try {
      await businessAPI.remove(business._id);
      setBusinesses((prev) => prev.filter((b) => b._id !== business._id));
      dispatch(showToast({ message: 'Business removed' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not remove the business', severity: 'error' }));
    }
  };

  /* ── product form ────────────────────────────────────────────── */
  const openCreate = async (overrides = {}) => {
    if (!businesses.length) {
      dispatch(showToast({ message: 'Create a business first, then list products under it.' }));
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
      dispatch(showToast({ message: 'Your product is now live in the marketplace!' }));
      setTab('listings');
      loadListings();
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not list the product', severity: 'error' }));
    }
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    try {
      await marketplaceAPI.order(orderTarget._id, { quantity: Number(orderForm.quantity) || 1, note: orderForm.note });
      setOrderTarget(null);
      dispatch(showToast({ message: 'Order placed! The seller has been notified.' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Order could not be placed', severity: 'error' }));
    }
  };

  const toggleAvailable = async (product) => {
    try {
      const { data } = await marketplaceAPI.update(product._id, { available: !product.available });
      const updated = data.data ?? data;
      setListings((prev) => prev.map((p) => (p._id === product._id ? { ...p, available: updated.available } : p)));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not update the listing', severity: 'error' }));
    }
  };

  const removeListing = async (product) => {
    try {
      await marketplaceAPI.remove(product._id);
      setListings((prev) => prev.filter((p) => p._id !== product._id));
      dispatch(showToast({ message: 'Listing removed' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not remove the listing', severity: 'error' }));
    }
  };

  const setOrderState = async (product, order, status) => {
    try {
      await marketplaceAPI.updateOrder(product._id, order._id, { status });
      setListings((prev) => prev.map((p) => (p._id === product._id
        ? { ...p, orders: p.orders.map((o) => (o._id === order._id ? { ...o, status } : o)) }
        : p)));
      dispatch(showToast({ message: `Order ${status}` }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not update the order', severity: 'error' }));
    }
  };

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <>
      <PageHeader
        eyebrow="Neighbourhood marketplace"
        title="Community Marketplace"
        description="Open a business and sell home-made food or handcrafted art to your neighbours."
        action={<button onClick={() => openCreate()} className="btn-primary !px-4"><Plus size={18} /> Sell a product</button>}
      />

      {/* ── sticky toolbar: tabs + search ───────────────────────── */}
      <div className="sticky top-16 z-20 -mx-3 mb-6 border-b border-earth-200 bg-white/90 px-3 py-3 backdrop-blur-md dark:border-earth-700 dark:bg-earth-900/90 md:top-20 md:-mx-8 md:px-8">
        {/* tab row — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === value
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                  : 'bg-earth-100 text-earth-700 hover:bg-earth-200 dark:bg-earth-800 dark:text-earth-200 dark:hover:bg-earth-700'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* search + category row — only in browse tab */}
        {tab === 'browse' && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* search input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search for a dish or product…"
                className="field !pl-9 !pr-9"
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-earth-400 hover:text-earth-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {/* category pills */}
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => updateCatFilter('all')}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${catFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-earth-100 text-earth-700 dark:bg-earth-800 dark:text-earth-200'}`}
              >
                All
              </button>
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateCatFilter(value)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition ${catFilter === value ? 'bg-brand-600 text-white' : 'bg-earth-100 text-earth-700 dark:bg-earth-800 dark:text-earth-200'}`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Browse ───────────────────────────────────────────────── */}
      {tab === 'browse' && (
        <>
          {activeStore ? (
            <>
              <button onClick={closeStore} className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-earth-200 bg-white px-4 py-2 text-sm font-bold text-brand-600 shadow-sm hover:bg-brand-50 dark:border-earth-700 dark:bg-earth-900">
                <ArrowLeft size={16} /> Back to marketplace
              </button>
              {/* store hero */}
              <div className="mb-6 overflow-hidden rounded-2xl border border-earth-200 bg-white shadow-sm dark:border-earth-700 dark:bg-earth-900">
                <div className="h-28 bg-gradient-to-br from-brand-500/20 to-indigo-500/20 dark:from-brand-900/40 dark:to-indigo-900/40" />
                <div className="relative px-6 pb-6">
                  <div className="relative -mt-8 flex items-end gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-earth-100 text-brand-600 shadow-md dark:border-earth-900 dark:bg-earth-800">
                      {activeStore.business.logo ? (
                        <img src={uploadUrl(activeStore.business.logo)} alt={activeStore.business.name} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 size={28} />
                      )}
                    </div>
                    <div className="min-w-0 pb-1">
                      <h2 className="font-display text-xl font-extrabold">{activeStore.business.name}</h2>
                      {activeStore.business.description && <p className="text-sm text-slate-500">{activeStore.business.description}</p>}
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><MapPin size={12} /> Apartment {activeStore.business.apartment}</div>
                    </div>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="card p-10 text-center text-sm text-slate-500">Loading listings…</div>
              ) : !activeStore.products.length ? (
                <EmptyState icon={Package} title="No products yet" subtitle="This business hasn't listed any products yet." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeStore.products.map((product) => {
                    const ownStore = activeStore.business.owner?._id === user?.id || activeStore.business.owner === user?.id;
                    return (
                      <ProductCard
                        key={product._id}
                        product={product}
                        user={ownStore ? { id: product.seller } : user}
                        onOrder={() => { setOrderTarget({ ...product, business: activeStore.business }); setOrderForm({ quantity: 1, note: '' }); }}
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : search.trim() ? (
            loading ? (
              <div className="card p-10 text-center text-sm text-slate-500">Searching marketplace…</div>
            ) : !products.length ? (
              <EmptyState icon={Search} title="No results found" subtitle={`Nothing matched "${search}". Try a different word.`} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    user={user}
                    onOrder={() => { setOrderTarget(product); setOrderForm({ quantity: 1, note: '' }); }}
                  />
                ))}
              </div>
            )
          ) : (
            loading ? (
              <div className="card p-10 text-center text-sm text-slate-500">Loading businesses…</div>
            ) : !visibleBrowseBusinesses.length ? (
              <EmptyState
                icon={Store}
                title="No storefronts yet"
                subtitle="Be the first to open a business and sell to your community!"
                action={<button onClick={openCreateBusiness} className="btn-primary mt-5 !px-5"><Plus size={16} /> Open a business</button>}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleBrowseBusinesses.map((business) => (
                  <StoreCard key={business._id} business={business} onClick={() => openStore(business._id)} />
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* ── My businesses ─────────────────────────────────────────── */}
      {tab === 'businesses' && (
        <>
          <div className="mb-5 flex justify-end">
            <button onClick={openCreateBusiness} className="btn-secondary !px-4 text-sm"><Plus size={16} /> New business</button>
          </div>
          {!businesses.length ? (
            <EmptyState
              icon={Building2}
              title="No businesses yet"
              subtitle="Open your own storefront and start selling to your neighbours."
              action={<button onClick={openCreateBusiness} className="btn-primary mt-5 !px-5"><Plus size={16} /> Open a business</button>}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {businesses.map((business) => (
                <article key={business._id} className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-earth-100 text-brand-600 dark:bg-earth-800">
                      {business.logo ? <img src={uploadUrl(business.logo)} alt={business.name} className="h-full w-full object-cover" /> : <Building2 size={24} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-bold">{business.name}</h3>
                      {business.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{business.description}</p>}
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><MapPin size={12} /> Apartment {business.apartment}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => openCreate({ business: business._id })} className="btn-primary !px-3 !py-2 text-sm"><Plus size={15} /> Add product</button>
                    <button onClick={() => openEditBusiness(business)} className="btn-secondary !px-3 !py-2 text-sm"><Pencil size={15} /> Edit</button>
                    <button onClick={() => removeBusiness(business)} className="rounded-xl border-2 border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── My listings ───────────────────────────────────────────── */}
      {tab === 'listings' && (
        loading ? (
          <div className="card p-10 text-center text-sm text-slate-500">Loading your listings…</div>
        ) : !listings.length ? (
          <EmptyState icon={ShoppingBag} title="No listings yet" subtitle='Tap "Sell a product" to get started.' action={<button onClick={() => openCreate()} className="btn-primary mt-5 !px-5"><Plus size={16} /> Sell a product</button>} />
        ) : (
          <div className="grid gap-4">
            {listings.map((product) => {
              const Meta = catMeta(product.category);
              const activeOrders = (product.orders || []).filter((o) => o.status !== 'cancelled' && o.status !== 'completed');
              return (
                <article key={product._id} className="card p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                    <div className="flex gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-earth-100 text-brand-600 dark:bg-earth-800">
                        {product.images?.length ? <img src={uploadUrl(product.images[0])} alt={product.title} className="h-full w-full object-cover" /> : <Meta.icon size={24} />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg font-bold">{product.title}</h3>
                          <span className="inline-flex items-center gap-1 rounded-full bg-earth-100 px-2 py-0.5 text-xs font-bold capitalize text-earth-600 dark:bg-earth-800 dark:text-earth-200"><Meta.icon size={12} /> {product.category}</span>
                          <span className={product.available ? 'inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700' : 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500'}>{product.available ? 'Available' : 'Hidden'}</span>
                        </div>
                        <div className="mt-1 text-sm font-bold text-brand-600">{currency(product.price)}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><Building2 size={12} /> {product.business?.name} <span className="mx-1">•</span> <MapPin size={12} /> {product.business?.apartment}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-start gap-2">
                      <button onClick={() => toggleAvailable(product)} className="btn-secondary !px-4 !py-2 text-sm">{product.available ? 'Hide' : 'Show'}</button>
                      <button onClick={() => removeListing(product)} className="rounded-xl border-2 border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {!!activeOrders.length && (
                    <div className="mt-4 space-y-2 border-t border-earth-200 pt-4 dark:border-earth-700">
                      <div className="text-xs font-bold uppercase tracking-wide text-earth-500">Orders received</div>
                      {activeOrders.map((order) => (
                        <div key={order._id} className="flex flex-wrap items-center gap-2 rounded-xl bg-earth-50 px-3 py-2 text-sm dark:bg-earth-800/50">
                          <span className="font-bold">{order.buyer?.name || 'Resident'}</span>
                          <span className="text-slate-500">× {order.quantity}</span>
                          {order.note && <span className="text-xs text-slate-400">"{order.note}"</span>}
                          <span className={statusPill(order.status)}>{order.status}</span>
                          <div className="ml-auto flex gap-1.5">
                            {order.status === 'placed' && <button onClick={() => setOrderState(product, order, 'confirmed')} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white">Confirm</button>}
                            {order.status !== 'completed' && order.status !== 'cancelled' && <button onClick={() => setOrderState(product, order, 'completed')} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Complete</button>}
                            {order.status === 'placed' && <button onClick={() => setOrderState(product, order, 'cancelled')} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-600">Decline</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )
      )}

      {/* ── My orders ─────────────────────────────────────────────── */}
      {tab === 'orders' && (
        loading ? (
          <div className="card p-10 text-center text-sm text-slate-500">Loading your orders…</div>
        ) : !orders.length ? (
          <EmptyState icon={ShoppingCart} title="No orders yet" subtitle="Browse the marketplace to find something you like." action={<button onClick={() => setTab('browse')} className="btn-primary mt-5 !px-5"><Store size={16} /> Browse marketplace</button>} />
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => {
              const Meta = catMeta(order.product?.category);
              return (
                <article key={order._id} className="card flex items-center gap-4 p-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-earth-100 text-brand-600 dark:bg-earth-800">
                    {order.product?.images?.length ? <img src={uploadUrl(order.product.images[0])} alt={order.product.title} className="h-full w-full object-cover" /> : <Meta.icon size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{order.product?.title || 'Product'}</h3>
                      <span className={statusPill(order.status)}>{order.status}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      Qty {order.quantity} · {currency((order.product?.price || 0) * order.quantity)} · from {order.product?.business?.name || 'Business'} (Apt {order.product?.business?.apartment || '-'})
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {/* ── Create / edit business dialog ─────────────────────────── */}
      <Dialog open={businessOpen} onClose={() => setBusinessOpen(false)} fullWidth maxWidth="sm">
        <DialogContent className="!p-7">
          <div className="eyebrow">{editingBusiness ? 'Edit business' : 'New business'}</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold">{editingBusiness ? editingBusiness.name : 'Open your storefront'}</h2>
          <p className="mt-1 text-sm text-slate-500">Give your business a name — every product you list will appear under it.</p>
          <form onSubmit={submitBusiness} className="mt-6 space-y-4">
            <label><span className="mb-2 block text-sm font-bold">Business name</span><input className="field" required maxLength={120} value={businessForm.name} onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })} placeholder="e.g. Priya's Bakes" /></label>
            <label><span className="mb-2 block text-sm font-bold">Description (optional)</span><textarea className="field" rows="2" value={businessForm.description} onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })} placeholder="What do you sell?" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="mb-2 block text-sm font-bold">Apartment no.</span><input className="field" required value={businessForm.apartment} onChange={(e) => setBusinessForm({ ...businessForm, apartment: e.target.value })} placeholder="e.g. A-1203" /></label>
              <label><span className="mb-2 block text-sm font-bold">Contact phone (optional)</span><input className="field" value={businessForm.contactPhone} onChange={(e) => setBusinessForm({ ...businessForm, contactPhone: e.target.value })} placeholder="Buyers may call you" /></label>
            </div>
            <ImageUploader images={businessLogo} setImages={(files) => setBusinessLogo(files.slice(-1))} hint="Optional business logo." />
            <button className="btn-primary w-full"><Building2 size={16} /> {editingBusiness ? 'Save changes' : 'Create business'}</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Create listing dialog ──────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogContent className="!p-7">
          <div className="eyebrow">List a product</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold">Sell to your community</h2>
          <form onSubmit={create} className="mt-6 space-y-4">
            {businesses.length > 1 && (
              <label><span className="mb-2 block text-sm font-bold">Business</span>
                <select className="field" required value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })}>
                  {businesses.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(({ value, label, icon: Icon, color }) => (
                <button key={value} type="button" onClick={() => setForm({ ...form, category: value })}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${form.category === value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-earth-300 text-earth-500 hover:border-earth-400'}`}>
                  <Icon size={17} /> {label}
                </button>
              ))}
            </div>
            <label><span className="mb-2 block text-sm font-bold">Product name</span><input className="field" required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.category === 'food' ? 'e.g. Homemade veg biryani' : 'e.g. Hand-painted canvas'} /></label>
            <label><span className="mb-2 block text-sm font-bold">Description</span><textarea className="field" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ingredients, size, quantity available, etc." /></label>
            <label><span className="mb-2 block text-sm font-bold">Price (₹)</span><input className="field" type="number" min="0" step="1" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 250" /></label>
            <ImageUploader images={images} setImages={setImages} highlight={voiceFilled} hint="A bright, clear photo helps your product sell faster." />
            <button className="btn-primary w-full"><Store size={16} /> List product</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Order dialog ───────────────────────────────────────────── */}
      <Dialog open={!!orderTarget} onClose={() => setOrderTarget(null)} fullWidth maxWidth="xs">
        <DialogContent className="!p-0 overflow-hidden">
          {/* product image at top */}
          {productImage(orderTarget) && (
            <div className="h-40 w-full overflow-hidden">
              <img src={productImage(orderTarget)} alt={orderTarget?.title} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="p-7">
            <div className="eyebrow">Place an order</div>
            <h2 className="mt-2 font-display text-2xl font-extrabold">{orderTarget?.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{currency(orderTarget?.price || 0)} · {orderTarget?.business?.name} · Apt {orderTarget?.business?.apartment}</p>
            <form onSubmit={submitOrder} className="mt-6 space-y-4">
              <label><span className="mb-2 block text-sm font-bold">Quantity</span><input className="field" type="number" min="1" max="99" required value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} /></label>
              <label><span className="mb-2 block text-sm font-bold">Note to seller (optional)</span><textarea className="field" rows="3" value={orderForm.note} onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })} placeholder="Pickup time, preferences, etc." /></label>
              <div className="flex items-center justify-between rounded-xl bg-earth-50 px-4 py-3 text-sm font-bold dark:bg-earth-800/50">
                <span>Total</span>
                <span className="text-brand-600">{currency((orderTarget?.price || 0) * (Number(orderForm.quantity) || 1))}</span>
              </div>
              <button className="btn-primary w-full"><CheckCircle2 size={16} /> Confirm order</button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
