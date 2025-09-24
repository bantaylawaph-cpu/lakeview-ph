// resources/js/lib/api.js
import { alertInfo } from "../utils/alerts";

const API_BASE = "/api";
const LS_KEY = "lv_token";
const STORE_KEY = "lv_token_store"; // "local" or "session"

function notifyAuthChange() {
  try { window.dispatchEvent(new CustomEvent("lv-auth-change")); } catch {}
}

export function getToken() {
  const store = localStorage.getItem(STORE_KEY) || "local";
  return store === "session"
    ? sessionStorage.getItem(LS_KEY)
    : localStorage.getItem(LS_KEY);
}

export function setToken(tok, { remember = false } = {}) {
  try { localStorage.removeItem(LS_KEY); sessionStorage.removeItem(LS_KEY); } catch {}
  if (remember) {
    localStorage.setItem(LS_KEY, tok);
    localStorage.setItem(STORE_KEY, "local");
  } else {
    sessionStorage.setItem(LS_KEY, tok);
    localStorage.setItem(STORE_KEY, "session");
  }
  notifyAuthChange();
}

export function clearToken() {
  try {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(LS_KEY);
    localStorage.removeItem(STORE_KEY);
  } catch {}
  notifyAuthChange();
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

export async function api(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const token = getToken();
  const hadToken = !!token;
  // Only attach Authorization header when we actually have a token.
  const authHeaders = auth && token ? { Authorization: `Bearer ${token}` } : {};

  // If this call requires auth but we don't have a token, short-circuit and
  // reject immediately. This avoids making unauthenticated requests to
  // admin/auth endpoints which just return 401s and clutter the console.
  if (auth && !token) {
    return Promise.reject(new Error("Unauthenticated"));
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // If the server returns 401 but we didn't have a token, treat it as an unauthenticated request
  // and don't clear tokens or show the session-expired notification. Only perform session
  // expiry handling when the client actually had a token.
  if (res.status === 401 && hadToken) {
    clearToken();
    if (!window.__lv401Shown) {
      window.__lv401Shown = true;
      alertInfo("Session expired", "Please sign in again.");
    }
  }

    if (!res.ok) {
    // Try to parse a JSON error body to extract validation messages
    let t = "";
    let parsedBody = null;
    try {
      parsedBody = await res.json();
      if (parsedBody) {
        if (parsedBody.errors && typeof parsedBody.errors === 'object') {
          t = Object.entries(parsedBody.errors)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('; ');
        } else if (parsedBody.message) {
          t = parsedBody.message;
        } else {
          t = JSON.stringify(parsedBody);
        }
      }
    } catch {
      t = await res.text().catch(() => "");
    }

    if (res.status === 429) {
      const err = new Error(`HTTP 429 Too Many Requests: ${t || 'rate limit exceeded'}`);
      err.status = res.status;
      err.body = parsedBody;
      throw err;
    }

    const err = new Error(t ? `HTTP ${res.status} ${t}` : `HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsedBody;
    throw err;
  }

  return res.json().catch(() => ({}));
}

/**
 * Public (no-auth) API wrapper — same as api() but always omits Authorization.
 * Usage: apiPublic(`/public/layers${buildQuery({ body_type: 'lake', body_id: 1 })}`)
 */
export function apiPublic(path, opts = {}) {
  return api(path, { ...opts, auth: false });
}
