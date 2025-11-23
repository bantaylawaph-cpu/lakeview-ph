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

export async function fetchAndCache(tenantId) {
  if (!tenantId) return '';
  const existing = getName(tenantId);
  if (existing) return existing;
  // Throttle full list fetches to at most once per 30s
  const now = Date.now();
  let rows = [];
  if (now - memory.lastFetchTs < 30_000 && memory._lastRows) {
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
  const cached = getName(tenantId);
  if (cached) { setter(cached); return; }
  const fresh = await fetchAndCache(tenantId);
  if (fresh) setter(fresh);
}
