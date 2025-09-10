// Minimal fetch wrapper using Bearer token in localStorage
const API_BASE = '/api';
export function getToken() { return localStorage.getItem('lv_token'); }
export function setToken(tok) { localStorage.setItem('lv_token', tok); }
export function clearToken() { localStorage.removeItem('lv_token'); }

export async function api(path, { method='GET', body, headers={}, auth=true } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { clearToken(); }
  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json().catch(()=> ({}));
}
