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
];

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

  const baseColumns = useMemo(() => ([
    { id: 'user', header: 'User', render: (raw) => (
      <div>
        {raw.user?.name}
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
        </div>
      </div>
    </div>
  );
}
