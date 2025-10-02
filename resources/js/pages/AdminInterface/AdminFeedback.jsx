import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FiRefreshCw, FiEye, FiXCircle } from 'react-icons/fi';
import Modal from '../../components/Modal';
import api from '../../lib/api';

const STATUS_ORDER = ['open','in_progress','resolved','wont_fix'];
const STATUS_LABEL = STATUS_ORDER.reduce((acc, k) => {
  acc[k] = k === 'in_progress' ? 'In Progress' : k === 'wont_fix' ? "Won't Fix" : k.charAt(0).toUpperCase() + k.slice(1);
  return acc;
}, {});

const SEARCH_SCOPE_MAP = {
  name: ['name'],
  title: ['title'],
  message: ['message'],
  name_title: ['name','title'],
  name_message: ['name','message'],
  title_message: ['title','message'],
  all: ['name','title','message']
};

const StatusPill = ({ status }) => (
  <span className={`feedback-status ${status}`}>{STATUS_LABEL[status] || status}</span>
);

function FeedbackDetailModal({ open, onClose, item, onSave }) {
  const [status, setStatus] = useState(item?.status || 'open');
  const [adminResponse, setAdminResponse] = useState(item?.admin_response || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(item?.status || 'open');
      setAdminResponse(item?.admin_response || '');
    }
  }, [open, item]);

  if (!open || !item) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/admin/feedback/${item.id}`, { status, admin_response: adminResponse });
      onSave?.(res?.data?.data || res?.data || res);
      onClose?.();
    } catch {
      /* swallow */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Feedback #${item.id}`}
      width={720}
      ariaLabel="Feedback detail dialog"
      bodyClassName="feedback-detail-body"
    >
      <div className="lv-settings-panel" style={{ gap: 14 }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{item.title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Status:</span> <StatusPill status={status} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Category:</span> {item.category ? <span className="feedback-category-badge">{item.category}</span> : <span style={{ fontSize: 12 }}>—</span>}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Submitted: {new Date(item.created_at).toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Message:</div>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{item.message}</div>
        </div>
      </div>
      <div className="lv-settings-panel" style={{ gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Moderation</h3>
        <div className="lv-field-row">
          <label htmlFor="fb-detail-status">Status</label>
          <select
            id="fb-detail-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 6,
              padding: '6px 10px',
              background: '#fff',
              fontSize: 14,
            }}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="lv-field-row">
          <label htmlFor="fb-detail-response">Admin Response</label>
          <textarea
            id="fb-detail-response"
            value={adminResponse}
            onChange={(e) => setAdminResponse(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Provide context, resolution notes, or rationale."
            style={{
              resize: 'vertical',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 14,
              lineHeight: 1.4,
              background: '#fff',
            }}
          />
        </div>
        <div className="settings-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="pill-btn ghost" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" type="button" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

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
      const res = await api.get(`/admin/feedback?${params.toString()}`);
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
    } catch (e) { /* ignore */ } finally { setBulkApplying(false); }
  };

  return (
    <div className="content-page">
  <h1 style={{ marginTop:0, fontSize:'1.4rem', lineHeight:1.15, fontWeight:600 }}>System Feedback</h1>
      <p className="muted" style={{ marginTop:4 }}>Review, search, categorize, and resolve user-submitted feedback.</p>

      <div className="advanced-filters" style={{ marginTop:16 }}>
        <div className="advanced-filters-header" style={{ marginBottom:10 }}>
          <strong>Filters</strong>
          <div style={{ display:'flex', gap:8 }}>
            <button className="pill-btn ghost sm" onClick={() => { setSearch(''); setStatus(''); setCategory(''); setRoleFilter(''); setSearchScope('name'); fetchData({ page:1 }); }} disabled={loading}>Reset</button>
            <button className="pill-btn ghost sm" onClick={() => fetchData({ page:1 })} disabled={loading}><FiRefreshCw size={14}/> Refresh</button>
          </div>
        </div>
        {/* Dedicated search row */}
        <div className="org-filter" style={{ width:'100%', marginBottom:14, display:'flex', flexDirection:'row', gap:8, alignItems:'flex-start' }}>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
            <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <div style={{ width:200, display:'flex' }}>
            <select
              style={{ fontSize:'inherit', padding:'6px 8px', lineHeight:1.3, width:'100%', height:34 }}
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
            <select value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="">Status (all)</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="org-filter">
            <select value={category} onChange={e=>setCategory(e.target.value)}>
              <option value="">Category (all)</option>
              <option value="bug">Bug</option>
              <option value="suggestion">Suggestion</option>
              <option value="data">Data</option>
              <option value="ui">UI/UX</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="org-filter">
            <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
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

      <div className="table-wrapper" style={{ marginTop:18 }}>
        {selectedIds.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f1f5f9', padding:'6px 10px', borderRadius:8, marginBottom:8 }}>
            <span style={{ fontSize:12 }}>{selectedIds.length} selected</span>
            <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)} style={{ fontSize:12 }}>
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
                {['title','user','org','category','status','created'].map(col => (
                  <th key={col} className="lv-th">
                    <div className="lv-th-inner">
                      <button
                        type="button"
                        className={`lv-th-label lv-sortable ${sort.id === col ? 'is-sorted' : ''}`}
                        onClick={() => applySort(col)}
                        aria-label={`Sort by ${col}`}
                      >
                        {col === 'title' && 'Title'}
                        {col === 'user' && 'User'}
                        {col === 'org' && 'Org'}
                        {col === 'category' && 'Category'}
                        {col === 'status' && 'Status'}
                        {col === 'created' && 'Created'}
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
                <tr><td className="lv-td" colSpan={8} style={{ textAlign:'center' }}>No feedback found.</td></tr>
              )}
              {loading && (
                <tr><td className="lv-td" colSpan={8} style={{ textAlign:'center' }}>Loading…</td></tr>
              )}
              {sortedRows.map(r => (
                <tr key={r.id} className="lv-tr">
                  <td className="lv-td" style={{ width:32 }}>
                    <input type="checkbox" aria-label={`Select feedback ${r.id}`} checked={selectedIds.includes(r.id)} onChange={()=>toggleRow(r.id)} />
                  </td>
                  <td className="lv-td" style={{ maxWidth:240 }}><div style={{ fontWeight:600, fontSize:13 }}>{r.title}</div><div style={{ fontSize:11, color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.message}</div></td>
                  <td className="lv-td" style={{ fontSize:12 }}>
                    {r.is_guest ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                        <span className="badge" style={{ background:'#f59e0b20', color:'#b45309', padding:'2px 6px', borderRadius:6, fontSize:11 }}>Guest</span>
                        {r.guest_name || '—'}
                      </span>
                    ) : (r.user?.name || '—')}
                  </td>
                  <td className="lv-td" style={{ fontSize:12 }}>
                    {r.tenant?.name || ''}
                  </td>
                  <td className="lv-td" style={{ fontSize:12 }}>{r.category ? <span className="feedback-category-badge">{r.category}</span> : '—'}</td>
                  <td className="lv-td" style={{ fontSize:12 }}><StatusPill status={r.status} /></td>
                  <td className="lv-td" style={{ fontSize:12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
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
    </div>
  );
}
