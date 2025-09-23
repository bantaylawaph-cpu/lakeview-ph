// Remove a user as a member from a tenant (organization)
// (These must be after api is defined, so moved to bottom)
// resources/js/lib/api.js

// --- Config ---------------------------------------------------------------
const STORAGE_KEY = "auth.token";
const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && (process.env.MIX_API_BASE || process.env.VITE_API_BASE)) ||
  "/api";

// --- Token handling -------------------------------------------------------
let _token = null;
try {
  _token = localStorage.getItem(STORAGE_KEY) || null;
} catch (_) {
  _token = null;
}

export function setToken(token /*, opts */) {
  _token = token || null;
  try {
    if (_token) localStorage.setItem(STORAGE_KEY, _token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

export function getToken() {
  return _token;
}

export function clearToken() {
  setToken(null);
}

// --- Helpers --------------------------------------------------------------
function toQueryString(params) {
  if (!params) return "";
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((item) => usp.append(`${k}[]`, item));
    else usp.append(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}
/**
 * Build a query string from a params object.
 * Example: buildQuery({ a: 1, q: "laguna de bay" }) -> "?a=1&q=laguna%20de%20bay"
 */
export function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length === 0) return "";
  const usp = new URLSearchParams();
  for (const [k, v] of entries) {
    if (Array.isArray(v)) v.forEach((vv) => usp.append(k, String(vv)));
    else usp.append(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

function buildUrl(url, params) {
  const isAbsolute = /^https?:\/\//i.test(url);
  const base = isAbsolute ? url : `${API_BASE}${url}`;
  return `${base}${toQueryString(params)}`;
}

async function parseResponse(res) {
  const ct = res.headers.get("content-type") || "";
  if (res.status === 204) return {};
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  return { message: text || res.statusText };
}

function makeError(res, data) {
  // Stringify so AuthModal.extractMessage(JSON.parse(e.message)) works
  const err = new Error(JSON.stringify(data));
  err.response = { status: res.status, data };
  return err;
}

// --- Core request ---------------------------------------------------------
async function request(method, url, { params, body, headers, raw } = {}) {
  const finalUrl = buildUrl(url, params);
  const isForm = body instanceof FormData;
  const token = getToken();
  const hadToken = !!token;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const init = {
    method,
    headers: {
      Accept: "application/json",
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...authHeaders,
      ...(headers || {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  };
  let res;
  try {
    res = await fetch(finalUrl, init);
  } catch (networkError) {
    const err = new Error(JSON.stringify({ message: "Network error" }));
    err.cause = networkError;
    throw err;
  }
  if (raw) return res;
  const data = await parseResponse(res);
  if (!res.ok) throw makeError(res, data);
  return data;
}

// --- Public API client ----------------------------------------------------
// Function-call style: api("/path", { method, body, params })
function client(url, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  return request(method, url, opts);
}

// Attach axios-like methods
client.get    = (url, config = {})           => request("GET",    url, config);
client.post   = (url, body, config = {})     => request("POST",   url, { ...(config || {}), body });
client.put    = (url, body, config = {})     => request("PUT",    url, { ...(config || {}), body });
client.patch  = (url, body, config = {})     => request("PATCH",  url, { ...(config || {}), body });
client.delete = (url, config = {})           => request("DELETE", url, config);
client.upload = (url, formData, config = {}) => request("POST",   url, { ...(config || {}), body: formData });

// expose token helpers on the client too (optional)
client.setToken  = setToken;
client.getToken  = getToken;
client.clearToken = clearToken;

// --- Auth helpers (used by AuthModal.jsx) ---------------------------------
// Registration OTP
export async function requestRegisterOtp(payloadOrEmail) {
  const payload = typeof payloadOrEmail === "string"
    ? { email: payloadOrEmail }
    : (payloadOrEmail || {});
  return client.post("/auth/register/request-otp", payload);
}
export async function verifyRegisterOtp({ email, code, remember }) {
  return client.post("/auth/register/verify-otp", { email, code, remember });
}

// Forgot Password OTP
export async function requestForgotOtp(payloadOrEmail) {
  const payload = typeof payloadOrEmail === "string"
    ? { email: payloadOrEmail }
    : (payloadOrEmail || {});
  return client.post("/auth/forgot/request-otp", payload);
}
export async function verifyForgotOtp({ email, code }) {
  return client.post("/auth/forgot/verify-otp", { email, code });
}

// Ticket-based reset (what AuthModal imports as resetWithTicket)
export async function resetWithTicket({ ticket, password, password_confirmation }) {
  return client.post("/auth/forgot/reset", { ticket, password, password_confirmation });
}

// (Optional) Code-based reset helper, if some screens still use it
export async function resetForgotPassword({ email, code, password, password_confirmation }) {
  return client.post("/auth/forgot/reset", { email, code, password, password_confirmation });
}

// Resend OTP
export async function resendOtp({ email, purpose }) {
  return client.post("/auth/otp/resend", { email, purpose });
}

// Auth: register/login/me/logout (used in some flows)
export async function register(payload) {
  const res = await client.post("/auth/register", payload);
  if (res?.token) setToken(res.token);
  return res;
}
export async function login({ email, password, remember }) {
  const res = await client.post("/auth/login", { email, password, remember });
  if (res?.token) setToken(res.token);
  return res;
}
export async function me() {
  return client.get("/auth/me");
}
export async function logout() {
  try { await client.post("/auth/logout"); }
  finally { clearToken(); }
}

// ---- Tenant admin management ----
export const fetchTenantAdmins = (tenantId) =>
  api(`/admin/tenants/${tenantId}/admins`);

export const assignTenantAdmin = (tenantId, userId) =>
  api(`/admin/tenants/${tenantId}/admins`, {
    method: "POST",
    body: { user_id: userId },
  });

export const removeTenantAdmin = (tenantId, userId) =>
  api(`/admin/tenants/${tenantId}/admins/${userId}`, {
    method: "DELETE",
  });



// --- Exports ---------------------------------------------------------------
const api = client;         // default export is the function client
export default api;
// also provide a named `api` for files that do: import { api } from "../lib/api"
export { api };

/**
 * Public (no-auth) API wrapper — same as api() but always omits Authorization.
 * Usage: apiPublic(`/public/layers${buildQuery({ body_type: 'lake', body_id: 1 })}`)
 */
export function apiPublic(path, opts = {}) {
  return api(path, { ...opts, auth: false });
}

// Remove a user as a member from a tenant (organization)
export const removeTenantMember = (tenantId, userId) =>
  api(`/admin/tenants/${tenantId}/members/${userId}`, {
    method: "DELETE",
  });
// Assign a user as a member to a tenant (organization)
export const assignTenantMember = (tenantId, userId) =>
  api(`/admin/tenants/${tenantId}/members`, {
    method: "POST",
    body: { user_id: userId },
  });
