import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FiEye, FiMessageSquare } from 'react-icons/fi';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';
import { cachedGet, invalidateHttpCache } from '../../lib/httpCache';
import TableToolbar from '../../components/table/TableToolbar';
import { STATUS_ORDER, STATUS_LABEL, SEARCH_SCOPE_MAP } from '../../components/admin/feedback/feedbackConstants';
import StatusPill from '../../components/admin/feedback/StatusPill';
import AttachmentsModal from '../../components/admin/feedback/AttachmentsModal';
import FeedbackDetailModal from '../../components/admin/feedback/FeedbackDetailModal';


export default function AdminFeedback() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  // searchScope options: name | title | message | name_title | name_message | title_message | all
  const [searchScope, setSearchScope] = useState('name');
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Bulk selection & actions state (CSV export removed per request)
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsItem, setDocsItem] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Column picker wiring
  const COLUMNS = useMemo(() => ([
    { id: 'title', header: 'Title' },
    { id: 'user', header: 'User' },
    { id: 'source', header: 'Source' },
    { id: 'lake', header: 'Lake' },
    { id: 'category', header: 'Category' },
    { id: 'docs', header: 'Documents' },
    { id: 'status', header: 'Status' },
    { id: 'org', header: 'Org' },
    { id: 'created', header: 'Created' },
  ]), []);
  const [visibleMap, setVisibleMap] = useState(() => ({
    title: true,
    user: true,
    source: true,
    lake: true,
    category: true,
    docs: true,
    status: true,
    org: false,
    created: false,
  }));
  const visibleColumns = useMemo(() => COLUMNS.filter(c => visibleMap[c.id] !== false).map(c => c.id), [COLUMNS, visibleMap]);

  const fetchData = useCallback(async (opts={}) => {
    const p = opts.page || page;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', p);
    params.set('per_page', 10);
    const trimmed = search.trim();
    if (trimmed) {
      params.set('search', trimmed);
      const fields = SEARCH_SCOPE_MAP[searchScope] || ['name'];
      params.set('search_fields', fields.join(','));
    }
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (roleFilter) params.set('role', roleFilter);
    try {
      const res = await cachedGet(`/admin/feedback`, { params: Object.fromEntries(params.entries()), ttlMs: 2 * 60 * 1000 });
      const payload = res?.data || res;
      const dataArr = payload?.data ? payload.data : (Array.isArray(payload) ? payload : []);
      setRows(dataArr);
      setSelectedIds([]);
      setPage(payload?.current_page || p);
      setLastPage(payload?.last_page || p);
    } catch {
      setError('Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, [page, search, searchScope, status, category, roleFilter]);

  useEffect(() => { fetchData({ page:1 }); }, [search, status, category, roleFilter]);

  // Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    let es;
    const connect = () => {
      const maxId = rows.reduce((m, r) => r.id > m ? r.id : m, 0);
      try { invalidateHttpCache('/admin/feedback'); } catch {}
      es = new EventSource(`/api/admin/feedback/stream?last_id=${maxId}`);
      es.addEventListener('feedback-created', (ev) => {
        try { invalidateHttpCache('/admin/feedback'); } catch {}
        fetchData({ page: 1 });
      });
      es.onerror = () => {
        if (es) es.close();
        // Reconnect after short delay
        setTimeout(connect, 5000);
      };
    };
    connect();
    return () => { if (es) es.close(); };
  }, [rows, fetchData]);

  // Auto-refresh the list periodically when the tab is visible
  useEffect(() => {
    let timer = null;
    const intervalMs = 30000; // 30 seconds
    const tick = async () => {
      try {
        if (document.visibilityState === 'visible') {
          try { invalidateHttpCache('/admin/feedback'); } catch {}
          await fetchData({ page: 1 });
        }
      } finally {
        timer = setTimeout(tick, intervalMs);
      }
    };
    timer = setTimeout(tick, intervalMs);
    return () => { if (timer) clearTimeout(timer); };
  }, [fetchData]);

  const openDetail = (row) => { setSelected(row); setDetailOpen(true); };
  const handleSaved = (updated) => {
    setRows(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
  };

  // Sorting logic (client-side on current page set)
  const SORT_KEY = 'admin-feedback::sort';
  const [sort, setSort] = useState(() => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && (parsed.dir === 'asc' || parsed.dir === 'desc')) return parsed;
      }
    } catch {}
    return { id: null, dir: 'asc' };
  });
  useEffect(() => { try { localStorage.setItem(SORT_KEY, JSON.stringify(sort)); } catch {} }, [sort]);

  const getSortValue = (row, id) => {
    switch (id) {
      case 'title': return row.title?.toLowerCase?.() || '';
      case 'user': return (row.user?.name || '').toLowerCase();
      case 'org': return (row.tenant?.name || '').toLowerCase();
      case 'lake': return (row.lake?.name || '').toLowerCase();
      case 'source': return row.lake?.id ? 0 : 1; // Lake Panel first
      case 'category': return (row.category || '').toLowerCase();
      case 'status': return STATUS_ORDER.indexOf(row.status);
      case 'created': return row.created_at ? new Date(row.created_at).getTime() : 0;
      default: return '';
    }
  };

  const sortedRows = useMemo(() => {
    if (!sort.id) return rows;
    const copy = rows.slice();
    copy.sort((a,b) => {
      const av = getSortValue(a, sort.id);
      const bv = getSortValue(b, sort.id);
      if (av == null && bv == null) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sort]);

  const applySort = (colId) => {
    setSort(prev => {
      if (prev.id !== colId) return { id: colId, dir: 'asc' };
      // Toggle sorting direction
      return { id: colId, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  };

  // ---- Bulk selection helpers ----
  const allOnPageIds = useMemo(() => rows.map(r => r.id), [rows]);
  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(allOnPageIds); else setSelectedIds([]);
  };
  const toggleRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const doBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    setBulkApplying(true);
    try {
      const res = await api.post('/admin/feedback/bulk-update', { ids: selectedIds, status: bulkStatus });
      const updated = res?.data?.data || [];
      setRows(prev => prev.map(r => {
        const hit = updated.find(u => u.id === r.id);
        return hit ? { ...r, ...hit } : r;
      }));
      setSelectedIds([]);
      setBulkStatus('');
      try { invalidateHttpCache('/admin/feedback'); } catch {}
    } catch (e) { /* ignore */ } finally { setBulkApplying(false); }
  };

  return (
    <div className="content-page">
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiMessageSquare />
            <span>System Feedback</span>
          </div>
        </div>
        <p className="muted" style={{ marginTop:4 }}>Review, search, categorize, and resolve user-submitted feedback.</p>
      </div>

      <TableToolbar
        tableId="admin-feedback"
        search={{ value: search, onChange: setSearch, placeholder: 'Search Feedback...' }}
        columnPicker={{ columns: COLUMNS, visibleMap, onVisibleChange: setVisibleMap }}
        onToggleFilters={() => setShowFilters(v => !v)}
        onRefresh={() => { try { invalidateHttpCache('/admin/feedback'); } catch {} fetchData({ page: 1 }); }}
      />

      {showFilters && (
      <div className="advanced-filters" style={{ marginTop:16 }}>
        <div className="advanced-filters-header" style={{ marginBottom:10 }}>
          <strong>Filters</strong>
          <div style={{ display:'flex', gap:8 }}>
            <button className="pill-btn ghost sm" onClick={() => { setSearch(''); setStatus(''); setCategory(''); setRoleFilter(''); setSearchScope('name'); fetchData({ page:1 }); }} disabled={loading}>Reset</button>
          </div>
        </div>
        {/* Dedicated search row */}
        <div className="org-filter" style={{ width:'100%', marginBottom:14, display:'flex', flexDirection:'row', gap:8, alignItems:'flex-start' }}>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
            <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{ height: 32 }} />
          </div>
          <div style={{ width:200, display:'flex' }}>
            <select
              style={{ fontSize:'inherit', padding:'6px 8px', lineHeight:1.3, width:'100%', height:32 }}
              value={searchScope}
              onChange={e=>setSearchScope(e.target.value)}
            >
              <option value="name">Name</option>
              <option value="title">Title</option>
              <option value="message">Message</option>
              <option value="name_title">Name + Title</option>
              <option value="name_message">Name + Message</option>
              <option value="title_message">Title + Message</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
        {/* Remaining filters grid */}
        <div className="advanced-filters-grid">
          <div className="org-filter">
            <select value={status} onChange={e=>setStatus(e.target.value)} style={{ height: 32 }}>
              <option value="">Status (all)</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="org-filter">
            <select value={category} onChange={e=>setCategory(e.target.value)} style={{ height: 32 }}>
              <option value="">Category (all)</option>
              <option value="bug">Bug</option>
              <option value="suggestion">Suggestion</option>
              <option value="data">Data</option>
              <option value="ui">UI/UX</option>
              <option value="org_petition">Petition a New Organization</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="org-filter">
            <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{ height: 32 }}>
              <option value="">Role (all)</option>
              <option value="superadmin">Superadmin</option>
              <option value="org_admin">Org Admin</option>
              <option value="contributor">Contributor</option>
              <option value="public">Public</option>
              <option value="guest">Guest</option>
            </select>
          </div>
        </div>
  </div>
  )}

      <div className="table-wrapper" style={{ marginTop:18 }}>
        {selectedIds.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f1f5f9', padding:'6px 10px', borderRadius:8, marginBottom:8 }}>
            <span style={{ fontSize:12 }}>{selectedIds.length} selected</span>
            <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)} style={{ fontSize:12, height: 32 }}>
              <option value="">Set status…</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <button className="pill-btn sm" disabled={!bulkStatus || bulkApplying} onClick={doBulkUpdate}>{bulkApplying ? 'Applying…' : 'Apply'}</button>
            <button className="pill-btn ghost sm" onClick={()=>{ setSelectedIds([]); setBulkStatus(''); }}>Clear</button>
          </div>
        )}
        <div className="lv-table-wrap">
          <table className="lv-table">
            <thead>
              <tr>
                <th className="lv-th" style={{ width:32 }}>
                  <div className="lv-th-inner">
                    <input type="checkbox" aria-label="Select all on page" checked={selectedIds.length>0 && selectedIds.length===rows.length} onChange={toggleSelectAll} disabled={rows.length===0} />
                  </div>
                </th>
                {visibleColumns.map(col => (
                  <th key={col} className="lv-th">
                    <div className="lv-th-inner">
                      <button
                        type="button"
                        className={`lv-th-label lv-sortable ${sort.id === col ? 'is-sorted' : ''}`}
                        onClick={() => applySort(col)}
                        aria-label={`Sort by ${col}`}
                      >
                        {COLUMNS.find(c => c.id === col)?.header || col}
                        {sort.id === col && (
                          <span style={{ marginLeft: 6, fontSize: 12, color: '#6b7280' }}>
                            {sort.dir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </div>
                  </th>
                ))}
                <th className="lv-th sticky-right"><div className="lv-th-inner"><span className="lv-th-label">Actions</span></div></th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr><td className="lv-td" colSpan={2 + visibleColumns.length} style={{ textAlign:'center' }}>No feedback found.</td></tr>
              )}
              {loading && (
                <tr><td className="lv-td" colSpan={2 + visibleColumns.length} style={{ textAlign:'center' }}><LoadingSpinner label="Loading feedback…" /></td></tr>
              )}
              {sortedRows.map(r => (
                <tr key={r.id} className="lv-tr">
                  <td className="lv-td" style={{ width:32 }}>
                    <input type="checkbox" aria-label={`Select feedback ${r.id}`} checked={selectedIds.includes(r.id)} onChange={()=>toggleRow(r.id)} />
                  </td>
                  {visibleColumns.map(col => {
                    if (col === 'title') {
                      return (
                        <td key={col} className="lv-td" style={{ maxWidth:240 }}>
                          <div style={{ fontWeight:600, fontSize:13 }}>{r.title}</div>
                          <div style={{ fontSize:11, color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.message}</div>
                        </td>
                      );
                    }
                    if (col === 'user') {
                      return (
                        <td key={col} className="lv-td" style={{ fontSize:12 }}>
                          {r.is_guest ? (
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                              <span className="badge" style={{ background:'#f59e0b20', color:'#b45309', padding:'2px 6px', borderRadius:6, fontSize:11 }}>Guest</span>
                              {r.guest_name || '—'}
                            </span>
                          ) : (r.user?.name || '—')}
                        </td>
                      );
                    }
                    if (col === 'org') {
                      return (
                        <td key={col} className="lv-td" style={{ fontSize:12 }}>
                          {r.tenant?.name || ''}
                        </td>
                      );
                    }
                    if (col === 'lake') {
                      return (
                        <td key={col} className="lv-td" style={{ fontSize:12 }}>{r.lake?.name || '—'}</td>
                      );
                    }
                    if (col === 'category') {
                      return (
                        <td key={col} className="lv-td" style={{ fontSize:12 }}>{r.category ? <span className="feedback-category-badge">{r.category}</span> : '—'}</td>
                      );
                    }
                    if (col === 'source') {
                      const isLake = !!r.lake?.id;
                      const label = isLake ? 'Lake Panel' : 'System';
                      const color = isLake ? '#3b82f6' : '#64748b';
                      return (
                        <td key={col} className="lv-td" style={{ fontSize:12 }}>
                          <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{label}</span>
                        </td>
                      );
                    }
                    if (col === 'docs') {
                      // Deduplicate based on canonical path like in modal
                      const toCanonical = (raw) => {
                        if (!raw || typeof raw !== 'string') return '';
                        try { if (raw.startsWith('http')) { const u = new URL(raw); return u.pathname.replace(/^\//,''); } } catch {}
                        return raw.replace(/^\//,'');
                      };
                      const baseImgs = Array.isArray(r.images) ? r.images.filter(x => typeof x === 'string') : [];
                      const metaFiles = Array.isArray(r?.metadata?.files) ? r.metadata.files : [];
                      const metaPaths = metaFiles.map(f => (typeof f?.url === 'string' ? f.url : (typeof f?.path === 'string' ? f.path : null))).filter(Boolean);
                      const combined = [...baseImgs, ...metaPaths];
                      const seen = new Set();
                      const unique = [];
                      for (const c of combined) { const key = toCanonical(c); if (!key || seen.has(key)) continue; seen.add(key); unique.push(c); }
                      const total = unique.length;
                      if (total <= 0) return (<td key={col} className="lv-td" style={{ fontSize:12 }}>—</td>);
                      return (
                        <td key={col} className="lv-td" style={{ fontSize:12 }}>
                          <button
                            className="pill-btn ghost sm"
                            onClick={() => { setDocsItem(r); setDocsOpen(true); }}
                            title={`View attachments (${total})`}
                          >
                            <FiFileText /> View ({total})
                          </button>
                        </td>
                      );
                    }
                    if (col === 'status') {
                      return (
                        <td key={col} className="lv-td" style={{ fontSize:12 }}><StatusPill status={r.status} /></td>
                      );
                    }
                    if (col === 'created') {
                      return (
                        <td key={col} className="lv-td" style={{ fontSize:12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                      );
                    }
                    return null;
                  })}
                  <td className="lv-td sticky-right" style={{ fontSize:12 }}>
                    <div className="lv-actions-inline">
                      <button className="pill-btn ghost sm" onClick={() => openDetail(r)} title="View & edit"><FiEye size={14}/></button>
                      {r.spam_score > 0 && <span title={`Spam score: ${r.spam_score}`} style={{ marginLeft:4, fontSize:10, color:'#dc2626' }}>⚠</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lv-table-pager">
          <span className="pager-text">Page {page} / {lastPage}</span>
          <button className="pill-btn ghost sm" disabled={page <= 1 || loading} onClick={() => { const np = page - 1; setPage(np); fetchData({ page: np }); }}>Prev</button>
          <button className="pill-btn ghost sm" disabled={page >= lastPage || loading} onClick={() => { const np = page + 1; setPage(np); fetchData({ page: np }); }}>Next</button>
        </div>
      </div>

      <FeedbackDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        item={selected}
        onSave={handleSaved}
      />
      <AttachmentsModal open={docsOpen} onClose={() => setDocsOpen(false)} item={docsItem} />
    </div>
  );
}
