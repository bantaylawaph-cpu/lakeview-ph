import { api, apiPublic, buildQuery } from "../../../lib/api";

// Simple in-memory cache with TTL
const _cache = new Map();
const DEFAULT_TTL = 60 * 1000; // 60s

function _now() { return Date.now(); }
function _getCache(key) {
  const hit = _cache.get(key);
  if (!hit) return null;
  if (hit.ttl && hit.expires < _now()) { _cache.delete(key); return null; }
  return hit.data;
}
function _setCache(key, data, ttl = DEFAULT_TTL) {
  _cache.set(key, { data, ttl, expires: _now() + ttl });
}

export async function fetchParameters() {
  const key = 'parameters';
  const cached = _getCache(key);
  if (cached) return cached.slice();
  try {
    let res;
    try { res = await api('/options/parameters'); } catch { res = await apiPublic('/options/parameters'); }
    const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const normalized = rows.map(pr => ({
      id: pr.id,
      key: pr.code || pr.key || String(pr.id),
      code: pr.code || pr.key || String(pr.id),
      label: pr.name || pr.code || String(pr.id),
      unit: pr.unit || pr.parameter?.unit || '',
      evaluation_type: pr.evaluation_type || null // include for direction logic
    }));
    _setCache(key, normalized);
    return normalized.slice();
  } catch {
    _setCache(key, []);
    return [];
  }
}

// Fetch sample events for a single lake and normalize each event into a record with parameter keyed objects.
export async function fetchSampleEvents({ lakeId, from, to, limit = 1000, organizationId } = {}) {
  if (!lakeId) return [];
  const key = `sample:${lakeId}|${from||''}|${to||''}|${limit}|${organizationId||''}`;
  const cached = _getCache(key);
  if (cached) return cached.map(r => ({ ...r }));
  try {
    const qs = buildQuery({ lake_id: lakeId, sampled_from: from || undefined, sampled_to: to || undefined, limit, organization_id: organizationId || undefined });
    let res;
    try { res = await apiPublic(`/public/sample-events${qs}`); }
    catch (e) {
      if (e?.status === 429) { await new Promise(r=>setTimeout(r,500)); res = await apiPublic(`/public/sample-events${qs}`); }
      else throw e;
    }
    const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const recs = [];
    for (const ev of rows) {
      const sampled = ev.sampled_at ? new Date(ev.sampled_at) : null;
      if (!sampled) continue;
      const stationName = ev?.station?.name || ev?.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : "");
      const stationCode = ev?.station?.code || ev?.station_code || ev?.station_id || "";
      const results = Array.isArray(ev?.results) ? ev.results : [];
      const paramObj = {};
      for (const r of results) {
        if (!r || !r.parameter) continue;
        const pid = r.parameter_id || r.parameter?.id;
        const code = r.parameter?.code || r.parameter?.name || String(pid || "");
        const val = r.value == null ? null : (Number.isFinite(Number(r.value)) ? Number(r.value) : null);
        const thrMin = r?.threshold?.min_value != null ? Number(r.threshold.min_value) : null;
        const thrMax = r?.threshold?.max_value != null ? Number(r.threshold.max_value) : null;
        const keyParam = code || String(pid || "");
        paramObj[keyParam] = { value: val, unit: r.parameter?.unit || r.unit || "", threshold: { min: thrMin, max: thrMax } };
      }
      recs.push({
        lake: String(ev.lake_id ?? ev.lake?.id ?? lakeId),
        organization_id: ev.organization_id ?? ev.organization?.id ?? null,
        organization_name: ev.organization_name ?? ev.organization?.name ?? null,
        stationCode: String(stationCode || ""),
        area: stationName || "",
        date: sampled,
        ...paramObj,
      });
    }
    _setCache(key, recs);
    return recs.map(r => ({ ...r }));
  } catch {
    _setCache(key, []);
    return [];
  }
}

// Try admin stations first, fallback to sample events derived stations.
export async function fetchStationsForLake({ lakeId, from, to, limit = 1000 } = {}) {
  if (!lakeId) return [];
  const key = `stations:${lakeId}|${from||''}|${to||''}|${limit}`;
  const cached = _getCache(key);
  if (cached) return cached.slice();
  // Attempt admin stations
  try {
    const res = await api(`/admin/stations?lake_id=${encodeURIComponent(lakeId)}`);
    const list = Array.isArray(res?.data) ? res.data : [];
    const normalized = list.map((s) => {
      const latRaw = s.latitude ?? s.lat ?? null;
      const lngRaw = s.longitude ?? s.lng ?? null;
      const name = s.name || (latRaw != null && lngRaw != null ? `${Number(latRaw).toFixed(6)}, ${Number(lngRaw).toFixed(6)}` : `Station ${s.id || ''}`);
      return name;
    });
    if (normalized.length) { _setCache(key, normalized); return normalized.slice(); }
  } catch {}
  // Fallback to sample events
  try {
    const qs = buildQuery({ lake_id: lakeId, sampled_from: from || undefined, sampled_to: to || undefined, limit });
    let res;
    try { res = await apiPublic(`/public/sample-events${qs}`); }
    catch (e) { if (e?.status === 429) { await new Promise(r=>setTimeout(r,500)); res = await apiPublic(`/public/sample-events${qs}`); } else throw e; }
    const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    const uniq = new Map();
    rows.forEach((r) => {
      const name = r?.station?.name || r?.station_name || (r.latitude != null && r.longitude != null ? `${Number(r.latitude).toFixed(6)}, ${Number(r.longitude).toFixed(6)}` : null);
      if (name && !uniq.has(name)) uniq.set(name, name);
    });
    const arr = Array.from(uniq.values());
    _setCache(key, arr);
    return arr.slice();
  } catch {
    _setCache(key, []);
    return [];
  }
}

// Utility to derive org options from records
export function deriveOrgOptions(records = []) {
  const map = new Map();
  for (const r of records) {
    const oid = r.organization_id;
    const oname = r.organization_name;
    if (oid && oname && !map.has(String(oid))) map.set(String(oid), { id: oid, name: oname });
  }
  return Array.from(map.values());
}

// Utility to derive parameter options present in records (will not duplicate existing fetchParameters, used to supplement dynamic params discovered)
export function deriveParamOptions(records = []) {
  const map = new Map();
  for (const rec of records) {
    Object.entries(rec).forEach(([k, v]) => {
      if (!v || typeof v !== 'object') return;
      if (['lake','organization_id','organization_name','stationCode','area','date'].includes(k)) return;
      if (!map.has(k)) map.set(k, { key: k, code: k, label: k, unit: v.unit || '' });
    });
  }
  return Array.from(map.values());
}
