// resources/js/lib/layers.js
import { api, apiPublic, buildQuery, getToken } from "./api";

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

export const fetchLakeOptions = async (q = "") => {
  const key = String(q || "");

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
    const qp = q ? `?q=${encodeURIComponent(q)}` : "";
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
export async function fetchPublicLayers({ bodyType, bodyId, includeBounds = false } = {}) {
  if (!bodyType || !bodyId) return [];
  const qs = buildQuery({
    body_type: bodyType,
    body_id: bodyId,
    include: includeBounds ? "bounds" : "",
  });
  const res = await apiPublic(`/public/layers${qs}`);
  return pluck(res);
}

/** NEW: fetch a single public layer with geometry */
export async function fetchPublicLayerGeo(id, { includeBounds = true } = {}) {
  if (!id) return null;
  const include = ["geom"];
  if (includeBounds) include.push("bounds");
  const qs = buildQuery({ include: include.join(",") });
  try {
    const r = await apiPublic(`/public/layers/${encodeURIComponent(id)}${qs}`);
    return r?.data || null;
  } catch (_) {
    return null;
  }
}
/** ---- Layers CRUD (auth) ---- */
export const fetchLayersForBody = async (bodyType, bodyId) => {
  if (!bodyType || !bodyId) return [];
  const res = await api(
    `/layers?body_type=${encodeURIComponent(bodyType)}&body_id=${encodeURIComponent(
      bodyId
    )}&include=geom,bounds`
  );
  return pluck(res);
};

export const createLayer = (payload) => api("/layers", { method: "POST", body: payload });

export const activateLayer = (id) =>
  api(`/layers/${id}`, { method: "PATCH", body: { is_active: true } });

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
  return api(`/layers/${row.id}`, { method: "PATCH", body: { visibility: next } });
};

export const deleteLayer = (id) => api(`/layers/${id}`, { method: "DELETE" });

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
export const updateLayer = (id, payload) =>
  api(`/layers/${id}`, { method: 'PATCH', body: payload });

export async function setLayerDefault(layerId, isActive) {
  return api(`/layers/${layerId}/default`, {
    method: 'PATCH',
    body: { is_active: !!isActive },
  });
}
