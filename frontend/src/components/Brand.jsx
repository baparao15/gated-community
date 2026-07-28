import panchayatMark from '../assets/brand/panchayat-mark.png';

export default function Brand({ compact = false, light = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-brand-50 shadow-lg shadow-brand-600/10 ring-1 ring-brand-100">
        <img src={panchayatMark} alt="Panchayat" className="h-full w-full object-cover" />
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
