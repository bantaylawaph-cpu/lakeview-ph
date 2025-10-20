// Lightweight shared data utilities used by Stats modal components.

// Derive a display name for an event's station, falling back to coordinates
export const eventStationName = (ev) => (
  ev?.station?.name ||
  ev?.station_name ||
  ((ev?.latitude != null && ev?.longitude != null)
    ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}`
    : null)
);

export const mean = (arr) => {
  const a = (Array.isArray(arr) ? arr.filter(Number.isFinite) : []);
  if (!a.length) return NaN;
  return a.reduce((s, v) => s + v, 0) / a.length;
};

export const median = (arr) => {
  const a = (Array.isArray(arr) ? arr.filter(Number.isFinite) : []);
  if (!a.length) return NaN;
  const s = a.slice().sort((x, y) => x - y);
  const n = s.length;
  const m = Math.floor(n / 2);
  return (n % 2) ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const parseIsoDate = (iso) => { try { return new Date(iso); } catch { return null; } };

// Depth helpers
export const depthBandKeyInt = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 'NA';
  return String(Math.round(n));
};

export const depthKeyHalfM = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return (Math.round(n * 2) / 2).toFixed(1);
};

// Anchor an events array to a relative time range using its own latest date.
// Matches existing per-component behavior. For custom/all, returns original arr.
export const anchorByTimeRange = (arr, timeRange, dateFrom, dateTo) => {
  if (!arr || !arr.length) return [];
  if (timeRange === 'custom') {
    const f = dateFrom ? parseIsoDate(dateFrom) : null;
    const t = dateTo ? parseIsoDate(dateTo) : null;
    return arr.filter((e) => {
      const d = parseIsoDate(e?.sampled_at);
      if (!d) return false;
      if (f && d < f) return false;
      if (t && d > t) return false;
      return true;
    });
  }
  if (timeRange === 'all' || !timeRange) return arr;
  const allDates = arr.map((e) => parseIsoDate(e?.sampled_at)).filter((d) => d && !isNaN(d));
  if (!allDates.length) return [];
  const latest = new Date(Math.max(...allDates));
  const from = new Date(latest);
  if (timeRange === '5y') from.setFullYear(from.getFullYear() - 5);
  else if (timeRange === '3y') from.setFullYear(from.getFullYear() - 3);
  else if (timeRange === '1y') from.setFullYear(from.getFullYear() - 1);
  else if (timeRange === '6mo') from.setMonth(from.getMonth() - 6);
  return arr.filter((e) => {
    const d = parseIsoDate(e?.sampled_at);
    return d && d >= from && d <= latest;
  });
};
