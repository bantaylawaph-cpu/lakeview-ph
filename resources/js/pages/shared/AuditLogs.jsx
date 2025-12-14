// resources/js/pages/shared/AuditLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { buildQuery, me as fetchMe } from '../../lib/api';
import { cachedGet, invalidateHttpCache } from '../../lib/httpCache';
import TableLayout from '../../layouts/TableLayout';
import TableToolbar from '../../components/table/TableToolbar';
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
  
  // Entity lookup maps for resolving IDs to names
  const [entityLookupMap, setEntityLookupMap] = useState(() => new Map()); // type_id -> name

  // Detail modal state
  const [detailRow, setDetailRow] = useState(null);
  const openDetail = (row) => setDetailRow(row);
  const closeDetail = () => setDetailRow(null);

  // Table ID
  const TABLE_ID = isAdminScope ? 'admin-audit-logs' : 'org-audit-logs';

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
    return params;
  };

  const fetchLogs = async (params = {}, opts = {}) => {
    if (!effectiveBase) return; // org scope without tenant/admin access
    setLoading(true); setError(null);
    try {
      // Shorter TTL for org audit logs (30s) vs admin (2min) for fresher tenant-scoped data
      const ttl = opts.force ? 0 : (isAdminScope ? (2 * 60 * 1000) : (30 * 1000));
      const res = await cachedGet(effectiveBase, { params, ttlMs: ttl });
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

  // Initial load
  useEffect(() => { (async () => { await fetchMeCached(); })(); }, []);
  
  // Clear cache and reload when scope or tenant changes
  useEffect(() => { 
    if (me) { 
      // Invalidate cache to ensure fresh data after security fix or context change
      invalidateHttpCache(['/admin/audit-logs', '/org/']);
      fetchLogs(buildParams({ page: 1 })); 
    } 
    /* eslint-disable-next-line react-hooks/exhaustive-deps */ 
  }, [me?.id, me?.tenant_id, isAdminScope]);

  // Auto refetch when base changes (debounced)
  useEffect(() => {
    if (!effectiveBase) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchLogs(buildParams({ page: 1 })); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBase]);

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
    
    const getRoleDisplay = (r) => {
      const raw = r.actor_role || r.actor?.role || '';
      const v = String(raw).toLowerCase().replace(/\s+/g,' ').trim();
      if (v === 'superadmin' || v === 'super_admin' || v === 'super administrator') return 'Super Admin';
      if (v === 'org_admin' || v === 'orgadmin' || v === 'organization administrator' || v === 'organization_admin') return 'Org Admin';
      if (v === 'contributor') return 'Contributor';
      return humanize(raw) || 'User';
    };
    
    const getRoleColor = (r) => {
      const raw = r.actor_role || r.actor?.role || '';
      const v = String(raw).toLowerCase().replace(/\s+/g,' ').trim();
      if (v === 'superadmin' || v === 'super_admin' || v === 'super administrator') return '#ef4444';
      if (v === 'org_admin' || v === 'orgadmin' || v === 'organization administrator' || v === 'organization_admin') return '#3b82f6';
      if (v === 'contributor') return '#10b981';
      return '#6b7280';
    };
    
    return [
      { id: 'who', header: 'Who', render: r => {
          const actor = r.actor_name || (isAdminScope ? 'System' : 'User');
          const role = getRoleDisplay(r);
          const roleColor = getRoleColor(r);
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <div style={{ fontWeight:500 }}>{actor}</div>
              <div style={{ fontSize:12, color:'#64748b', display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ color:roleColor, fontSize:14 }}>●</span>
                <span>{role}</span>
              </div>
            </div>
          );
        }, width: 180 },
      { id: 'what', header: 'What', render: r => {
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
          const base = modelBase;
          
          if (base === 'User' && r.action === 'created') {
            const after = r.after || {};
            const userName = after.name || r.entity_name || after.email || 'New User';
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <div>{truncate(userName)} Registered</div>
                {after.email && <div style={{ fontSize:12, color:'#64748b' }}>{after.email}</div>}
              </div>
            );
          }
          
          if (base === 'ParameterThreshold') {
            const after = r.after || {};
            const before = r.before || {};
            const any = { ...before, ...after };
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
                let currentStd = null;
                for (const v of stdMap.values()) { if (v && v.is_current) { currentStd = v; break; } }
                if (currentStd && (currentStd.code || currentStd.name)) return currentStd.code || currentStd.name;
                return 'Default Standard';
              }
              return `Standard #${any.standard_id}`;
            })();
            
            // Extract changed values for threshold
            let detail = null;
            if (r.action === 'updated' && before && after) {
              const changes = [];
              if (before.min_value !== after.min_value) changes.push(`Min: ${before.min_value ?? 'NULL'} → ${after.min_value ?? 'NULL'}`);
              if (before.max_value !== after.max_value) changes.push(`Max: ${before.max_value ?? 'NULL'} → ${after.max_value ?? 'NULL'}`);
              if (changes.length > 0) detail = changes.join(', ');
            }
            
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <div>{verb} threshold for <strong>{truncate(String(paramName))}</strong> in <strong>{truncate(String(stdLabel))}</strong></div>
                {detail && <div style={{ fontSize:12, color:'#64748b' }}>{detail}</div>}
              </div>
            );
          }
          
          if (base === 'SamplingEvent') {
            const lakeNm = r.entity_name || extractLakeName(r);
            const lakeLabel = lakeNm ? truncate(lakeNm) : null;
            const sampledDate = (() => {
              const raw = (r.after && r.after.sampled_at) || (r.before && r.before.sampled_at) || null;
              if (!raw) return null; try { return new Date(raw).toLocaleDateString(); } catch { return raw; }
            })();
            
            // Extract status change
            let detail = null;
            if (r.action === 'updated' && r.before && r.after) {
              if (r.before.status !== r.after.status) {
                detail = `Status: ${humanize(r.before.status || 'none')} → ${humanize(r.after.status || 'none')}`;
              }
            }
            
            let core = `${verb} Sampling Event`;
            if (sampledDate) core += ` (${sampledDate})`;
            if (lakeLabel) core += ` for <strong>${lakeLabel}</strong>`;
            
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <div dangerouslySetInnerHTML={{ __html: core }} />
                {detail && <div style={{ fontSize:12, color:'#64748b' }}>{detail}</div>}
              </div>
            );
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
            let core = `${verb} <strong>${truncate(layerName)}</strong> layer`;
            if (lakeNm) core += ` for <strong>${truncate(lakeNm)}</strong>`;
            return <div dangerouslySetInnerHTML={{ __html: core }} />;
          }
          
          if (r.entity_name) {
            return (
              <div>
                {verb} <strong>{truncate(r.entity_name)}</strong>
              </div>
            );
          }
          
          const idTag = r.model_id ? `${modelBase} #${r.model_id}` : modelBase;
          return <div>{verb} {idTag}</div>;
        }, width: 420 },
      { id: 'when', header: 'When', render: r => {
          if (!r.event_at) return '—';
          const d = new Date(r.event_at);
          const date = d.toLocaleDateString();
          const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:2, fontSize:13 }}>
              <div>{date}</div>
              <div style={{ color:'#64748b' }}>{time}</div>
            </div>
          );
        }, width: 120 },
      { id: 'actions', header: '', width: 80, render: r => (
        <button className="pill-btn ghost sm" title="View Details" onClick={() => openDetail(r)} style={{ display:'flex', alignItems:'center', gap:4 }}>
          <FiEye />
        </button>
      )},
    ];
  }, [isAdminScope, paramMap, stdMap, thresholdMap]);

  const visibleColumns = columns;

  const actions = [];

  // Resolve entity IDs to names
  const resolveEntityName = async (key, id) => {
    if (!id || id === null) return null;
    const cacheKey = `${key}_${id}`;
    
    // Check cache first
    if (entityLookupMap.has(cacheKey)) {
      return entityLookupMap.get(cacheKey);
    }
    
    try {
      let endpoint = null;
      let nameField = 'name';
      
      // Map fields to endpoints
      if (key === 'user_id' || key === 'actor_id' || key === 'created_by' || key === 'updated_by') {
        endpoint = `/admin/users/${id}`;
      } else if (key === 'lake_id') {
        endpoint = `/admin/lakes/${id}`;
      } else if (key === 'organization_id' || key === 'tenant_id') {
        endpoint = `/admin/organizations/${id}`;
      } else if (key === 'parameter_id') {
        if (paramMap.has(String(id))) {
          return paramMap.get(String(id)).name;
        }
        endpoint = `/admin/parameters/${id}`;
      } else if (key === 'standard_id') {
        if (stdMap.has(String(id))) {
          return stdMap.get(String(id)).code || stdMap.get(String(id)).name;
        }
        endpoint = `/admin/wq-standards/${id}`;
      }
      
      if (!endpoint) return null;
      
      const res = await cachedGet(endpoint, { ttlMs: 5 * 60 * 1000 });
      const data = res?.data?.data || res?.data || res;
      const name = data?.name || data?.code || data?.email || null;
      
      if (name) {
        setEntityLookupMap(prev => {
          const next = new Map(prev);
          next.set(cacheKey, name);
          return next;
        });
      }
      
      return name;
    } catch (err) {
      return null;
    }
  };
  
  // Get relative time
  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Build structured changes for modal table
  const buildChanges = (row) => {
    if (!row || !row.before || !row.after) return [];
    const keys = row.diff_keys && Array.isArray(row.diff_keys) && row.diff_keys.length
      ? row.diff_keys
      : Array.from(new Set([...(row.before?Object.keys(row.before):[]), ...(row.after?Object.keys(row.after):[])]));
    const prettify = (k)=>k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    
    // Smart value formatter - context aware
    const normalize = (v, key, context = 'before') => {
      // Handle null
      if (v === null) {
        return <span style={{color:'#94a3b8',fontStyle:'italic'}}>NULL</span>;
      }
      
      // Handle undefined - context matters
      if (v === undefined) {
        if (context === 'after') {
          // Field was removed
          return <span style={{color:'#dc2626',fontStyle:'italic',display:'flex',alignItems:'center',gap:4}}>🗑️ Removed</span>;
        } else {
          // Field didn't exist before
          return <span style={{color:'#94a3b8',fontStyle:'italic'}}>—</span>;
        }
      }
      
      // Handle empty string
      if (v === '') {
        return <span style={{color:'#94a3b8',fontStyle:'italic'}}>(empty)</span>;
      }
      
      // Date fields
      if (key && /_at$|_date$|date_|sampled_at/.test(key) && typeof v === 'string') {
        try {
          const d = new Date(v);
          if (!isNaN(d.getTime())) {
            return d.toLocaleString();
          }
        } catch {}
      }
      
      // Boolean
      if (typeof v === 'boolean') {
        return v ? <span style={{color:'#10b981',fontWeight:500}}>✓ True</span> : <span style={{color:'#ef4444',fontWeight:500}}>✗ False</span>;
      }
      
      // Numbers
      if (typeof v === 'number') {
        return <span style={{color:'#0891b2',fontFamily:'monospace'}}>{v}</span>;
      }
      
      // Objects/Arrays - pretty print
      if (typeof v==='object'){ 
        try{
          const json = JSON.stringify(v, null, 2);
          return <pre style={{margin:0,fontSize:12,background:'#f1f5f9',padding:'6px 8px',borderRadius:4,maxHeight:120,overflow:'auto',fontFamily:'monospace'}}>{json}</pre>;
        }catch{
          return String(v);
        } 
      }
      
      return String(v); 
    };
    
    const out=[];
    for (const k of keys){
      const b=row.before[k];
      const a=row.after[k];
      if (JSON.stringify(b)===JSON.stringify(a)) continue;
      
      // Skip ID fields that should be hidden
      if (/_id$/.test(k) && !['id'].includes(k)) {
        continue; // Skip foreign key IDs, they're redundant with name fields
      }
      
      out.push({ 
        fieldLabel: prettify(k), 
        fromVal: normalize(b, k, 'before'), 
        toVal: normalize(a, k, 'after'),
        isImportant: /status|role|permission|deleted|active|enabled/.test(k)
      }); 
    }
    return out;
  };
  
  // Build modal title
  const getModalTitle = (row) => {
    if (!row) return 'Audit Log Details';
    const action = formatAction(row.action);
    const base = row.model_type ? row.model_type.split('\\').pop() : 'Record';
    const entityName = row.entity_name || `${base} #${row.model_id || '?'}`;
    return `${action} ${entityName}`;
  };
  
  // Copy details to clipboard
  const copyDetails = (row) => {
    if (!row) return;
    const text = `
Audit Log #${row.id || '?'}
User: ${row.actor_name || 'System'}
Role: ${row.actor_role || 'N/A'}
Action: ${formatAction(row.action)}
Entity: ${row.entity_name || 'N/A'}
Timestamp: ${fmt(row.event_at)}
IP Address: ${row.ip_address || 'N/A'}
${row.tenant_name ? `Organization: ${row.tenant_name}` : ''}

Changes:
${buildChanges(row).map(ch => `  ${ch.fieldLabel}: ${ch.fromVal} → ${ch.toVal}`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Details copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const goPage = (p) => fetchLogs(buildParams({ page: p }));

  // Client-side filtered data for display
  const filteredData = useMemo(() => rows.filter(r => {
    if (q) {
      // Build summary via columns render
      const summaryText = columns[0].render(r) || '';
      if (!summaryText.toLowerCase().includes(q.toLowerCase())) return false;
    }
    return true;
  }), [rows, q, isAdminScope, columns]);

  // Render
  if (!isAdminScope && !isOrgAdmin) {
    return (
      <div style={{ padding:16, position:'relative' }}>
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
    <div style={{ padding: 16, position:'relative' }}>
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
          onRefresh={() => { try { if (effectiveBase) invalidateHttpCache(effectiveBase); } catch {} fetchLogs(buildParams(), { force: true }); }}
        />
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
          title={getModalTitle(detailRow)}
          width={800}
          ariaLabel={isAdminScope ? 'Audit log detail dialog' : 'Organization audit log detail dialog'}
          bodyClassName="audit-log-detail-body"
          footer={(
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
              <div style={{ fontSize:12, color:'#64748b' }}>
                Log ID: #{detailRow.id || '?'}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button 
                  className="pill-btn ghost sm" 
                  onClick={() => copyDetails(detailRow)}
                  title="Copy details to clipboard"
                >
                  📋 Copy
                </button>
                <button className="pill-btn ghost" onClick={closeDetail}>Close</button>
              </div>
            </div>
          )}
        >
          {/* Header Summary Card */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            padding: '16px 20px', 
            borderRadius: 12, 
            marginBottom: 20,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, opacity:0.9, marginBottom:4 }}>
                  {getRelativeTime(detailRow.event_at)}
                </div>
                <div style={{ fontSize:15, fontWeight:500 }}>
                  {detailRow.actor_name || 'System'}
                  <span style={{ 
                    marginLeft:8, 
                    fontSize:11, 
                    background:'rgba(255,255,255,0.2)', 
                    padding:'2px 8px', 
                    borderRadius:12,
                    textTransform:'uppercase',
                    letterSpacing:0.5
                  }}>
                    {(() => {
                      const raw = detailRow.actor_role || detailRow.actor?.role || '';
                      const v = String(raw).toLowerCase().replace(/\s+/g,' ').trim();
                      if (v === 'superadmin' || v === 'super_admin' || v === 'super administrator') return 'Super Admin';
                      if (v === 'org_admin' || v === 'orgadmin' || v === 'organization administrator' || v === 'organization_admin') return 'Org Admin';
                      if (v === 'contributor') return 'Contributor';
                      return humanize(raw) || 'User';
                    })()}
                  </span>
                </div>
              </div>
              <div style={{ textAlign:'right', fontSize:13 }}>
                <div style={{ opacity:0.9 }}>{fmt(detailRow.event_at)}</div>
                {detailRow.ip_address && (
                  <div style={{ fontSize:12, opacity:0.8, marginTop:4 }}>
                    📍 {detailRow.ip_address}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="lv-settings-panel" style={{ gap: 14, background:'#f9fafb', padding:16, borderRadius:8 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color:'#334155' }}>Event Details</h3>
            <div style={{ display:'grid', gridTemplateColumns:'140px 1fr', rowGap:10, fontSize:13.5 }}>
              <div style={{ color:'#64748b', fontWeight:500 }}>Action Type</div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{
                  padding:'2px 10px',
                  borderRadius:6,
                  fontSize:12,
                  fontWeight:500,
                  background: detailRow.action === 'created' ? '#dcfce7' : 
                             detailRow.action === 'updated' ? '#dbeafe' :
                             detailRow.action === 'deleted' ? '#fee2e2' : 
                             detailRow.action === 'restored' ? '#fef3c7' : '#f3f4f6',
                  color: detailRow.action === 'created' ? '#166534' : 
                        detailRow.action === 'updated' ? '#1e40af' :
                        detailRow.action === 'deleted' ? '#991b1b' : 
                        detailRow.action === 'restored' ? '#854d0e' : '#475569'
                }}>
                  {formatAction(detailRow.action)}
                </span>
              </div>
              
              <div style={{ color:'#64748b', fontWeight:500 }}>Entity Type</div>
              <div>{detailRow.model_type ? detailRow.model_type.split('\\').pop() : 'Record'}</div>
              
              <div style={{ color:'#64748b', fontWeight:500 }}>Entity</div>
              <div style={{ fontWeight:500 }}>
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
                <>
                  <div style={{ color:'#64748b', fontWeight:500 }}>Organization</div>
                  <div>{detailRow.tenant_name || detailRow.tenant_id}</div>
                </>
              )}
            </div>
          </div>

          {/* Changes Section */}
          <div className="lv-settings-panel" style={{ gap: 12, marginTop:20 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color:'#334155', display:'flex', alignItems:'center', gap:8 }}>
              <span>Field Changes</span>
              {detailRow.before && detailRow.after && buildChanges(detailRow).length > 0 && (
                <span style={{ 
                  fontSize:11, 
                  background:'#3b82f6', 
                  color:'white', 
                  padding:'2px 8px', 
                  borderRadius:12,
                  fontWeight:500
                }}>
                  {buildChanges(detailRow).length}
                </span>
              )}
            </h3>
            {detailRow.before && detailRow.after ? (
              (() => {
                const changes = buildChanges(detailRow);
                if (changes.length === 0) {
                  return <div style={{ fontStyle:'italic', fontSize:13, color:'#64748b', padding:12, background:'#f9fafb', borderRadius:8, textAlign:'center' }}>
                    No field differences detected.
                  </div>;
                }
                return (
                  <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
                      <thead style={{ background:'linear-gradient(to bottom, #f8fafc, #f1f5f9)' }}>
                        <tr>
                          <th style={{ textAlign:'left', padding:'10px 12px', fontSize:11, textTransform:'uppercase', letterSpacing:0.5, color:'#475569', fontWeight:600, width:'25%' }}>Field</th>
                          <th style={{ textAlign:'left', padding:'10px 12px', fontSize:11, textTransform:'uppercase', letterSpacing:0.5, color:'#475569', fontWeight:600, width:'37.5%' }}>Before</th>
                          <th style={{ textAlign:'left', padding:'10px 12px', fontSize:11, textTransform:'uppercase', letterSpacing:0.5, color:'#475569', fontWeight:600, width:'37.5%' }}>After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changes.map((ch,i) => (
                          <tr key={i} style={{ 
                            background: i % 2 ? '#fafbfc' : 'white',
                            borderTop: i > 0 ? '1px solid #f1f5f9' : 'none',
                            ...(ch.isImportant ? { borderLeft:'3px solid #f59e0b' } : {})
                          }}>
                            <td style={{ padding:'10px 12px', fontWeight:ch.isImportant ? 600 : 500, color:'#1e293b' }}>
                              {ch.fieldLabel}
                              {ch.isImportant && <span style={{ marginLeft:6, fontSize:10, color:'#f59e0b' }}>★</span>}
                            </td>
                            <td style={{ padding:'10px 12px', color:'#dc2626', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{ch.fromVal}</td>
                            <td style={{ padding:'10px 12px', color:'#059669', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{ch.toVal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            ) : (
              <div style={{ fontStyle:'italic', fontSize:13, color:'#64748b', padding:12, background:'#f9fafb', borderRadius:8, textAlign:'center' }}>
                {detailRow.action === 'created' ? 'New record created - no previous values to compare.' : 
                 detailRow.action === 'deleted' ? 'Record deleted - no subsequent values.' : 
                 'No before/after payload available for comparison.'}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
