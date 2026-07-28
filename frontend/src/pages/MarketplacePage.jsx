import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import {
  ArrowLeft, Building2, CheckCircle2, MapPin, Palette, Pencil, Plus, ShoppingBag,
  ShoppingCart, Store, Trash2, UtensilsCrossed,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ImageUploader from '../components/ImageUploader';
import api from '../services/api';
import { marketplaceAPI } from '../services/marketplaceAPI';
import { businessAPI } from '../services/businessAPI';
import { showToast } from '../store/uiSlice';
import { asList, currency, unitLabel, uploadUrl } from '../utils/apiData';

const CATEGORIES = [
  { value: 'food', label: 'Food', icon: UtensilsCrossed },
  { value: 'art', label: 'Art', icon: Palette },
];
const catMeta = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES[0];

const emptyForm = { business: '', category: 'food', title: '', description: '', price: '' };
const emptyBusinessForm = { name: '', description: '', apartment: '', contactPhone: '' };

export default function MarketplacePage() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [tab, setTab] = useState('browse'); // 'browse' | 'businesses' | 'listings' | 'orders'
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [products, setProducts] = useState([]);
  const [browseBusinesses, setBrowseBusinesses] = useState([]);
  const [activeStore, setActiveStore] = useState(null); // { business, products } when viewing one storefront
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

  // The top-level browse screen: every open storefront, like a list of restaurants.
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

  const updateSearch = (value) => { setActiveStore(null); setSearch(value); };
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

  // My businesses are needed for the "sell a product" flow regardless of which tab is
  // active, so load them once up front.
  useEffect(() => { loadBusinesses(); }, []);

  useEffect(() => {
    if (tab === 'browse') {
      setActiveStore(null);
      if (search.trim()) loadBrowse(); else loadStores();
    } else if (tab === 'businesses') loadBusinesses();
    else if (tab === 'listings') loadListings();
    else loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // A search term looks up dishes/products by name across every business. With no
  // search term, the category chips instead filter the storefront list itself.
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

  const fetchApartment = async () => {
    try {
      const { data } = await api.get('/residents/profile');
      const apartment = unitLabel((data.data ?? data)?.unit) || '';
      return apartment === '-' ? '' : apartment;
    } catch (_) {
      return '';
    }
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

  // Voice assistant deep-link: "sell homemade cake for 200" lands here with the
  // category/title/price already populated — the seller just adds a photo and publishes.
  useEffect(() => {
    const prefill = location.state?.voicePrefill;
    if (prefill?.type !== 'marketplace') return;
    navigate(location.pathname, { replace: true, state: null });
    (async () => {
      await openCreate({
        category: prefill.category || 'food',
        title: prefill.title || '',
        price: prefill.price || '',
      });
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

  const statusPill = (status) => {
    const map = {
      placed: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-600',
    };
    return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${map[status] || 'bg-slate-100 text-slate-600'}`;
  };

  const productImage = (product) => (product.images?.length
    ? uploadUrl(product.images[0])
    : null);

  return (
    <>
      <PageHeader
        eyebrow="Neighbourhood marketplace"
        title="Community Marketplace"
        description="Open a business and sell home-made food or handcrafted art to your neighbours."
        action={<button onClick={() => openCreate()} className="btn-primary !px-4"><Plus size={18} /> Sell a product</button>}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {[['browse', 'Browse', Store], ['businesses', 'My businesses', Building2], ['listings', 'My listings', ShoppingBag], ['orders', 'My orders', ShoppingCart]].map(([value, label, Icon]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${tab === value ? 'bg-brand-600 text-white' : 'bg-earth-200 text-earth-700 dark:bg-earth-800 dark:text-earth-100'}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ── Browse ─────────────────────────────────────────────── */}
      {tab === 'browse' && (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-2">
              <button onClick={() => updateCatFilter('all')} className={`rounded-full px-4 py-2 text-sm font-bold ${catFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-earth-200 text-earth-700 dark:bg-earth-800 dark:text-earth-100'}`}>All</button>
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => updateCatFilter(value)} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${catFilter === value ? 'bg-brand-600 text-white' : 'bg-earth-200 text-earth-700 dark:bg-earth-800 dark:text-earth-100'}`}><Icon size={15} /> {label}</button>
              ))}
            </div>
            <input
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              placeholder="Search for a dish or product…"
              className="field sm:ml-auto sm:max-w-xs"
            />
          </div>

          {activeStore ? (
            <>
              <button onClick={closeStore} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600"><ArrowLeft size={16} /> Back to marketplace</button>
              <div className="card mb-6 flex items-center gap-4 p-5">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-earth-100 text-brand-600 dark:bg-earth-800">
                  {activeStore.business.logo ? <img src={uploadUrl(activeStore.business.logo)} alt={activeStore.business.name} className="h-full w-full object-cover" /> : <Building2 size={28} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl font-extrabold">{activeStore.business.name}</h2>
                  {activeStore.business.description && <p className="mt-1 text-sm text-slate-500">{activeStore.business.description}</p>}
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400"><MapPin size={12} /> Apartment {activeStore.business.apartment}</div>
                </div>
              </div>

              {loading ? (
                <div className="card p-10 text-center text-sm text-slate-500">Loading listings…</div>
              ) : !activeStore.products.length ? (
                <div className="card p-10 text-center text-sm text-slate-500">This business hasn't listed any products yet.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeStore.products.map((product) => {
                    const Meta = catMeta(product.category);
                    const img = productImage(product);
                    const ownStore = activeStore.business.owner?._id === user?.id || activeStore.business.owner === user?.id;
                    return (
                      <article key={product._id} className="card overflow-hidden">
                        <div className="relative h-40 bg-earth-100 dark:bg-earth-800">
                          {img ? (
                            <img src={img} alt={product.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-earth-300"><Meta.icon size={40} /></div>
                          )}
                          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold capitalize text-earth-700 shadow"><Meta.icon size={13} /> {product.category}</span>
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-lg font-bold">{product.title}</h3>
                            <span className="shrink-0 font-display text-lg font-extrabold text-brand-600">{currency(product.price)}</span>
                          </div>
                          {product.description && <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{product.description}</p>}
                          <button
                            onClick={() => { setOrderTarget({ ...product, business: activeStore.business }); setOrderForm({ quantity: 1, note: '' }); }}
                            disabled={ownStore}
                            className="btn-primary mt-4 w-full !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ShoppingCart size={16} /> {ownStore ? 'Your listing' : 'Order now'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          ) : search.trim() ? (
            loading ? (
              <div className="card p-10 text-center text-sm text-slate-500">Searching marketplace…</div>
            ) : !products.length ? (
              <div className="card p-10 text-center text-sm text-slate-500">No products match your search.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                  const Meta = catMeta(product.category);
                  const img = productImage(product);
                  const own = product.seller?._id === user?.id || product.seller === user?.id;
                  return (
                    <article key={product._id} className="card overflow-hidden">
                      <div className="relative h-40 bg-earth-100 dark:bg-earth-800">
                        {img ? (
                          <img src={img} alt={product.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-earth-300"><Meta.icon size={40} /></div>
                        )}
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold capitalize text-earth-700 shadow"><Meta.icon size={13} /> {product.category}</span>
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-lg font-bold">{product.title}</h3>
                          <span className="shrink-0 font-display text-lg font-extrabold text-brand-600">{currency(product.price)}</span>
                        </div>
                        {product.description && <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{product.description}</p>}
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                          <Building2 size={13} /> <span className="truncate font-semibold text-slate-500">{product.business?.name || 'Business'}</span>
                          <span className="mx-1">•</span>
                          <MapPin size={13} /> {product.business?.apartment || '-'}
                        </div>
                        <button
                          onClick={() => { setOrderTarget(product); setOrderForm({ quantity: 1, note: '' }); }}
                          disabled={own}
                          className="btn-primary mt-4 w-full !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ShoppingCart size={16} /> {own ? 'Your listing' : 'Order now'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : (
            loading ? (
              <div className="card p-10 text-center text-sm text-slate-500">Loading businesses…</div>
            ) : !visibleBrowseBusinesses.length ? (
              <div className="card p-10 text-center text-sm text-slate-500">No businesses have opened a storefront yet. Be the first to sell something!</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleBrowseBusinesses.map((business) => (
                  <article
                    key={business._id}
                    onClick={() => openStore(business._id)}
                    className="card cursor-pointer overflow-hidden transition hover:shadow-lg"
                  >
                    <div className="flex items-center gap-4 p-5">
                      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-earth-100 text-brand-600 dark:bg-earth-800">
                        {business.logo ? <img src={uploadUrl(business.logo)} alt={business.name} className="h-full w-full object-cover" /> : <Building2 size={24} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-bold">{business.name}</h3>
                        {business.description && <p className="mt-1 line-clamp-1 text-sm text-slate-500">{business.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                          <MapPin size={12} /> {business.apartment}
                          {!!business.categories?.length && business.categories.map((c) => (
                            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-earth-100 px-2 py-0.5 font-bold capitalize text-earth-600 dark:bg-earth-800 dark:text-earth-200">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-earth-100 px-5 py-3 text-xs font-bold text-brand-600 dark:border-earth-800">
                      {business.productCount || 0} item{business.productCount === 1 ? '' : 's'} available →
                    </div>
                  </article>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* ── My businesses ──────────────────────────────────────── */}
      {tab === 'businesses' && (
        <>
          <div className="mb-4 flex justify-end">
            <button onClick={openCreateBusiness} className="btn-secondary !px-4 text-sm"><Plus size={16} /> New business</button>
          </div>
          {!businesses.length ? (
            <div className="card p-10 text-center text-sm text-slate-500">You haven't created a business yet. Open one to start selling under your own name.</div>
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
                    <button onClick={() => removeBusiness(business)} className="rounded-xl border-2 border-red-200 px-3 py-2 text-sm font-bold text-red-600"><Trash2 size={15} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── My listings ────────────────────────────────────────── */}
      {tab === 'listings' && (
        loading ? (
          <div className="card p-10 text-center text-sm text-slate-500">Loading your listings…</div>
        ) : !listings.length ? (
          <div className="card p-10 text-center text-sm text-slate-500">You haven't listed anything yet. Tap “Sell a product” to get started.</div>
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
                      <button onClick={() => removeListing(product)} className="rounded-xl border-2 border-red-200 px-3 py-2 text-sm font-bold text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {!!activeOrders.length && (
                    <div className="mt-4 space-y-2 border-t border-earth-200 pt-4 dark:border-earth-700">
                      <div className="text-xs font-bold uppercase tracking-wide text-earth-500">Orders received</div>
                      {activeOrders.map((order) => (
                        <div key={order._id} className="flex flex-wrap items-center gap-2 rounded-xl bg-earth-50 px-3 py-2 text-sm dark:bg-earth-800/50">
                          <span className="font-bold">{order.buyer?.name || 'Resident'}</span>
                          <span className="text-slate-500">× {order.quantity}</span>
                          {order.note && <span className="text-xs text-slate-400">“{order.note}”</span>}
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

      {/* ── My orders ──────────────────────────────────────────── */}
      {tab === 'orders' && (
        loading ? (
          <div className="card p-10 text-center text-sm text-slate-500">Loading your orders…</div>
        ) : !orders.length ? (
          <div className="card p-10 text-center text-sm text-slate-500">You haven't ordered anything yet. Browse the marketplace to find something you like.</div>
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
                      Qty {order.quantity} • {currency((order.product?.price || 0) * order.quantity)} • from {order.product?.business?.name || 'Business'} (Apt {order.product?.business?.apartment || '-'})
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {/* ── Create / edit business dialog ──────────────────────── */}
      <Dialog open={businessOpen} onClose={() => setBusinessOpen(false)} fullWidth maxWidth="sm">
        <DialogContent className="!p-7">
          <div className="eyebrow">{editingBusiness ? 'Edit business' : 'New business'}</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold">{editingBusiness ? editingBusiness.name : 'Open your storefront'}</h2>
          <p className="mt-1 text-sm text-slate-500">Give your business a name — every product you list will appear under it.</p>
          <form onSubmit={submitBusiness} className="mt-6 space-y-4">
            <label>
              <span className="mb-2 block text-sm font-bold">Business name</span>
              <input className="field" required maxLength={120} value={businessForm.name} onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })} placeholder="e.g. Priya's Bakes" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">Description (optional)</span>
              <textarea className="field" rows="2" value={businessForm.description} onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })} placeholder="What do you sell?" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-2 block text-sm font-bold">Apartment no.</span>
                <input className="field" required value={businessForm.apartment} onChange={(e) => setBusinessForm({ ...businessForm, apartment: e.target.value })} placeholder="e.g. A-1203" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold">Contact phone (optional)</span>
                <input className="field" value={businessForm.contactPhone} onChange={(e) => setBusinessForm({ ...businessForm, contactPhone: e.target.value })} placeholder="Buyers may call you" />
              </label>
            </div>
            <ImageUploader images={businessLogo} setImages={(files) => setBusinessLogo(files.slice(-1))} hint="Optional business logo." />
            <button className="btn-primary w-full"><Building2 size={16} /> {editingBusiness ? 'Save changes' : 'Create business'}</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Create listing dialog ──────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogContent className="!p-7">
          <div className="eyebrow">List a product</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold">Sell to your community</h2>
          <form onSubmit={create} className="mt-6 space-y-4">
            {businesses.length > 1 && (
              <label>
                <span className="mb-2 block text-sm font-bold">Business</span>
                <select className="field" required value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })}>
                  {businesses.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setForm({ ...form, category: value })} className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${form.category === value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-earth-300 text-earth-500'}`}><Icon size={17} /> {label}</button>
              ))}
            </div>
            <label>
              <span className="mb-2 block text-sm font-bold">Product name</span>
              <input className="field" required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.category === 'food' ? 'e.g. Homemade veg biryani' : 'e.g. Hand-painted canvas'} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">Description</span>
              <textarea className="field" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ingredients, size, quantity available, etc." />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">Price (₹)</span>
              <input className="field" type="number" min="0" step="1" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 250" />
            </label>
            <ImageUploader
              images={images}
              setImages={setImages}
              highlight={voiceFilled}
              hint="A bright, clear photo helps your product sell faster."
            />
            <button className="btn-primary w-full"><Store size={16} /> List product</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Order dialog ───────────────────────────────────────── */}
      <Dialog open={!!orderTarget} onClose={() => setOrderTarget(null)} fullWidth maxWidth="xs">
        <DialogContent className="!p-7">
          <div className="eyebrow">Place an order</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold">{orderTarget?.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{currency(orderTarget?.price || 0)} • {orderTarget?.business?.name} • Apartment {orderTarget?.business?.apartment}</p>
          <form onSubmit={submitOrder} className="mt-6 space-y-4">
            <label>
              <span className="mb-2 block text-sm font-bold">Quantity</span>
              <input className="field" type="number" min="1" max="99" required value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">Note to seller (optional)</span>
              <textarea className="field" rows="3" value={orderForm.note} onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })} placeholder="Pickup time, preferences, etc." />
            </label>
            <div className="flex items-center justify-between rounded-xl bg-earth-50 px-4 py-3 text-sm font-bold dark:bg-earth-800/50">
              <span>Total</span>
              <span className="text-brand-600">{currency((orderTarget?.price || 0) * (Number(orderForm.quantity) || 1))}</span>
            </div>
            <button className="btn-primary w-full"><CheckCircle2 size={16} /> Confirm order</button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
