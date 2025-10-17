// resources/js/pages/AdminInterface/AdminOrgApplications.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import TableToolbar from '../../components/table/TableToolbar';
import TableLayout from '../../layouts/TableLayout';
import { FiFileText, FiClipboard } from 'react-icons/fi';
import KycDocsModal from '../../components/KycDocsModal';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending_kyc', label: 'Pending' },
  { value: 'pending_org_review', label: 'Pending Org Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_changes', label: 'Needs Changes' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'accepted_another_org', label: 'Accepted Another Org' },
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
    documents: true,
    tenant: true,
    desired_role: true,
    status: true,
  });

  // Map status codes to formal labels for display
  const STATUS_LABELS = useMemo(() => ({
    pending_kyc: 'Pending',
    pending_org_review: 'Pending Org Review',
    approved: 'Approved',
    needs_changes: 'Needs Changes',
    rejected: 'Rejected',
    accepted_another_org: 'Accepted Another Org',
  }), []);
  const statusLabel = (code) => STATUS_LABELS[code] || code || '';

  const COLUMNS = useMemo(() => ([
    { id: 'user', header: 'User' },
    { id: 'documents', header: 'Documents' },
    { id: 'tenant', header: 'Organization' },
    { id: 'desired_role', header: 'Desired Role' },
    { id: 'status', header: 'Status' },
  ]), []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      // Always fetch all applications; status filtering will be applied per-user after grouping.
      const res = await api.get('/admin/org-applications');
      setApps(res?.data || []);
    } catch (e) {
      try { const j = JSON.parse(e?.message||''); setError(j?.message || 'Failed to load.'); } catch { setError('Failed to load.'); }
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

  function exportCsv() {
    const cols = COLUMNS.filter(c => visibleMap[c.id] !== false && c.id !== 'actions');
    const header = cols.map(c => '"' + (c.header || c.id).replaceAll('"', '""') + '"').join(',');
    const body = filtered.map(gr => cols.map(c => {
      const primary = gr.primary_app;
      const v = c.id === 'user' ? (gr.user?.name ?? '')
        : c.id === 'tenant' ? (primary?.tenant?.name ?? '')
        : c.id === 'desired_role' ? (primary?.desired_role ?? '')
        : c.id === 'status' ? (gr.status_summary ?? '')
        : '';
      const s = String(v ?? '');
      return '"' + s.replaceAll('"', '""') + '"';
    }).join(',')).join('\n');
    const csv = [header, body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin-org-applications-per-user.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Mirror AdminUsers: build TableLayout columns and normalized rows
  const [docUserId, setDocUserId] = useState(null);
  const [userApps, setUserApps] = useState({ open: false, user: null, apps: [], loading: false, error: '' });

  const baseColumns = useMemo(() => ([
    { id: 'user', header: 'User', render: (row) => (
      <div>
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
        >
          {row.user?.name}
        </button>
        <div className="muted" style={{ fontSize: 12 }}>{row.user?.email}</div>
      </div>
    ), width: 220 },
    { id: 'documents', header: 'Documents', render: (row) => (
      <button className="pill-btn ghost sm" onClick={() => setDocUserId(row.user?.id)} title="View KYC documents">
        <FiFileText /> View
      </button>
    ), width: 120 },
    { id: 'tenant', header: 'Latest Organization', accessor: 'tenant_name', width: 200 },
    { id: 'desired_role', header: 'Latest Desired Role', accessor: 'desired_role', width: 170 },
    { id: 'status', header: 'Latest Status', render: (row) => {
      const primary = row.primary_app;
      const baseStatus = primary?.status;
      const color = {
        pending_kyc: '#f59e0b',
        pending_org_review: '#3b82f6',
        approved: '#22c55e',
        needs_changes: '#eab308',
        rejected: '#ef4444',
        accepted_another_org: '#64748b',
      }[baseStatus] || '#64748b';
      return <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{row.status_summary}</span>;
    }, width: 170 },
  ]), []);

  const visibleColumns = useMemo(
    () => baseColumns.filter(c => visibleMap[c.id] !== false),
    [baseColumns, visibleMap]
  );

  const normalized = useMemo(() => (filtered || []).map(r => ({
    id: r.id,
    tenant_name: r.primary_app?.tenant?.name ?? '',
    desired_role: r.primary_app?.desired_role ?? '',
    status: r.primary_app?.status ?? '',
    _raw: r,
  })), [filtered]);

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
        </p>
      </div>

      <TableToolbar
        tableId="admin-org-applications"
        search={{ value: query, onChange: setQuery, placeholder: 'Search id, user, org…' }}
        filters={[{ id: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: STATUS_OPTIONS }]}
        columnPicker={{ columns: COLUMNS, visibleMap, onVisibleChange: setVisibleMap }}
        onRefresh={load}
        onExport={exportCsv}
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
            pageSize={15}
          />
          <KycDocsModal open={!!docUserId} onClose={() => setDocUserId(null)} userId={docUserId} />
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
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  {userApps.apps.length} application{userApps.apps.length !== 1 ? 's' : ''}
                </div>
                {userApps.apps.length === 0 && (
                  <div className="muted">No applications.</div>
                )}
                {userApps.apps.map((app) => {
                  const badgeColor = {
                    pending_kyc: '#f59e0b',
                    pending_org_review: '#3b82f6',
                    approved: '#22c55e',
                    needs_changes: '#eab308',
                    rejected: '#ef4444',
                    accepted_another_org: '#64748b',
                  }[app.status] || '#64748b';
                  return (
                    <div key={app.id} className="card" style={{ border: '1px solid #e5e7eb' }}>
                      <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{app.tenant?.name || 'Unknown org'}</div>
                          <div className="muted" style={{ fontSize: 12 }}>Desired role: {app.desired_role}</div>
                          <div className="muted" style={{ fontSize: 12 }}>Applied: {app.created_at ? new Date(app.created_at).toLocaleString() : '—'}</div>
                          {app.accepted_at && (
                            <div className="muted" style={{ fontSize: 12 }}>Accepted: {new Date(app.accepted_at).toLocaleString()}</div>
                          )}
                          {app.archived_at && (
                            <div className="muted" style={{ fontSize: 12 }}>Archived: {new Date(app.archived_at).toLocaleString()} {app.archived_reason ? `(${app.archived_reason})` : ''}</div>
                          )}
                        </div>
                        <div>
                          <span style={{ background: `${badgeColor}22`, color: badgeColor, padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>{statusLabel(app.status)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  );
}
