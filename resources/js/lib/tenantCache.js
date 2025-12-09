// Simple tenant name cache: in-memory + localStorage persistence
// Provides getName(tenantId) and fetchAndCache(tenantId)
import { listTenantsOptions } from './api';

const memory = {
  names: {},
  lastFetchTs: 0,
};

const LS_PREFIX = 'lv_tenant_name_';

export function getName(tenantId) {
  if (!tenantId) return '';
  const idStr = String(tenantId);
  // Memory first
  if (memory.names[idStr]) return memory.names[idStr];
  // LocalStorage fallback
  try {
    const ls = localStorage.getItem(LS_PREFIX + idStr);
    if (ls) {
      memory.names[idStr] = ls;
      return ls;
    }
  } catch {}
  return '';
}

export function clearTenantName(tenantId) {
  if (!tenantId) return;
  const idStr = String(tenantId);
  delete memory.names[idStr];
  try {
    localStorage.removeItem(LS_PREFIX + idStr);
  } catch {}
}

export function clearAllTenantNames() {
  memory.names = {};
  memory.lastFetchTs = 0;
  delete memory._lastRows;
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(LS_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {}
}

export async function fetchAndCache(tenantId, forceRefresh = false) {
  if (!tenantId) return '';
  if (!forceRefresh) {
    const existing = getName(tenantId);
    if (existing) return existing;
  }
  // Throttle full list fetches to at most once per 10s (unless forcing refresh)
  const now = Date.now();
  let rows = [];
  if (!forceRefresh && now - memory.lastFetchTs < 10_000 && memory._lastRows) {
    rows = memory._lastRows;
  } else {
    try {
      const res = await listTenantsOptions();
      rows = res?.data || [];
      memory._lastRows = rows;
      memory.lastFetchTs = now;
    } catch {
      rows = [];
    }
  }
  const match = rows.find(r => Number(r.id) === Number(tenantId));
  const name = match?.name || '';
  if (name) {
    const idStr = String(tenantId);
    memory.names[idStr] = name;
    try { localStorage.setItem(LS_PREFIX + idStr, name); } catch {}
  }
  return name;
}

export async function ensureTenantName(tenantId, setter) {
  if (!tenantId) return;
  // Always fetch fresh to ensure we get updated names
  const fresh = await fetchAndCache(tenantId, true);
  if (fresh) setter(fresh);
}
