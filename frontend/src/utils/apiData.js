export const unwrapApiData = (payload, fallback = null) => {
  const body = payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.docs)) return body.docs;
  if (Array.isArray(body?.results)) return body.results;
  return body ?? fallback;
};

export const asList = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.docs)) return value.docs;
  if (Array.isArray(value?.results)) return value.results;
  return Array.isArray(fallback) ? fallback : [];
};

export const numberFormat = new Intl.NumberFormat('en-IN');

export const currency = (amount = 0) => `INR ${numberFormat.format(Number(amount) || 0)}`;

export const monthLabel = (period) => {
  if (!period?.month || !period?.year) return '-';
  return `${String(period.month).padStart(2, '0')}/${period.year}`;
};

export const unitLabel = (unit) => {
  if (!unit) return '-';
  return [unit.blockName, unit.unitNumber].filter(Boolean).join('-') || '-';
};

export const uploadUrl = (path) => (path ? `/${String(path).replace(/\\/g, '/').replace(/^\/+/, '')}` : '');
