import React, { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import TableToolbar from "../../components/table/TableToolbar";
import TableLayout from "../../layouts/TableLayout";
import { FiCheck, FiX, FiAlertCircle, FiFileText } from 'react-icons/fi';
import KycDocsModal from '../../components/KycDocsModal';

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending_kyc", label: "Pending KYC" },
  { value: "pending_org_review", label: "Pending Org Review" },
  { value: "approved", label: "Approved" },
  { value: "needs_changes", label: "Needs Changes" },
  { value: "rejected", label: "Rejected" },
];

export default function OrgApplications() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visibleMap, setVisibleMap] = useState({
    id: true,
    user: true,
    documents: true,
    desired_role: true,
    status: true,
    actions: true,
  });

  const COLUMNS = useMemo(() => ([
    { id: "user", header: "User" },
    { id: "documents", header: "Documents" },
    { id: "desired_role", header: "Desired Role" },
    { id: "status", header: "Status" },
    { id: "actions", header: "Actions" },
  ]), []);

  // Derive tenant id from current user token payload or a global; fallback: ask backend whoami
  // For simplicity, we try /auth/me to get tenant_id
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const me = await api.get('/auth/me');
      if (!me?.tenant_id) throw new Error('No tenant in session');
      const tenantId = me.tenant_id;
      const res = await api.get(`/org/${tenantId}/applications`, { params: status ? { status } : undefined });
      setRows(res?.data || []);
    } catch (e) {
      try { const j = JSON.parse(e?.message||''); setError(j?.message || 'Failed to load.'); } catch { setError('Failed to load.'); }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const decide = async (id, action) => {
    try {
      const me = await api.get('/auth/me');
      const tenantId = me?.tenant_id;
      if (!tenantId) throw new Error('No tenant in session');
      let notes = '';
      if (action === 'needs_changes' || action === 'reject') {
        notes = window.prompt('Reviewer notes (optional):', '') || '';
      }
      await api.post(`/org/${tenantId}/applications/${id}/decision`, { action, notes });
      load();
    } catch (e) {
      // noop; could show toast
    }
  };

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => {
      const parts = [
        String(r.id || ""),
        r.user?.name || "",
        r.user?.email || "",
        r.status || "",
      ].join("\n").toLowerCase();
      return parts.includes(q);
    });
  }, [rows, query]);

  function exportCsv() {
    const cols = COLUMNS.filter(c => visibleMap[c.id] !== false && c.id !== 'actions');
    const header = cols.map(c => '"' + (c.header || c.id).replaceAll('"', '""') + '"').join(',');
    const body = filtered.map(r => cols.map(c => {
      const v = c.id === 'user' ? (r.user?.name ?? '')
        : c.id === 'email' ? (r.user?.email ?? '')
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
    a.download = 'org-applications.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Build TableLayout columns, normalized data, and actions (mirror admin table UX)
  const [docUser, setDocUser] = useState({ id: null, tenantId: null });

  const Badge = (props) => {
    const color = {
      pending_kyc: '#f59e0b',
      pending_org_review: '#3b82f6',
      approved: '#22c55e',
      needs_changes: '#eab308',
      rejected: '#ef4444',
    }[props.value] || '#64748b';
    return <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{props.value}</span>;
  };

  const baseColumns = useMemo(() => ([
    { id: 'user', header: 'User', render: (raw) => (
      <div>
        {raw.user?.name}
        <div className="muted" style={{ fontSize: 12 }}>{raw.user?.email}</div>
      </div>
    ), width: 220 },
    { id: 'documents', header: 'Documents', render: (raw) => (
      <button
        className="pill-btn ghost sm"
        onClick={async () => {
          try {
            const me = await api.get('/auth/me');
            const tenantId = me?.tenant_id;
            setDocUser({ id: raw.user?.id, tenantId });
          } catch {}
        }}
        title="View KYC documents"
      >
        <FiFileText /> View
      </button>
    ), width: 120 },
    { id: 'desired_role', header: 'Desired Role', accessor: 'desired_role', width: 160 },
    { id: 'status', header: 'Status', render: (raw) => (
      <Badge value={raw.status} />
    ), width: 160 },
  ]), []);

  const visibleColumns = useMemo(
    () => baseColumns.filter(c => visibleMap[c.id] !== false),
    [baseColumns, visibleMap]
  );

  const normalized = useMemo(() => (filtered || []).map(r => ({
    desired_role: r.desired_role ?? '',
    status: r.status ?? '',
    _raw: r,
  })), [filtered]);

  const actions = useMemo(() => ([
    { label: 'Approve', title: 'Approve', type: 'edit', icon: <FiCheck />, onClick: (raw) => decide(raw.id, 'approve') },
    { label: 'Needs changes', title: 'Needs changes', icon: <FiAlertCircle />, onClick: (raw) => decide(raw.id, 'needs_changes') },
    { label: 'Reject', title: 'Reject', type: 'delete', icon: <FiX />, onClick: (raw) => decide(raw.id, 'reject') },
  ]), []);

  return (
    <div className="content-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Applications</h1>
      </div>

      <TableToolbar
        tableId="org-applications"
        search={{ value: query, onChange: setQuery, placeholder: 'Search name, email, id…' }}
        filters={[{ id: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: STATUS_OPTIONS }]}
        columnPicker={{ columns: COLUMNS, visibleMap, onVisibleChange: setVisibleMap }}
        onRefresh={load}
        onExport={exportCsv}
      />

      {loading && <div style={{ marginTop: 8 }}>Loading…</div>}
      {error && (
        <div style={{ color: '#b42318', background: '#fee4e2', border: '1px solid #fda29b', padding: 10, borderRadius: 8, marginTop: 8 }}>
          {String(error)}
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-body">
          <TableLayout
            tableId="org-apps-table"
            columns={visibleColumns}
            data={normalized}
            actions={visibleMap.actions !== false ? actions : []}
            loading={loading}
            hidePager={false}
            pageSize={15}
          />
          <KycDocsModal open={!!docUser.id} onClose={() => setDocUser({ id: null, tenantId: null })} userId={docUser.id} orgTenantId={docUser.tenantId} />
        </div>
      </div>
    </div>
  );
}
