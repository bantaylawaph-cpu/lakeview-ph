// resources/js/pages/AdminInterface/AdminOrgApplications.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import TableToolbar from '../../components/table/TableToolbar';
import TableLayout from '../../layouts/TableLayout';
import { FiFileText } from 'react-icons/fi';
import KycDocsModal from '../../components/KycDocsModal';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending_kyc', label: 'Pending KYC' },
  { value: 'pending_org_review', label: 'Pending Org Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_changes', label: 'Needs Changes' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'accepted_another_org', label: 'Accepted at another org' },
];
import Modal from '../../components/Modal';

export default function AdminOrgApplications() {
  const [rows, setRows] = useState([]);
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
      const res = await api.get('/admin/org-applications', { params: status ? { status } : undefined });
      setRows(res?.data || []);
    } catch (e) {
      try { const j = JSON.parse(e?.message||''); setError(j?.message || 'Failed to load.'); } catch { setError('Failed to load.'); }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  // Admins are read-only on applications; decisions are delegated to org administrators.

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => {
      const parts = [
        String(r.id || ''),
        r.user?.name || '',
        r.user?.email || '',
        r.tenant?.name || '',
        r.desired_role || '',
        r.status || '',
      ].join('\n').toLowerCase();
      return parts.includes(q);
    });
  }, [rows, query]);

  function exportCsv() {
    const cols = COLUMNS.filter(c => visibleMap[c.id] !== false && c.id !== 'actions');
    const header = cols.map(c => '"' + (c.header || c.id).replaceAll('"', '""') + '"').join(',');
    const body = filtered.map(r => cols.map(c => {
      const v = c.id === 'user' ? (r.user?.name ?? '')
        : c.id === 'tenant' ? (r.tenant?.name ?? '')
        : c.id === 'desired_role' ? (r.desired_role ?? '')
        : c.id === 'status' ? (r.status ?? '')
        : '';
      const s = String(v ?? '');
      return '"' + s.replaceAll('"', '""') + '"';
    }).join(',')).join('\n');
    const csv = [header, body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin-org-applications.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Mirror AdminUsers: build TableLayout columns and normalized rows
  const [docUserId, setDocUserId] = useState(null);
  const [userApps, setUserApps] = useState({ open: false, user: null, apps: [], loading: false, error: '' });

  const baseColumns = useMemo(() => ([
    { id: 'user', header: 'User', render: (raw) => (
      <div>
        <button
          className="pill-btn ghost sm"
          title="View all applications by this user"
          onClick={async () => {
            const user = raw.user;
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
          {raw.user?.name}
        </button>
        <div className="muted" style={{ fontSize: 12 }}>{raw.user?.email}</div>
      </div>
    ), width: 220 },
    { id: 'documents', header: 'Documents', render: (raw) => (
      <button className="pill-btn ghost sm" onClick={() => setDocUserId(raw.user?.id)} title="View KYC documents">
        <FiFileText /> View
      </button>
    ), width: 120 },
    { id: 'tenant', header: 'Organization', accessor: 'tenant_name', width: 200 },
    { id: 'desired_role', header: 'Desired Role', accessor: 'desired_role', width: 160 },
    { id: 'status', header: 'Status', render: (raw) => {
      const color = {
        pending_kyc: '#f59e0b',
        pending_org_review: '#3b82f6',
        approved: '#22c55e',
        needs_changes: '#eab308',
        rejected: '#ef4444',
        accepted_another_org: '#64748b',
      }[raw.status] || '#64748b';
      return <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{raw.status}</span>;
    }, width: 160 },
  ]), []);

  const visibleColumns = useMemo(
    () => baseColumns.filter(c => visibleMap[c.id] !== false),
    [baseColumns, visibleMap]
  );

  const normalized = useMemo(() => (filtered || []).map(r => ({
    id: r.id,
    tenant_name: r.tenant?.name ?? '',
    desired_role: r.desired_role ?? '',
    status: r.status ?? '',
    _raw: r,
  })), [filtered]);

  // No row actions for admin view.

  return (
    <div className="content-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Org Applications</h1>
        <div className="muted" style={{ marginLeft: 16, fontSize: 13 }}>
          Admins can view only; decisions are made by the organization’s admin.
        </div>
      </div>
      <div className="muted" style={{ margin: '6px 0 10px 0', fontSize: 13 }}>
        Tip: Click a user’s name to see all of their applications.
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
                          <span style={{ background: `${badgeColor}22`, color: badgeColor, padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>{app.status}</span>
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
