import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { QRCodeSVG } from 'qrcode.react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { CheckCircle2, Clock3, LogIn, LogOut, Plus, QrCode, Search, Send, ShieldCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import useApiData from '../hooks/useApiData';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { asList, unitLabel } from '../utils/apiData';

export default function VisitorsPage() {
  const role = useSelector((s) => s.auth.user?.role);
  return role === 'Guard' || role === 'Admin' || role === 'SuperAdmin' ? <GateVisitors /> : <ResidentVisitors />;
}

function ResidentVisitors() {
  const dispatch = useDispatch();
  const { data, setData } = useApiData('/visitors/my', []);
  const visitors = asList(data);
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', purpose: 'Guest visit', validUntil: '', vehicleNumber: '', notes: '' });
  const visibleVisitors = visitors.filter((visitor) => [visitor.name, visitor.phone, visitor.purpose, visitor.status].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));
  const today = new Date().toDateString();
  const expectedToday = visitors.filter((v) => ['approved', 'pending'].includes(v.status) && new Date(v.validFrom || v.createdAt || Date.now()).toDateString() === today).length;
  const thisMonth = visitors.filter((v) => {
    const d = new Date(v.createdAt || v.validFrom || Date.now());
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data: response } = await api.post('/visitors/preapprove', { ...form, validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined });
      const created = response.data;
      setData([created, ...visitors]);
      setPass(created);
      dispatch(showToast({ message: 'Visitor pass generated successfully' }));
    } catch {
      dispatch(showToast({ message: 'Visitor pass could not be generated', severity: 'error' }));
    }
  };

  return <>
    <PageHeader eyebrow="Visitor management" title="Guests, deliveries and entries" description="Pre-approve visitors, share a secure pass and review entry history." action={<button onClick={() => { setPass(null); setOpen(true); }} className="btn-primary"><Plus size={18} /> Pre-approve visitor</button>} />
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard title="Expected today" value={expectedToday} icon={Clock3} color="blue" />
      <StatCard title="Checked in" value={visitors.filter((v) => v.status === 'checked-in').length} icon={LogIn} color="green" />
      <StatCard title="This month" value={thisMonth} icon={CheckCircle2} color="violet" />
    </div>
    <section className="card mt-7 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <h2 className="section-title">Visitor history</h2>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="search-input !py-2 w-full sm:w-64" placeholder="Search visitor" />
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {visibleVisitors.length === 0 && <div className="p-6 text-center text-sm text-slate-400">No visitors found.</div>}
        {visibleVisitors.map((v) => (
          <div key={v._id} className="p-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-sm text-ink dark:text-white">{v.name}</div>
                <div className="text-xs text-slate-400">{v.phone}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-medium">Purpose: {v.purpose}</div>
              </div>
              <StatusBadge value={v.status} />
            </div>
            <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
              <span>{new Date(v.validFrom || v.createdAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
              <button onClick={() => { setPass(v); setOpen(true); }} className="rounded-lg bg-brand-50 px-3 py-1.5 font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                View pass
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400 dark:bg-slate-900">
            <tr>
              <th className="px-5 py-3">Visitor</th>
              <th>Purpose</th>
              <th>Expected</th>
              <th>Pass</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleVisitors.map((v) => (
              <tr key={v._id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-5 py-4">
                  <div className="font-bold">{v.name}</div>
                  <div className="text-xs text-slate-400">{v.phone}</div>
                </td>
                <td>{v.purpose}</td>
                <td>{new Date(v.validFrom || v.createdAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td><button onClick={() => { setPass(v); setOpen(true); }} className="font-bold text-brand-600 dark:text-brand-300">View pass</button></td>
                <td><StatusBadge value={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogContent className="!p-7">{!pass ? <form onSubmit={submit}><div className="eyebrow">Secure guest entry</div><h2 className="mt-2 font-display text-2xl font-extrabold">Pre-approve a visitor</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{[['Visitor name', 'name', 'text'], ['Phone number', 'phone', 'tel'], ['Purpose', 'purpose', 'text'], ['Expected until', 'validUntil', 'datetime-local'], ['Vehicle number', 'vehicleNumber', 'text']].map(([label, key, type]) => <label key={key} className={key === 'vehicleNumber' ? 'sm:col-span-2' : ''}><span className="mb-2 block text-sm font-bold">{label}</span><input required={['name', 'phone', 'purpose'].includes(key)} className="field" type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}<label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Notes for security</span><textarea className="field" rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div><button className="btn-primary mt-6 w-full"><QrCode size={18} /> Generate secure pass</button></form> : <div className="text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 /></div><h2 className="mt-3 font-display text-2xl font-extrabold">Visitor pass ready</h2><p className="text-sm text-slate-500">{pass.name} - {pass.purpose}</p><div className="mx-auto mt-6 inline-block rounded-3xl border border-slate-100 bg-white p-5 shadow-card"><QRCodeSVG value={JSON.stringify({ visitorId: pass._id, otp: pass.otp })} size={190} level="H" /><div className="mt-4 text-xs uppercase tracking-wider text-slate-400">One-time password</div><div className="font-display text-3xl font-extrabold tracking-[.2em]">{pass.otp || '000000'}</div></div><button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Visitor pass for ${pass.name}. OTP: ${pass.otp || '000000'}`)}`, '_blank')} className="btn-primary mt-6 w-full"><Send size={18} /> Share via WhatsApp</button></div>}</DialogContent></Dialog>
  </>;
}

function GateVisitors() {
  const dispatch = useDispatch();
  const { data, setData } = useApiData('/visitors', []);
  const visitors = asList(data);
  const [otp, setOtp] = useState('');
  const [query, setQuery] = useState('');
  const [verified, setVerified] = useState(null);
  const counts = useMemo(() => ({ inside: visitors.filter((v) => v.status === 'checked-in').length, expected: visitors.filter((v) => v.status === 'approved').length, out: visitors.filter((v) => v.status === 'checked-out').length }), [visitors]);
  const visibleVisitors = visitors.filter((visitor) => [visitor.name, visitor.phone, visitor.purpose, visitor.host?.name, visitor.unit?.unitNumber, visitor.status].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));

  const verify = async () => {
    try {
      const { data: response } = await api.post('/visitors/verify', { otp });
      setVerified(response.data);
    } catch {
      setVerified(null);
    }
  };

  const update = async (visitor, action) => {
    try {
      const { data: response } = await api.post(`/visitors/${visitor._id}/${action}`);
      const updated = response.data;
      setData(visitors.map((v) => v._id === visitor._id ? { ...v, ...updated } : v));
      setVerified(null);
      dispatch(showToast({ message: `Visitor ${action === 'checkin' ? 'checked in' : 'checked out'}` }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Visitor status could not be updated', severity: 'error' }));
    }
  };

  return <>
    <PageHeader eyebrow="Gate operations" title="Visitor access desk" description="Verify a QR or OTP, review resident details and manage entry in seconds." />
    <div className="grid gap-4 sm:grid-cols-3"><StatCard title="Currently inside" value={counts.inside} icon={LogIn} color="blue" /><StatCard title="Expected today" value={counts.expected} icon={Clock3} color="orange" /><StatCard title="Checked out" value={counts.out} icon={LogOut} color="green" /></div>
    <div className="mt-7 grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
      <section className="card p-6"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><ShieldCheck /></div><h2 className="mt-4 section-title">Verify visitor</h2><p className="mt-1 text-sm text-slate-500">Scan the QR using the gate device or enter the six-digit pass.</p><button onClick={() => dispatch(showToast({ message: 'Camera scanner is not available in this browser view. Enter the OTP from the visitor pass.' }))} className="mt-5 flex h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 text-brand-600"><QrCode size={38} /><span className="mt-2 font-bold">Open QR scanner</span></button><div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>OR ENTER OTP</span><span className="h-px flex-1 bg-slate-200" /></div><div className="flex gap-2"><input maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="field text-center font-display text-xl font-bold tracking-[.2em]" placeholder="000000" /><button onClick={verify} className="btn-primary !px-4">Verify</button></div>
        {verified && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="text-emerald-600" /><div><div className="font-bold text-emerald-800">{verified.name}</div><div className="text-sm text-emerald-700">{verified.purpose} - {verified.host?.name}</div><div className="text-xs text-emerald-600">Unit {unitLabel(verified.unit)}</div></div></div><button onClick={() => update(verified, 'checkin')} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 font-bold text-white">Check in visitor</button></div>}
      </section>
      <section className="card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">Visitor log</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="search-input !py-2 w-full sm:w-60" placeholder="Search" />
          </div>
        </div>

        {/* Mobile View (< md) */}
        <div className="mt-4 md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {visibleVisitors.length === 0 && <div className="py-6 text-center text-sm text-slate-400">No visitors found.</div>}
          {visibleVisitors.map((v) => (
            <div key={v._id} className="py-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-ink dark:text-white">{v.name}</div>
                  <div className="text-xs text-slate-400">{v.purpose}</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Host: <span className="font-semibold">{v.host?.name || 'Resident'}</span> • Unit {unitLabel(v.unit)}
                  </div>
                </div>
                <StatusBadge value={v.status} />
              </div>
              <div className="flex justify-end pt-1">
                {v.status === 'approved' ? (
                  <button onClick={() => update(v, 'checkin')} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700">
                    Check in
                  </button>
                ) : v.status === 'checked-in' ? (
                  <button onClick={() => update(v, 'checkout')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700">
                    Check out
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="mt-4 hidden md:block overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-3">Visitor</th>
                <th>Resident</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleVisitors.map((v) => (
                <tr key={v._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-4 font-bold">
                    {v.name}
                    <div className="text-xs font-normal text-slate-400">{v.purpose}</div>
                  </td>
                  <td>{v.host?.name}</td>
                  <td>{unitLabel(v.unit)}</td>
                  <td><StatusBadge value={v.status} /></td>
                  <td>
                    {v.status === 'approved' ? (
                      <button onClick={() => update(v, 'checkin')} className="font-bold text-brand-600 dark:text-brand-300">Check in</button>
                    ) : v.status === 'checked-in' ? (
                      <button onClick={() => update(v, 'checkout')} className="font-bold text-red-500 dark:text-red-400">Check out</button>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </>;
}
