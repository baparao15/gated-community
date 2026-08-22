import panchayatMark from '../assets/brand/panchayat-mark.png';

export default function Brand({ compact = false, light = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl shadow-lg ring-1 ${light ? 'bg-white/15 ring-white/20 shadow-white/10' : 'bg-brand-50 shadow-brand-600/10 ring-brand-100'}`}>
        <img src={panchayatMark} alt="Panchayat" className="h-8 w-8 object-contain" />
      </div>
      {!compact && (
        <div>
          <div className={`font-display text-2xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-brand-600 dark:text-brand-100'}`}>Panchayat</div>
          <div className={`text-[10px] font-bold uppercase tracking-[.18em] ${light ? 'text-brand-100' : 'text-earth-500'}`}>Community Hub</div>
        </div>
      )}
    </div>
  );
}
