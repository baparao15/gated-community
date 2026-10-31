import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart3, Bell, BookOpen, Building, CalendarDays, Car, CircleDollarSign, ClipboardList, Home,
  LogOut, Menu, MessageSquareText, Moon, ShieldCheck, Siren, Store, Sun, UserRound, UsersRound, Wrench, X,
} from 'lucide-react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Brand from './Brand';
import VoiceAssistant from './VoiceAssistant';
import api from '../services/api';
import { clearToast, setSidebar, showToast, toggleDark } from '../store/uiSlice';
import { logout } from '../store/authSlice';
import useApiData from '../hooks/useApiData';
import { asList } from '../utils/apiData';

const shared = [
  { to: '/app/dashboard', label: 'Dashboard', icon: Home },
  { to: '/app/marketplace', label: 'Marketplace', icon: Store },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/chat', label: 'Community Chat', icon: MessageSquareText },
];
const resident = [
  { to: '/app/visitors', label: 'Visitors', icon: UsersRound },
  { to: '/app/complaints', label: 'Maintenance', icon: ClipboardList },
  { to: '/app/payments', label: 'Payments', icon: CircleDollarSign },
  { to: '/app/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/app/notices', label: 'Notices', icon: BookOpen },
  { to: '/app/vehicles', label: 'Vehicles', icon: Car },
  { to: '/app/forum', label: 'Community Forum', icon: MessageSquareText },
  { to: '/app/emergency', label: 'SOS & Emergency', icon: Siren },
  { to: '/app/profile', label: 'My Profile', icon: UserRound },
];
const admin = [
  { to: '/app/residents', label: 'Residents', icon: Building },
  { to: '/app/units', label: 'Units', icon: Home },
  { to: '/app/complaints', label: 'Maintenance', icon: ClipboardList },
  { to: '/app/visitors', label: 'Visitors', icon: UsersRound },
  { to: '/app/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/app/payments', label: 'Revenue', icon: CircleDollarSign },
  { to: '/app/notices', label: 'Announcements', icon: BookOpen },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
  { to: '/app/emergency', label: 'Emergency & SOS', icon: Siren },
];
const guard = [
  { to: '/app/visitors', label: 'Visitor Gate', icon: ShieldCheck },
  { to: '/app/vehicles', label: 'Vehicle Lookup', icon: Car },
  { to: '/app/emergency', label: 'Emergency', icon: Siren },
];
const staff = [
  { to: '/app/complaints', label: 'Assigned Tasks', icon: Wrench },
  { to: '/app/profile', label: 'My Profile', icon: UserRound },
];

// Mobile bottom bar: exactly 4 items per role — two on the left, two on the right,
// with the voice-assistant mic floating in the centre. Profile lives in the top bar.
const mobileByRole = {
  Resident: [
    ['/app/dashboard', Home, 'Home'],
    ['/app/visitors', UsersRound, 'Visitors'],
    ['/app/complaints', ClipboardList, 'Maintenance'],
    ['/app/marketplace', Store, 'Market'],
  ],
  Guard: [
    ['/app/dashboard', Home, 'Home'],
    ['/app/visitors', ShieldCheck, 'Gate'],
    ['/app/vehicles', Car, 'Vehicles'],
    ['/app/emergency', Siren, 'SOS'],
  ],
  Staff: [
    ['/app/dashboard', Home, 'Home'],
    ['/app/complaints', Wrench, 'Tasks'],
    ['/app/marketplace', Store, 'Market'],
    ['/app/settings', Wrench, 'Settings'],
  ],
  Admin: [
    ['/app/dashboard', Home, 'Home'],
    ['/app/residents', Building, 'People'],
    ['/app/complaints', ClipboardList, 'Maintenance'],
    ['/app/reports', BarChart3, 'Reports'],
  ],
  SuperAdmin: [
    ['/app/dashboard', Home, 'Home'],
    ['/app/residents', Building, 'People'],
    ['/app/complaints', ClipboardList, 'Maintenance'],
    ['/app/reports', BarChart3, 'Reports'],
  ],
};

export default function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useSelector((s) => s.auth);
  const { dark, sidebarOpen, toast } = useSelector((s) => s.ui);
  const items = useMemo(() => [...shared, ...(user?.role === 'Resident' ? resident : user?.role === 'Guard' ? guard : user?.role === 'Staff' ? staff : admin)], [user?.role]);
  const { data: unreadData, reload: reloadUnread } = useApiData(token ? '/notifications?isRead=false&limit=1' : null, []);
  const hasUnreadNotifications = asList(unreadData).length > 0;

  useEffect(() => { dispatch(setSidebar(false)); }, [location.pathname]);
  useEffect(() => { if (!token) navigate('/login', { replace: true }); }, [token]);
  useEffect(() => {
    if (token) reloadUnread();
  }, [location.pathname, token, reloadUnread]);
  useEffect(() => {
    const refresh = () => reloadUnread();
    window.addEventListener('notifications:changed', refresh);
    return () => window.removeEventListener('notifications:changed', refresh);
  }, [reloadUnread]);

  const leave = () => { dispatch(logout()); navigate('/'); };
  const roleLabel = { Guard: 'Gate desk', Staff: 'Service team', Resident: 'Resident', Admin: 'Admin', SuperAdmin: 'Super Admin' }[user?.role];
  const verificationLabel = user?.role === 'Resident' ? 'Verified Resident' : user?.role === 'SuperAdmin' ? 'Super Admin' : 'Verified Account';
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const mobileItems = mobileByRole[user?.role] || mobileByRole.Resident;
  const initials = user?.name?.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosCategory, setSosCategory] = useState('medical');
  const [sosLocation, setSosLocation] = useState('');
  const [sosMessage, setSosMessage] = useState('');
  const [sosSubmitting, setSosSubmitting] = useState(false);

  const handleOpenSos = () => {
    setSosCategory('medical');
    setSosLocation('');
    setSosMessage('');
    setSosModalOpen(true);
  };

  const handleSendSos = async (e) => {
    e.preventDefault();
    if (!sosLocation.trim()) {
      dispatch(showToast({ message: 'Please specify where the issue is located', severity: 'error' }));
      return;
    }
    if (!sosMessage.trim()) {
      dispatch(showToast({ message: 'Please describe the emergency issue', severity: 'error' }));
      return;
    }
    setSosSubmitting(true);
    try {
      await api.post('/sos', {
        category: sosCategory,
        location: sosLocation.trim(),
        message: `[Location: ${sosLocation.trim()}] ${sosMessage.trim()}`,
      });
      setSosModalOpen(false);
      setSosLocation('');
      setSosMessage('');
      dispatch(showToast({ message: '🚨 SOS Alert sent! Security desk and admin team have been notified.', severity: 'error' }));
    } catch (err) {
      dispatch(showToast({ message: err.response?.data?.message || 'Could not send SOS alert. Please call security directly.', severity: 'error' }));
    } finally {
      setSosSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas dark:bg-earth-900">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-earth-300/70 bg-canvas/95 p-5 transition-transform dark:border-earth-700 dark:bg-earth-900 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="shrink-0 flex items-center justify-between px-2">
          <Brand />
          <button className="lg:hidden" onClick={() => dispatch(setSidebar(false))}><X /></button>
        </div>
        <div className="mt-8 shrink-0 rounded-2xl bg-white/80 p-4 text-earth-900 shadow-card ring-1 ring-earth-300/70 dark:bg-earth-800 dark:text-earth-50">
          <div className="flex items-center gap-3">
            <div className={`grid h-12 w-12 shrink-0 overflow-hidden place-items-center rounded-full font-display font-bold ring-2 ring-white ${isSuperAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-brand-100 text-brand-600'}`}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="h-full w-full object-cover" />
              ) : (
                initials || '?'
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold leading-tight" title={user?.name}>{user?.name}</div>
              <div className="text-xs text-earth-500">{roleLabel} workspace</div>
            </div>
          </div>
          <div className={`mt-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${isSuperAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-mint-100 text-mint-600'}`}>
            <ShieldCheck size={14} /> {verificationLabel}
          </div>
        </div>
        <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map(({ to, label, icon: Icon }, index) => (
            <NavLink key={`${to}-${index}`} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-brand-100 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100' : 'text-earth-700 hover:bg-earth-100 hover:text-brand-600 dark:text-earth-200 dark:hover:bg-earth-800 dark:hover:text-white'}`}>
              <Icon size={19} /> {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={leave} className="mt-4 shrink-0 flex items-center justify-center gap-3 rounded-xl bg-earth-200 px-4 py-4 text-sm font-bold text-brand-700 hover:bg-brand-100 dark:bg-earth-800 dark:text-brand-100 dark:hover:bg-earth-700 transition"><LogOut size={19} /> Logout</button>
      </aside>

      {sidebarOpen && <button aria-label="Close menu" onClick={() => dispatch(setSidebar(false))} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}

      <div className="lg:pl-72 min-w-0 max-w-full">
        <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-earth-300/60 px-3 dark:border-earth-700 md:h-20 md:px-8">
          <div className="flex items-center gap-2.5">
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-earth-300 bg-white text-brand-600 transition active:scale-95 dark:border-earth-700 dark:bg-earth-900 dark:text-brand-300 lg:hidden" onClick={() => dispatch(setSidebar(true))} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="lg:hidden">
              <Brand size="sm" />
            </div>
            <div className="hidden text-sm text-earth-700 dark:text-earth-300 lg:block"><span className="status-dot mr-2 bg-mint-500" />Community services online</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* mic only on desktop — on mobile it lives in the bottom nav FAB */}
            <span className="hidden lg:flex">
              <VoiceAssistant variant="button" />
            </span>
            <button onClick={() => dispatch(toggleDark())} className="grid h-10 w-10 place-items-center rounded-xl border border-earth-300 bg-white text-earth-700 dark:border-earth-700 dark:bg-earth-900 dark:text-earth-200">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <NavLink to="/app/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl border border-earth-300 bg-white text-earth-700 dark:border-earth-700 dark:bg-earth-900 dark:text-earth-200">
              <Bell size={19} />{hasUnreadNotifications && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />}
            </NavLink>
            <div className="ml-1 hidden text-right sm:block"><div className="text-sm font-bold text-earth-900 dark:text-earth-50">{user?.name}</div><div className="text-xs text-earth-500">{roleLabel}</div></div>
            <NavLink
              to="/app/profile"
              title="My profile"
              aria-label="My profile"
              className={({ isActive }) => `grid h-10 w-10 shrink-0 overflow-hidden place-items-center rounded-full text-sm font-bold ring-1 transition ${isActive ? 'bg-brand-600 text-white ring-brand-600' : 'bg-brand-100 text-brand-700 ring-earth-300 hover:bg-brand-200 dark:bg-earth-800 dark:text-brand-100 dark:ring-earth-700'}`}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="h-full w-full object-cover" />
              ) : (
                initials || <UserRound size={19} />
              )}
            </NavLink>
          </div>
        </header>
        <main className="w-full min-w-0 max-w-full overflow-x-hidden px-3 py-4 pb-32 md:p-8 lg:pb-8"><Outlet /></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <div className="relative mx-3 mb-3 pb-safe">
          {/* white cradle that bumps up around the floating mic */}
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-16 w-[4.75rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-earth-900" />
          <div className="relative flex items-stretch rounded-[1.9rem] bg-white px-1.5 shadow-[0_14px_38px_-10px_rgba(76,29,20,0.32)] dark:bg-earth-900">
            {[
              mobileItems[0],
              'divider',
              mobileItems[1],
              'well',
              mobileItems[2],
              'divider',
              mobileItems[3],
            ].map((entry, index) => {
              if (entry === 'divider') return <span key={`d${index}`} className="my-4 w-px shrink-0 self-stretch bg-earth-200/70 dark:bg-earth-700/70" />;
              if (entry === 'well') return <span key="well" className="w-16 shrink-0" aria-hidden="true" />;
              const [to, Icon, label] = entry;
              return (
                <NavLink key={to} to={to} className="flex flex-1 items-center justify-center py-2.5">
                  {({ isActive }) => (
                    <div className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-bold transition ${isActive ? 'bg-brand-50 text-brand-600 dark:bg-brand-700/25 dark:text-brand-50' : 'text-earth-500 dark:text-earth-300'}`}>
                      <Icon size={22} strokeWidth={2} />
                      <span className="whitespace-nowrap">{label}</span>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
          <VoiceAssistant />
        </div>
      </nav>
      {user?.role === 'Resident' && (
        <button
          type="button"
          onClick={handleOpenSos}
          title="Trigger Emergency SOS"
          aria-label="Trigger Emergency SOS"
          className="fixed bottom-36 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-600/40 transition active:scale-90 hover:bg-red-700 md:bottom-28 md:right-5 cursor-pointer"
        >
          <Siren size={22} className="animate-pulse" />
        </button>
      )}

      {/* Emergency SOS Pop-up Modal */}
      <Dialog
        open={sosModalOpen}
        onClose={() => !sosSubmitting && setSosModalOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          className: '!rounded-2xl dark:!bg-earth-900 dark:!text-earth-50 !bg-white !text-earth-900 !border !border-red-200 dark:!border-red-900/60 !shadow-2xl overflow-hidden',
        }}
      >
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Siren size={22} className="animate-bounce" />
              </div>
              <div>
                <h2 className="font-display text-lg font-extrabold leading-tight">Emergency SOS Alert</h2>
                <p className="text-xs text-red-100">Broadcasts instant alert to security & admin</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSosModalOpen(false)}
              disabled={sosSubmitting}
              className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <DialogContent className="!p-6">
          <form onSubmit={handleSendSos} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-earth-600 dark:text-earth-300">
                Emergency Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'medical', label: '🏥 Medical' },
                  { id: 'fire', label: '🔥 Fire' },
                  { id: 'security', label: '🛡️ Security' },
                  { id: 'other', label: '⚠️ Other' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSosCategory(id)}
                    className={`rounded-xl border py-2 text-xs font-bold transition ${
                      sosCategory === id
                        ? 'border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/50 dark:text-red-300'
                        : 'border-earth-200 text-earth-700 hover:border-earth-300 dark:border-earth-700 dark:text-earth-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-earth-600 dark:text-earth-300">
                Where is the issue? (Location / Apartment) <span className="text-red-500">*</span>
              </label>
              <input
                required
                className="field"
                placeholder="e.g. Apt A-101, Block B Elevator, Clubhouse"
                value={sosLocation}
                onChange={(e) => setSosLocation(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-earth-600 dark:text-earth-300">
                What is the issue? (Details) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                className="field"
                placeholder="Describe what happened, any immediate dangers or assistance required..."
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={sosSubmitting}
                onClick={() => setSosModalOpen(false)}
                className="btn-secondary !py-2.5 !px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sosSubmitting}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700 active:scale-95 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                <Siren size={16} /> {sosSubmitting ? 'Sending Alert…' : 'Send SOS Alert'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => dispatch(clearToast())}><Alert variant="filled" severity={toast?.severity || 'success'}>{toast?.message}</Alert></Snackbar>
    </div>
  );
}
