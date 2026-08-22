import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CircleDollarSign,
  ClipboardCheck,
  Home,
  IndianRupee,
  Landmark,
  ShieldCheck,
  UserCheck,
  UsersRound,
  Wrench,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import useApiData from '../hooks/useApiData';
import { asList, currency, unitLabel } from '../utils/apiData';

const firstName = (name) => name?.split(' ')[0] || 'there';

const colorClass = (color) => ({
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600',
  violet: 'bg-violet-50 text-violet-600',
  red: 'bg-red-50 text-red-600',
  earth: 'bg-earth-100 text-brand-700',
}[color] || 'bg-earth-100 text-brand-700');

export default function DashboardPage() {
  const user = useSelector((s) => s.auth.user);
  const role = user?.role || 'Resident';
  const isAdmin = role === 'Admin' || role === 'SuperAdmin';
  const isGuard = role === 'Guard';
  const isStaff = role === 'Staff';
  const isResident = role === 'Resident';

  const { data: noticesData } = useApiData('/announcements?limit=4', []);
  const { data: overview } = useApiData(isAdmin ? '/dashboard/overview' : null, {});
  const { data: security } = useApiData(isGuard ? '/security/dashboard' : null, { activeVisitors: [], todayStats: {}, pendingApprovals: [] });
  const { data: staffTasksData } = useApiData(isStaff ? '/complaints/assigned/me' : null, []);
  const { data: residentVisitorsData } = useApiData(isResident ? '/visitors/my?limit=50' : null, []);
  const { data: residentComplaintsData } = useApiData(isResident ? '/complaints/my?limit=50' : null, []);
  const { data: residentBookingsData } = useApiData(isResident ? '/bookings/my?limit=50' : null, []);
  const { data: residentInvoicesData } = useApiData(isResident ? '/invoices/my?limit=50' : null, []);

  const notices = asList(noticesData);
  const staffTasks = asList(staffTasksData);
  const residentVisitors = asList(residentVisitorsData);
  const residentComplaints = asList(residentComplaintsData);
  const residentBookings = asList(residentBookingsData);
  const residentInvoices = asList(residentInvoicesData);
  const today = new Date().toDateString();

  const outstanding = residentInvoices
    .filter((invoice) => !['paid', 'cancelled'].includes(invoice.status))
    .reduce((sum, invoice) => sum + ((invoice.totalAmount || 0) - (invoice.paidAmount || 0)), 0);
  const todaysVisitors = residentVisitors.filter((visitor) => new Date(visitor.validFrom || visitor.createdAt || Date.now()).toDateString() === today);
  const activeComplaints = residentComplaints.filter((complaint) => !['resolved', 'closed'].includes(complaint.status));
  const upcomingBookings = residentBookings.filter((booking) => new Date(booking.slotStart || 0) > new Date() && !['cancelled', 'rejected'].includes(booking.status));

  const dashboard = getDashboardModel({
    isAdmin,
    isGuard,
    isStaff,
    overview,
    security,
    staffTasks,
    outstanding,
    todaysVisitors,
    activeComplaints,
    upcomingBookings,
    notices,
  });

  const initials = user?.name?.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      {/* ── DESKTOP LAYOUT ──────────────────────────────── */}
      <div className="hidden sm:block">
        <PageHeader
          eyebrow="Panchayat community hub"
          title={`Welcome back, ${firstName(user?.name)}`}
          description={dashboard.shortIntro}
        />

        <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <section className="card p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Quick actions</h2>
              <span className="text-xs text-earth-500">Things you do most</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5">
              {dashboard.actions.map(({ label, icon: Icon, to, color }) => (
                <Link key={label} to={to} className="min-h-28 rounded-2xl border border-earth-300/70 bg-white/80 p-3 transition active:scale-[.98] hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-earth-700 dark:bg-earth-900 sm:flex sm:min-h-0 sm:items-center sm:gap-4 sm:p-4">
                  <div className={`grid h-11 w-11 place-items-center rounded-2xl ${colorClass(color)}`}><Icon size={20} /></div>
                  <span className="mt-3 block text-sm font-extrabold leading-tight sm:mt-0 sm:text-base">{label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand-600 via-brand-700 to-earth-900 text-white shadow-soft">
            <div className="relative p-5 sm:p-6">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 left-10 h-28 w-28 rounded-full bg-amber-100/10" />
              <div className="relative">
                <div className="eyebrow !text-brand-100">Community snapshot</div>
                <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{dashboard.snapshotTitle}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-brand-100">{dashboard.snapshotText}</p>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {dashboard.snapshot.map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white/12 p-3 text-center ring-1 ring-white/10 backdrop-blur">
                      <div className="font-display text-2xl font-extrabold">{item.value}</div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-brand-100">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="card p-4 sm:p-6">
            <div className="flex justify-between">
              <h2 className="section-title">Gram notices</h2>
              <Link to="/app/notices" className="text-sm font-bold text-brand-600">View all</Link>
            </div>
            <div className="mt-4 divide-y divide-earth-300/70 dark:divide-earth-700">
              {notices.map((notice) => (
                <div key={notice._id} className="flex gap-4 py-4">
                  <div className={`mt-1 h-10 w-1 rounded-full ${notice.type === 'emergency' ? 'bg-red-500' : notice.type === 'event' ? 'bg-emerald-500' : 'bg-brand-500'}`} />
                  <div>
                    <div className="font-bold">{notice.title}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-earth-500">{notice.body || notice.message}</div>
                  </div>
                </div>
              ))}
              {!notices.length && <div className="py-5 text-sm text-earth-500">No notices published yet.</div>}
            </div>
          </section>
        </div>

        <section className="card mt-5 p-4 sm:p-6">
          <div className="flex justify-between">
            <h2 className="section-title">{dashboard.activityTitle}</h2>
            <Link to={dashboard.activityLink} className="text-sm font-bold text-brand-600">Open</Link>
          </div>
          <div className="mt-5 space-y-3">
            {dashboard.activityItems.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-2xl border border-earth-300/70 p-3 dark:border-earth-700 sm:gap-4 sm:p-4">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl sm:h-11 sm:w-11 ${colorClass(item.color)}`}><item.icon size={19} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-earth-500">{item.description}</div>
                </div>
                {item.status && <StatusBadge value={item.status} />}
              </div>
            ))}
            {!dashboard.activityItems.length && <div className="text-sm text-earth-500">{dashboard.emptyActivity}</div>}
          </div>
        </section>
      </div>

      {/* ── MOBILE LAYOUT ──────── */}
      <div className="sm:hidden -mx-3 -mt-4">

        {/* Greeting header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-earth-400">{greeting}</p>
            <h1 className="mt-0.5 font-display text-[1.45rem] font-extrabold leading-tight text-ink dark:text-earth-50">
              {firstName(user?.name)} 👋
            </h1>
          </div>
          <Link
            to="/app/notifications"
            className="relative grid h-10 w-10 place-items-center rounded-2xl border border-earth-200 bg-white shadow-sm active:scale-95 transition-transform dark:border-earth-700 dark:bg-earth-800"
          >
            <Bell size={19} className="text-earth-600 dark:text-earth-200" />
          </Link>
        </div>

        {/* Hero gradient card */}
        <div className="mx-4 overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-brand-600 via-brand-700 to-earth-900 text-white shadow-xl shadow-brand-900/20">
          <div className="relative p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-amber-100/10" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 font-display text-base font-extrabold ring-2 ring-white/30">
                  {initials || '?'}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand-200">Panchayat Hub</div>
                  <div className="text-sm font-bold text-white leading-tight">{dashboard.snapshotTitle}</div>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-brand-100 mb-4">{dashboard.snapshotText}</p>
              <div className="grid grid-cols-3 gap-2">
                {dashboard.snapshot.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/12 py-3 text-center ring-1 ring-white/10">
                    <div className="font-display text-2xl font-extrabold">{item.value}</div>
                    <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-200">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions — horizontal icon pills */}
        <div className="mt-6 px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-extrabold text-ink dark:text-earth-50">Quick actions</h2>
            <span className="text-[11px] font-semibold text-earth-400">Tap to open</span>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {dashboard.actions.map(({ label, icon: Icon, to, color }) => {
              const pillColors = {
                blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', icon: 'text-blue-600', ring: 'ring-blue-100 dark:ring-blue-800' },
                green: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: 'text-emerald-600', ring: 'ring-emerald-100 dark:ring-emerald-800' },
                orange: { bg: 'bg-orange-50 dark:bg-orange-950/40', icon: 'text-orange-500', ring: 'ring-orange-100 dark:ring-orange-800' },
                violet: { bg: 'bg-violet-50 dark:bg-violet-950/40', icon: 'text-violet-600', ring: 'ring-violet-100 dark:ring-violet-800' },
                red: { bg: 'bg-red-50 dark:bg-red-950/40', icon: 'text-red-600', ring: 'ring-red-100 dark:ring-red-800' },
                earth: { bg: 'bg-earth-100 dark:bg-earth-800', icon: 'text-brand-700', ring: 'ring-earth-200 dark:ring-earth-700' },
              }[color] || { bg: 'bg-earth-100 dark:bg-earth-800', icon: 'text-brand-700', ring: 'ring-earth-200' };
              return (
                <Link key={label} to={to} className="flex shrink-0 flex-col items-center gap-2 active:scale-90 transition-transform">
                  <div className={`grid h-16 w-16 place-items-center rounded-[1.1rem] ${pillColors.bg} ring-1 ${pillColors.ring} shadow-sm`}>
                    <Icon size={26} className={pillColors.icon} />
                  </div>
                  <span className="w-[4.5rem] text-center text-[11px] font-bold leading-tight text-earth-700 dark:text-earth-300">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Notices — horizontal scroll cards */}
        {notices.length > 0 && (
          <div className="mt-7">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-[15px] font-extrabold text-ink dark:text-earth-50">Gram notices</h2>
              <Link to="/app/notices" className="text-xs font-bold text-brand-600">See all ›</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
              {notices.map((notice) => {
                const isEmergency = notice.type === 'emergency';
                const isEvent = notice.type === 'event';
                const accent = isEmergency ? 'bg-red-500' : isEvent ? 'bg-emerald-500' : 'bg-brand-500';
                const cardBg = isEmergency
                  ? 'bg-red-50 dark:bg-red-950/30'
                  : isEvent
                  ? 'bg-emerald-50 dark:bg-emerald-950/30'
                  : 'bg-brand-50 dark:bg-brand-950/30';
                const tag = isEmergency ? '🚨 Emergency' : isEvent ? '🎉 Event' : '📢 Notice';
                return (
                  <div key={notice._id} className={`relative shrink-0 w-56 rounded-2xl ${cardBg} p-4 overflow-hidden`}>
                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${accent}`} />
                    <div className="ml-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-earth-400">{tag}</span>
                      <div className="mt-1 text-sm font-extrabold leading-snug text-ink dark:text-earth-50 line-clamp-2">
                        {notice.title}
                      </div>
                      <div className="mt-1.5 text-[11px] text-earth-500 line-clamp-2">
                        {notice.body || notice.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity feed */}
        <div className="mt-7 px-4 pb-44">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-extrabold text-ink dark:text-earth-50">{dashboard.activityTitle}</h2>
            <Link to={dashboard.activityLink} className="text-xs font-bold text-brand-600">Open ›</Link>
          </div>

          {dashboard.activityItems.length === 0 ? (
            <div className="rounded-2xl border border-earth-200 bg-white/80 dark:border-earth-700 dark:bg-earth-900 px-4 py-8 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-semibold text-earth-500">{dashboard.emptyActivity}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.activityItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-earth-200/70 bg-white/90 p-3.5 shadow-sm dark:border-earth-700 dark:bg-earth-900">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-[0.875rem] ${colorClass(item.color)}`}>
                    <item.icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-ink dark:text-earth-50">{item.title}</div>
                    <div className="mt-0.5 truncate text-[11px] text-earth-500">{item.description}</div>
                  </div>
                  {item.status && <StatusBadge value={item.status} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function getDashboardModel(ctx) {
  if (ctx.isAdmin) return adminModel(ctx);
  if (ctx.isGuard) return guardModel(ctx);
  if (ctx.isStaff) return staffModel(ctx);
  return residentModel(ctx);
}

function residentModel({ outstanding, todaysVisitors, activeComplaints, upcomingBookings, notices }) {
  return {
    shortIntro: outstanding ? `${currency(outstanding)} due. Everything else is one tap away.` : 'Your home desk is ready for today.',
    actions: [
      { label: 'Pre-approve visitor', icon: UsersRound, to: '/app/visitors', color: 'blue' },
      { label: 'Report maintenance', icon: Wrench, to: '/app/complaints', color: 'orange' },
      { label: 'Book facility', icon: CalendarCheck, to: '/app/bookings', color: 'green' },
      { label: 'Pay dues', icon: CircleDollarSign, to: '/app/payments', color: 'violet' },
    ],
    snapshotTitle: outstanding ? `${currency(outstanding)} due` : 'Your household is up to date',
    snapshotText: 'Visitors, notices, payments and bookings are gathered into a compact mobile home screen.',
    snapshot: [
      { label: 'Visitors', value: todaysVisitors.length },
      { label: 'Issues', value: activeComplaints.length },
      { label: 'Bookings', value: upcomingBookings.length },
    ],
    activityTitle: 'Upcoming bookings',
    activityLink: '/app/bookings',
    emptyActivity: 'No upcoming bookings yet.',
    activityItems: upcomingBookings.slice(0, 3).map((booking) => ({
      id: booking._id,
      icon: CalendarCheck,
      color: 'blue',
      title: booking.facility?.name || 'Facility booking',
      description: `${new Date(booking.slotStart).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} - ${booking.purpose || booking.status}`,
      status: booking.status,
    })),
  };
}

function adminModel({ overview, notices }) {
  const attentionItems = [
    [`${overview.residents?.pending || 0} resident approvals`, 'New registrations awaiting review', 'orange', UsersRound],
    [`${overview.complaints?.open || 0} open issues`, 'Community service requests waiting for action', 'blue', Wrench],
    [`${currency(overview.dues?.overdue || 0)} dues`, 'Outstanding community collections', 'violet', IndianRupee],
  ];

  return {
    shortIntro: 'A compact view of people, notices, dues and service work.',
    actions: [
      { label: 'Manage residents', icon: UsersRound, to: '/app/residents', color: 'blue' },
      { label: 'Add announcement', icon: BookOpen, to: '/app/notices', color: 'orange' },
      { label: 'Review visitors', icon: ShieldCheck, to: '/app/visitors', color: 'green' },
      { label: 'Open reports', icon: ClipboardCheck, to: '/app/reports', color: 'violet' },
    ],
    snapshotTitle: 'Community desk overview',
    snapshotText: 'Resident registrations, service issues and notices stay visible without leaving the app home.',
    snapshot: [
      { label: 'Notices', value: notices.length },
      { label: 'Residents', value: overview.residents?.total || 0 },
      { label: 'Issues', value: overview.complaints?.open || 0 },
    ],
    activityTitle: 'Needs attention',
    activityLink: '/app/reports',
    emptyActivity: 'No urgent community items right now.',
    activityItems: attentionItems.map(([title, description, color, icon]) => ({
      id: title,
      icon,
      color,
      title,
      description,
    })),
  };
}

function guardModel({ security, notices }) {
  const liveVisitors = [...(security.activeVisitors || []), ...(security.pendingApprovals || [])];

  return {
    shortIntro: 'Gate activity, visitor entries and emergency desk in one mobile view.',
    actions: [
      { label: 'Visitor gate', icon: ShieldCheck, to: '/app/visitors', color: 'blue' },
      { label: 'Vehicle lookup', icon: Home, to: '/app/vehicles', color: 'green' },
      { label: 'Emergency desk', icon: Bell, to: '/app/emergency', color: 'red' },
      { label: 'Read notices', icon: BookOpen, to: '/app/notices', color: 'orange' },
    ],
    snapshotTitle: 'Gate desk overview',
    snapshotText: "Today's entries, exits and resident approvals stay in one app-style control view.",
    snapshot: [
      { label: 'Inside', value: security.activeVisitors?.length || 0 },
      { label: 'Pending', value: security.pendingApprovals?.length || 0 },
      { label: 'Notices', value: notices.length },
    ],
    activityTitle: 'Live visitors',
    activityLink: '/app/visitors',
    emptyActivity: 'No visitors are waiting at the gate.',
    activityItems: liveVisitors.slice(0, 4).map((visitor) => ({
      id: visitor._id,
      icon: UserCheck,
      color: visitor.status === 'checked-in' ? 'green' : 'orange',
      title: visitor.name,
      description: `${visitor.purpose || 'Visit'} - ${visitor.host?.name || 'Resident'} - ${unitLabel(visitor.unit)}`,
      status: visitor.status,
    })),
  };
}

function staffModel({ staffTasks, notices }) {
  const activeTasks = staffTasks.filter((task) => !['resolved', 'closed'].includes(task.status));

  return {
    shortIntro: 'Assigned service work and updates arranged for quick mobile handling.',
    actions: [
      { label: 'View assigned issues', icon: Wrench, to: '/app/complaints', color: 'orange' },
      { label: 'My earnings & tasks', icon: IndianRupee, to: '/app/complaints', color: 'green' },
      { label: 'Read notices', icon: BookOpen, to: '/app/notices', color: 'blue' },
      { label: 'My profile', icon: UsersRound, to: '/app/profile', color: 'violet' },
    ],
    snapshotTitle: 'Service desk overview',
    snapshotText: 'Assigned community issues and updates are grouped into the same mobile home layout.',
    snapshot: [
      { label: 'Active', value: activeTasks.length },
      { label: 'Done', value: staffTasks.length - activeTasks.length },
      { label: 'Notices', value: notices.length },
    ],
    activityTitle: 'Assigned issues',
    activityLink: '/app/complaints',
    emptyActivity: 'No assigned issues right now.',
    activityItems: activeTasks.slice(0, 4).map((task) => ({
      id: task._id,
      icon: Wrench,
      color: task.status === 'in-progress' ? 'orange' : 'blue',
      title: `${task.category} request`,
      description: `${task.raisedBy?.name || 'Resident'} - ${unitLabel(task.unit)} - ${task.description}`,
      status: task.status,
    })),
  };
}
