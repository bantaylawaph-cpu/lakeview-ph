// Refactored version aligned with adminUsers.jsx UI/UX but scoped to contributors
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { ROLE_LABEL } from "../../lib/roles";
import api from "../../lib/api";
import React, { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";

const CONTRIBUTOR_ROLE_ID = 3;
const FIXED_ROLE = 'contributor';
const emptyContributor = { name: '', email: '', password: '', role: FIXED_ROLE, role_id: CONTRIBUTOR_ROLE_ID };

export default function OrgMembers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [q, setQ] = useState('');
  const [colVisible, setColVisible] = useState({
    seq: true, id: true, name: true, email: true, role: true, role_id: true, status: true, joined: true, actions: true,
  });

  // Modal state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [initial, setInitial] = useState(emptyContributor);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(r => !term || [r.name, r.email].filter(Boolean).some(v => String(v).toLowerCase().includes(term)));
  }, [rows, q]);

  const fetchContributors = async (tid) => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/org/${tid}/users`);
      const list = res?.data || res || [];
      const contribs = list.filter(u => (u.role_id === CONTRIBUTOR_ROLE_ID) || (u.role === FIXED_ROLE));
      const mapped = contribs.map(u => ({
        id: u.id,
        name: u.name || '-',
        email: u.email || '-',
        role: u.role || FIXED_ROLE,
        role_id: u.role_id ?? CONTRIBUTOR_ROLE_ID,
        status: (u.active === false || u.disabled) ? 'inactive' : 'active',
        joined_at: u.created_at || u.pivot?.created_at || null,
      }));
      setRows(mapped);
    } catch (e) {
      console.error('Failed to load contributors', e);
      setError(e?.response?.data?.message || 'Failed to load contributors');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/auth/me');
        const tid = me?.tenant_id || me?.tenant?.id || me?.tenants?.[0]?.id || null;
        setTenantId(tid);
        if (tid) fetchContributors(tid);
      } catch (e) {
        setError('Unable to resolve tenant context');
      }
    })();
  }, []);

  const reload = () => { if (tenantId) fetchContributors(tenantId); };

  const openCreate = () => { setMode('create'); setEditingId(null); setInitial(emptyContributor); setOpen(true); };
  const openEdit = async (row) => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const res = await api.get(`/org/${tenantId}/users/${row.id}`);
      const u = res?.data || res || {};
      setMode('edit');
      setEditingId(u.id);
      setInitial({ name: u.name || '', email: u.email || '', password: '', role: FIXED_ROLE, role_id: u.role_id ?? CONTRIBUTOR_ROLE_ID });
      setOpen(true);
    } catch (e) {
      Swal.fire('Failed to load contributor', e?.response?.data?.message || '', 'error');
    } finally { setSaving(false); }
  };
  const closeModal = () => { if (saving) return; setOpen(false); setMode('create'); setInitial(emptyContributor); setEditingId(null); };
  const toast = (title, icon='success') => Swal.fire({ toast:true, position:'top-end', timer:1700, showConfirmButton:false, icon, title });

  const submitForm = async (formState) => {
    if (!tenantId) return;
    const payload = { name: formState.name, email: formState.email, role: FIXED_ROLE, role_id: CONTRIBUTOR_ROLE_ID, tenant_id: tenantId };
    if (formState.password) {
      payload.password = formState.password;
      if (formState.password_confirmation) payload.password_confirmation = formState.password_confirmation;
    }
    const verb = mode === 'edit' ? 'Update' : 'Create';
    const { isConfirmed } = await Swal.fire({ title: verb + ' contributor?', icon:'question', showCancelButton:true, confirmButtonText: verb });
    if (!isConfirmed) return;
    setSaving(true);
    try {
      if (mode === 'edit' && editingId) {
        await api.put(`/org/${tenantId}/users/${editingId}`, payload);
        toast('Contributor updated');
      } else {
        await api.post(`/org/${tenantId}/users`, payload);
        toast('Contributor created');
      }
      closeModal();
      reload();
    } catch (e) {
      const detail = e?.response?.data?.message || Object.values(e?.response?.data?.errors || {})?.flat()?.join(', ') || '';
      Swal.fire('Save failed', detail, 'error');
    } finally { setSaving(false); }
  };

  const deleteContributor = async (row) => {
    if (!tenantId) return;
    const { isConfirmed } = await Swal.fire({ title:'Delete contributor?', text: row.email, icon:'warning', showCancelButton:true, confirmButtonText:'Delete', confirmButtonColor:'#dc2626' });
    if (!isConfirmed) return;
    try { await api.delete(`/org/${tenantId}/users/${row.id}`); toast('Contributor deleted'); reload(); }
    catch(e){ Swal.fire('Delete failed', e?.response?.data?.message || '', 'error'); }
  };

  const columns = useMemo(() => [
    { id:'seq', header:'#' },
    { id:'id', header:'ID' },
    { id:'name', header:'Name' },
    { id:'email', header:'Email' },
    { id:'role', header:'Role' },
    { id:'role_id', header:'Role ID' },
    { id:'status', header:'Status' },
    { id:'joined', header:'Joined' },
    { id:'actions', header:'Actions' },
  ], []);

  return (
    <div className="container" style={{ padding:16 }}>
      <div className="flex-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h2 style={{ margin:0 }}>Organization · Contributors</h2>
        <button className="pill-btn" onClick={openCreate}>+ New Contributor</button>
      </div>
      <div className="card" style={{ padding:12, borderRadius:12, marginBottom:12 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <input type="text" placeholder="Search contributors…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ padding:'6px 10px', flex:'1 1 240px' }} />
          <button className="pill-btn ghost sm" onClick={reload} disabled={loading}>Refresh</button>
        </div>
        {error && <div className="lv-error" style={{ marginTop:8, color:'#b91c1c' }}>{error}</div>}
      </div>
      <div className="table-wrapper">
        <div className="lv-table-wrap">
          <div className="lv-table-scroller">
            <table className="lv-table" style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {colVisible.seq && <th style={{ width:60, textAlign:'left', padding:'8px 12px' }}>#</th>}
                  {colVisible.id && <th style={{ width:80, textAlign:'left', padding:'8px 12px' }}>ID</th>}
                  {colVisible.name && <th style={{ textAlign:'left', padding:'8px 12px' }}>Name</th>}
                  {colVisible.email && <th style={{ textAlign:'left', padding:'8px 12px' }}>Email</th>}
                  {colVisible.role && <th style={{ textAlign:'left', padding:'8px 12px' }}>Role</th>}
                  {colVisible.role_id && <th style={{ textAlign:'left', padding:'8px 12px' }}>Role ID</th>}
                  {colVisible.status && <th style={{ textAlign:'left', padding:'8px 12px' }}>Status</th>}
                  {colVisible.joined && <th style={{ textAlign:'left', padding:'8px 12px' }}>Joined</th>}
                  {colVisible.actions && <th style={{ width:200, textAlign:'right', padding:'8px 12px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ textAlign:'center', padding:16 }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="9" className="lv-empty" style={{ textAlign:'center', padding:16 }}>No contributors found</td></tr>
                ) : (
                  filtered.map((u,i) => {
                    const joined = u.joined_at ? new Date(u.joined_at).toLocaleString() : '—';
                    return (
                      <tr key={u.id} style={{ borderBottom:'1px solid #e5e7eb' }}>
                        {colVisible.seq && <td style={{ padding:'8px 12px' }}>{i+1}</td>}
                        {colVisible.id && <td style={{ padding:'8px 12px' }}>{u.id}</td>}
                        {colVisible.name && <td style={{ padding:'8px 12px' }}>{u.name}</td>}
                        {colVisible.email && <td style={{ padding:'8px 12px' }}>{u.email}</td>}
                        {colVisible.role && <td style={{ padding:'8px 12px' }}>{ROLE_LABEL[u.role] || u.role}</td>}
                        {colVisible.role_id && <td style={{ padding:'8px 12px' }}>{u.role_id}</td>}
                        {colVisible.status && <td style={{ padding:'8px 12px' }}>{u.status}</td>}
                        {colVisible.joined && <td style={{ padding:'8px 12px' }}>{joined}</td>}
                        {colVisible.actions && (
                          <td style={{ padding:'8px 12px', display:'flex', gap:8, justifyContent:'flex-end' }}>
                            <button className="pill-btn ghost sm" onClick={()=>openEdit(u)}>Edit</button>
                            <button className="pill-btn ghost sm red-text" onClick={()=>deleteContributor(u)}>Delete</button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={closeModal}
        title={mode === 'edit' ? 'Edit Contributor' : 'New Contributor'}
        ariaLabel="Contributor Form"
        width={600}
        footer={(
          <div className="lv-modal-actions" style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button type="button" className="pill-btn ghost" onClick={closeModal} disabled={saving}>Cancel</button>
            <button type="submit" form="org-contributor-form" className="pill-btn primary" disabled={saving}>{saving ? 'Saving…' : (mode==='edit' ? 'Update Contributor' : 'Create Contributor')}</button>
          </div>
        )}
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
          <div style={{ gridColumn:'1/3', fontSize:12, color:'#6b7280' }}>Role fixed: Contributor (role_id={CONTRIBUTOR_ROLE_ID})</div>
        </form>
      </Modal>
    </div>
  );
}
