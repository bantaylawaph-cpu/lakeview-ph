// Refactored version aligned with adminUsers.jsx UI/UX but scoped to contributors
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useLocation } from 'react-router-dom';
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FiEdit, FiTrash, FiUsers } from 'react-icons/fi';
import DashboardHeader from '../../components/DashboardHeader';
import api, { me as fetchMe } from "../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../lib/httpCache";
import Modal from "../../components/Modal";
import TableToolbar from "../../components/table/TableToolbar";
import TableLayout from "../../layouts/TableLayout";

// Constants
const CONTRIBUTOR_ROLE_ID = 3;
const FIXED_ROLE = 'contributor';
const TABLE_ID = 'org-contributors';
const VIS_KEY = `${TABLE_ID}::visible`;

// Initial form values
const emptyContributor = { name: '', email: '', password: '', role: FIXED_ROLE };

// Normalize API users -> table rows (only used fields)
const normalizeContributors = (rows = []) => rows.map(u => ({
  id: u.id,
  name: u.name || '',
  email: u.email || '',
  _raw: u,
}));

export default function OrgMembers() {
  // Core state
  const location = useLocation();
  const qp = new URLSearchParams(location.search);
  const [tenantId, setTenantId] = useState(() => qp.get('tenant_id') || null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search
  const [q, setQ] = useState('');

  // Column visibility
  const defaultsVisible = useMemo(() => ({ name: true, email: true }), []);
  const [visibleMap, setVisibleMap] = useState(() => { try { const raw = localStorage.getItem(VIS_KEY); return raw ? JSON.parse(raw) : defaultsVisible; } catch { return defaultsVisible; } });
  useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);

  // Modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [initial, setInitial] = useState(emptyContributor);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Build base columns
  const baseColumns = useMemo(() => [
    { id: 'name', header: 'Name', accessor: 'name' },
    { id: 'email', header: 'Email', accessor: 'email', width: 240 },
  ], []);
  const visibleColumns = useMemo(() => baseColumns.filter(c => visibleMap[c.id] !== false), [baseColumns, visibleMap]);

  const toast = (title, icon='success') => Swal.fire({ toast:true, position:'top-end', timer:1600, showConfirmButton:false, icon, title });
  const unwrap = (res) => (res?.data ?? res);

  // Fetch contributors
  const fetchContributors = async (tid) => {
    setLoading(true); setError(null);
    try {
      const res = unwrap(await cachedGet(`/org/${tid}/users`, { ttlMs: 5 * 60 * 1000 }));
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : res?.data?.data || []);
      const contribs = list.filter(u => (u.role_id === CONTRIBUTOR_ROLE_ID) || (u.role === FIXED_ROLE));
      setRows(contribs);
    } catch (e) {
      console.error('Failed to load contributors', e);
      setError(e?.response?.data?.message || 'Failed to load contributors');
    } finally { setLoading(false); }
  };

  // Resolve tenant then load
  useEffect(() => { (async () => {
    try {
      const me = await fetchMe({ maxAgeMs: 60 * 1000 });
      const tid = me?.tenant_id || me?.tenant?.id || me?.tenants?.[0]?.id || null;
      setTenantId(tid);
      if (tid) fetchContributors(tid);
    } catch { setError('Unable to resolve tenant context'); }
  })(); }, []);

  const reload = () => { if (tenantId) fetchContributors(tenantId); };

  // Open / Edit
  const openCreate = () => { setMode('create'); setEditingId(null); setInitial(emptyContributor); setOpen(true); };
  const openEdit = useCallback(async (row) => {
    if (!tenantId) {
      Swal.fire('Tenant not ready', 'Please wait a moment and try again.', 'info');
      return;
    }
    setSaving(true);
    try {
      const res = unwrap(await api.get(`/org/${tenantId}/users/${row.id}`));
      const u = res?.data ?? res;
      setMode('edit');
      setEditingId(u.id);
      setInitial({ name: u.name || '', email: u.email || '', password: '', role: FIXED_ROLE });
      setOpen(true);
    } catch (e) {
      Swal.fire('Failed to load contributor', e?.response?.data?.message || '', 'error');
    } finally {
      setSaving(false);
    }
  }, [tenantId]);
  const closeModal = () => { if (saving) return; setOpen(false); setInitial(emptyContributor); setEditingId(null); setMode('create'); };

  // Submit
  const submitForm = async (payload) => {
    if (!tenantId) return;
    const verb = mode === 'edit' ? 'Update' : 'Create';
    const body = { name: payload.name, email: payload.email };
    if (payload.password) {
      body.password = payload.password;
      if (payload.password_confirmation) body.password_confirmation = payload.password_confirmation;
    }

    const { isConfirmed } = await Swal.fire({ title: `${verb} contributor?`, text: payload.email, icon:'question', showCancelButton:true, confirmButtonText: verb, confirmButtonColor:'#2563eb' });
    if (!isConfirmed) return;
    setSaving(true);
    try {
      if (mode === 'edit' && editingId) { await api.put(`/org/${tenantId}/users/${editingId}`, body); toast('Contributor updated'); }
      else { await api.post(`/org/${tenantId}/users`, body); toast('Contributor created'); }
      closeModal(); reload();
      try { invalidateHttpCache(`/org/${tenantId}/users`); } catch {}
    } catch (e) {
      console.error('Save failed', e);
      const detail = e?.response?.data?.message || Object.values(e?.response?.data?.errors || {})?.flat()?.join(', ') || '';
      Swal.fire('Save failed', detail, 'error');
    } finally { setSaving(false); }
  };

  // Delete
  const deleteContributor = useCallback(async (row) => {
    if (!tenantId) {
      Swal.fire('Tenant not ready', 'Please wait a moment and try again.', 'info');
      return;
    }
    const { isConfirmed } = await Swal.fire({ title:'Delete contributor?', text:`This will permanently delete ${row.email}.`, icon:'warning', showCancelButton:true, confirmButtonText:'Delete', confirmButtonColor:'#dc2626' });
    if (!isConfirmed) return;
    try {
      await api.delete(`/org/${tenantId}/users/${row.id}`);
      toast('Contributor deleted');
      try { invalidateHttpCache(`/org/${tenantId}/users`); } catch {}
      reload();
    } catch(e) {
      console.error('Delete failed', e);
      Swal.fire('Delete failed', e?.response?.data?.message || '', 'error');
    }
  }, [tenantId]);

  // Actions (same style as adminUsers)
  const actions = useMemo(() => [
    { label:'Edit', title:'Edit', type:'edit', icon:<FiEdit />, onClick:(raw)=>openEdit(raw) },
    { label:'Delete', title:'Delete', type:'delete', icon:<FiTrash />, onClick:(raw)=>deleteContributor(raw) },
  ], [openEdit, deleteContributor]);

  // Normalized rows (for TableLayout)
  const normalized = useMemo(() => normalizeContributors(rows), [rows]);

  // Apply search client-side
  const debounceRef = useRef(null);
  const [filtered, setFiltered] = useState([]);
  useEffect(() => { setFiltered(normalized); }, [normalized]);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const term = q.trim().toLowerCase();
      setFiltered(normalized.filter(r => {
        if (term && !(r.name.toLowerCase().includes(term) || r.email.toLowerCase().includes(term))) return false;
        return true;
      }));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, normalized]);

  // Column picker adapter
  const columnPickerAdapter = {
    columns: baseColumns.map(c => ({ id: c.id, header: c.header })),
    visibleMap,
    onVisibleChange: map => setVisibleMap(map),
  };

  return (
    <div className="container" style={{ padding: 16 }}>
      <DashboardHeader
        icon={<FiUsers />}
        title="Members"
        description="Manage contributors for your organization. Add, edit, or remove contributors as needed."
        actions={<button className="pill-btn" onClick={openCreate}>+ New Contributor</button>}
      />

      <div className="card" style={{ padding:12, borderRadius:12, marginBottom:12 }}>
        <TableToolbar
          tableId={TABLE_ID}
          search={{ value: q, onChange: (val) => setQ(val), placeholder: 'Search Members...' }}
          filters={[]}
          columnPicker={columnPickerAdapter}
          onRefresh={reload}
        />
        {error && <div className="lv-error" style={{ marginTop:8, color:'#b91c1c' }}>{error}</div>}
      </div>

      <div className="card" style={{ padding:12, borderRadius:12 }}>
        {loading && <div className="lv-empty" style={{ padding:16 }}>Loading…</div>}
        {!loading && (
          <TableLayout
            tableId={TABLE_ID}
            columns={visibleColumns}
            data={filtered}
            pageSize={15}
            actions={actions}
            resetSignal={0}
            columnPicker={false}
          />
        )}
        <div style={{ marginTop:8, fontSize:12, color:'#6b7280' }}>{filtered.length} contributor{filtered.length!==1?'s':''} shown</div>
      </div>

      <Modal
        open={open}
        onClose={closeModal}
        title={mode === 'edit' ? 'Edit Contributor' : 'Create Contributor'}
        ariaLabel="Contributor Form"
        width={600}
        footer={<div className="lv-modal-actions"><button type="button" className="pill-btn ghost" onClick={closeModal} disabled={saving}>Cancel</button><button type="submit" form="org-contributor-form" className="pill-btn primary" disabled={saving}>{saving ? 'Saving…' : (mode==='edit' ? 'Update Contributor' : 'Create Contributor')}</button></div>}
      >
        <form id="org-contributor-form" onSubmit={(e)=>{ e.preventDefault(); submitForm(initial); }} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <label className="lv-field" style={{ gridColumn:'1/2' }}>
            <span>Name *</span>
            <input required value={initial.name} onChange={(e)=>setInitial(i=>({...i,name:e.target.value}))} />
          </label>
          <label className="lv-field" style={{ gridColumn:'2/3' }}>
            <span>Email *</span>
            <input required type="email" value={initial.email} onChange={(e)=>setInitial(i=>({...i,email:e.target.value}))} />
          </label>
          <label className="lv-field" style={{ gridColumn:'1/2' }}>
            <span>{mode==='edit' ? 'New Password (optional)' : 'Password *'}</span>
            <input type="password" required={mode!=='edit'} value={initial.password||''} onChange={(e)=>setInitial(i=>({...i,password:e.target.value}))} />
          </label>
          <label className="lv-field" style={{ gridColumn:'2/3' }}>
            <span>{mode==='edit' ? 'Confirm New Password' : 'Confirm Password *'}</span>
            <input type="password" required={mode!=='edit'} value={initial.password_confirmation||''} onChange={(e)=>setInitial(i=>({...i,password_confirmation:e.target.value}))} />
          </label>
        </form>
      </Modal>
    </div>
  );
}
