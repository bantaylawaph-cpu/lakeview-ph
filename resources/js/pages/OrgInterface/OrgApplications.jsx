import React, { useEffect, useMemo, useState } from "react";
import api, { me as fetchMe } from "../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../lib/httpCache";
import TableToolbar from "../../components/table/TableToolbar";
import TableLayout from "../../layouts/TableLayout";
import { FiCheck, FiX, FiAlertCircle, FiClipboard, FiInfo } from 'react-icons/fi';
import DashboardHeader from '../../components/DashboardHeader';
import KycProfileModal from '../../components/KycProfileModal';
import Modal from "../../components/Modal";

// Updated: remove generic "Pending" from filters; keep others
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending_org_review", label: "Pending Org Review" },
  { value: "approved", label: "Approved" },
  { value: "needs_changes", label: "Needs Changes" },
  { value: "rejected", label: "Rejected" },
  { value: "accepted_another_org", label: "Accepted Another Org" },
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
    desired_role: true,
    status: true,
    actions: true,
  });
  const [decisionModal, setDecisionModal] = useState({ open: false, id: null, action: null, notes: '', submitting: false, error: '' });
  const [orgTenantId, setOrgTenantId] = useState(null);

  // Map status codes to formal labels for display
  const STATUS_LABELS = useMemo(() => ({
    pending_kyc: 'Pending Org Review',
    pending_org_review: 'Pending Org Review',
    approved: 'Approved',
    needs_changes: 'Needs Changes',
    rejected: 'Rejected',
    accepted_another_org: 'Accepted Another Org',
  }), []);
  const statusLabel = (code) => STATUS_LABELS[code] || code || '';
  const roleLabel = (role) => {
    if (!role) return '';
    return String(role).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const COLUMNS = useMemo(() => ([
    { id: "user", header: "User" },
    { id: "desired_role", header: "Desired Role" },
    { id: "status", header: "Status" },
    { id: "actions", header: "Actions" },
  ]), []);

  // Derive tenant id from current user token payload or a global; fallback: use me() helper to get tenant_id
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const me = await fetchMe({ maxAgeMs: 60 * 1000 });
      if (!me?.tenant_id) throw new Error('No tenant in session');
  const tenantId = me.tenant_id;
  setOrgTenantId(tenantId);
      const res = await cachedGet(`/org/${tenantId}/applications`, { params: status ? { status } : undefined, ttlMs: 2 * 60 * 1000 });
      setRows(res?.data || []);
    } catch (e) {
      try { const j = JSON.parse(e?.message||''); setError(j?.message || 'Failed to load.'); } catch { setError('Failed to load.'); }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  // Submit a decision; notes required will be handled by caller for certain actions
  const decide = async (id, action, notes = '') => {
    try {
      const me = await fetchMe({ maxAgeMs: 60 * 1000 });
      const tenantId = me?.tenant_id;
      if (!tenantId) throw new Error('No tenant in session');
      await api.post(`/org/${tenantId}/applications/${id}/decision`, { action, notes });
      try { invalidateHttpCache(`/org/${tenantId}/applications`); } catch {}
      load();
    } catch (e) {
      // noop; could show toast
    }
  };

  // Open modal for needs_changes or reject to collect notes
  const openDecisionModal = (row, action) => {
    setDecisionModal({ open: true, id: row.id, action, notes: '', submitting: false, error: '' });
  };

  const submitDecisionModal = async () => {
    const { id, action, notes } = decisionModal;
    if ((action === 'needs_changes' || action === 'reject') && !String(notes || '').trim()) {
      setDecisionModal(dm => ({ ...dm, error: 'Please provide a brief reason.' }));
      return;
    }
    setDecisionModal(dm => ({ ...dm, submitting: true, error: '' }));
    try {
      await decide(id, action, notes);
      setDecisionModal({ open: false, id: null, action: null, notes: '', submitting: false, error: '' });
    } catch (e) {
      setDecisionModal(dm => ({ ...dm, submitting: false, error: 'Failed to submit decision. Please try again.' }));
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

  // Build TableLayout columns, normalized data, and actions (mirror admin table UX)
  const [profileUserId, setProfileUserId] = useState(null);
  const [statusInfoOpen, setStatusInfoOpen] = useState(false);

  const Badge = (props) => {
    const color = {
      pending_kyc: '#3b82f6', // unify with Pending Org Review
      pending_org_review: '#3b82f6',
      approved: '#22c55e',
      needs_changes: '#eab308',
      rejected: '#ef4444',
      accepted_another_org: '#64748b',
    }[props.value] || '#64748b';
    return <span style={{ background: `${color}22`, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{statusLabel(props.value)}</span>;
  };

  const baseColumns = useMemo(() => ([
    { id: 'user', header: 'User', render: (raw) => (
      <div>
        <button
          className="pill-btn ghost sm"
          title="View user information profile"
          onClick={() => setProfileUserId(raw.user?.id)}
          style={{ padding: '2px 8px' }}
        >{raw.user?.name}</button>
      </div>
    ), width: 180 },
    { id: 'desired_role', header: 'Desired Role', render: (raw) => (
      <div>{roleLabel(raw.desired_role)}</div>
    ), width: 160 },
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
    ), ariaLabel: 'Latest Status', render: (raw) => (
      <Badge value={raw.status} />
    ), width: 170 },
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
    { label: 'Needs changes', title: 'Needs changes', icon: <FiAlertCircle />, onClick: (raw) => openDecisionModal(raw, 'needs_changes') },
    { label: 'Reject', title: 'Reject', type: 'delete', icon: <FiX />, onClick: (raw) => openDecisionModal(raw, 'reject') },
  ]), []);

  return (
    <div className="content-page">
      <DashboardHeader
        icon={<FiClipboard />}
        title="Applications"
        description="Review and manage membership applications for your organization. Approve, request changes, or reject applications."
      />

      <TableToolbar
        tableId="org-applications"
        search={{ value: query, onChange: setQuery, placeholder: 'Search Applications...' }}
        filters={[{ id: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: STATUS_OPTIONS }]}
        columnPicker={{ columns: COLUMNS, visibleMap, onVisibleChange: setVisibleMap }}
        onRefresh={() => { if (orgTenantId) { try { invalidateHttpCache(`/org/${orgTenantId}/applications`); } catch {} load(); } }}
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
            actions={(visibleMap.actions !== false) ? actions.filter(Boolean) : []}
            disableActionsWhen={(raw) => raw?.status === 'accepted_another_org' || raw?.status === 'rejected'}
            loading={loading}
            hidePager={false}
            pageSize={15}
          />
          <KycProfileModal open={!!profileUserId} onClose={() => setProfileUserId(null)} userId={profileUserId} orgTenantId={orgTenantId} />
          <Modal
            open={decisionModal.open}
            onClose={() => setDecisionModal({ open: false, id: null, action: null, notes: '', submitting: false, error: '' })}
            title={decisionModal.action === 'reject' ? 'Reject application' : 'Request changes'}
            width={520}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="muted" style={{ fontSize: 14 }}>
                {decisionModal.action === 'reject'
                  ? 'Please share a brief reason for rejection so the applicant understands what to do next.'
                  : 'Describe what changes are needed so the applicant can update their submission.'}
              </div>
              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Reviewer notes</div>
                <textarea
                  rows={5}
                  value={decisionModal.notes}
                  onChange={(e) => setDecisionModal(dm => ({ ...dm, notes: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
                  placeholder={decisionModal.action === 'reject' ? 'E.g., ID is blurry and cannot be verified.' : 'E.g., Please upload the back side of your ID.'}
                />
              </label>
              {decisionModal.error && (
                <div style={{ color: '#b42318', background: '#fee4e2', border: '1px solid #fda29b', padding: 8, borderRadius: 8 }}>
                  {decisionModal.error}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setDecisionModal({ open: false, id: null, action: null, notes: '', submitting: false, error: '' })} className="pill-btn ghost">Cancel</button>
                <button type="button" onClick={submitDecisionModal} className="pill-btn" disabled={decisionModal.submitting}>
                  {decisionModal.submitting ? 'Submitting…' : (decisionModal.action === 'reject' ? 'Reject' : 'Send request')}
                </button>
              </div>
            </div>
          </Modal>
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
              <div>
                <div style={{ fontWeight: 600 }}>Accepted Another Org</div>
                <div className="muted" style={{ fontSize: 13 }}>The applicant accepted a position in another organization; this application is closed.</div>
              </div>
              <div className="lv-modal-actions" style={{ marginTop: 8 }}>
                <button type="button" className="pill-btn" onClick={() => setStatusInfoOpen(false)}>Close</button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}
