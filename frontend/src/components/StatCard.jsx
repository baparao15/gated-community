import { ArrowUpRight } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, color = 'blue', hint, trend }) {
  const colors = {
    blue: 'bg-brand-100 text-brand-600 dark:bg-brand-950',
    green: 'bg-mint-100 text-mint-600 dark:bg-mint-600/20',
    orange: 'bg-amber-100 text-amber-500 dark:bg-amber-700/20',
    violet: 'bg-brand-50 text-brand-700 dark:bg-brand-700/20',
    red: 'bg-red-100 text-red-700 dark:bg-red-950',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${colors[color]}`}><Icon size={21} /></div>
        {trend && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><ArrowUpRight size={14} />{trend}</span>}
      </div>
      <div className="mt-5 text-sm font-semibold text-earth-700 dark:text-earth-200">{title}</div>
      <div className="mt-1 font-display text-2xl font-extrabold text-ink dark:text-white">{value}</div>
      {hint && <div className="mt-2 text-xs text-earth-500">{hint}</div>}
    </div>
  );
}
