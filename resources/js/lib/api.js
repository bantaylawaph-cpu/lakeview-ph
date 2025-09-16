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
  const hadToken = !!getToken(); // <-- existing behavior, just kept here
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    // Only show the alert if we *were* authenticated previously
    if (hadToken && !window.__lv401Shown) {
      window.__lv401Shown = true;
      alertInfo("Session expired", "Please sign in again.");
    }
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
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
