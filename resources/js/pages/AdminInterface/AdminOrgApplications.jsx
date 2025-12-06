// resources/js/pages/AdminInterface/AdminOrgApplications.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { cachedGet, invalidateHttpCache } from '../../lib/httpCache';
import TableToolbar from '../../components/table/TableToolbar';
import TableLayout from '../../layouts/TableLayout';
import { FiClipboard, FiInfo } from 'react-icons/fi';
import KycProfileModal from '../../components/KycProfileModal';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  // Removed generic Pending from filters to avoid confusion; submitted items appear as Pending Org Review
  { value: 'pending_org_review', label: 'Pending Org Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_changes', label: 'Needs Changes' },
  { value: 'rejected', label: 'Rejected' },
  // Removed "Accepted Another Org" from Admin Dashboard per request
];
import Modal from '../../components/Modal';

export default function AdminOrgApplications() {
  // Raw applications fetched from API
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [visibleMap, setVisibleMap] = useState({
    user: true,
    applications: true,
    status: true,
  });
  const [statusInfoOpen, setStatusInfoOpen] = useState(false);
  // Sorting state (mirror AdminUsers/AdminOrganizations heuristics)
  const [sortBy, setSortBy] = useState('user');
  const [sortDir, setSortDir] = useState('asc');
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Map status codes to formal labels for display
  const STATUS_LABELS = useMemo(() => ({
    // Display pending_kyc as Pending Org Review (do not surface a separate generic Pending state here)
    pending_kyc: 'Pending Org Review',
    pending_org_review: 'Pending Org Review',
    approved: 'Approved',
    needs_changes: 'Needs Changes',
    rejected: 'Rejected',
    // accepted_another_org intentionally omitted from Admin Dashboard
  }), []);
  const statusLabel = (code) => {
    // Hide accepted_another_org from admin view entirely
    if (code === 'accepted_another_org') return '';
    return STATUS_LABELS[code] || code || '';
  };

  const COLUMNS = useMemo(() => ([
    { id: 'user', header: 'User' },
    { id: 'applications', header: 'Applications' },
    { id: 'status', header: 'Latest Status' },
  ]), []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      // Proactively clear any cached responses for this endpoint
      try { invalidateHttpCache('/admin/org-applications'); } catch {}
      // Always fetch fresh from DB; bypass http cache and dedupe by using api.get directly
      console.debug('[AdminOrgApplications] Fetching /admin/org-applications');
      const res = await api.get('/admin/org-applications', { params: { _ts: Date.now() } });
      const rows = res?.data || [];
      console.debug('[AdminOrgApplications] Fetched rows:', rows.length, rows);
      setApps(rows);
    } catch (e) {
      let msg = 'Failed to load.';
      try { const j = JSON.parse(e?.message||''); msg = j?.message || msg; } catch {}
      console.error('[AdminOrgApplications] Fetch error:', e);
      setError(msg);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // Fetch once; status is applied locally

  // Admins are read-only on applications; decisions are delegated to org administrators.

  // Group applications per user (one table row per user)
  const grouped = useMemo(() => {
    const map = new Map();
    for (const app of apps) {
      const uid = app.user?.id;
      if (!uid) continue;
      if (!map.has(uid)) {
        map.set(uid, { user: app.user, apps: [] });
      }
      map.get(uid).apps.push(app);
    }
    // For each user, pick the "primary" (most recent by created_at) application to surface tenant / role / status.
    const rows = [];
    for (const { user, apps: list } of map.values()) {
      const sorted = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const primary = sorted[0];
      // Derive a status summary: if multiple distinct statuses, show primary plus count.
      const uniqueStatuses = Array.from(new Set(list.map(a => a.status).filter(Boolean)));
      let statusLbl = statusLabel(primary?.status) || '';
      if (uniqueStatuses.length > 1) {
        statusLbl = `${statusLabel(primary?.status)} (+${uniqueStatuses.length - 1})`;
      }
      rows.push({
        id: `user-${user.id}`,
        user,
        primary_app: primary,
        apps: list,
        status_summary: statusLbl,
      });
    }
    return rows;
  }, [apps]);

  // Apply status filter (if any user has at least one app with that status, keep the user)
  const statusFiltered = useMemo(() => {
    if (!status) return grouped;
    return grouped.filter(gr => gr.apps.some(a => a.status === status));
  }, [grouped, status]);

  // Apply search across user and all their applications' salient fields
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return statusFiltered;
    return statusFiltered.filter(gr => {
      const parts = [
        gr.user?.name || '',
        gr.user?.email || '',
        ...gr.apps.map(a => a.tenant?.name || ''),
        ...gr.apps.map(a => a.desired_role || ''),
        ...gr.apps.map(a => a.status || ''),
      ].join('\n').toLowerCase();
      return parts.includes(q);
    });
  }, [statusFiltered, query]);

  // Sorting comparator based on current sortBy/sortDir
  const sorted = useMemo(() => {
    const dir = (String(sortDir).toLowerCase() === 'desc') ? -1 : 1;
    const cmp = (a, b) => {
      switch (sortBy) {
        case 'user': {
          const av = (a.user?.name || '').toLowerCase();
          const bv = (b.user?.name || '').toLowerCase();
          return av.localeCompare(bv) * dir;
        }
        case 'applications': {
          const av = (a.apps?.length || 0);
          const bv = (b.apps?.length || 0);
          return (av === bv ? 0 : (av < bv ? -1 : 1)) * dir;
        }
        case 'status': {
          const av = (a.primary_app?.status || '').toLowerCase();
          const bv = (b.primary_app?.status || '').toLowerCase();
          return av.localeCompare(bv) * dir;
        }
        default: {
          const av = String(a.id || '');
          const bv = String(b.id || '');
          return av.localeCompare(bv) * dir;
        }
      }
    };
    const arr = [...filtered];
    arr.sort(cmp);
    return arr;
  }, [filtered, sortBy, sortDir]);

  // Heuristic sort toggle: first click desc for id/timestamps, asc otherwise; subsequent toggles flip
  const handleSortChange = (columnId) => {
    if (!columnId) return;
    if (columnId !== sortBy) {
      const initialDesc = /^(id|created_at|updated_at)$/i.test(columnId);
      setSortBy(columnId);
      setSortDir(initialDesc ? 'desc' : 'asc');
      setPage(1);
      return;
    }
    setSortDir(prev => (String(prev).toLowerCase() === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  // Client-side pagination (10 per page)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / pageSize)), [sorted.length]);
  const paged = useMemo(() => {
    const start = (Math.max(1, page) - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  // Mirror AdminUsers: build TableLayout columns and normalized rows
  const [profileUserId, setProfileUserId] = useState(null);
  const [userApps, setUserApps] = useState({ open: false, user: null, apps: [], loading: false, error: '' });

  const baseColumns = useMemo(() => ([
    { id: 'user', header: 'User', render: (row) => (
      <div>
        <button
          className="pill-btn ghost sm"
          title="View user information profile"
          onClick={() => setProfileUserId(row.user?.id)}
          style={{ padding: '2px 8px' }}
        >
          {row.user?.name}
        </button>
      </div>
    ), width: 220 },
    { id: 'applications', header: 'Applications', render: (row) => (
      <button
        className="pill-btn ghost sm"
        title="View all applications by this user"
        onClick={async () => {
          const user = row.user;
          setUserApps({ open: true, user, apps: [], loading: true, error: '' });
          try {
            const res = await api.get(`/admin/users/${user.id}/org-applications`);
            setUserApps({ open: true, user, apps: res?.data || [], loading: false, error: '' });
          } catch (e) {
            let msg = 'Failed to load applications.';
            try { const j = JSON.parse(e?.message||''); msg = j?.message || msg; } catch {}
            setUserApps({ open: true, user, apps: [], loading: false, error: msg });
          }
        }}
        style={{ padding: '2px 8px' }}
      >View</button>
    ), width: 140 },
    { id: 'status', header: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        Latest Status
        <span
          role="button"
          title="What does 'Latest Status' mean?"
          aria-label="Latest Status info"
          tabIndex={0}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStatusInfoOpen(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setStatusInfoOpen(true); } }}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af' }}
        >
          <FiInfo size={12} />
        </span>
      </span>
    ), ariaLabel: 'Latest Status', render: (row) => {
      const primary = row.primary_app;
      const baseStatus = primary?.status;
      const color = {
        pending_kyc: '#3b82f6', // show as Pending Org Review color
        pending_org_review: '#3b82f6',
        approved: '#22c55e',
        needs_changes: '#eab308',
        rejected: '#ef4444',
      }[baseStatus] || '#64748b';
      const label = String(row.status_summary || '').trim();
      return <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{label || '—'}</span>;
    }, width: 170 },
  ]), []);

  const visibleColumns = useMemo(
    () => baseColumns.filter(c => visibleMap[c.id] !== false),
    [baseColumns, visibleMap]
  );

  // Normalized rows passed to TableLayout. Previous implementation only kept id + status and lost
  // the grouped metadata (user, apps list, primary_app, status_summary). That caused the table to appear
  // empty or missing values because column renderers expect these properties. Preserve them here.
  const normalized = useMemo(() => (paged || []).map(r => ({
    id: r.id,
    user: r.user,
    applications: r.apps.length,
    status: r.primary_app?.status ?? '',
    status_summary: r.status_summary,
    primary_app: r.primary_app,
    apps: r.apps,
    _raw: r,
  })), [paged]);

  // No row actions for admin view.

  return (
    <div className="content-page">
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiClipboard />
            <span>Organization Applications</span>
          </div>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
          Browse and review all user submissions for joining organizations. Decisions are handled by each organization’s administrators.
          <br />
          <span style={{ fontStyle: 'italic' }}>Tip: Click a user’s name to view all of their applications.</span>
          <br />
          <span className="muted" style={{ fontSize: 12 }}>Fetched: {apps.length} row{apps.length === 1 ? '' : 's'}</span>
        </p>
      </div>

      <TableToolbar
        tableId="admin-org-applications"
        search={{ value: query, onChange: setQuery, placeholder: 'Search Organization Applications...' }}
        filters={[{ id: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: STATUS_OPTIONS }]}
        columnPicker={{ columns: COLUMNS, visibleMap, onVisibleChange: setVisibleMap }}
        onRefresh={load}
      />

      <div className="card">
        <div className="card-body">
          {error && <div className="alert error">{String(error)}</div>}
          <TableLayout
            tableId="admin-org-apps-table"
            columns={visibleColumns}
            data={normalized}
            actions={[]}
            loading={loading}
            hidePager={false}
            pageSize={pageSize}
            serverSide={true}
            pagination={{ page, totalPages }}
            sort={{ id: sortBy, dir: sortDir }}
            onPageChange={(p) => setPage(Math.max(1, Number(p) || 1))}
            onSortChange={handleSortChange}
          />
          <Modal
            open={statusInfoOpen}
            onClose={() => setStatusInfoOpen(false)}
            title="Status explanations"
            width={560}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Pending Org Review</div>
                <div className="muted" style={{ fontSize: 13 }}>The organization is reviewing the user’s application after submission.</div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Approved</div>
                <div className="muted" style={{ fontSize: 13 }}>The application has been approved by the organization.</div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Needs Changes</div>
                <div className="muted" style={{ fontSize: 13 }}>The organization requested changes. The user should update their submission and resubmit.</div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Rejected</div>
                <div className="muted" style={{ fontSize: 13 }}>The application has been rejected by the organization.</div>
              </div>
              <div className="lv-modal-actions" style={{ marginTop: 8 }}>
                <button type="button" className="pill-btn" onClick={() => setStatusInfoOpen(false)}>Close</button>
              </div>
            </div>
          </Modal>
          <KycProfileModal open={!!profileUserId} onClose={() => setProfileUserId(null)} userId={profileUserId} />
          <Modal
            open={userApps.open}
            onClose={() => setUserApps({ open: false, user: null, apps: [], loading: false, error: '' })}
            title={userApps.user ? `Applications for ${userApps.user.name}` : 'Applications'}
            width={720}
          >
            {userApps.loading && <div>Loading…</div>}
            {userApps.error && (
              <div className="alert error">{String(userApps.error)}</div>
            )}
            {!userApps.loading && !userApps.error && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#e5e7eb',
                    color: '#111827',
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '6px 12px',
                    minWidth: 40,
                  }}>
                    {userApps.apps.length}
                  </span>
                  <span className="muted" style={{ fontSize: 13, letterSpacing: 0.3 }}>
                    APPLICATION{userApps.apps.length !== 1 ? 'S' : ''}
                  </span>
                </div>
                {userApps.apps.length === 0 && (
                  <div className="muted">No applications.</div>
                )}
                {userApps.apps.map((app) => (
                  <div
                    key={app.id}
                    className="card"
                    style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}
                  >
                    <div
                      className="card-body"
                      style={{ display: 'grid', gap: 8, padding: 14 }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{app.tenant?.name || 'Unknown org'}</div>
                      {/* Status directly below title */}
                      <div>
                        {(() => {
                          const baseStatus = app?.status;
                          const color = {
                            pending_kyc: '#3b82f6', // show as Pending Org Review color
                            pending_org_review: '#3b82f6',
                            approved: '#22c55e',
                            needs_changes: '#eab308',
                            rejected: '#ef4444',
                          }[baseStatus] || '#64748b';
                          const label = String(statusLabel(baseStatus) || '').trim() || '—';
                          return (
                            <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{label}</span>
                          );
                        })()}
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        Applied: {app.created_at ? new Date(app.created_at).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true
                        }) : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  );
}
