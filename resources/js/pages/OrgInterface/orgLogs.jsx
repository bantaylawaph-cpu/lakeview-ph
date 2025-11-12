// resources/js/pages/OrgInterface/orgLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { me as fetchCurrentUser } from '../../lib/api';
import { cachedGet } from '../../lib/httpCache';
import TableLayout from '../../layouts/TableLayout';
import TableToolbar from '../../components/table/TableToolbar';
import FilterPanel from '../../components/table/FilterPanel';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FiEye } from 'react-icons/fi';
import Modal from '../../components/Modal';

// Org UI mirrors adminLogs but with a reduced filter set (no tenant/role filters)
const TABLE_ID = 'org-audit-logs';
const VIS_KEY = `${TABLE_ID}::visible`;
const ADV_KEY = `${TABLE_ID}::filters_advanced`;

const fmt = (s) => (s ? new Date(s).toLocaleString() : '—');

// Humanize helpers
const humanize = (s) => {
  if (!s) return '';
  // convert snake_case or camelCase to Title Case
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

// Helper to extract lake name from row or payloads
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

export default function OrgAuditLogsPage() {
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: null });
  // Client-side meta computation cache/state (when backend omits paginator meta)
  const clientMetaCacheRef = useRef(new Map()); // key -> { total, last_page, per_page }
  const [clientMetaLoading, setClientMetaLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  // Advanced filters (subset): action, actor_name, entity, time window preset
  const [fAction, setFAction] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').action || ''; } catch { return ''; } });
  const [fActorName, setFActorName] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').actor_name || ''; } catch { return ''; } });
  const [fEntity, setFEntity] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').model_type || ''; } catch { return ''; } });
  const [fTimeWindow, setFTimeWindow] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').time_window || ''; } catch { return ''; } });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Column visibility (summary + target + actions)
  const defaultsVisible = useMemo(() => ({ summary: true, target: true, actions: true }), []);
  const [visibleMap, setVisibleMap] = useState(() => {
    try { const raw = localStorage.getItem(VIS_KEY); return raw ? JSON.parse(raw) : defaultsVisible; } catch { return defaultsVisible; }
  });
  useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {}; }, [visibleMap]);

  // Persist advanced filters
  useEffect(() => {
    try { localStorage.setItem(ADV_KEY, JSON.stringify({ action: fAction||'', actor_name: fActorName||'', model_type: fEntity||'', time_window: fTimeWindow||'' })); } catch {}
  }, [fAction, fActorName, fEntity, fTimeWindow]);

  const debounceRef = useRef(null);
  const page = meta.current_page ?? 1;
  const perPage = meta.per_page ?? 10;

  const fetchMe = async () => { try { const u = await fetchCurrentUser({ maxAgeMs: 60 * 1000 }); setMe(u); } catch { setMe(null); } };

  const isOrgAdmin = me?.role === 'org_admin';
  const effectiveTenantId = isOrgAdmin ? me?.tenant_id : null;

  const buildParams = (overrides={}) => {
    const params = { page, per_page: perPage, ...overrides };
    if (fAction) params.action = fAction;
    if (fActorName) params.actor_name = fActorName; // backend may ignore; fallback filter client-side
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
        const two=(n)=>String(n).padStart(2,'0');
        params.date_from = `${from.getFullYear()}-${two(from.getMonth()+1)}-${two(from.getDate())}`;
      }
    }
    return params;
  };

  const fetchLogs = async (params={}, opts={}) => {
    if (!effectiveTenantId) return; // need a tenant for org route
    setLoading(true); setError(null);
    try {
  const res = await cachedGet(`/org/${effectiveTenantId}/audit-logs`, { params, ttlMs: opts.force ? 0 : (2 * 60 * 1000) });
  // NOTE: api.get returns the parsed JSON body. For Laravel paginator, this is an object
  // with top-level pagination keys and a `data` array. Do not access `res.data` here.
  const body = res;
  let items = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
      if (Array.isArray(items)) {
        items = items.filter(it => {
          const mt = it.model_type || '';
          const base = String(mt).split('\\').pop();
          return base !== 'SampleResult';
        });
      }
      setRows(Array.isArray(items) ? items : []);
      const pg = Array.isArray(body) ? null : (body || null);
      // Support both Laravel paginator shapes:
      // - Default paginator: top-level current_page, last_page, per_page, total
      // - API resources paginator: meta object with those fields
      const metaObj = pg && typeof pg === 'object' && pg.meta && typeof pg.meta === 'object' ? pg.meta : pg;
      const effectivePage = params.page || 1;
      const effectivePerPage = params.per_page || perPage;
      const metaPresent = !!(metaObj && (typeof metaObj.current_page === 'number' || typeof metaObj.last_page === 'number' || typeof metaObj.total === 'number'));
      if (metaPresent) {
        setMeta({
          current_page: typeof metaObj.current_page === 'number' ? metaObj.current_page : effectivePage,
          last_page: typeof metaObj.last_page === 'number' ? metaObj.last_page : Math.max(1, Math.ceil((typeof metaObj.total === 'number' ? metaObj.total : (Array.isArray(items) ? items.length : 0)) / effectivePerPage)),
          per_page: typeof metaObj.per_page === 'number' ? metaObj.per_page : effectivePerPage,
          total: typeof metaObj.total === 'number' ? metaObj.total : null,
        });
      } else {
        setMeta({ current_page: effectivePage, last_page: 1, per_page: effectivePerPage, total: null });
        const baseParams = { ...params };
        delete baseParams.page;
        await ensureClientMeta(baseParams, effectivePage, effectivePerPage, Array.isArray(items) ? items.length : 0);
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  // Compute and cache total/last_page when server doesn't provide meta.
  const ensureClientMeta = async (baseParams, currentPage, perPageVal, currentPageCount) => {
    try {
      const key = `/org/${effectiveTenantId}/audit-logs?${new URLSearchParams({ ...baseParams, per_page: perPageVal }).toString()}`;
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
          const resp = await api.get(`/org/${effectiveTenantId}/audit-logs`, { params: { ...baseParams, page: pageIdx, per_page: perPageVal } });
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
      console.warn('Failed to compute client-side pagination meta (org)', err);
    } finally {
      setClientMetaLoading(false);
    }
  };

  useEffect(() => { fetchMe(); }, []);
  useEffect(() => { if (effectiveTenantId) fetchLogs(buildParams({ page:1 })); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [effectiveTenantId]);
  useEffect(() => {
    if (!effectiveTenantId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(()=>{ fetchLogs(buildParams({ page:1 })); }, 400);
    return ()=>{ if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fAction, fActorName, fEntity, fTimeWindow]);

  // Column + detail modal
  const [detailRow, setDetailRow] = useState(null);
  const openDetail = (row) => setDetailRow(row);
  const closeDetail = () => setDetailRow(null);

  const columns = useMemo(() => {
    const truncate = (s, max=60) => (s && s.length > max ? s.slice(0,max)+'…' : s);
    const modelNameMap = {
      'LakeFlow': 'Tributary',
      'SamplingEvent': 'Sampling Event',
      'ParameterThreshold': 'Parameter Threshold',
      'WqStandard': 'WQ Standard',
      'OrgApplication': 'Organization Application',
      'KycProfile': 'KYC Profile',
      'Tenant': 'Organization',
    };
    return [
      { id: 'summary', header: 'Summary', render: r => {
        const actor = r.actor_name || 'User';
        const modelBase = r.model_type ? r.model_type.split('\\').pop() : 'Record';
        let verb;
        switch (r.action) {
          case 'created': verb = 'Created'; break;
          case 'updated': verb = 'Updated'; break;
          case 'deleted': verb = 'Deleted'; break;
          case 'force_deleted': verb = 'Force Deleted'; break;
          case 'restored': verb = 'Restored'; break;
          default: verb = (r.action || 'Did').replace(/\b\w/g,c=>c.toUpperCase());
        }
        const base = modelBase;
        // Always append timestamp if available
        const ts = r.event_at ? ` at ${fmt(r.event_at)}` : '';
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
  }, []);
  const visibleColumns = useMemo(()=> columns.filter(c => visibleMap[c.id] !== false), [columns, visibleMap]);

  // Client-side filtering fallback (actor name, entity, time window)
  const filtered = useMemo(()=> rows.filter(r => {
    if (q) {
      const summary = columns[0].render(r) || '';
      if (!summary.toLowerCase().includes(q.toLowerCase())) return false;
    }
    if (fActorName) {
      const nm = (r.actor_name||'').toLowerCase();
      if (!nm.includes(fActorName.toLowerCase())) return false;
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
  }), [rows, q, fActorName, fEntity, fTimeWindow, columns]);

  // Derive entity options from current rows (org scope limited)
  const entityOptions = useMemo(()=> {
    const map = new Map();
    for (const r of rows) if (r.model_type) {
      const full = r.model_type; const base = full.split('\\').pop(); if (base === 'SampleResult') continue; if (!map.has(full)) map.set(full, base);
    }
    return Array.from(map.entries()).map(([full, base])=>({ value: full, label: base })).sort((a,b)=>a.label.localeCompare(b.label));
  }, [rows]);

  // Clear stale fEntity if it's not in current options
  useEffect(() => {
    const allowed = new Set(entityOptions.map(o => o.value));
    if (fEntity && !allowed.has(fEntity)) setFEntity('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityOptions]);

  const columnPickerAdapter = {
    columns: columns.map(c => ({ id: c.id, header: c.header })),
    visibleMap,
    onVisibleChange: (m) => setVisibleMap(m),
  };

  const advancedFields = [
    { id: 'action', label: 'Action', type: 'select', value: fAction, onChange: v=>setFAction(v), options: [
      { value:'', label:'All' },
      { value:'created', label:'Created' },
      { value:'updated', label:'Updated' },
      { value:'deleted', label:'Deleted' },
      { value:'force_deleted', label:'Force Deleted' },
      { value:'restored', label:'Restored' },
    ]},
    { id: 'actor_name', label: 'Name', type: 'text', value: fActorName, onChange: v=>setFActorName(v) },
    { id: 'model_type', label: 'Entity', type: 'select', value: fEntity, onChange: v=>setFEntity(v), options: [ { value:'', label:'All' }, ...entityOptions ] },
    { id: 'time_window', label: 'Time Window', type: 'select', value: fTimeWindow, onChange: v=>setFTimeWindow(v), options: [
      { value:'', label:'All' }, { value:'24h', label:'Last 24h' }, { value:'7d', label:'Last 7d' }, { value:'30d', label:'Last 30d' }
    ]},
  ];
  const activeAdvCount = [fAction, fActorName, fEntity, fTimeWindow].filter(Boolean).length;
  const clearAdvanced = () => { setFAction(''); setFActorName(''); setFEntity(''); setFTimeWindow(''); fetchLogs(buildParams({ page:1 })); };
  const goPage = (p)=> fetchLogs(buildParams({ page:p }));

  // Build structured change rows for detail modal
  const buildChanges = (row) => {
    if (!row || !row.before || !row.after) return [];
    const keys = row.diff_keys && Array.isArray(row.diff_keys) && row.diff_keys.length
      ? row.diff_keys
      : Array.from(new Set([...(row.before?Object.keys(row.before):[]), ...(row.after?Object.keys(row.after):[])]));
    const prettify = (k)=>k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    const normalize = (v)=> { if (v===null||v===undefined||v==='') return 'NULL'; if (typeof v==='object'){ try{return JSON.stringify(v);}catch{return String(v);} } return String(v); };
    const out=[]; for (const k of keys){ const b=row.before[k]; const a=row.after[k]; if (JSON.stringify(b)===JSON.stringify(a)) continue; out.push({ field: prettify(k), from: normalize(b), to: normalize(a) }); }
    return out;
  };

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
      {!isOrgAdmin && (
        <div className="card" style={{ padding:16, borderRadius:12, marginBottom:12 }}>
          <div style={{ fontSize:14 }}>This page is only available to organization administrators.</div>
        </div>
      )}
      {isOrgAdmin && (
        <>
          <div className="card" style={{ padding:12, borderRadius:12, marginBottom:12 }}>
            <TableToolbar
              tableId={TABLE_ID}
              search={{ value:q, onChange: setQ, placeholder:'Search Logs...' }}
              filters={[]}
              columnPicker={columnPickerAdapter}
              onRefresh={()=> fetchLogs(buildParams(), { force: true })}
              onToggleFilters={()=> setShowAdvanced(s=>!s)}
              filtersBadgeCount={activeAdvCount}
            />
            <FilterPanel open={showAdvanced} fields={advancedFields} onClearAll={clearAdvanced} />
            {error && <div className="lv-error" style={{ padding:8, color:'var(--danger)' }}>{error}</div>}
          </div>
          <div className="card" style={{ padding:12, borderRadius:12 }}>
            {loading && <div style={{ padding:16 }}><LoadingSpinner label="Loading audit logs…" /></div>}
            {!loading && filtered.length === 0 && <div className="lv-empty" style={{ padding:16 }}>No audit logs.</div>}
            {!loading && filtered.length > 0 && (
              <TableLayout
                tableId={TABLE_ID}
                columns={visibleColumns}
                data={filtered}
                pageSize={perPage}
                actions={[]}
                resetSignal={0}
                columnPicker={false}
                hidePager={true}
              />
            )}
            <div className="lv-table-pager" style={{ marginTop:10, display:'flex', gap:8, alignItems:'center' }}>
              <button className="pill-btn ghost sm" disabled={loading || page<=1} onClick={()=> goPage(page-1)}>&lt; Prev</button>
              {loading || clientMetaLoading ? (
                <span className="pager-text">Loading…</span>
              ) : (
                <span className="pager-text">
                  Page {meta.current_page} of {meta.last_page}{meta?.total != null ? ` · ${meta.total} total` : ''}
                </span>
              )}
              <button className="pill-btn ghost sm" disabled={loading || clientMetaLoading || page>=meta.last_page} onClick={()=> goPage(page+1)}>Next &gt;</button>
            </div>
          </div>
        </>
      )}

      {detailRow && (
        <Modal
          open={!!detailRow}
          onClose={closeDetail}
          title={`Audit Log #${detailRow.id || ''}`}
          width={720}
          ariaLabel="Organization audit log detail dialog"
          bodyClassName="audit-log-detail-body"
          footer={(
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="pill-btn ghost" onClick={closeDetail}>Close</button>
            </div>
          )}
        >
          <div className="lv-settings-panel" style={{ gap:14 }}>
            <h3 style={{ margin:0, fontSize:'1rem' }}>Event</h3>
            <div style={{ display:'grid', rowGap:6, fontSize:13.5 }}>
              <div><strong style={{ width:110, display:'inline-block' }}>User:</strong> {detailRow.actor_name || 'User'}</div>
              <div><strong style={{ width:110, display:'inline-block' }}>Role:</strong> {humanize(detailRow.actor_role || '') || '—'}</div>
              <div><strong style={{ width:110, display:'inline-block' }}>Action:</strong> {formatAction(detailRow.action)}</div>
              <div><strong style={{ width:110, display:'inline-block' }}>Entity:</strong> {
                (() => {
                  const base = detailRow.model_type ? detailRow.model_type.split('\\').pop() : 'Record';
                  if (base === 'SamplingEvent') {
                    const lakeNm = detailRow.entity_name || extractLakeName(detailRow);
                    const sampledDate = (() => {
                      const raw = (detailRow.after && detailRow.after.sampled_at) || (detailRow.before && detailRow.before.sampled_at) || null;
                      if (!raw) return null; try { return new Date(raw).toLocaleDateString(); } catch { return raw; }
                    })();
                    let text = 'Sampling Event';
                    if (sampledDate) text += ` (${sampledDate})`;
                    if (lakeNm) text += ` for ${lakeNm}`;
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
                  // If entity_name present, strip trailing " #<id>" if appended in the payload
                  const raw = detailRow.entity_name || base;
                  return String(raw).replace(/\s+#\d+$/, '');
                })()
              }</div>
              <div><strong style={{ width:110, display:'inline-block' }}>Organization:</strong> {detailRow.tenant_name || detailRow.tenant_id || '—'}</div>
              <div><strong style={{ width:110, display:'inline-block' }}>Timestamp:</strong> {fmt(detailRow.event_at)}</div>
            </div>
          </div>
          <div className="lv-settings-panel" style={{ gap:12 }}>
            <h3 style={{ margin:0, fontSize:'1rem' }}>Changes</h3>
            {detailRow.before && detailRow.after ? (
              (() => {
                const changes = buildChanges(detailRow).map(ch => ({ fieldLabel: ch.field, fromVal: ch.from, toVal: ch.to }));
                if (changes.length === 0) return <div style={{ fontStyle:'italic', fontSize:13, color:'#64748b' }}>No field differences detected.</div>;
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
                        {changes.map((ch,i)=>(
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
