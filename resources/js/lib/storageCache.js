// resources/js/lib/storageCache.js
// Lightweight persistent cache with TTL using localStorage with in-memory fallback.
// API:
//   get(key, { maxAgeMs }) -> value | null
//   set(key, value, { ttlMs })
//   remove(key)
//   clear(prefix)

const MEM = new Map(); // key -> { ts, ttlMs, value }
const NS = 'lvcache:'; // namespace prefix in localStorage
const VERSION = 1;

function now() { return Date.now(); }

function toStore(val, ttlMs) {
  return JSON.stringify({ v: VERSION, ts: now(), ttl: Number(ttlMs) || 0, value: val });
}

function fromStore(raw) {
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    if (obj.v !== VERSION) return null;
    return obj;
  } catch { return null; }
}

function isFresh(rec, maxAgeMsOverride) {
  if (!rec) return false;
  const ttl = Number(maxAgeMsOverride != null ? maxAgeMsOverride : rec.ttl) || 0;
  if (ttl <= 0) return true; // treat 0 as no expiry
  return (now() - Number(rec.ts || 0)) < ttl;
}

export function get(key, { maxAgeMs } = {}) {
  const k = NS + String(key);
  // Try memory first
  const mem = MEM.get(k);
  if (mem && isFresh(mem, maxAgeMs)) return mem.value;

  try {
    const raw = window?.localStorage?.getItem(k);
    if (!raw) return null;
    const rec = fromStore(raw);
    if (!rec) { window.localStorage.removeItem(k); return null; }
    if (!isFresh(rec, maxAgeMs)) { window.localStorage.removeItem(k); MEM.delete(k); return null; }
    MEM.set(k, { ts: rec.ts, ttlMs: rec.ttl, value: rec.value });
    return rec.value;
  } catch {
    return mem && isFresh(mem, maxAgeMs) ? mem.value : null;
  }
}

export function set(key, value, { ttlMs } = {}) {
  const k = NS + String(key);
  const rec = { ts: now(), ttlMs: Number(ttlMs) || 0, value };
  MEM.set(k, rec);
  try {
    window?.localStorage?.setItem(k, toStore(value, ttlMs));
  } catch {
    // Best effort: if localStorage fails (quota/private mode), keep memory entry only.
  }
}

export function remove(key) {
  const k = NS + String(key);
  MEM.delete(k);
  try { window?.localStorage?.removeItem(k); } catch {}
}

export function clear(prefix = '') {
  const p = NS + String(prefix || '');
  // Clear memory
  Array.from(MEM.keys()).forEach((k) => { if (k.startsWith(p)) MEM.delete(k); });
  // Clear storage
  try {
    const ls = window?.localStorage;
    if (!ls) return;
    const toDel = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(p)) toDel.push(k);
    }
    toDel.forEach((k) => ls.removeItem(k));
  } catch {}
}

export default { get, set, remove, clear };

