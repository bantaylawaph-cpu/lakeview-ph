// resources/js/pages/OrgInterface/orgLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../lib/api';
import TableLayout from '../../layouts/TableLayout';
import TableToolbar from '../../components/table/TableToolbar';
import FilterPanel from '../../components/table/FilterPanel';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FiEye } from 'react-icons/fi';

// Org UI mirrors adminLogs but with a reduced filter set (no tenant/role filters)
const TABLE_ID = 'org-audit-logs';
const VIS_KEY = `${TABLE_ID}::visible`;
const ADV_KEY = `${TABLE_ID}::filters_advanced`;

const fmt = (s) => (s ? new Date(s).toLocaleString() : '—');

export default function OrgAuditLogsPage() {
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
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
  const perPage = meta.per_page ?? 25;

  const fetchMe = async () => { try { const u = await api.get('/auth/me'); setMe(u); } catch { setMe(null); } };

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

  const fetchLogs = async (params={}) => {
    if (!effectiveTenantId) return; // need a tenant for org route
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/org/${effectiveTenantId}/audit-logs`, { params });
      const items = Array.isArray(res?.data) ? res.data : (res?.data?.data || res.data || res);
      setRows(Array.isArray(items) ? items : []);
      const m = res?.meta || res || {};
      setMeta({
        current_page: m.current_page || params.page || 1,
        last_page: m.last_page || 1,
        per_page: m.per_page || params.per_page || perPage,
        total: m.total || (Array.isArray(items) ? items.length : 0),
      });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
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
    return [
      { id: 'summary', header: 'Summary', render: r => {
        const actor = r.actor_name || 'User';
        const modelBase = r.model_type ? r.model_type.split('\\').pop() : 'Record';
        const idTag = r.model_id ? `${modelBase}#${r.model_id}` : modelBase;
        let verb;
        switch (r.action) {
          case 'created': verb = 'Created'; break;
          case 'updated': verb = 'Updated'; break;
          case 'deleted': verb = 'Deleted'; break;
          case 'force_deleted': verb = 'Force Deleted'; break;
          case 'restored': verb = 'Restored'; break;
          default: verb = (r.action || 'Did').replace(/\b\w/g,c=>c.toUpperCase());
        }
        if (r.entity_name) return `${actor} ${verb} ${truncate(r.entity_name)}`;
        return `${actor} ${verb} ${idTag}`;
      }, width: 560 },
      { id: 'target', header: 'Target', render: r => (r.model_type ? r.model_type.split('\\').pop() : 'Record'), width: 140 },
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
      const full = r.model_type; const base = full.split('\\').pop(); if (!map.has(full)) map.set(full, base);
    }
    return Array.from(map.entries()).map(([full, base])=>({ value: full, label: base })).sort((a,b)=>a.label.localeCompare(b.label));
  }, [rows]);

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
              search={{ value:q, onChange: setQ, placeholder:'Search...' }}
              filters={[]}
              columnPicker={columnPickerAdapter}
              onRefresh={()=> fetchLogs(buildParams())}
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
              <button className="pill-btn ghost sm" disabled={page<=1} onClick={()=> goPage(page-1)}>&lt; Prev</button>
              <span className="pager-text">Page {meta.current_page} of {meta.last_page} · {meta.total} total</span>
              <button className="pill-btn ghost sm" disabled={page>=meta.last_page} onClick={()=> goPage(page+1)}>Next &gt;</button>
            </div>
          </div>
        </>
      )}

      {detailRow && (
        <div className="lv-modal-backdrop" style={{ position:'absolute', inset:0, background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', zIndex:20, overflowY:'auto' }} onClick={closeDetail}>
          <div className="lv-modal" style={{ background:'#fff', borderRadius:14, padding:24, maxWidth:720, width:'100%', position:'relative', boxShadow:'0 10px 24px -4px rgba(0,0,0,0.25)', animation:'fadeInScale .18s ease' }} onClick={e=>e.stopPropagation()}>
            <button onClick={closeDetail} style={{ position:'absolute', top:10, right:10 }} className="pill-btn ghost sm">✕</button>
            <h3 style={{ marginTop:0, marginBottom:16, fontSize:20 }}>Audit Log Details</h3>
            <div style={{ fontSize:14, lineHeight:1.55, display:'grid', rowGap:6, paddingBottom:12, borderBottom:'1px solid #e5e7eb' }}>
              <div style={{ padding:'4px 0' }}><strong style={{ width:90, display:'inline-block' }}>User:</strong> {detailRow.actor_name || 'User'}</div>
              <div style={{ padding:'4px 0' }}><strong style={{ width:90, display:'inline-block' }}>Action:</strong> {(() => {
                const model = detailRow.model_type ? detailRow.model_type.split('\\').pop() : 'Record';
                return `${(detailRow.action || 'updated').replace(/_/g,' ')} ${model} #${detailRow.model_id || ''}`.trim();
              })()}</div>
              <div style={{ padding:'4px 0' }}><strong style={{ width:90, display:'inline-block' }}>Timestamp:</strong> {fmt(detailRow.event_at)}</div>
            </div>
            {detailRow.action === 'updated' && detailRow.before && detailRow.after && (
              <div style={{ marginTop:18 }}>
                <strong style={{ fontSize:13, letterSpacing:0.5, textTransform:'uppercase', color:'#374151' }}>Changes</strong>
                <div style={{ marginTop:10, border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
                    <thead style={{ background:'#f3f4f6' }}>
                      <tr>
                        <th style={{ textAlign:'left', padding:'8px 10px', fontWeight:600, fontSize:12, textTransform:'uppercase', letterSpacing:0.5 }}>What</th>
                        <th style={{ textAlign:'left', padding:'8px 10px', fontWeight:600, fontSize:12, textTransform:'uppercase', letterSpacing:0.5 }}>From</th>
                        <th style={{ textAlign:'left', padding:'8px 10px', fontWeight:600, fontSize:12, textTransform:'uppercase', letterSpacing:0.5 }}>To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const changes = buildChanges(detailRow);
                        if (changes.length === 0) return (
                          <tr><td colSpan={3} style={{ padding:'10px 12px', fontStyle:'italic', color:'#6b7280' }}>No field differences detected.</td></tr>
                        );
                        return changes.map((ch,i)=>(
                          <tr key={i} style={{ background: i % 2 ? '#f9fafb' : 'white' }}>
                            <td style={{ padding:'6px 10px', fontWeight:500 }}>{ch.field}</td>
                            <td style={{ padding:'6px 10px', color:'#b91c1c', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{ch.from}</td>
                            <td style={{ padding:'6px 10px', color:'#065f46', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{ch.to}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {detailRow.action !== 'updated' && (
              <div style={{ marginTop:18, fontSize:13.5, fontStyle:'italic', color:'#4b5563' }}>No granular change list for this action.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
