// Lightweight in-memory KPI cache with TTL
const DEFAULT_TTL = 60 * 1000; // 1 minute
const _cache = new Map();

export function setKpi(key, value, ttl = DEFAULT_TTL) {
  try {
    _cache.set(String(key), { value, ts: Date.now(), ttl: Number(ttl) || DEFAULT_TTL });
  } catch (_) {}
}

export function getKpi(key) {
  const rec = _cache.get(String(key));
  if (!rec) return null;
  if (Date.now() - rec.ts > (rec.ttl || DEFAULT_TTL)) {
    _cache.delete(String(key));
    return null;
  }
  return rec.value;
}

export function clearKpi(key) {
  if (key === undefined) return clearAll();
  _cache.delete(String(key));
}

export function clearAll() {
  _cache.clear();
}

export default {
  getKpi,
  setKpi,
  clearKpi,
  clearAll,
};
