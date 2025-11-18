// resources/js/pages/shared/AuditLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { buildQuery, me as fetchMe } from '../../lib/api';
import { cachedGet } from '../../lib/httpCache';
import TableLayout from '../../layouts/TableLayout';
import TableToolbar from '../../components/table/TableToolbar';
import FilterPanel from '../../components/table/FilterPanel';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FiEye } from 'react-icons/fi';
import Modal from '../../components/Modal';

// Utility to format ISO -> local string
const fmt = (s) => (s ? new Date(s).toLocaleString() : '—');

// Humanize helpers (shared)
const humanize = (s) => {
  if (!s) return '';
  const spaced = s.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatAction = (a) => {
  if (!a) return '';
  switch (a) {
    case 'created': return 'Created';
    case 'updated': return 'Updated';
    case 'deleted': return 'Deleted';
    case 'force_deleted': return 'Force Deleted';
    case 'restored': return 'Restored';
    default: return humanize(a);
  }
};

// Helper to coerce before/after payloads into plain objects
const parseMaybeJSON = (v) => {
  if (v === null || v === undefined || v === '') return {};
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  }
  if (typeof v === 'object') return v; // already object / array
  return {};
};

// Extract lake name from row or payloads
const extractLakeName = (r) => {
  if (!r) return null;
  if (r.lake_name) return r.lake_name;
  if (r.entity_name && /(lake)$/i.test((r.model_type || '').split('\\').pop())) return r.entity_name;
  const scan = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.lake_name) return obj.lake_name;
    if (obj.lake && typeof obj.lake === 'object' && obj.lake.name) return obj.lake.name;
    if (obj.name && typeof obj.name === 'string') return obj.name;
    return null;
  };
  return scan(r.after) || scan(r.before) || scan(r) || null;
};

// Shared Audit Logs component
// scope: 'admin' | 'org'
export default function AuditLogs({ scope = 'admin' }) {
  const isAdminScope = scope === 'admin';

  // User and base scoping
  const [me, setMe] = useState(null);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: null });
  const clientMetaCacheRef = useRef(new Map());
  const [clientMetaLoading, setClientMetaLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  // Lazy lookup maps for ParameterThreshold summaries
  const [paramMap, setParamMap] = useState(() => new Map()); // id -> { name, code }
  const [stdMap, setStdMap] = useState(() => new Map()); // id -> { code, name }
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  // Cache for resolving threshold-specific metadata when payload lacks IDs
  const [thresholdMap, setThresholdMap] = useState(() => new Map()); // id -> { parameter_id, paramName, standard_id, stdLabel }

  // Stable option catalogs (roles, tenants, entities) for admin; org only needs entities
  const [allRoles, setAllRoles] = useState([]);
  const [allTenants, setAllTenants] = useState([]); // { value, label }
  const [allEntities, setAllEntities] = useState([]); // { base, full }

  // Detail modal state
  const [detailRow, setDetailRow] = useState(null);
  const openDetail = (row) => setDetailRow(row);
  const closeDetail = () => setDetailRow(null);

  // Advanced filters
  const TABLE_ID = isAdminScope ? 'admin-audit-logs' : 'org-audit-logs';
  const VIS_KEY = `${TABLE_ID}::visible`;
  const ADV_KEY = `${TABLE_ID}::filters_advanced`;

  const [fAction, setFAction] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').action || ''; } catch { return ''; } });
  const [fActorName, setFActorName] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').actor_name || ''; } catch { return ''; } });
  const [fRole, setFRole] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').role || ''; } catch { return ''; } });
  const [fTenant, setFTenant] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').tenant_id || ''; } catch { return ''; } });
  const [fEntity, setFEntity] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').model_type || ''; } catch { return ''; } });
  const [fTimeWindow, setFTimeWindow] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').time_window || ''; } catch { return ''; } });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Persist advanced filters
  useEffect(() => {
    try {
      localStorage.setItem(ADV_KEY, JSON.stringify({
        action: fAction || '',
        actor_name: fActorName || '',
        role: isAdminScope ? (fRole || '') : undefined,
        tenant_id: isAdminScope ? (fTenant || '') : undefined,
        model_type: fEntity || '',
        time_window: fTimeWindow || '',
      }));
    } catch {}
  }, [ADV_KEY, fAction, fActorName, fRole, fTenant, fEntity, fTimeWindow, isAdminScope]);

  // Column visibility
  const defaultsVisible = useMemo(() => ({ summary: true, target: true, actions: true }), []);
  const [visibleMap, setVisibleMap] = useState(() => {
    try { const raw = localStorage.getItem(VIS_KEY); return raw ? JSON.parse(raw) : defaultsVisible; } catch { return defaultsVisible; }
  });
  useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {}; }, [VIS_KEY, visibleMap]);

  // Debounce ref for auto fetch
  const debounceRef = useRef(null);

  const page = meta.current_page ?? 1;
  const perPage = meta.per_page ?? (isAdminScope ? 25 : 10);

  const fetchMeCached = async () => {
    try { const u = await fetchMe({ maxAgeMs: 5 * 60 * 1000 }); setMe(u || null); } catch { setMe(null); }
  };

  const isOrgAdmin = me?.role === 'org_admin';

  // Route base handling
  const effectiveBase = isAdminScope
    ? ((isOrgAdmin && me?.tenant_id) ? `/org/${me.tenant_id}/audit-logs` : '/admin/audit-logs')
    : (isOrgAdmin && me?.tenant_id ? `/org/${me.tenant_id}/audit-logs` : null);

  const buildParams = (overrides = {}) => {
    const params = { page, per_page: perPage, ...overrides };
    if (fAction) params.action = fAction;
    if (fActorName) params.actor_name = fActorName;
    if (isAdminScope && fRole) params.role = fRole;
    if (isAdminScope && fTenant) params.tenant_id = fTenant;
    if (fEntity) params.model_type = fEntity;
    if (fTimeWindow) {
      const now = new Date();
      let from;
      switch (fTimeWindow) {
        case '24h': from = new Date(now.getTime() - 24*60*60*1000); break;
        case '7d': from = new Date(now.getTime() - 7*24*60*60*1000); break;
        case '30d': from = new Date(now.getTime() - 30*24*60*60*1000); break;
        default: from = null;
      }
      if (from) {
        const two = (n) => String(n).padStart(2,'0');
        params.date_from = `${from.getFullYear()}-${two(from.getMonth()+1)}-${two(from.getDate())}`;
      }
    }
    return params;
  };

  const fetchLogs = async (params = {}, opts = {}) => {
    if (!effectiveBase) return; // org scope without tenant/admin access
    setLoading(true); setError(null);
    try {
      const res = await cachedGet(effectiveBase, { params, ttlMs: opts.force ? 0 : (2 * 60 * 1000) });
      const body = res;
      let items = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
      if (Array.isArray(items)) {
        items = items.filter(it => {
          const mt = it.model_type || '';
          const base = String(mt).split('\\').pop();
          return base !== 'SampleResult';
        });
      }
      const normalizedItems = Array.isArray(items)
        ? items.map(r => ({ ...r, before: parseMaybeJSON(r.before), after: parseMaybeJSON(r.after) }))
        : [];
      setRows(normalizedItems);

      // Update stable option catalogs
      if (isAdminScope && Array.isArray(normalizedItems)) {
        // Roles
        setAllRoles(prev => {
          const set = new Set(prev);
          for (const r of normalizedItems) {
            const role = r.actor_role || (r.actor && r.actor.role);
            if (role) set.add(role);
          }
          return Array.from(set).sort();
        });
        // Tenants
        setAllTenants(prev => {
          const map = new Map(prev.map(t => [String(t.value), t.label]));
          for (const r of normalizedItems) {
            if (r.tenant_id) {
              const key = String(r.tenant_id);
              if (!map.has(key)) map.set(key, r.tenant_name || `Organization ${key}`);
            }
          }
          return Array.from(map.entries()).map(([value,label])=>({ value, label })).sort((a,b)=>a.label.localeCompare(b.label));
        });
      }
      // Entities
      setAllEntities(prev => {
        const map = new Map(prev.map(e => [e.full, e.base]));
        for (const r of normalizedItems) if (r.model_type) {
          const full = r.model_type;
          const base = full.split('\\').pop();
          if (base === 'SampleResult') continue;
          if (!map.has(full)) map.set(full, base);
        }
        return Array.from(map.entries()).map(([full, base]) => ({ base, full })).sort((a,b)=>a.base.localeCompare(b.base));
      });

      const pg = Array.isArray(body) ? null : (body || null);
      const metaObj = pg && typeof pg === 'object' && pg.meta && typeof pg.meta === 'object' ? pg.meta : pg;
      const effectivePage = params.page || 1;
      const effectivePerPage = params.per_page || perPage;
      const metaPresent = !!(metaObj && (typeof metaObj.current_page === 'number' || typeof metaObj.last_page === 'number' || typeof metaObj.total === 'number'));
      if (metaPresent) {
        setMeta({
          current_page: typeof metaObj.current_page === 'number' ? metaObj.current_page : effectivePage,
          last_page: typeof metaObj.last_page === 'number' ? metaObj.last_page : Math.max(1, Math.ceil((typeof metaObj.total === 'number' ? metaObj.total : normalizedItems.length) / effectivePerPage)),
          per_page: typeof metaObj.per_page === 'number' ? metaObj.per_page : effectivePerPage,
          total: typeof metaObj.total === 'number' ? metaObj.total : null,
        });
      } else {
        setMeta({ current_page: effectivePage, last_page: 1, per_page: effectivePerPage, total: null });
        const baseParams = { ...params }; delete baseParams.page;
        await ensureClientMeta(effectiveBase, baseParams, effectivePage, effectivePerPage, normalizedItems.length);
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  // When logs include ParameterThreshold rows, fetch catalogs to resolve names
  useEffect(() => {
    const hasThresholds = rows.some(r => (r.model_type || '').split('\\').pop() === 'ParameterThreshold');
    if (!hasThresholds || catalogsLoaded) return;
    (async () => {
      try {
        const [paramsRes, stdsRes] = await Promise.all([
          cachedGet('/admin/parameters', { ttlMs: 5 * 60 * 1000 }),
          cachedGet('/admin/wq-standards', { ttlMs: 5 * 60 * 1000 }),
        ]);
        const pList = Array.isArray(paramsRes?.data) ? paramsRes.data : (Array.isArray(paramsRes) ? paramsRes : []);
        const sList = Array.isArray(stdsRes?.data) ? stdsRes.data : (Array.isArray(stdsRes) ? stdsRes : []);
        const pMap = new Map();
        for (const p of pList) if (p && p.id != null) pMap.set(String(p.id), { name: p.name || p.code || `Parameter #${p.id}`, code: p.code || '' });
        const sMap = new Map();
        for (const s of sList) if (s && s.id != null) sMap.set(String(s.id), { code: s.code || s.name || `Standard #${s.id}`, name: s.name || s.code || '' , is_current: !!s.is_current });
        setParamMap(pMap);
        setStdMap(sMap);
        setCatalogsLoaded(true);
      } catch {/* ignore lookup errors */}
    })();
  }, [rows, catalogsLoaded]);

  // Resolve missing ParameterThreshold details via API when payload lacks identifiers
  useEffect(() => {
    const pending = [];
    for (const r of rows) {
      const base = (r.model_type || '').split('\\').pop();
      if (base !== 'ParameterThreshold') continue;
      if (!r || thresholdMap.has(String(r.model_id))) continue;
      const any = { ...(r.before || {}), ...(r.after || {}) };
      const hasParamId = any.parameter_id != null;
      const hasStdInfo = any.standard_id != null || any.standard_code || any.standard_name || (any.standard && (any.standard.code || any.standard.name));
      if (!hasParamId || !hasStdInfo) {
        pending.push(String(r.model_id));
      }
    }
    if (pending.length === 0) return;
    (async () => {
      for (const id of pending.slice(0, 20)) { // safety bound
        try {
          const res = await cachedGet(`/admin/parameter-thresholds/${id}`, { ttlMs: 60 * 1000 });
          const body = res?.data?.data || res?.data || res;
          if (body && typeof body === 'object') {
            const p = body.parameter || {};
            const s = body.standard || {};
            const paramId = body.parameter_id != null ? String(body.parameter_id) : (p.id != null ? String(p.id) : null);
            const paramName = p.name || p.code || (paramId ? `Parameter #${paramId}` : 'Parameter');
            const stdId = body.standard_id != null ? String(body.standard_id) : (s.id != null ? String(s.id) : null);
            const stdLabel = s.code || s.name || (stdId ? `Standard #${stdId}` : ( (() => {
              // null standard -> try current from stdMap
              let current = null; for (const v of stdMap.values()) { if (v && v.is_current) { current = v; break; } }
              return current ? (current.code || current.name || 'Default Standard') : 'Default Standard';
            })() ));
            setThresholdMap(prev => {
              const next = new Map(prev);
              next.set(String(id), { parameter_id: paramId, paramName, standard_id: stdId, stdLabel });
              return next;
            });
          }
        } catch {/* ignore per-row failure */}
      }
    })();
  }, [rows, thresholdMap, stdMap]);

  // Compute and cache total/last_page when server doesn't provide meta.
  const ensureClientMeta = async (baseUrl, baseParams, currentPage, perPageVal, currentPageCount) => {
    try {
      const key = `${baseUrl}?${buildQuery({ ...baseParams, per_page: perPageVal })}`;
      const cached = clientMetaCacheRef.current.get(key);
      if (cached && typeof cached.total === 'number' && typeof cached.last_page === 'number') {
        setMeta(m => ({ ...m, last_page: cached.last_page, total: cached.total, per_page: cached.per_page || perPageVal }));
        return;
      }
      setClientMetaLoading(true);
      let total = 0;
      let pageIdx = 1;
      const maxPages = 500; // safety cap
      for (; pageIdx <= maxPages; pageIdx++) {
        let len;
        if (pageIdx === currentPage && typeof currentPageCount === 'number') {
          len = currentPageCount;
        } else {
          const resp = await api.get(baseUrl, { params: { ...baseParams, page: pageIdx, per_page: perPageVal } });
          const b = resp?.data;
          const arr = Array.isArray(b) ? b : (Array.isArray(b?.data) ? b.data : []);
          len = Array.isArray(arr) ? arr.filter(it => {
            const mt = it.model_type || '';
            const base = String(mt).split('\\').pop();
            return base !== 'SampleResult';
          }).length : 0;
        }
        total += len;
        if (len < perPageVal) break;
      }
      const lastPage = Math.max(1, Math.ceil(total / perPageVal));
      const computed = { total, last_page: lastPage, per_page: perPageVal };
      clientMetaCacheRef.current.set(key, computed);
      setMeta(m => ({ ...m, last_page: lastPage, total, per_page: perPageVal }));
    } catch (err) {
      console.warn('Failed to compute client-side pagination meta', err);
    } finally {
      setClientMetaLoading(false);
    }
  };

  // Seed option catalogs for admin scope without duplicate calls
  const seedOptions = async () => {
    if (!isAdminScope) return;
    if ((allRoles.length && allTenants.length && allEntities.length) || !me) return;
    const rawBases = me && me.role && me.role.includes('admin') ? ['/admin/audit-logs', effectiveBase] : [effectiveBase];
    const candidateBases = Array.from(new Set(rawBases));
    for (const base of candidateBases) {
      if (!base) continue;
      try {
        const res = await cachedGet(base, { params: { page: 1, per_page: 100 }, ttlMs: 2 * 60 * 1000 });
        const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        if (!Array.isArray(items) || items.length === 0) continue;
        setAllRoles(prev => {
          const set = new Set(prev);
          for (const r of items) { const role = r.actor_role || (r.actor && r.actor.role); if (role) set.add(role); }
          return Array.from(set).sort();
        });
        setAllTenants(prev => {
          const map = new Map(prev.map(t => [String(t.value), t.label]));
          for (const r of items) if (r.tenant_id) { const key = String(r.tenant_id); if (!map.has(key)) map.set(key, r.tenant_name || `Organization ${key}`); }
          return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a,b)=>a.label.localeCompare(b.label));
        });
        setAllEntities(prev => {
          const map = new Map(prev.map(e => [e.full, e.base]));
          for (const r of items) if (r.model_type) { const full = r.model_type; const base = full.split('\\').pop(); if (base === 'SampleResult') continue; if (!map.has(full)) map.set(full, base); }
          return Array.from(map.entries()).map(([full, base]) => ({ base, full })).sort((a,b)=>a.base.localeCompare(b.base));
        });
        if (allRoles.length || allTenants.length || allEntities.length) break;
      } catch {/* ignore */}
    }
  };

  // Initial load
  useEffect(() => { (async () => { await fetchMeCached(); })(); }, []);
  useEffect(() => { if (me) { seedOptions(); fetchLogs(buildParams({ page: 1 })); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [me, isAdminScope]);

  // Auto refetch on advanced filter changes (debounced)
  useEffect(() => {
    if (!effectiveBase) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchLogs(buildParams({ page: 1 })); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fAction, fActorName, fRole, fTenant, fEntity, fTimeWindow, effectiveBase]);

  // Columns
  const columns = useMemo(() => {
    const truncate = (s, max = 60) => (s && s.length > max ? s.slice(0, max) + '…' : s);
    const modelNameMap = {
      'LakeFlow': 'Tributary',
      'SamplingEvent': 'Sampling Event',
      'ParameterThreshold': 'Parameter Threshold',
      'WqStandard': 'Standard',
      'OrgApplication': 'Organization Application',
      'KycProfile': 'KYC Profile',
      'Tenant': 'Organization',
    };
    return [
      { id: 'summary', header: 'Summary', render: r => {
          const actor = r.actor_name || (isAdminScope ? 'System Admin' : 'User');
          const modelBase = r.model_type ? r.model_type.split('\\').pop() : 'Record';
          let verb;
          switch (r.action) {
            case 'created': verb = 'Created'; break;
            case 'updated': verb = 'Updated'; break;
            case 'deleted': verb = 'Deleted'; break;
            case 'force_deleted': verb = 'Force Deleted'; break;
            case 'restored': verb = 'Restored'; break;
            default: verb = (r.action || 'Did').replace(/\b\w/g, c=>c.toUpperCase());
          }
          const ts = r.event_at ? ` at ${fmt(r.event_at)}` : '';
          const base = modelBase;
          if (base === 'ParameterThreshold') {
            const after = r.after || {};
            const before = r.before || {};
            const any = { ...before, ...after };
            // Try nested relation names first if present in payload
            const paramId = any.parameter_id != null ? String(any.parameter_id) : null;
            const paramFromMap = paramId && paramMap.get(paramId);
            const thMeta = thresholdMap.get(String(r.model_id));
            const paramName = (after.parameter && (after.parameter.name || after.parameter.code))
              || (before.parameter && (before.parameter.name || before.parameter.code))
              || any.parameter_name
              || any.parameter_code
              || (paramFromMap && (paramFromMap.name || paramFromMap.code))
              || (thMeta && thMeta.paramName)
              || (paramId ? `Parameter #${paramId}` : 'Parameter');
            const stdLabel = (() => {
              const stdObj = after.standard || before.standard || any.standard || null;
              const stdId = any.standard_id != null ? String(any.standard_id) : null;
              const stdFromMap = stdId && stdMap.get(stdId);
              const thStd = thMeta && thMeta.stdLabel;
              if (stdObj && (stdObj.code || stdObj.name)) return stdObj.code || stdObj.name;
              if (any.standard_code) return any.standard_code;
              if (any.standard_name) return any.standard_name;
              if (stdFromMap && (stdFromMap.code || stdFromMap.name)) return stdFromMap.code || stdFromMap.name;
              if (thStd) return thStd;
              if (any.standard_id == null) {
                // Try to show current standard code if available from catalog
                let currentStd = null;
                for (const v of stdMap.values()) { if (v && v.is_current) { currentStd = v; break; } }
                if (currentStd && (currentStd.code || currentStd.name)) return currentStd.code || currentStd.name;
                return 'Default Standard';
              }
              return `Standard #${any.standard_id}`;
            })();
            return `${actor} ${verb} the threshold for ${truncate(String(paramName))} in ${truncate(String(stdLabel))}${ts}`;
          }
          if (base === 'SamplingEvent') {
            const lakeNm = r.entity_name || extractLakeName(r);
            const lakeLabel = lakeNm ? truncate(lakeNm) : null;
            const sampledDate = (() => {
              const raw = (r.after && r.after.sampled_at) || (r.before && r.before.sampled_at) || null;
              if (!raw) return null; try { return new Date(raw).toLocaleDateString(); } catch { return raw; }
            })();
            let core = `${actor} ${verb} Sampling Event`;
            if (sampledDate) core += ` (${sampledDate})`;
            if (lakeLabel) core += ` for ${lakeLabel}`;
            return `${core}${ts}`;
          }
          if (base === 'Layer') {
            const layerName = r.entity_name || (r.after && r.after.name) || (r.before && r.before.name) || 'Layer';
            const scanLake = (obj) => {
              if (!obj || typeof obj !== 'object') return null;
              for (const k of Object.keys(obj)) {
                const v = obj[k];
                if (typeof v === 'string' && /lake/i.test(k) && v.trim()) return v.trim();
                if (v && typeof v === 'object' && v.name && /lake/i.test(k)) return String(v.name).trim();
              }
              return null;
            };
            const lakeNm = scanLake(r.after) || scanLake(r.before) || null;
            let core = `${actor} ${verb} ${truncate(layerName)} layer`;
            if (lakeNm) core += ` for ${truncate(lakeNm)}`;
            return `${core}${ts}`;
          }
          if (r.entity_name) return `${actor} ${verb} ${truncate(r.entity_name)}${ts}`;
          const idTag = r.model_id ? `${modelBase}#${r.model_id}` : modelBase;
          return `${actor} ${verb} ${idTag}${ts}`;
        }, width: 560 },
      { id: 'target', header: 'Target', render: r => {
        const base = r.model_type ? r.model_type.split('\\').pop() : 'Record';
        return modelNameMap[base] || base;
      }, width: 140 },
      { id: 'actions', header: 'Action', width: 80, render: r => (
        <button className="pill-btn ghost sm" title="View Details" onClick={() => openDetail(r)} style={{ display:'flex', alignItems:'center', gap:4 }}>
          <FiEye />
        </button>
      )},
    ];
  }, [isAdminScope, paramMap, stdMap, thresholdMap]);

  const visibleColumns = useMemo(() => columns.filter(c => visibleMap[c.id] !== false), [columns, visibleMap]);

  // Derived options
  const derivedRoles = isAdminScope ? (allRoles.length ? allRoles : Array.from(new Set(rows.map(r => r.actor_role || (r.actor && r.actor.role)).filter(Boolean))).sort()) : [];
  const derivedTenants = isAdminScope ? (allTenants.length ? allTenants : (() => {
    const map = new Map();
    for (const r of rows) if (r.tenant_id) {
      const key = String(r.tenant_id); if (!map.has(key)) map.set(key, r.tenant_name || `Organization ${key}`);
    }
    return Array.from(map.entries()).map(([value,label])=>({ value, label })).sort((a,b)=>a.label.localeCompare(b.label));
  })()) : [];
  const derivedEntities = allEntities.length ? allEntities : (() => {
    const map = new Map();
    for (const r of rows) if (r.model_type) {
      const full = r.model_type; const base = full.split('\\').pop(); if (base === 'SampleResult') continue; if (!map.has(full)) map.set(full, base);
    }
    return Array.from(map.entries()).map(([full, base])=>({ base, full })).sort((a,b)=>a.base.localeCompare(b.base));
  })();

  // Clear stale entity filter if not available
  useEffect(() => {
    const allowed = new Set(derivedEntities.map(e => e.full));
    if (fEntity && !allowed.has(fEntity)) setFEntity('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedEntities]);

  const actions = [];

  // Build structured changes for modal table
  const buildChanges = (row) => {
    if (!row || !row.before || !row.after) return [];
    const keys = row.diff_keys && Array.isArray(row.diff_keys) && row.diff_keys.length
      ? row.diff_keys
      : Array.from(new Set([...(row.before?Object.keys(row.before):[]), ...(row.after?Object.keys(row.after):[])]));
    const prettify = (k)=>k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    const normalize = (v)=> { if (v===null||v===undefined||v==='') return 'NULL'; if (typeof v==='object'){ try{return JSON.stringify(v);}catch{return String(v);} } return String(v); };
    const out=[]; for (const k of keys){ const b=row.before[k]; const a=row.after[k]; if (JSON.stringify(b)===JSON.stringify(a)) continue; out.push({ fieldLabel: prettify(k), fromVal: normalize(b), toVal: normalize(a) }); }
    return out;
  };

  const columnPickerAdapter = {
    columns: columns.map(c => ({ id: c.id, header: c.header })),
    visibleMap,
    onVisibleChange: (m) => setVisibleMap(m),
  };

  // Advanced fields
  const advancedFields = useMemo(() => {
    const baseFields = [
      { id: 'action', label: 'Action', type: 'select', value: fAction, onChange: v => setFAction(v), options: [
        { value: '', label: 'All' }, { value: 'created', label: 'Created' }, { value: 'updated', label: 'Updated' }, { value: 'deleted', label: 'Deleted' }, { value: 'force_deleted', label: 'Force Deleted' }, { value: 'restored', label: 'Restored' },
      ] },
      { id: 'actor_name', label: 'Name', type: 'text', value: fActorName, onChange: v => setFActorName(v) },
      { id: 'model_type', label: 'Entity', type: 'select', value: fEntity, onChange: v => setFEntity(v), options: [ { value:'', label:'All' }, ...derivedEntities.map(e=>({ value:e.full, label:e.base })) ] },
      { id: 'time_window', label: 'Time Window', type: 'select', value: fTimeWindow, onChange: v => setFTimeWindow(v), options: [
        { value:'', label:'All' }, { value:'24h', label:'Last 24h' }, { value:'7d', label:'Last 7d' }, { value:'30d', label:'Last 30d' }
      ] },
    ];
    if (!isAdminScope) return baseFields;
    return [
      baseFields[0],
      baseFields[1],
      { id: 'role', label: 'Role', type: 'select', value: fRole, onChange: v => setFRole(v), options: [ { value:'', label:'All' }, ...derivedRoles.map(r=>({ value:r, label:r })) ] },
      { id: 'group_tei', label: 'Scope', type: 'group', children: [
        { id: 'tenant_id', label: 'Organization', type: 'select', value: fTenant, onChange: v => setFTenant(v), options: [ { value:'', label:'All' }, ...derivedTenants ] },
        baseFields[2],
        baseFields[3],
      ]},
    ];
  }, [isAdminScope, fAction, fActorName, fRole, fTenant, fEntity, fTimeWindow, derivedRoles, derivedTenants, derivedEntities]);

  const activeAdvCount = useMemo(() => [fAction, fActorName, isAdminScope ? fRole : null, isAdminScope ? fTenant : null, fEntity, fTimeWindow].filter(Boolean).length, [fAction, fActorName, fRole, fTenant, fEntity, fTimeWindow, isAdminScope]);

  const clearAdvanced = () => {
    setFAction(''); setFActorName(''); if (isAdminScope) { setFRole(''); setFTenant(''); } setFEntity(''); setFTimeWindow(''); fetchLogs(buildParams({ page: 1 }));
  };

  const goPage = (p) => fetchLogs(buildParams({ page: p }));

  // Client-side filtered data for display
  const filteredData = useMemo(() => rows.filter(r => {
    if (q) {
      // Build summary via columns render
      const summaryText = columns[0].render(r) || '';
      if (!summaryText.toLowerCase().includes(q.toLowerCase())) return false;
    }
    if (fActorName) {
      const nm = (r.actor_name||'').toLowerCase();
      if (!nm.includes(fActorName.toLowerCase())) return false;
    }
    if (isAdminScope && fRole) {
      const rv = (r.actor_role || (r.actor && r.actor.role) || '').toLowerCase();
      if (rv !== fRole.toLowerCase()) return false;
    }
    if (isAdminScope && fTenant) {
      if (String(r.tenant_id) !== String(fTenant)) return false;
    }
    if (fEntity && r.model_type !== fEntity) return false;
    if (fTimeWindow) {
      const ev = r.event_at ? new Date(r.event_at) : null; if (!ev) return false;
      const now = new Date(); const diff = now - ev; const day = 24*60*60*1000;
      if (fTimeWindow==='24h' && diff>day) return false;
      if (fTimeWindow==='7d' && diff>7*day) return false;
      if (fTimeWindow==='30d' && diff>30*day) return false;
    }
    return true;
  }), [rows, q, fActorName, fRole, fTenant, fEntity, fTimeWindow, isAdminScope, columns]);

  // Render
  if (!isAdminScope && !isOrgAdmin) {
    return (
      <div className="container" style={{ padding:16, position:'relative' }}>
        <div className="dashboard-card" style={{ marginBottom:12 }}>
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiEye />
              <span>Organization Audit Logs</span>
            </div>
          </div>
          <p className="muted" style={{ marginTop:4 }}>Activity history within your organization.</p>
        </div>
        <div className="card" style={{ padding:16, borderRadius:12, marginBottom:12 }}>
          <div style={{ fontSize:14 }}>This page is only available to organization administrators.</div>
        </div>
      </div>
    );
  }

  const headingTitle = isAdminScope ? 'Audit Logs' : 'Organization Audit Logs';
  const headingDesc = isAdminScope ? 'View system audit logs and activity history.' : 'Activity history within your organization.';

  return (
    <div className="container" style={{ padding: 16, position:'relative' }}>
      <div className="dashboard-card" style={{ marginBottom: 12 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiEye />
            <span>{headingTitle}</span>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>{headingDesc}</p>
      </div>
      <div className="card" style={{ padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <TableToolbar
          tableId={TABLE_ID}
          search={{ value: q, onChange: (val) => setQ(val), placeholder: 'Search Logs...' }}
          filters={[]}
          columnPicker={{
            columns: columns.map(c => ({ id: c.id, header: c.header })),
            visibleMap,
            onVisibleChange: (m) => setVisibleMap(m),
          }}
          onRefresh={() => fetchLogs(buildParams(), { force: true })}
          onToggleFilters={() => setShowAdvanced(s => !s)}
          filtersBadgeCount={activeAdvCount}
        />
        <FilterPanel open={showAdvanced} fields={advancedFields} onClearAll={clearAdvanced} />
        {error && <div className="lv-error" style={{ padding: 8, color: 'var(--danger)' }}>{error}</div>}
      </div>
      <div className="card" style={{ padding: 12, borderRadius: 12 }}>
        {loading && <div style={{ padding: 16 }}><LoadingSpinner label="Loading audit logs…" /></div>}
        {!loading && filteredData.length === 0 && <div className="lv-empty" style={{ padding: 16 }}>No audit logs.</div>}
        {!loading && filteredData.length > 0 && (
          <TableLayout
            tableId={TABLE_ID}
            columns={visibleColumns}
            data={filteredData}
            pageSize={perPage}
            virtualize={true}
            rowHeight={48}
            actions={actions}
            resetSignal={0}
            columnPicker={false}
            hidePager={true}
          />
        )}
        <div className="lv-table-pager" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="pill-btn ghost sm" disabled={loading || page <= 1} onClick={() => goPage(page - 1)}>&lt; Prev</button>
          {loading || clientMetaLoading ? (
            <span className="pager-text">Loading…</span>
          ) : (
            <span className="pager-text">Page {meta.current_page ?? page} of {meta.last_page}{meta?.total != null ? ` · ${meta.total} total` : ''}</span>
          )}
          <button className="pill-btn ghost sm" disabled={loading || clientMetaLoading || page >= meta.last_page} onClick={() => goPage(page + 1)}>Next &gt;</button>
        </div>
      </div>

      {detailRow && (
        <Modal
          open={!!detailRow}
          onClose={closeDetail}
          title={`Audit Log #${detailRow.id || ''}`}
          width={720}
          ariaLabel={isAdminScope ? 'Audit log detail dialog' : 'Organization audit log detail dialog'}
          bodyClassName="audit-log-detail-body"
          footer={(
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="pill-btn ghost" onClick={closeDetail}>Close</button>
            </div>
          )}
        >
          <div className="lv-settings-panel" style={{ gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Event</h3>
            <div style={{ display:'grid', rowGap:6, fontSize:13.5 }}>
              <div><strong style={{ width:110, display:'inline-block' }}>User:</strong> {detailRow.actor_name || (isAdminScope ? 'System Admin' : 'User')}</div>
              <div><strong style={{ width:110, display:'inline-block' }}>Role:</strong> {(() => {
                const raw = detailRow.actor_role || detailRow.actor?.role || '';
                const v = String(raw).toLowerCase().replace(/\s+/g,' ').trim();
                if (v === 'superadmin' || v === 'super_admin' || v === 'super administrator') return 'Super Administrator';
                if (v === 'org_admin' || v === 'orgadmin' || v === 'organization administrator' || v === 'organization_admin') return 'Organization Administrator';
                if (v === 'contributor') return 'Contributor';
                return humanize(raw) || '—';
              })()}</div>
              <div><strong style={{ width:110, display:'inline-block' }}>Action:</strong> {formatAction(detailRow.action)}</div>
              <div><strong style={{ width:110, display:'inline-block' }}>Entity:</strong>{' '}
                {(() => {
                  const base = detailRow.model_type ? detailRow.model_type.split('\\').pop() : 'Record';
                  if (base === 'SamplingEvent') {
                    const nm = detailRow.entity_name || extractLakeName(detailRow);
                    const sampledDate = (() => {
                      const raw = (detailRow.after && detailRow.after.sampled_at) || (detailRow.before && detailRow.before.sampled_at) || null;
                      if (!raw) return null; try { return new Date(raw).toLocaleDateString(); } catch { return raw; }
                    })();
                    let text = 'Sampling Event';
                    if (sampledDate) text += ` (${sampledDate})`;
                    if (nm) text += ` for ${nm}`;
                    return text;
                  }
                  if (base === 'Layer') {
                    const layerName = detailRow.entity_name || (detailRow.after && detailRow.after.name) || (detailRow.before && detailRow.before.name) || 'Layer';
                    const scanLake = (obj) => {
                      if (!obj || typeof obj !== 'object') return null;
                      for (const k of Object.keys(obj)) {
                        const v = obj[k];
                        if (typeof v === 'string' && /lake/i.test(k) && v.trim()) return v.trim();
                        if (v && typeof v === 'object' && v.name && /lake/i.test(k)) return String(v.name).trim();
                      }
                      return null;
                    };
                    const lakeNm = scanLake(detailRow.after) || scanLake(detailRow.before) || null;
                    return `${layerName} layer${lakeNm ? ` for ${lakeNm}` : ''}`;
                  }
                  const raw = detailRow.entity_name || base;
                  return String(raw).replace(/\s+#\d+$/, '');
                })()}
              </div>
              {detailRow.tenant_id && (
                <div><strong style={{ width:110, display:'inline-block' }}>Organization:</strong> {detailRow.tenant_name || detailRow.tenant_id}</div>
              )}
              {detailRow.ip_address && (
                <div><strong style={{ width:110, display:'inline-block' }}>IP:</strong> {detailRow.ip_address}</div>
              )}
              <div><strong style={{ width:110, display:'inline-block' }}>Timestamp:</strong> {fmt(detailRow.event_at)}</div>
            </div>
          </div>

          <div className="lv-settings-panel" style={{ gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Changes</h3>
            {detailRow.before && detailRow.after ? (
              (() => {
                const changes = buildChanges(detailRow);
                if (changes.length === 0) {
                  return <div style={{ fontStyle:'italic', fontSize:13, color:'#64748b' }}>No field differences detected.</div>;
                }
                return (
                  <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
                      <thead style={{ background:'#f3f4f6' }}>
                        <tr>
                          <th style={{ textAlign:'left', padding:'8px 10px', fontSize:12, textTransform:'uppercase', letterSpacing:0.5 }}>Field</th>
                          <th style={{ textAlign:'left', padding:'8px 10px', fontSize:12, textTransform:'uppercase', letterSpacing:0.5 }}>From</th>
                          <th style={{ textAlign:'left', padding:'8px 10px', fontSize:12, textTransform:'uppercase', letterSpacing:0.5 }}>To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changes.map((ch,i) => (
                          <tr key={i} style={{ background: i % 2 ? '#f9fafb' : 'white' }}>
                            <td style={{ padding:'6px 10px', fontWeight:500 }}>{ch.fieldLabel}</td>
                            <td style={{ padding:'6px 10px', color:'#b91c1c', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{ch.fromVal}</td>
                            <td style={{ padding:'6px 10px', color:'#065f46', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{ch.toVal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            ) : (
              <div style={{ fontStyle:'italic', fontSize:13, color:'#64748b' }}>No before/after payload to diff.</div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
