import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FiEye, FiMessageSquare, FiFileText } from 'react-icons/fi';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../lib/api';
import { cachedGet, invalidateHttpCache } from '../../lib/httpCache';
import TableToolbar from '../../components/table/TableToolbar';
import TableLayout from '../../layouts/TableLayout';
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
  const [meta, setMeta] = useState({ total: 0, perPage: 10, current: 1, last: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  // searchScope options: name | title | message | name_title | name_message | title_message | all
  const [searchScope, setSearchScope] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Bulk selection & actions state (CSV export removed per request)
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsItem, setDocsItem] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting logic (client-side on current page set) — define early to avoid TDZ
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

  // Normalize various paginator payload shapes into a consistent object
  const parsePagination = (payload, fallbackPage) => {
    let items = [];
    let current;
    let last;

    // Common Laravel paginator shapes
    if (Array.isArray(payload)) {
      items = payload;
    } else if (Array.isArray(payload?.data)) {
      items = payload.data;
      current = payload?.current_page ?? payload?.currentPage;
      last = payload?.last_page ?? payload?.lastPage;
    } else if (payload?.data && Array.isArray(payload?.data?.data)) {
      // Nested data + meta
      items = payload.data.data;
      current = payload.data?.current_page ?? payload.data?.currentPage ?? payload?.meta?.current_page ?? payload?.meta?.currentPage;
      last = payload.data?.last_page ?? payload.data?.lastPage ?? payload?.meta?.last_page ?? payload?.meta?.lastPage;
    } else if (Array.isArray(payload?.items)) {
      items = payload.items;
      current = payload?.meta?.current_page ?? payload?.meta?.currentPage;
      last = payload?.meta?.last_page ?? payload?.meta?.lastPage;
    } else if (Array.isArray(payload?.results)) {
      items = payload.results;
    }

    // Fallbacks for page and last_page using totals
    const totalVal = Number(
      payload?.total ?? payload?.meta?.total ?? payload?.data?.total ?? items.length ?? 0
    ) || 0;
    const perPageVal = Number(
      payload?.per_page ?? payload?.perPage ?? payload?.meta?.per_page ?? payload?.meta?.perPage ?? payload?.data?.per_page ?? 10
    ) || 10;

    if (!last) {
      const computed = totalVal > 0 && perPageVal > 0 ? Math.ceil(totalVal / perPageVal) : undefined;
      last = (payload?.last_page ?? payload?.lastPage ?? payload?.meta?.last_page ?? payload?.meta?.lastPage ?? computed ?? 1);
    }

    const curNum = Math.max(1, Number(current ?? fallbackPage ?? 1) || 1);
    const lastNum = Math.max(1, Number(last || 1) || 1);
    return {
      items,
      current: curNum,
      last: lastNum,
      perPage: perPageVal,
      total: totalVal,
    };
  };

  const fetchData = useCallback(async (targetPage) => {
    const p = Math.max(1, Number(targetPage ?? page) || 1);
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', p);
    params.set('per_page', 10);
    // Send server-side sort params to ensure paginator consistency
    if (sort?.id) {
      params.set('sort_by', sort.id);
      params.set('sort_dir', sort.dir === 'asc' ? 'asc' : 'desc');
    }
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
      // Bypass cache to ensure accurate pagination metadata
      try { invalidateHttpCache('/admin/feedback'); } catch {}
      const res = await api.get(`/admin/feedback`, { params: Object.fromEntries(params.entries()) });
      // api.get returns parsed JSON directly (not wrapped like Axios)
      // Backend returns: { data: [...], current_page, last_page, total, per_page }
      const payload = res;
      const parsed = parsePagination(payload, p);
      setRows(parsed.items);
      setSelectedIds([]);
      setPage(parsed.current);
      setLastPage(parsed.last);
      setMeta({ total: parsed.total, perPage: parsed.perPage, current: parsed.current, last: parsed.last });
    } catch (e) {
      console.error('[AdminFeedback] fetch error:', e);
      setError('Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, [page, search, searchScope, status, category, roleFilter, sort?.id, sort?.dir]);

  // Refetch when sort changes to use backend ordering
  useEffect(() => { fetchData(1); }, [sort?.id, sort?.dir]);

  useEffect(() => { fetchData(1); }, [search, status, category, roleFilter]);

  // Real-time updates via Server-Sent Events (SSE) with graceful fallback to polling
  const [sseEnabled, setSseEnabled] = useState(true);
  useEffect(() => {
    if (!sseEnabled) return; // disabled after first fatal error
    let es;
    const connect = () => {
      const maxId = rows.reduce((m, r) => r.id > m ? r.id : m, 0);
      try { invalidateHttpCache('/admin/feedback'); } catch {}
      try {
        es = new EventSource(`/api/admin/feedback/stream?last_id=${maxId}`);
        es.addEventListener('feedback-created', () => {
          try { invalidateHttpCache('/admin/feedback'); } catch {}
          fetchData(1);
        });
        es.onerror = () => {
          if (es) es.close();
          // If server doesn't return text/event-stream, the browser aborts; stop retrying
          setSseEnabled(false);
        };
      } catch {
        setSseEnabled(false);
      }
    };
    connect();
    return () => { if (es) es.close(); };
  }, [rows, fetchData, sseEnabled]);

  // Auto-refresh the list periodically when the tab is visible
  useEffect(() => {
    let timer = null;
    const intervalMs = 30000; // 30 seconds
    const tick = async () => {
      try {
        if (document.visibilityState === 'visible') {
          try { invalidateHttpCache('/admin/feedback'); } catch {}
          await fetchData(1);
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
  // Sorting logic (client-side on current page set) — now uses early-defined `sort`

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

  // Build TableLayout columns mirroring other admin pages
  const baseColumns = useMemo(() => ([
    {
      id: 'title', header: 'Title', width: 240,
      render: (r) => (
        <div>
          <div style={{ fontWeight:600, fontSize:13, wordBreak:'break-word' }}>{r.title}</div>
          <div style={{ fontSize:11, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', wordBreak:'break-word' }}>
            {r.message?.split(/\s+/).slice(0, 10).join(' ') + (r.message?.split(/\s+/).length > 10 ? '...' : '')}
          </div>
        </div>
      )
    },
    {
      id: 'user', header: 'User',
      render: (r) => (
        <span style={{ fontSize:12 }}>
          {r.is_guest ? (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
              <span className="badge" style={{ background:'#f59e0b20', color:'#b45309', padding:'2px 6px', borderRadius:6, fontSize:11 }}>Guest</span>
              {r.guest_name || '—'}
            </span>
          ) : (r.user?.name || '—')}
        </span>
      )
    },
    {
      id: 'source', header: 'Source',
      render: (r) => {
        const isLake = !!r.lake?.id;
        const label = isLake ? 'Lake Panel' : 'System';
        const color = isLake ? '#3b82f6' : '#64748b';
        return <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{label}</span>;
      }
    },
    {
      id: 'lake', header: 'Lake',
      render: (r) => (<span style={{ fontSize:12 }}>{r.lake?.name || '—'}</span>)
    },
    {
      id: 'category', header: 'Category',
      render: (r) => (<span style={{ fontSize:12 }}>{r.category ? <span className="feedback-category-badge">{r.category}</span> : '—'}</span>)
    },
    {
      id: 'docs', header: 'Documents',
      render: (r) => {
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
        if (total <= 0) return (<span style={{ fontSize:12 }}>—</span>);
        return (
          <button
            className="pill-btn ghost sm"
            onClick={() => { setDocsItem(r); setDocsOpen(true); }}
            title={`View attachments (${total})`}
          >
            <FiFileText /> View ({total})
          </button>
        );
      }
    },
    {
      id: 'status', header: 'Status',
      render: (r) => (<span style={{ fontSize:12 }}><StatusPill status={r.status} /></span>)
    },
    {
      id: 'org', header: 'Org',
      render: (r) => (<span style={{ fontSize:12 }}>{r.tenant?.name || ''}</span>)
    },
    {
      id: 'created', header: 'Created',
      render: (r) => (<span style={{ fontSize:12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span>)
    },
  ]), [rows, selectedIds]);

  const visibleTableColumns = useMemo(() => baseColumns.filter(c => visibleMap[c.id] !== false), [baseColumns, visibleMap]);

  const normalized = useMemo(() => sortedRows.map(r => ({ id: r.id, _raw: r })), [sortedRows]);

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
        onRefresh={() => { try { invalidateHttpCache('/admin/feedback'); } catch {} fetchData(1); }}
      />

      {showFilters && (
      <div className="advanced-filters" style={{ marginTop:16 }}>
        <div className="advanced-filters-header" style={{ marginBottom:10 }}>
          <strong>Filters</strong>
          <div style={{ display:'flex', gap:8 }}>
            <button className="pill-btn ghost sm" onClick={() => { setSearch(''); setStatus(''); setCategory(''); setRoleFilter(''); setSearchScope('all'); fetchData(1); }} disabled={loading}>Reset</button>
          </div>
        </div>
        {/* Removed duplicate search bar from Filters panel (toolbar search remains) */}
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
        {/* TEMP: debug pagination meta to investigate "no next" issue */}
        {/* Pagination meta debug was temporary; removed for production UI */}
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
        <TableLayout
          key={`pager-${lastPage}-${page}`}
          tableId="admin-feedback-table"
          columns={visibleTableColumns}
          data={normalized}
          actions={[{ label: 'View', title: 'View & edit', icon: <FiEye size={14} />, onClick: (row) => openDetail(row._raw ?? row) }]}
          loading={loading}
          hidePager={false}
          pageSize={10}
          serverSide={true}
          pagination={{ page, totalPages: lastPage }}
          sort={{ id: sort.id || null, dir: sort.dir || 'asc' }}
          onSortChange={(colId) => applySort(colId)}
          onPageChange={(p) => { const np = Math.max(1, Number(p) || 1); setPage(np); fetchData(np); }}
        />
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
