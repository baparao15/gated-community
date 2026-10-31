import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { QRCodeSVG } from 'qrcode.react';
import { Bell, Car, CheckCheck, Heart, MessageCircle, Plus, Search, Send, Share2, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import useApiData from '../hooks/useApiData';
import api from '../services/api';
import { showToast } from '../store/uiSlice';
import { asList } from '../utils/apiData';

export function VehiclesPage() {
  const role = useSelector((s) => s.auth.user?.role);
  const endpoint = role === 'Resident' ? '/vehicles/my' : '/vehicles';
  const { data, setData } = useApiData(endpoint, []);
  const list = asList(data);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ vehicleNumber: '', type: 'car', make: '', model: '', color: '', parkingSlot: '' });
  const dispatch = useDispatch();
  const visible = list.filter((vehicle) => [
    vehicle.vehicleNumber,
    vehicle.owner?.name,
    vehicle.unit?.unitNumber,
    vehicle.parkingSlot,
    vehicle.make,
    vehicle.model,
    vehicle.color,
  ].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));

  const add = async (event) => {
    event.preventDefault();
    try {
      const { data: response } = await api.post('/vehicles', form);
      setData([response.data, ...list]);
      setOpen(false);
      setForm({ vehicleNumber: '', type: 'car', make: '', model: '', color: '', parkingSlot: '' });
      dispatch(showToast({ message: 'Vehicle registered' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Vehicle could not be registered', severity: 'error' }));
    }
  };

  return <>
    <PageHeader
      eyebrow="Parking & access"
      title={role === 'Resident' ? 'My vehicles' : 'Vehicle lookup'}
      description="Keep resident vehicles, parking assignments and gate identification organized."
      action={role === 'Resident' ? <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={18} /> Add vehicle</button> : null}
    />
    <div className="relative mb-5 max-w-md">
      <Search className="absolute left-3 top-3 text-slate-400" size={17} />
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="search-input" placeholder="Search vehicle, owner, unit" />
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      {visible.map((vehicle) => <article key={vehicle._id} className="card p-6">
        <div className="flex items-start justify-between">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-brand-600"><Car /></div>
          <StatusBadge value={vehicle.isActive ? 'active' : 'inactive'} />
        </div>
        <div className="mt-5 font-display text-2xl font-extrabold tracking-wide">{vehicle.vehicleNumber}</div>
        <div className="mt-2 text-sm text-slate-500">{[vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(' - ')}</div>
        <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Parking slot</div>
            <div className="font-bold">{vehicle.parkingSlot || 'Not assigned'}</div>
          </div>
          <div className="rounded-xl bg-white p-2 shadow-card"><QRCodeSVG value={vehicle.vehicleNumber} size={52} /></div>
        </div>
      </article>)}
    </div>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogContent className="!p-7">
        <h2 className="font-display text-2xl font-extrabold">Register a vehicle</h2>
        <form onSubmit={add} className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            ['Vehicle number', 'vehicleNumber'],
            ['Make', 'make'],
            ['Model', 'model'],
            ['Color', 'color'],
            ['Parking slot', 'parkingSlot'],
          ].map(([label, key]) => <label key={key}>
            <span className="mb-2 block text-sm font-bold">{label}</span>
            <input required={key === 'vehicleNumber'} className="field" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
          </label>)}
          <label>
            <span className="mb-2 block text-sm font-bold">Type</span>
            <select className="field" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              {['car', 'motorcycle', 'bicycle', 'scooter', 'other'].map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <button className="btn-primary sm:col-span-2">Save vehicle</button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

export function ForumPage() {
  const { data, setData } = useApiData('/forum/posts', []);
  const posts = asList(data);
  const user = useSelector((s) => s.auth.user);
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'general' });
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState({});
  const dispatch = useDispatch();

  const create = async (event) => {
    event.preventDefault();
    try {
      const { data: response } = await api.post('/forum/posts', form);
      setData([response.data, ...posts]);
      setOpen(false);
      setForm({ title: '', body: '', category: 'general' });
      dispatch(showToast({ message: 'Post published' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Post could not be published', severity: 'error' }));
    }
  };

  const like = async (post) => {
    try {
      const { data: response } = await api.post(`/forum/posts/${post._id}/like`);
      setData(posts.map((item) => (
        item._id === post._id
          ? { ...item, likesCount: response.data.likes, likes: Array.from({ length: response.data.likes }) }
          : item
      )));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Post could not be liked', severity: 'error' }));
    }
  };

  const toggleComments = (postId) => {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleCommentChange = (postId, value) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: value,
    }));
  };

  const handleCommentSubmit = async (event, postId) => {
    event.preventDefault();
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;

    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    try {
      const { data: response } = await api.post(`/forum/posts/${postId}/comment`, { body: text });
      const newComment = response.data;
      const formattedComment = {
        ...newComment,
        author: newComment?.author?.name ? newComment.author : { _id: user?._id, name: user?.name || 'Resident', role: user?.role },
      };

      setData(posts.map((item) => (
        item._id === postId
          ? { ...item, comments: [...(item.comments || []), formattedComment] }
          : item
      )));

      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      dispatch(showToast({ message: 'Comment added' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not post comment', severity: 'error' }));
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await api.delete(`/forum/posts/${postId}/comments/${commentId}`);
      setData(posts.map((item) => (
        item._id === postId
          ? { ...item, comments: (item.comments || []).filter((c) => c._id !== commentId) }
          : item
      )));
      dispatch(showToast({ message: 'Comment deleted' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not delete comment', severity: 'error' }));
    }
  };

  const visible = category === 'all' ? posts : posts.filter((post) => post.category === category);

  return <>
    <PageHeader eyebrow="Neighbourhood conversations" title="Community forum" description="Ask, share, trade and connect with the people around you." action={<button onClick={() => setOpen(true)} className="btn-primary"><Plus size={18} /> Create post</button>} />
    <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
      {['all', 'general', 'events', 'buy-sell', 'help', 'feedback'].map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold capitalize transition ${category === item ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:text-brand-600 dark:bg-earth-800 dark:text-slate-300 dark:hover:text-white'}`}>{item.replace('-', ' / ')}</button>)}
    </div>
    <div className="mx-auto max-w-3xl space-y-5">
      {visible.map((post) => <article key={post._id} className="card p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 font-bold text-white">{post.author?.name?.split(' ').map((x) => x[0]).join('').slice(0, 2)}</div>
          <div>
            <div className="font-bold">{post.author?.name}</div>
            <div className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} - {post.category}</div>
          </div>
        </div>
        <h2 className="mt-5 font-display text-xl font-bold">{post.title}</h2>
        <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">{post.body}</p>
        <div className="mt-5 flex gap-5 border-t border-slate-100 pt-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <button onClick={() => like(post)} className="flex items-center gap-2 hover:text-red-500 dark:hover:text-red-400"><Heart size={18} /> {post.likes?.length || 0}</button>
          <button
            onClick={() => toggleComments(post._id)}
            className={`flex items-center gap-2 transition hover:text-brand-600 dark:hover:text-brand-300 ${openComments[post._id] ? 'text-brand-600 dark:text-brand-400 font-extrabold' : ''}`}
            aria-expanded={Boolean(openComments[post._id])}
          >
            <MessageCircle size={18} />
            <span>Comment</span>
            {(post.comments?.length || 0) > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-earth-800 dark:text-slate-300">
                {post.comments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(post.title);
                dispatch(showToast({ message: 'Post title copied to clipboard' }));
              }
            }}
            className="flex items-center gap-2 hover:text-brand-600 dark:hover:text-brand-300"
          >
            <Share2 size={18} /> Share
          </button>
        </div>

        {openComments[post._id] && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="space-y-3 mb-4">
              {(!post.comments || post.comments.length === 0) ? (
                <p className="py-2 text-xs text-slate-400 italic">No comments yet. Be the first to join the conversation!</p>
              ) : (
                post.comments.map((comment, idx) => {
                  const authorName = comment.author?.name || 'Resident';
                  const initials = authorName.split(' ').map((x) => x[0]).join('').slice(0, 2);
                  const isAuthor = user && (
                    comment.author?._id === user._id ||
                    comment.author === user._id ||
                    ['Admin', 'SuperAdmin'].includes(user.role)
                  );

                  return (
                    <div key={comment._id || idx} className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-earth-900/60">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-xs text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {authorName}
                            {comment.author?.role && comment.author.role !== 'Resident' && (
                              <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                                {comment.author.role}
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }) : 'Just now'}
                            </span>
                            {isAuthor && (
                              <button
                                onClick={() => handleDeleteComment(post._id, comment._id)}
                                className="text-slate-400 hover:text-red-500 transition p-0.5"
                                title="Delete comment"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                          {comment.body}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={(e) => handleCommentSubmit(e, post._id)} className="flex items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {user?.name?.split(' ').map((x) => x[0]).join('').slice(0, 2) || 'ME'}
              </div>
              <input
                type="text"
                value={commentDrafts[post._id] || ''}
                onChange={(e) => handleCommentChange(post._id, e.target.value)}
                placeholder="Write a comment..."
                className="field !py-2 !text-sm flex-1"
                disabled={commentSubmitting[post._id]}
              />
              <button
                type="submit"
                disabled={!commentDrafts[post._id]?.trim() || commentSubmitting[post._id]}
                className="btn-primary !px-3.5 !py-2 !text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={15} />
                <span className="hidden sm:inline">Post</span>
              </button>
            </form>
          </div>
        )}
      </article>)}
    </div>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogContent className="!p-7">
        <h2 className="font-display text-2xl font-extrabold">Start a discussion</h2>
        <form onSubmit={create} className="mt-6 space-y-4">
          <input required className="field" placeholder="Post title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <textarea required className="field" rows="6" placeholder="What would you like to share?" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
          <select className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['general', 'events', 'buy-sell', 'help', 'feedback', 'other'].map((item) => <option key={item}>{item}</option>)}</select>
          <button className="btn-primary w-full">Publish post</button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

export function NotificationsPage() {
  const { data, setData } = useApiData('/notifications', []);
  const list = asList(data);
  const [filter, setFilter] = useState('all');
  const dispatch = useDispatch();

  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      setData(list.map((notification) => ({ ...notification, isRead: true })));
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Notifications could not be updated', severity: 'error' }));
    }
  };

  const markOne = async (notification) => {
    if (notification.isRead) return;
    try {
      const { data: response } = await api.patch(`/notifications/${notification._id}/read`);
      setData(list.map((item) => (item._id === notification._id ? response.data : item)));
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Notification could not be opened', severity: 'error' }));
    }
  };

  const visible = filter === 'all' ? list : list.filter((notification) => notification.type.includes(filter));

  return <>
    <PageHeader eyebrow="Your updates" title="Notification center" description="Arrivals, approvals, service updates and payment reminders - all in one calm feed." action={<button onClick={markAll} className="btn-secondary"><CheckCheck size={18} /> Mark all read</button>} />
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">{['all', 'visitor', 'complaint', 'booking', 'invoice'].map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold capitalize transition ${filter === item ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:text-brand-600 dark:bg-earth-800 dark:text-slate-300 dark:hover:text-white'}`}>{item}</button>)}</div>
    <section className="card overflow-hidden">
      {visible.map((notification) => <button key={notification._id} onClick={() => markOne(notification)} className={`flex w-full gap-4 border-b border-slate-100 p-5 text-left last:border-0 dark:border-slate-800 ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${!notification.isRead ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}><Bell size={19} /></div>
        <div className="flex-1">
          <div className="flex justify-between gap-3">
            <div className="font-bold">{notification.title}</div>
            <div className="text-xs text-slate-400">{new Date(notification.createdAt).toLocaleDateString('en-IN')}</div>
          </div>
          <div className="mt-1 text-sm text-slate-500">{notification.message}</div>
        </div>
        {!notification.isRead && <span className="mt-2 h-2 w-2 rounded-full bg-brand-600" />}
      </button>)}
    </section>
  </>;
}
