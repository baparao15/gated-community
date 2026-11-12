import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { AlertTriangle, CalendarDays, CheckCircle2, Droplets, Megaphone, Pin, Plus, Sprout, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import useApiData from '../hooks/useApiData';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { asList } from '../utils/apiData';

const filterConfig = [
  { id: 'all', label: 'All Updates' },
  { id: 'notice', label: 'Notices' },
  { id: 'event', label: 'Upcoming Events' },
  { id: 'past-events', label: 'Past Events' },
  { id: 'emergency', label: 'Emergency' },
];

const iconByType = {
  emergency: AlertTriangle,
  event: CalendarDays,
  notice: Megaphone,
};

const formatSafeDate = (d, options = { dateStyle: 'medium' }) => {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-IN', options);
};

const isEventPast = (notice) => {
  if (notice.type !== 'event') return false;
  if (!notice.eventDate) return false;
  const evtDate = new Date(notice.eventDate);
  if (isNaN(evtDate.getTime())) return false;
  evtDate.setHours(23, 59, 59, 999);
  return evtDate.getTime() < Date.now();
};

const isDeadlinePassed = (notice) => {
  if (!notice) return false;
  if (notice.expiresAt) {
    const exp = new Date(notice.expiresAt);
    if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) return true;
  }
  if (notice.eventDate) {
    const evtDate = new Date(notice.eventDate);
    if (!isNaN(evtDate.getTime())) {
      const hasTime = typeof notice.eventDate === 'string' && (notice.eventDate.includes('T') || notice.eventDate.includes(':'));
      if (!hasTime) {
        evtDate.setHours(23, 59, 59, 999);
      }
      if (evtDate.getTime() < Date.now()) return true;
    }
  }
  if (notice.type === 'event' && isEventPast(notice)) return true;
  return false;
};

export default function NoticesPage() {
  const user = useSelector((s) => s.auth.user);
  const role = user?.role;
  const isAdmin = ['Admin', 'SuperAdmin'].includes(role);
  const { data, setData } = useApiData('/announcements', []);
  const notices = asList(data);
  const [open, setOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', body: '', type: 'notice', audience: 'all', eventDate: '', expiresAt: '', isPinned: false });
  const [savedReminders, setSavedReminders] = useState(() => {
    try {
      const stored = localStorage.getItem(`notice_reminders_${user?._id || 'guest'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const dispatch = useDispatch();

  const handleSaveReminder = (notice) => {
    if (isDeadlinePassed(notice)) {
      dispatch(showToast({ message: 'The deadline for this notice has already passed', severity: 'warning' }));
      return;
    }
    const next = [...new Set([...savedReminders, notice._id])];
    setSavedReminders(next);
    try {
      localStorage.setItem(`notice_reminders_${user?._id || 'guest'}`, JSON.stringify(next));
    } catch {}
    dispatch(showToast({ message: 'Reminder saved for this notice' }));
  };

  const create = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        title: form.title,
        body: form.body,
        type: form.type,
        audience: form.audience,
        isPinned: form.isPinned,
        ...(form.eventDate && { eventDate: form.eventDate, expiresAt: form.eventDate }),
      };
      const { data: response } = await api.post('/announcements', payload);
      setData([response.data, ...notices]);
      setOpen(false);
      setForm({ title: '', body: '', type: 'notice', audience: 'all', eventDate: '', expiresAt: '', isPinned: false });
      dispatch(showToast({ message: 'Announcement published' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Announcement could not be published', severity: 'error' }));
    }
  };

  const visible = notices.filter((notice) => {
    const isPast = isEventPast(notice);
    if (filter === 'past-events') {
      return notice.type === 'event' && isPast;
    }
    // Completed events are removed from active updates and upcoming events
    if (isPast) {
      return false;
    }
    if (filter === 'all') return true;
    return notice.type === filter;
  });

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
      {filterConfig.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setFilter(id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize transition ${
            filter === id ? 'bg-brand-600 text-white shadow-sm' : 'bg-earth-200 text-earth-700 hover:bg-earth-300 dark:bg-earth-800 dark:text-earth-100 dark:hover:bg-earth-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    {visible.length === 0 && (
      <div className="card p-12 text-center text-earth-500">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-earth-100 text-earth-400 dark:bg-earth-800">
          <CalendarDays size={24} />
        </div>
        <div className="font-bold text-ink dark:text-earth-100">
          {filter === 'past-events' ? 'No completed past events found' : 'No updates found in this category'}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {filter === 'past-events' ? 'Events that have finished will automatically appear here.' : 'Check back later for new announcements.'}
        </p>
      </div>
    )}

    {featured && <article className="card card-pattern mb-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
            isEventPast(featured)
              ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
              : featured.type === 'emergency'
              ? 'bg-red-100 text-red-700'
              : 'bg-brand-100 text-brand-700'
          }`}>
            {isEventPast(featured) ? 'Completed Event' : featured.type === 'emergency' ? 'Urgent update' : featured.type}
          </span>
          {isEventPast(featured) && (
            <span className="text-xs font-semibold text-slate-400">Past event</span>
          )}
        </div>
        <span className="text-xs text-earth-500">{new Date(featured.eventDate || featured.createdAt || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
      </div>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-ink dark:text-white">{featured.title}</h2>
      <p className="mt-3 max-w-3xl leading-7 text-earth-700 dark:text-earth-200">{featured.body}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {!isDeadlinePassed(featured) ? (
          savedReminders.includes(featured._id) ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={15} /> Reminder active
            </span>
          ) : (
            <button onClick={() => handleSaveReminder(featured)} className="btn-primary !py-2 flex items-center gap-1.5">
              <CalendarDays size={16} /> Remind me
            </button>
          )
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-earth-800 px-3.5 py-2 text-xs font-bold text-slate-500">
            Deadline completed
          </span>
        )}
        <button onClick={() => setSelectedNotice(featured)} className="btn-secondary !py-2">Read more / Details</button>
      </div>
    </article>}

    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {remaining.map((notice, index) => {
        const Icon = iconByType[notice.type] || (index % 2 ? Sprout : Droplets);
        const isPast = isEventPast(notice);
        return <article key={notice._id} className={`card relative p-6 flex flex-col justify-between ${notice.type === 'emergency' ? '!border-red-200 bg-red-50/70 dark:bg-red-950/30' : ''}`}>
          <div>
            {notice.isPinned && <div className="absolute right-5 top-5 text-brand-600"><Pin size={18} /></div>}
            <div className={`grid h-12 w-12 place-items-center rounded-2xl ${
              isPast ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : notice.type === 'emergency' ? 'bg-red-100 text-red-700' : notice.type === 'event' ? 'bg-mint-100 text-mint-600' : 'bg-amber-100 text-amber-500'
            }`}><Icon size={22} /></div>
            <div className="mt-5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-earth-500">
              <span>{isPast ? 'Past Event' : notice.type} - {new Date(notice.eventDate || notice.createdAt || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
              {isPast && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">Completed</span>}
            </div>
            <h2 className="mt-2 font-display text-xl font-bold">{notice.title}</h2>
            <p className="mt-3 text-sm leading-6 text-earth-700 dark:text-earth-200 line-clamp-3">{notice.body}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedNotice(notice)}
            className="mt-5 text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200 text-left inline-flex items-center gap-1 cursor-pointer"
          >
            Read more →
          </button>
        </article>;
      })}
    </div>

    {/* Notice Details Modal */}
    <Dialog
      open={Boolean(selectedNotice)}
      onClose={() => setSelectedNotice(null)}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        className: '!rounded-2xl dark:!bg-earth-900 dark:!text-earth-50 !bg-white !text-earth-900 !border dark:!border-earth-700/60 !shadow-2xl',
      }}
    >
      <DialogContent className="!p-7">
        {selectedNotice && (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  selectedNotice.type === 'emergency'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                    : selectedNotice.type === 'event'
                    ? 'bg-mint-100 text-mint-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                }`}>
                  {selectedNotice.type === 'emergency' ? 'Urgent Alert' : selectedNotice.type}
                </span>
                {selectedNotice.isPinned && (
                  <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                    <Pin size={12} /> Pinned
                  </span>
                )}
                {selectedNotice.audience && selectedNotice.audience !== 'all' && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600 dark:bg-earth-800 dark:text-slate-300">
                    For: {selectedNotice.audience}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-earth-800 dark:hover:text-slate-200 transition"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="mt-4 font-display text-2xl font-extrabold text-ink dark:text-white">
              {selectedNotice.title}
            </h2>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-earth-500 dark:text-slate-400 border-b border-slate-100 pb-3 dark:border-slate-800">
              {formatSafeDate(selectedNotice.eventDate, { dateStyle: 'full' }) && (
                <div className="flex items-center gap-1 font-bold text-brand-600 dark:text-brand-400">
                  <CalendarDays size={14} />
                  <span>Event Date: {formatSafeDate(selectedNotice.eventDate, { dateStyle: 'full' })}</span>
                </div>
              )}
              <div>
                Published: {formatSafeDate(selectedNotice.createdAt) || 'Recent'}
              </div>
              {selectedNotice.postedBy?.name && (
                <div>Posted by: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedNotice.postedBy.name}</span></div>
              )}
            </div>

            <div className="mt-4 max-h-[50vh] overflow-y-auto pr-1">
              <p className="leading-7 text-earth-700 dark:text-earth-200 whitespace-pre-wrap text-base">
                {selectedNotice.body}
              </p>

              {selectedNotice.attachments && selectedNotice.attachments.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-2">Attachments</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNotice.attachments.map((file, i) => (
                      <a
                        key={i}
                        href={file}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-slate-700 dark:bg-earth-800 dark:text-brand-400"
                      >
                        Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              {!isDeadlinePassed(selectedNotice) ? (
                savedReminders.includes(selectedNotice._id) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={15} /> Reminder saved
                  </span>
                ) : (
                  <button
                    onClick={() => handleSaveReminder(selectedNotice)}
                    className="btn-primary !py-2 flex items-center gap-1.5"
                  >
                    <CalendarDays size={16} /> Remind me
                  </button>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-earth-800 px-3.5 py-2 text-xs font-bold text-slate-500">
                  Deadline completed
                </span>
              )}
              <button
                onClick={() => setSelectedNotice(null)}
                className="btn-secondary !py-2"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        className: '!rounded-2xl dark:!bg-earth-900 dark:!text-earth-50 !bg-white !text-earth-900 !border dark:!border-earth-700/60 !shadow-2xl',
      }}
    >
      <DialogContent className="!p-7">
        <h2 className="font-display text-2xl font-extrabold">Create announcement</h2>
        <form onSubmit={create} className="mt-6 space-y-4">
          <label><span className="mb-2 block text-sm font-bold">Title</span><input required className="field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label><span className="mb-2 block text-sm font-bold">Message</span><textarea required rows="5" className="field" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-bold">Type</span><select className="field" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>notice</option><option>event</option><option>emergency</option></select></label>
            <label><span className="mb-2 block text-sm font-bold">Audience</span><select className="field" value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}><option value="all">Everyone</option><option value="residents">Residents</option><option value="staff">Staff</option><option value="guards">Security</option></select></label>
          </div>
          <label><span className="mb-2 block text-sm font-bold">Event date / Deadline (optional)</span><input type="datetime-local" className="field" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value, expiresAt: event.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPinned} onChange={(event) => setForm({ ...form, isPinned: event.target.checked })} /> Pin this notice</label>
          <button className="btn-primary w-full">Publish announcement</button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
