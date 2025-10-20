// Shared chart helpers for bucketed labels and options

export const bucketKey = (d, mode) => {
  if (!d) return null;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const q = Math.floor((m - 1) / 3) + 1;
  if (mode === 'year') return `${y}`;
  if (mode === 'quarter') return `${y}-Q${q}`;
  return `${y}-${String(m).padStart(2, '0')}`;
};

export const bucketSortKey = (k) => {
  if (!k) return 0;
  const m = /^([0-9]{4})(?:-(?:Q([1-4])|([0-9]{2})))?$/.exec(k);
  if (!m) return 0;
  const y = Number(m[1]);
  const q = m[2] ? (Number(m[2]) * 3) : 0;
  const mo = m[3] ? Number(m[3]) : 0;
  return y * 12 + (q || mo);
};

export const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const groupLabel = (d, bucket) => {
  if (!d) return null;
  if (bucket === 'year') return String(d.getFullYear());
  if (bucket === 'quarter') return `Q${Math.floor(d.getMonth() / 3) + 1}`;
  return monthNames[d.getMonth()];
};
