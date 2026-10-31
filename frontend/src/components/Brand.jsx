import panchayatMark from '../assets/brand/panchayat-mark.png';

export default function Brand({ compact = false, light = false, size = 'default' }) {
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  const boxSize = isLg
    ? 'h-14 w-14 sm:h-16 sm:w-16 rounded-2xl'
    : isSm
    ? 'h-9 w-9 rounded-xl'
    : 'h-11 w-11 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl';

  const imgSize = isLg
    ? 'h-12 w-12 sm:h-14 sm:w-14'
    : isSm
    ? 'h-7 w-7'
    : 'h-9 w-9 sm:h-10 sm:w-10';

  const titleSize = isLg
    ? 'text-2xl sm:text-3xl'
    : isSm
    ? 'text-lg'
    : 'text-xl sm:text-2xl';

  const subSize = isLg
    ? 'text-xs'
    : isSm
    ? 'text-[9px]'
    : 'text-[10px] sm:text-[11px]';

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
      <div
        className={`grid ${boxSize} shrink-0 place-items-center overflow-hidden shadow-md ring-1 transition-transform ${
          light
            ? 'bg-white/15 ring-white/20 shadow-white/10'
            : 'bg-brand-50 shadow-brand-600/10 ring-brand-200/80 dark:bg-earth-800 dark:ring-earth-700'
        }`}
      >
        <img
          src={panchayatMark}
          alt="Panchayat"
          className={`${imgSize} object-contain transition-transform`}
        />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div
            className={`font-display ${titleSize} font-extrabold tracking-tight leading-none whitespace-nowrap ${
              light ? 'text-white' : 'text-brand-600 dark:text-brand-100'
            }`}
          >
            Panchayat
          </div>
          <div
            className={`mt-1 ${isSm ? 'hidden min-[360px]:block ' : ''}${subSize} font-bold uppercase tracking-[.18em] leading-none whitespace-nowrap ${
              light ? 'text-brand-100' : 'text-earth-500'
            }`}
          >
            Community Hub
          </div>
        </div>
      )}
    </div>
  );
}
