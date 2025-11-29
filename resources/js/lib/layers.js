// resources/js/lib/layers.js
import { api, apiPublic, buildQuery, getToken } from "./api";
import cache from './storageCache';
import { cachedGet, invalidateHttpCache } from './httpCache';

/** Normalize array responses: array | {data: array} | {data:{data: array}} */
const pluck = (r) => {
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.data?.data)) return r.data.data;
  return [];
};

/** ---- Options (id, name) helpers for dropdowns ---- */
// Simple in-memory cache + in-flight request dedupe to avoid rapid repeated calls
const _lakeOptionsCache = new Map(); // key -> {ts, data}
const _lakeOptionsInflight = new Map(); // key -> Promise
const LAKE_OPTIONS_TTL = 30 * 1000; // 30s

export const fetchLakeOptions = async (q = "", { hasData = false } = {}) => {
  const key = String(q || "") + (hasData ? ":hasdata" : "");

  // return cached value if fresh
  const cached = _lakeOptionsCache.get(key);
  if (cached && Date.now() - cached.ts < LAKE_OPTIONS_TTL) {
    return cached.data;
  }

  // if there's an in-flight request for the same key, return it
  if (_lakeOptionsInflight.has(key)) {
    return _lakeOptionsInflight.get(key);
  }

  const promise = (async () => {
    const params = new URLSearchParams();
    if (q) params.append("q", q);
    if (hasData) params.append("has_data", "1");
    const qp = params.toString() ? `?${params.toString()}` : "";
    
    // Try public (no-auth) endpoints first so anonymous users receive options.
    // If those fail, fall back to authenticated endpoints (if a token exists).
    const attempts = [
      () => apiPublic(`/options/lakes${qp}`),
      () => apiPublic(`/lakes${qp}`),
    ];
    if (getToken()) {
      attempts.push(() => api(`/options/lakes${qp}`));
      attempts.push(() => api(`/lakes${qp}`));
    }
    for (const tryFetch of attempts) {
      try {
        const res = await tryFetch();
        const rows = pluck(res).map((r) => ({ id: r.id, name: r.name, class_code: r.class_code }));
        _lakeOptionsCache.set(key, { ts: Date.now(), data: rows });
        return rows;
      } catch (_) {
        // try next
      }
    }
    // fallback empty
    const empty = [];
    _lakeOptionsCache.set(key, { ts: Date.now(), data: empty });
    return empty;
  })();

  _lakeOptionsInflight.set(key, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    _lakeOptionsInflight.delete(key);
  }
};

export const fetchWatershedOptions = async (q = "") => {
  const qp = q ? `?q=${encodeURIComponent(q)}` : "";
  const attempts = [
    () => api(`/options/watersheds${qp}`),
    () => api(`/watersheds${qp}`),
  ];
  for (const tryFetch of attempts) {
    try {
      const res = await tryFetch();
      return pluck(res).map((r) => ({ id: r.id, name: r.name }));
    } catch (_) {}
  }
  return [];
};

/** ---- Layers (PUBLIC list for LakeInfoPanel) ---- */
export async function fetchPublicLayers({ bodyType, bodyId, includeBounds = false, forceNetwork = false } = {}) {
  if (!bodyType || !bodyId) return [];
  const qs = buildQuery({
    body_type: bodyType,
    body_id: bodyId,
    include: includeBounds ? "bounds" : "",
  });
  const key = `public:layers:list:${bodyType}:${bodyId}:${includeBounds ? 'b' : '-'}`;
  const TTL = 10 * 60 * 1000; // 10 minutes
  const cached = cache.get(key, { maxAgeMs: TTL });
  if (cached && !forceNetwork) return cached;
  const res = await apiPublic(`/public/layers${qs}`);
  const rows = pluck(res);
  cache.set(key, rows, { ttlMs: TTL });
  return rows;
}

/** NEW: fetch a single public layer with geometry */
export async function fetchPublicLayerGeo(id, { includeBounds = true } = {}) {
  if (!id) return null;
  const include = ["geom"];
  if (includeBounds) include.push("bounds");
  const qs = buildQuery({ include: include.join(",") });
  const key = `public:layers:geo:${id}:${includeBounds ? 'b' : '-'}`;
  const TTL = 24 * 60 * 60 * 1000; // 24h
  const cached = cache.get(key, { maxAgeMs: TTL });
  if (cached) return cached;
  try {
    const r = await apiPublic(`/public/layers/${encodeURIComponent(id)}${qs}`);
    const val = r?.data || null;
    if (val) cache.set(key, val, { ttlMs: TTL });
    return val;
  } catch (_) {
    return null;
  }
}
/** ---- Layers CRUD (auth) ---- */
/**
 * Fetch all layers (auth) with optional scoping to a specific body.
 * The backend enforces role-based visibility. Set includeGeom/includeBounds to
 * include heavy columns when previews are needed.
 */
export const fetchAllLayers = async ({ bodyType, bodyId, includeGeom = false, includeBounds = false } = {}) => {
  const include = [];
  if (includeGeom) include.push('geom');
  if (includeBounds) include.push('bounds');
  const params = {
    body_type: bodyType || '',
    body_id: bodyId || '',
    include: include.join(',')
  };
  const res = await cachedGet('/layers', { params, ttlMs: 5 * 60 * 1000 });
  return pluck(res);
};

/**
 * Server-side paginated list of layers for admin screens.
 * Returns { rows, page, perPage, total, lastPage }
 */
export const fetchLayersPaged = async ({
  page = 1,
  perPage = 15,
  includeGeom = false,
  includeBounds = false,
  bodyType = '',
  bodyId = '',
  visibility = '',
  downloadable = '',
  createdBy = '',
  q = '',
  sortBy = 'created_at',
  sortDir = 'desc',
} = {}) => {
  const include = [];
  if (includeGeom) include.push('geom');
  if (includeBounds) include.push('bounds');
  const params = {
    page,
    per_page: perPage,
    sort_by: sortBy,
    sort_dir: sortDir,
    body_type: bodyType || undefined,
    body_id: bodyId || undefined,
    visibility: visibility || undefined,
    downloadable: downloadable || undefined,
    created_by: createdBy || undefined,
    q: q || undefined,
    include: include.join(',') || undefined,
  };
  const res = await api('/layers', { params });
  const rows = Array.isArray(res?.data) ? res.data : [];
  return {
    rows,
    page: res?.current_page || page,
    perPage: res?.per_page || perPage,
    total: res?.total || rows.length,
    lastPage: res?.last_page || 1,
  };
};

export const fetchLayersForBody = async (bodyType, bodyId) => {
  if (!bodyType || !bodyId) return [];
  const res = await api(
    `/layers?body_type=${encodeURIComponent(bodyType)}&body_id=${encodeURIComponent(
      bodyId
    )}&include=geom,bounds`
  );
  return pluck(res);
};

export const createLayer = async (payload) => {
  const r = await api("/layers", { method: "POST", body: payload });
  try {
    // Invalidate admin list and public layer caches
    invalidateHttpCache(['/layers']);
    cache.clear('public:layers');
  } catch (_) {}
  return r;
};

export const computeNextVisibility = (current, allowed = []) => {
  const base = Array.isArray(allowed) && allowed.length ? allowed.filter(Boolean) : ['public', 'admin'];
  const normalized = base.map((v) => String(v));
  let currentValue = current;
  if (currentValue === 'organization' || currentValue === 'organization_admin') {
    currentValue = 'admin';
  }
  if (!normalized.length) return currentValue || 'public';
  const idx = normalized.indexOf(currentValue);
  if (idx === -1) return normalized[0];
  return normalized[(idx + 1) % normalized.length];
};

export const toggleLayerVisibility = (row, allowed) => {
  if (!row || !row.id) {
    return Promise.reject(new Error('Layer row is required'));
  }
  const next = computeNextVisibility(row.visibility, allowed);
  if (!next || next === row.visibility) {
    return Promise.resolve(row);
  }
  return api(`/layers/${row.id}`, { method: "PATCH", body: { visibility: next } })
    .then((res) => {
      try { invalidateHttpCache('/layers'); cache.clear('public:layers'); } catch (_) {}
      return res;
    });
};

export const deleteLayer = async (id) => {
  const r = await api(`/layers/${id}`, { method: "DELETE" });
  try { invalidateHttpCache('/layers'); cache.clear('public:layers'); } catch (_) {}
  return r;
};

/** Fetch body name for header display */
export const fetchBodyName = async (bodyType, id) => {
  try {
    if (!bodyType || !id) return "";
    if (bodyType === "lake") {
      const r = await api(`/lakes/${id}`);
      return r?.name || "";
    }
    const ws = await api('/watersheds');
    const rows = pluck(ws);
    const found = rows.find((w) => Number(w.id) === Number(id));
    return found?.name || "";
  } catch (_) { return ""; }
};

/** Update layer metadata (no geometry) */
export const updateLayer = async (id, payload) => {
  const r = await api(`/layers/${id}`, { method: 'PATCH', body: payload });
  try { invalidateHttpCache('/layers'); cache.clear('public:layers'); } catch (_) {}
  return r;
};

export async function setLayerDefault(layerId, isActive) {
  // Deprecated: default concept removed; one-layer-per-body implies default implicitly
  return Promise.resolve(null);
}
