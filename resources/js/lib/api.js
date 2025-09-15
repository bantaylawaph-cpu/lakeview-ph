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

export async function api(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const hadToken = !!getToken(); // <-- new
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
