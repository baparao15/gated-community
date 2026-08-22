import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Rating from '@mui/material/Rating';
import { CheckCircle2, Clock3, HandCoins, IndianRupee, MessageSquare, Plus, Receipt, UserCheck, Users, Wrench } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import StatCard from '../components/StatCard';
import ImageUploader from '../components/ImageUploader';
import PaymentModal from '../components/PaymentModal';
import useApiData from '../hooks/useApiData';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { asList, currency, uploadUrl } from '../utils/apiData';

export default function ComplaintsPage() {
  const role = useSelector((s) => s.auth.user?.role);
  const isResident = role === 'Resident';
  const isStaff = role === 'Staff' || role === 'Admin' || role === 'SuperAdmin';
  const isWorker = role === 'Staff';
  const [view, setView] = useState('personal'); // 'personal' | 'community' — resident tab
  const endpoint = isResident
    ? (view === 'community' ? '/complaints/community' : '/complaints/my')
    : role === 'Staff' ? '/complaints/assigned/me' : '/complaints';
  const { data, setData } = useApiData(endpoint, []);
  const { data: staffEarningsData, setData: setStaffEarnings } = useApiData(isWorker ? '/complaints/staff-earnings' : null, null);
  const items = asList(data);
  const staffSummary = staffEarningsData?.summary || { totalEarned: 0, totalPaidOut: 0, pendingPayout: 0 };

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quoteTarget, setQuoteTarget] = useState(null);
  const [quoteForm, setQuoteForm] = useState({ amount: '', note: '' });
  const [payQuoteTarget, setPayQuoteTarget] = useState(null);
  const [form, setForm] = useState({ category: 'plumbing', scope: 'personal', description: '' });
  const [images, setImages] = useState([]);
  const [voiceFilled, setVoiceFilled] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const updateItem = (id, patch) => setData(items.map((x) => (x._id === id ? { ...x, ...patch } : x)));

  const openCreate = (scope) => { setForm({ category: 'plumbing', scope, description: '' }); setImages([]); setVoiceFilled(false); setOpen(true); };

  // Voice assistant deep-link: the mic parses "raise a plumbing complaint…" and lands
  // here with the category/description/scope pre-filled — the resident only adds a photo.
  useEffect(() => {
    const prefill = location.state?.voicePrefill;
    if (prefill?.type !== 'complaint' || !isResident) return;
    setForm({ category: prefill.category || 'plumbing', scope: prefill.scope || 'personal', description: prefill.description || '' });
    setImages([]);
    setVoiceFilled(true);
    setOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, isResident, navigate, location.pathname]);

  const create = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => fd.append(key, value));
    images.forEach((file) => fd.append('images', file));
    try {
      const { data: response } = await api.post('/complaints', fd);
      if (isResident && view === form.scope) setData([response.data, ...items]);
      setOpen(false);
      setImages([]);
      dispatch(showToast({ message: form.scope === 'community' ? 'Community issue reported. Thanks for the heads-up!' : 'Complaint raised. We will keep you updated.' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Complaint could not be raised', severity: 'error' }));
    }
  };

  const progress = async (item, status) => {
    try {
      const { data: response } = await api.patch(`/complaints/${item._id}/status`, { status, note: 'Updated from staff dashboard' });
      updateItem(item._id, response.data);
      dispatch(showToast({ message: `Task marked ${status}` }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Task could not be updated', severity: 'error' }));
    }
  };

  const sendQuote = async (e) => {
    e.preventDefault();
    try {
      const { data: response } = await api.post(`/complaints/${quoteTarget._id}/quote`, { amount: Number(quoteForm.amount), note: quoteForm.note });
      updateItem(quoteTarget._id, response.data);
      setQuoteTarget(null);
      dispatch(showToast({ message: 'Quote sent to the resident' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Quote could not be sent', severity: 'error' }));
    }
  };

  const respondQuote = async (item, action) => {
    try {
      const { data: response } = await api.patch(`/complaints/${item._id}/quote/respond`, { action });
      updateItem(item._id, response.data);
      dispatch(showToast({ message: action === 'accept' ? 'Quote accepted. The team will begin work.' : 'Quote rejected.' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not respond to the quote', severity: 'error' }));
    }
  };

  const handleProcessQuotePayment = async (payload) => {
    if (!payQuoteTarget) return;
    const { data: response } = await api.post(`/complaints/${payQuoteTarget._id}/quote/pay`, payload);
    updateItem(payQuoteTarget._id, response.data);
    dispatch(showToast({ message: 'Payment recorded successfully. Amount added to worker payout balance.' }));
    return response.data;
  };

  const title = isResident
    ? 'Maintenance requests'
    : role === 'Staff' ? 'Assigned maintenance tasks & earnings' : 'Complaint management';
  const eyebrow = isResident ? 'Home & community upkeep' : 'Service operations';

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description="Clear ownership, visible progress, quote payments and payout tracking."
        action={isResident ? (
          <div className="flex gap-2">
            <button onClick={() => openCreate('personal')} className="btn-secondary !px-4"><Plus size={18} /> Personal issue</button>
            <button onClick={() => openCreate('community')} className="btn-primary !px-4"><Users size={18} /> Community issue</button>
          </div>
        ) : null}
      />

      {/* Staff Earnings & Payout Balance Banner */}
      {isWorker && (
        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Earned from Jobs"
            value={currency(staffSummary.totalEarned)}
            icon={IndianRupee}
            color="blue"
          />
          <StatCard
            title="Paid Out by Admin"
            value={currency(staffSummary.totalPaidOut)}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            title="To Collect from Admin"
            value={currency(staffSummary.pendingPayout)}
            icon={HandCoins}
            color="orange"
          />
        </div>
      )}

      {isResident && (
        <div className="mb-6 flex gap-2">
          <button onClick={() => setView('personal')} className={`rounded-full px-4 py-2 text-sm font-bold transition ${view === 'personal' ? 'bg-brand-600 text-white' : 'bg-earth-200 text-earth-700 dark:bg-earth-800 dark:text-earth-100'}`}>My maintenance</button>
          <button onClick={() => setView('community')} className={`rounded-full px-4 py-2 text-sm font-bold transition ${view === 'community' ? 'bg-brand-600 text-white' : 'bg-earth-200 text-earth-700 dark:bg-earth-800 dark:text-earth-100'}`}>Community issues</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Open" value={items.filter((x) => x.status === 'open').length} icon={Clock3} color="orange" />
        <StatCard title="In progress" value={items.filter((x) => ['assigned', 'in-progress'].includes(x.status)).length} icon={Wrench} color="blue" />
        <StatCard title="Resolved" value={items.filter((x) => ['resolved', 'closed'].includes(x.status)).length} icon={CheckCircle2} color="green" />
      </div>

      <div className="mt-7 grid gap-4">
        {items.map((item) => {
          const quote = item.quote;
          const hasQuote = quote && quote.status !== 'none';
          return (
            <article key={item._id} className="card p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div className="flex gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                    <Wrench />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold capitalize">{item.category} issue</h3>
                      {item.scope === 'community' && <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-0.5 text-xs font-bold text-mint-600"><Users size={12} /> Community</span>}
                      <StatusBadge value={item.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                    <div className="mt-3 text-xs text-slate-400">
                      {String(item._id).slice(-8)} - {new Date(item.createdAt).toLocaleDateString('en-IN')}
                      {item.unit && ` - ${item.unit.blockName}-${item.unit.unitNumber}`}
                      {item.scope === 'community' && item.raisedBy?.name && ` - reported by ${item.raisedBy.name}`}
                    </div>
                    {!!item.images?.length && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.images.map((img) => (
                          <a key={img} href={uploadUrl(img)} target="_blank" rel="noreferrer" className="block h-16 w-16 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                            <img src={uploadUrl(img)} alt="Attached evidence" className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    {item.scope === 'personal' && hasQuote && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        <Receipt size={14} />
                        <span>Quote: {currency(quote.amount)}{quote.note ? ` — ${quote.note}` : ''}</span>
                        <span className="capitalize">({quote.status}{quote.status === 'accepted' ? `, ${quote.paymentStatus}` : ''})</span>
                      </div>
                    )}

                    {isResident && item.scope === 'personal' && quote?.status === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => respondQuote(item, 'accept')} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Accept quote</button>
                        <button onClick={() => respondQuote(item, 'reject')} className="rounded-xl border-2 border-red-200 px-4 py-2 text-xs font-bold text-red-600">Reject</button>
                      </div>
                    )}

                    {isResident && item.scope === 'personal' && quote?.status === 'accepted' && ['resolved', 'closed'].includes(item.status) && quote.paymentStatus === 'unpaid' && (
                      <button onClick={() => setPayQuoteTarget(item)} className="btn-primary mt-3 !py-2 text-sm"><IndianRupee size={16} /> Pay {currency(quote.amount)}</button>
                    )}

                    {quote?.paymentStatus === 'paid' && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 size={13} /> Paid {currency(quote.amount)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button onClick={() => setSelected(item)} className="btn-secondary !px-4 !py-2 text-sm"><MessageSquare size={16} /> Timeline</button>
                  {isStaff && item.scope === 'personal' && (!quote || quote.status === 'none' || quote.status === 'rejected') && (
                    <button onClick={() => { setQuoteTarget(item); setQuoteForm({ amount: '', note: '' }); }} className="btn-primary !px-4 !py-2 text-sm"><Receipt size={16} /> Send quote</button>
                  )}
                  {role === 'Staff' && item.status !== 'resolved' && (item.scope !== 'personal' || quote?.status === 'accepted') && (
                    <button onClick={() => progress(item, item.status === 'in-progress' ? 'resolved' : 'in-progress')} className="btn-primary !px-4 !py-2 text-sm">
                      {item.status === 'in-progress' ? 'Complete' : 'Start task'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {!items.length && (
          <div className="card p-10 text-center text-sm text-slate-500">
            {isResident && view === 'community' ? 'No community issues reported yet.' : 'Nothing here yet.'}
          </div>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogContent className="!p-7">
          <div className="eyebrow">{form.scope === 'community' ? 'Shared / common area' : 'New service request'}</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold">{form.scope === 'community' ? 'Report a community issue' : 'Tell us what needs attention'}</h2>
          <form onSubmit={create} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm({ ...form, scope: 'personal' })} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${form.scope === 'personal' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-earth-300 text-earth-500'}`}>Personal maintenance</button>
              <button type="button" onClick={() => setForm({ ...form, scope: 'community' })} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${form.scope === 'community' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-earth-300 text-earth-500'}`}>Community maintenance</button>
            </div>
            <p className="text-xs text-earth-500">{form.scope === 'community' ? 'Visible to every resident, so neighbours know it’s already flagged (e.g. a dirty shared pool or a broken gate).' : 'The maintenance team will send you a quote before any work is scheduled.'}</p>
            <label>
              <span className="mb-2 block text-sm font-bold">Category</span>
              <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['plumbing', 'electrical', 'cleaning', 'security', 'elevator', 'parking', 'noise', 'other'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">Description</span>
              <textarea
                className="field"
                rows="5"
                minLength="10"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the issue and where it is happening..."
              />
            </label>
            <ImageUploader
              images={images}
              setImages={setImages}
              highlight={voiceFilled}
              hint="Adding a clear photo helps the maintenance team come prepared."
            />
            <button className="btn-primary w-full">{form.scope === 'community' ? 'Report to the community' : 'Submit complaint'}</button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!quoteTarget} onClose={() => setQuoteTarget(null)} fullWidth maxWidth="xs">
        <DialogContent className="!p-7">
          <div className="eyebrow">Price the job</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold">Send a quote</h2>
          <p className="mt-1 text-sm text-slate-500">{quoteTarget?.description}</p>
          <form onSubmit={sendQuote} className="mt-6 space-y-4">
            <label>
              <span className="mb-2 block text-sm font-bold">Amount (₹)</span>
              <input className="field" type="number" min="1" step="1" required value={quoteForm.amount} onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })} placeholder="e.g. 500" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold">Note (optional)</span>
              <textarea className="field" rows="3" value={quoteForm.note} onChange={(e) => setQuoteForm({ ...quoteForm, note: e.target.value })} placeholder="What's included, parts needed, etc." />
            </label>
            <button className="btn-primary w-full"><Receipt size={16} /> Send quote to resident</button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogContent className="!p-7">
          <h2 className="font-display text-2xl font-extrabold">Complaint timeline</h2>
          <p className="mt-1 text-sm text-slate-500">{selected?.description}</p>
          <div className="mt-7 space-y-0">
            {['Open', 'Assigned', 'In progress', 'Resolved'].map((step, index) => {
              const active = ['open', 'assigned', 'in-progress', 'resolved', 'closed'].indexOf(selected?.status) >= index;
              return (
                <div key={step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`grid h-8 w-8 place-items-center rounded-full ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {active ? <CheckCircle2 size={16} /> : index + 1}
                    </div>
                    {index < 3 && <div className={`h-12 w-px ${active ? 'bg-brand-300' : 'bg-slate-200'}`} />}
                  </div>
                  <div className="pt-1">
                    <div className="font-bold">{step}</div>
                    <div className="text-xs text-slate-400">{active ? 'Status updated' : 'Pending'}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {['resolved', 'closed'].includes(selected?.status) && (
            <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-center">
              <div className="font-bold">How was the service?</div>
              <Rating className="mt-2" defaultValue={5} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PaymentModal
        open={Boolean(payQuoteTarget)}
        onClose={() => setPayQuoteTarget(null)}
        title="Pay Maintenance Quote"
        subtitle={`${payQuoteTarget?.category || 'Maintenance'} service by ${payQuoteTarget?.assignedTo?.name || 'Staff'}`}
        amount={payQuoteTarget?.quote?.amount || 0}
        complaintId={payQuoteTarget?._id}
        invoiceNumber={`MNT-${String(payQuoteTarget?._id).slice(-6)}`}
        onSuccess={(result) => {
          if (result?.complaint) {
            updateItem(payQuoteTarget._id, result.complaint);
          }
        }}
        onProcessPayment={handleProcessQuotePayment}
      />
    </>
  );
}
