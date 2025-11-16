// Remove a user as a member from a tenant (organization)
// (These must be after api is defined, so moved to bottom)
// resources/js/lib/api.js

// --- Config ---------------------------------------------------------------
const STORAGE_KEY = "auth.token";
const USER_STORAGE_KEY = "auth.user";
const USER_STORAGE_TS = "auth.user.ts";
const USER_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes freshness window
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

// --- User caching --------------------------------------------------------
let _user = null;
let _userTs = 0;
try {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  _user = raw ? JSON.parse(raw) : null;
  const ts = localStorage.getItem(USER_STORAGE_TS);
  _userTs = ts ? Number(ts) : 0;
} catch (_) { _user = null; _userTs = 0; }

export function setToken(token /*, opts */) {
  _token = token || null;
  try {
    if (_token) localStorage.setItem(STORAGE_KEY, _token);
    else localStorage.removeItem(STORAGE_KEY);
    // Notify listeners (Sidebar, etc.) that auth changed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lv-auth-change'));
    }
  } catch (_) {}
}

export function getToken() {
  return _token;
}

export function clearToken() {
  setToken(null);
}

export function setUser(user) {
  _user = user || null;
  try {
    if (_user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(_user));
    else localStorage.removeItem(USER_STORAGE_KEY);
    _userTs = _user ? Date.now() : 0;
    if (_userTs) localStorage.setItem(USER_STORAGE_TS, String(_userTs));
    else localStorage.removeItem(USER_STORAGE_TS);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lv-user-change'));
    }
  } catch (_) {}
}

export function getUser() {
  return _user;
}

export function clearUser() {
  setUser(null);
}

export function isUserFresh(maxAgeMs = USER_MAX_AGE_MS) {
  if (!_user) return false;
  if (!_userTs) return false;
  return (Date.now() - _userTs) < Math.max(0, Number(maxAgeMs) || 0);
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
  if (ct.includes("application/json")) {
    // Be tolerant of empty bodies or invalid JSON from some endpoints
    const text = await res.text();
    if (!text || !text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch (_) {
      // Fall back to a message wrapper rather than throwing
      return { message: text };
    }
  }
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
// Global abort controller to allow canceling in-flight requests (e.g., on logout)
let _abortController = (()=>{
  try { return new AbortController(); } catch { return { signal: undefined, abort: ()=>{} }; }
})();
function abortAllRequests(reason) {
  try { _abortController.abort(reason || 'abort'); } catch {}
  try { _abortController = new AbortController(); } catch { _abortController = { signal: undefined, abort: ()=>{} }; }
}

async function request(method, url, { params, body, headers, raw, auth } = {}) {
  const finalUrl = buildUrl(url, params);
  const isForm = body instanceof FormData;
  const token = getToken();
  const hadToken = !!token;
  // If auth === false, omit Authorization header even if a token exists (used by apiPublic)
  const useAuth = auth !== false;
  const authHeaders = useAuth && token ? { Authorization: `Bearer ${token}` } : {};
  const init = {
    method,
    headers: {
      Accept: "application/json",
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...authHeaders,
      ...(headers || {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    // Attach global abort signal so we can cancel promptly on logout
    signal: _abortController && _abortController.signal ? _abortController.signal : undefined,
  };
  let res;
  try {
    res = await fetch(finalUrl, init);
  } catch (networkError) {
    // Tag aborts distinctly so callers can keep UI open
    const isAbort = (networkError && (networkError.name === 'AbortError' || networkError.code === 20));
    const err = new Error(JSON.stringify({ message: isAbort ? 'Aborted' : 'Network error' }));
    err.cause = networkError;
    throw err;
  }
  if (raw) return res;
  const data = await parseResponse(res);
  if (!res.ok) {
    // If we had a token and got a 401, clear it to stop cascades of unauthorized calls
    if (res.status === 401 && hadToken) {
      try { clearToken(); } catch (_) {}
    }
    throw makeError(res, data);
  }
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

// --- In-flight GET dedupe --------------------------------------------------
// Map key: method+finalUrl -> Promise
const _inflight = new Map();
async function requestDedupe(method, url, opts = {}) {
  // Only dedupe GET without explicit disable flag
  if (method === 'GET' && !opts.allowDuplicate) {
    const finalUrl = buildUrl(url, opts.params);
    const key = `GET ${finalUrl}`;
    if (_inflight.has(key)) {
      return _inflight.get(key);
    }
    const p = request(method, url, opts).finally(() => {
      // small delay so very rapid sequential identical calls still share
      setTimeout(() => _inflight.delete(key), 50);
    });
    _inflight.set(key, p);
    return p;
  }
  return request(method, url, opts);
}

// Override get to use dedupe layer
client.get = (url, config = {}) => requestDedupe('GET', url, config);

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
  if (res?.data) setUser(res.data);
  return res;
}
export async function login({ email, password, remember }) {
  const res = await client.post("/auth/login", { email, password, remember });
  if (res?.token) setToken(res.token);
  if (res?.data) setUser(res.data);
  return res;
}
let _meInFlight = null;
export async function me({ maxAgeMs = USER_MAX_AGE_MS } = {}) {
  // Avoid spamming the server with /auth/me when no token is present.
  if (!getToken()) return null;
  // Use cached user if present and fresh
  if (getUser() && isUserFresh(maxAgeMs)) return getUser();
  if (_meInFlight) return _meInFlight;
  try {
    _meInFlight = client.get("/auth/me");
    const u = await _meInFlight;
    if (u) setUser(u);
    return u;
  } catch (e) {
    // Swallow unauthorized errors here so callers can treat null user gracefully
    if (e?.response?.status === 401) return null;
    throw e;
  } finally {
    _meInFlight = null;
  }
}
export async function logout() {
  // Strategy: attempt server logout WITH token first (non-blocking), then clear local.
  // Avoid 401 noise by swallowing errors and only clearing token after request fires.
  let fired = false;
  try {
    const p = client.post("/auth/logout");
    fired = true;
    // Give it a tiny window (300ms) then ignore; do not block caller.
    Promise.race([p, new Promise(r=>setTimeout(r,300))]).catch(()=>{});
  } catch { /* ignore */ }
  // Abort any other in-flight queries AFTER firing logout (so header still present for logout call)
  try { abortAllRequests('logout'); } catch {}
  try { clearToken(); } catch {}
  try { clearUser(); } catch {}
  return fired;
}

// Expose abort for rare advanced cases
export const cancelAllRequests = abortAllRequests;

// ---- Tenant admin management ----
// Tenant admin management (single-tenant user model)
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

// ---- Organization (Tenant) listing & management revamp ----
export const listTenants = (params = {}) =>
  api(`/admin/tenants${buildQuery(params)}`);

export const getTenant = (tenantId, params = {}) =>
  api(`/admin/tenants/${tenantId}${buildQuery(params)}`);

export const updateTenant = (tenantId, payload) =>
  api(`/admin/tenants/${tenantId}`, { method: 'PUT', body: payload });

export const softDeleteTenant = (tenantId) =>
  api(`/admin/tenants/${tenantId}`, { method: 'DELETE' });

export const restoreTenant = (tenantId) =>
  api(`/admin/tenants/${tenantId}/restore`, { method: 'POST' });

export const hardDeleteTenant = (tenantId, reason = '') =>
  api(`/admin/tenants/${tenantId}/hard`, { method: 'DELETE', body: { reason } });

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

// Tenancy integrity check (optional UI surfacing)
export const verifyTenancy = async () => api('/tenancy/verify');

// ---- KYC & Organization Applications (MVP) ----
export const getKycStatus = async () => api('/kyc/status');
export const listTenantsOptions = async () => api('/options/tenants'); // requires backend endpoint
export const createOrgApplication = async ({ tenant_id, desired_role }) =>
  api('/org-applications', { method: 'POST', body: { tenant_id, desired_role } });
