// Persistent KPI cache with TTL using localStorage via storageCache,
// with an in-memory fallback provided by storageCache itself.
import cache from './storageCache';

// Default to 5 minutes so values persist across quick navigations
const DEFAULT_TTL = 5 * 60 * 1000;
const NS = 'kpi:'; // per-key namespace under storageCache

export function setKpi(key, value, ttl = DEFAULT_TTL) {
  try {
    cache.set(NS + String(key), value, { ttlMs: Number(ttl) || DEFAULT_TTL });
  } catch (err) {
    // Don't silently swallow errors — surface them for debugging but
    // keep the app running (cache failures are non-fatal).
    // eslint-disable-next-line no-console
    console.warn('[kpiCache] setKpi failed for key', String(key), err);
  }
}

export function getKpi(key) {
  try {
    const v = cache.get(NS + String(key));
    return v == null ? null : v;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[kpiCache] getKpi failed for key', String(key), err);
    return null;
  }
}

export function clearKpi(key) {
  if (key === undefined) return clearAll();
  try {
    cache.remove(NS + String(key));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[kpiCache] clearKpi failed for key', String(key), err);
  }
}

export function clearAll() {
  try {
    cache.clear(NS);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[kpiCache] clearAll failed', err);
  }
}

export default { getKpi, setKpi, clearKpi, clearAll };
