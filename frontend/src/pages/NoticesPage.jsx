import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { AlertTriangle, CalendarDays, Droplets, Megaphone, Pin, Plus, Sprout } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import useApiData from '../hooks/useApiData';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { asList } from '../utils/apiData';

const filters = ['all', 'notice', 'event', 'emergency'];
const iconByType = {
  emergency: AlertTriangle,
  event: CalendarDays,
  notice: Megaphone,
};

export default function NoticesPage() {
  const role = useSelector((s) => s.auth.user?.role);
  const isAdmin = ['Admin', 'SuperAdmin'].includes(role);
  const { data, setData } = useApiData('/announcements', []);
  const notices = asList(data);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', body: '', type: 'notice', audience: 'all', eventDate: '', isPinned: false });
  const dispatch = useDispatch();

  const create = async (event) => {
    event.preventDefault();
    try {
      const { data: response } = await api.post('/announcements', form);
      setData([response.data, ...notices]);
      setOpen(false);
      setForm({ title: '', body: '', type: 'notice', audience: 'all', eventDate: '', isPinned: false });
      dispatch(showToast({ message: 'Announcement published' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Announcement could not be published', severity: 'error' }));
    }
  };

  const visible = filter === 'all' ? notices : notices.filter((notice) => notice.type === filter);
  const featured = visible[0];
  const remaining = visible.slice(1);

  return <>
    <PageHeader
      eyebrow="Community bulletin"
      title="Updates from the office"
      description="Announcements, service alerts, events and reminders in one simple feed."
      action={isAdmin ? <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={18} /> Create notice</button> : null}
    />
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize ${filter === item ? 'bg-brand-600 text-white' : 'bg-earth-200 text-earth-700 dark:bg-earth-800 dark:text-earth-100'}`}>{item === 'all' ? 'All updates' : item}</button>)}
    </div>

    {featured && <article className="card card-pattern mb-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase text-brand-700">{featured.type === 'emergency' ? 'Urgent update' : featured.type}</span>
        <span className="text-xs text-earth-500">{new Date(featured.eventDate || featured.createdAt || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
      </div>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">{featured.title}</h2>
      <p className="mt-3 max-w-3xl leading-7 text-earth-700">{featured.body}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={() => dispatch(showToast({ message: 'Reminder saved for this notice' }))} className="btn-primary !py-2">Remind me</button>
        <button onClick={() => dispatch(showToast({ message: featured.body }))} className="btn-secondary !py-2">Details</button>
      </div>
    </article>}

    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {remaining.map((notice, index) => {
        const Icon = iconByType[notice.type] || (index % 2 ? Sprout : Droplets);
        return <article key={notice._id} className={`card relative p-6 ${notice.type === 'emergency' ? '!border-red-200 bg-red-50/70 dark:bg-red-950/30' : ''}`}>
          {notice.isPinned && <div className="absolute right-5 top-5 text-brand-600"><Pin size={18} /></div>}
          <div className={`grid h-12 w-12 place-items-center rounded-2xl ${notice.type === 'emergency' ? 'bg-red-100 text-red-700' : notice.type === 'event' ? 'bg-mint-100 text-mint-600' : 'bg-amber-100 text-amber-500'}`}><Icon size={22} /></div>
          <div className="mt-5 text-xs font-bold uppercase tracking-wider text-earth-500">{notice.type} - {new Date(notice.eventDate || notice.createdAt || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
          <h2 className="mt-2 font-display text-xl font-bold">{notice.title}</h2>
          <p className="mt-3 text-sm leading-6 text-earth-700 dark:text-earth-200">{notice.body}</p>
          <button onClick={() => dispatch(showToast({ message: notice.body }))} className="mt-5 text-sm font-bold text-brand-600 dark:text-brand-300 dark:hover:text-brand-200">Read more</button>
        </article>;
      })}
    </div>

    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogContent className="!p-7">
        <h2 className="font-display text-2xl font-extrabold">Create announcement</h2>
        <form onSubmit={create} className="mt-6 space-y-4">
          <label><span className="mb-2 block text-sm font-bold">Title</span><input required className="field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label><span className="mb-2 block text-sm font-bold">Message</span><textarea required rows="5" className="field" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-bold">Type</span><select className="field" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>notice</option><option>event</option><option>emergency</option></select></label>
            <label><span className="mb-2 block text-sm font-bold">Audience</span><select className="field" value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}><option value="all">Everyone</option><option value="residents">Residents</option><option value="staff">Staff</option><option value="guards">Security</option></select></label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPinned} onChange={(event) => setForm({ ...form, isPinned: event.target.checked })} /> Pin this notice</label>
          <button className="btn-primary w-full">Publish announcement</button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
