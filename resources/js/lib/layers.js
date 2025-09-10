// resources/js/lib/layers.js
import { api } from "./api";

/** Normalize array responses: array | {data: array} | {data:{data: array}} */
const pluck = (r) => {
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.data?.data)) return r.data.data;
  return [];
};

/** ---- Options (id, name) helpers for dropdowns ---- */
export const fetchLakeOptions = async (q = "") => {
  const qp = q ? `?q=${encodeURIComponent(q)}` : "";
  const attempts = [
    () => api(`/options/lakes${qp}`),
    () => api(`/lakes${qp}`),
  ];
  for (const tryFetch of attempts) {
    try {
      const res = await tryFetch();
      return pluck(res).map((r) => ({ id: r.id, name: r.name }));
    } catch (_) {}
  }
  return [];
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

/** ---- Layers CRUD ---- */
export const fetchLayersForBody = async (bodyType, bodyId) => {
  if (!bodyType || !bodyId) return [];
  const res = await api(
    `/layers?body_type=${encodeURIComponent(bodyType)}&body_id=${encodeURIComponent(
      bodyId
    )}&include=bounds`
  );
  return pluck(res);
};

export const createLayer = (payload) => api("/layers", { method: "POST", body: payload });

export const activateLayer = (id) =>
  api(`/layers/${id}`, { method: "PATCH", body: { is_active: true } });

export const toggleLayerVisibility = (row) => {
  const next = row.visibility === "public" ? "admin" : "public";
  return api(`/layers/${row.id}`, { method: "PATCH", body: { visibility: next } });
};

export const deleteLayer = (id) => api(`/layers/${id}`, { method: "DELETE" });
