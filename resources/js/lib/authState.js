// Centralized auth state (lightweight, no external deps)
// Provides in-memory cache & events for user object.

let currentUser = null; // { id, name, email, role, ... }
let lastFetched = 0;

export function getCurrentUser() {
  return currentUser;
}

export function getLastFetched() {
  return lastFetched;
}

export function isStale(ms = 5 * 60 * 1000) { // default 5 minutes
  if (!currentUser) return true;
  return Date.now() - lastFetched > ms;
}

export function setCurrentUser(user, { silent = false } = {}) {
  currentUser = user || null;
  lastFetched = user ? Date.now() : 0;
  if (!silent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lv-user-update', { detail: currentUser }));
  }
  return currentUser;
}

export async function ensureUser(fetchFn) {
  if (currentUser) return currentUser;
  const u = await fetchFn();
  setCurrentUser(u);
  return u;
}

export function clearCurrentUser() {
  setCurrentUser(null);
}
