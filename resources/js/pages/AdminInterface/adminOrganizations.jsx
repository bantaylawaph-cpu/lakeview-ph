import React, { useEffect, useState, useMemo, useRef } from "react";
import { FiEdit2, FiTrash2, FiBriefcase } from 'react-icons/fi';
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";
import api from "../../lib/api";
import Swal from "sweetalert2";
import OrganizationForm from "../../components/OrganizationForm";
import OrganizationManageModal from "../../components/OrganizationManageModal";
import TableLayout from "../../layouts/TableLayout";
import { TYPE_OPTIONS } from "../../components/OrganizationForm";

export default function AdminOrganizationsPage() {
  const TABLE_ID = 'admin-organizations';
  const ADV_KEY = TABLE_ID + '::filters_advanced';
  const VIS_KEY = TABLE_ID + '::visible';

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [openForm, setOpenForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [openManage, setOpenManage] = useState(false);
  const [manageOrg, setManageOrg] = useState(null);

  const persisted = (() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}'); } catch { return {}; } })();
  // Persist 'type' and 'status' filters for organizations.
  const [fType, setFType] = useState(persisted.type || "");
  const [fStatus, setFStatus] = useState(persisted.status || ""); // '' | 'active' | 'inactive'
  useEffect(() => { try { localStorage.setItem(ADV_KEY, JSON.stringify({ type: fType, status: fStatus })); } catch {} }, [fType, fStatus]);

  // Default visible columns: primary contact fields; show Status by default (like users)
  const defaultVisible = useMemo(() => ({ name: true, type: true, phone: true, address: true, contact_email: true, created_at: false, updated_at: false, active: true }), []);
  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = localStorage.getItem(VIS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      // Enforce hidden defaults: if a column is false in defaultVisible, keep it false
      const final = {};
      for (const key of Object.keys(defaultVisible)) {
        if (defaultVisible[key] === false) final[key] = false;
        else if (Object.prototype.hasOwnProperty.call(parsed, key)) final[key] = parsed[key];
        else final[key] = defaultVisible[key];
      }
      return final;
    } catch {
      return defaultVisible;
    }
  });
  useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);

  const normalize = (rows=[]) => rows.map(t => {
    const hasIsActive = Object.prototype.hasOwnProperty.call(t, 'is_active');
    const active = hasIsActive ? !!t.is_active : (typeof t.active === 'boolean' ? t.active : !t.disabled);
    return {
      id: t.id,
      name: t.name || '',
      type: t.type || '—',
      phone: t.phone || '—',
      address: t.address || '—',
      contact_email: t.contact_email || '—',
      created_at: t.created_at || null,
      updated_at: t.updated_at || null,
      active,
      active_label: active ? 'Active' : 'Inactive',
      _raw: t,
    };
  });

  const buildParams = (overrides={}) => {
    const page = overrides.page ?? meta.current_page;
    const per_page = overrides.per_page ?? meta.per_page;
    const params = { q, page, per_page, ...overrides };
    if (fType) params.type = fType;
    if (fStatus) {
      const flag = (fStatus === 'active');
      params.active = flag; // compatibility
      params.is_active = flag;
    }
    return params;
  };

  const fetchOrgs = async (params={}) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/tenants', { params });
      const payload = res.data;
      const items = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      setRows(items);
      const m = payload?.meta || {};
      setMeta({ current_page: m.current_page || params.page || 1, last_page: m.last_page || 1, per_page: m.per_page || params.per_page || 15, total: m.total || items.length });
    } catch(e) { Swal.fire('Failed to load organizations', e?.response?.data?.message || '', 'error'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(buildParams()); /* initial load */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(()=>{ fetchOrgs(buildParams({ page:1 })); },400);
    return ()=>{ if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fType, fStatus]);

  const page = meta.current_page;
  const perPage = meta.per_page;
  const goPage = (p) => fetchOrgs(buildParams({ page: p }));

  const columns = useMemo(() => {
    const arr = [];
    if (visibleMap.name) arr.push({ id:'name', header:'Name', accessor:'name' });
    if (visibleMap.type) arr.push({ id:'type', header:'Type', accessor:'type', width:140 });
    if (visibleMap.phone) arr.push({ id:'phone', header:'Phone', accessor:'phone', width:140 });
    if (visibleMap.address) arr.push({ id:'address', header:'Address', accessor:'address', width:240 });
    if (visibleMap.contact_email) arr.push({ id:'contact_email', header:'Contact Email', accessor:'contact_email', width:220 });
    if (visibleMap.created_at) arr.push({ id:'created_at', header:'Created', accessor:'created_at', width:160, sortValue: r => r.created_at ? new Date(r.created_at) : null });
    if (visibleMap.updated_at) arr.push({ id:'updated_at', header:'Updated', accessor:'updated_at', width:160, sortValue: r => r.updated_at ? new Date(r.updated_at) : null });
    if (visibleMap.active) arr.push({ id:'active', header:'Status', accessor:'active_label', width:120 });
    return arr;
  }, [visibleMap]);

  const normalized = useMemo(() => normalize(rows).map(r => ({ ...r, created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '—', updated_at: r.updated_at ? new Date(r.updated_at).toLocaleString() : '—' })), [rows]);

  const actions = useMemo(() => [
    { label:'Edit', title:'Edit', type:'edit', icon:<FiEdit2 />, onClick: (row) => openEdit(row) },
    { label:'Manage', title:'Manage', icon:<FiBriefcase />, onClick: (row) => openOrgManage(row) },
    { label:'Force Delete', title:'Force Delete', type:'delete', icon:<FiTrash2 />, onClick: (row) => handleDelete(row, { force: true }) },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const advancedFields = [
    { id:'type', label:'Type', type:'select', value:fType, onChange:v=>setFType(v), options:[{ value:'', label:'All Types' }, ...TYPE_OPTIONS.map(t=>({ value:t, label:t }))] },
    { id:'status', label:'Status', type:'select', value:fStatus, onChange:v=>setFStatus(v), options:[ { value:'', label:'All Statuses' }, { value:'active', label:'Active' }, { value:'inactive', label:'Inactive' } ] },
  ];
  const clearAdvanced = () => { setFType(''); setFStatus(''); fetchOrgs(buildParams({ page:1 })); };
  const activeAdvCount = [fType, fStatus].filter(Boolean).length;

  const columnPickerAdapter = { columns: [
    { id:'name', header:'Name' },
    { id:'type', header:'Type' },
    { id:'phone', header:'Phone' },
    { id:'address', header:'Address' },
    { id:'contact_email', header:'Contact Email' },
    { id:'created_at', header:'Created' },
    { id:'updated_at', header:'Updated' },
    { id:'active', header:'Active' },
  ], visibleMap, onVisibleChange: (m)=> setVisibleMap(m) };

  const openCreate = () => { setEditingOrg(null); setOpenForm(true); };
  const openEdit = (row) => { setEditingOrg(row._raw || row); setOpenForm(true); };
  const openOrgManage = (row) => { setManageOrg(row._raw || row); setOpenManage(true); };

  const handleFormSubmit = async (payload) => {
    // Map status fields for backend compatibility
    if (typeof payload.active === 'boolean') {
      payload.is_active = !!payload.active;
      payload.disabled = !payload.active;
    }
    try {
      if (editingOrg) {
        await api.put(`/admin/tenants/${editingOrg.id}`, payload);
        Swal.fire('Organization updated','','success');
      } else {
        await api.post('/admin/tenants', payload);
        Swal.fire('Organization created','','success');
      }
      setOpenForm(false);
      fetchOrgs(buildParams({ page:1 }));
    } catch(e){
      Swal.fire('Save failed', e?.response?.data?.message || '', 'error');
    }
  };
  const handleDelete = async (row, { force } = { force: false }) => {
    const org = row._raw || row;
    const { isConfirmed } = await Swal.fire({ title: force ? 'Force delete organization?' : 'Delete organization?', text: force ? `This will permanently delete ${org.name}. This action cannot be undone.` : `This will delete ${org.name}.`, icon:'warning', showCancelButton:true, confirmButtonText: force ? 'Force Delete' : 'Delete', confirmButtonColor:'#dc2626' });
    if (!isConfirmed) return;
    try {
      const url = force ? `/admin/tenants/${org.id}?force=1` : `/admin/tenants/${org.id}`;
      await api.delete(url);
      Swal.fire('Organization deleted','','success');
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      fetchOrgs(buildParams({ page: nextPage }));
    } catch(e){
      Swal.fire('Delete failed', e?.response?.data?.message || '', 'error');
    }
  };

  // Toggle active/inactive directly from table (optional quick action)
  const toggleActive = async (row) => {
    const org = row._raw || row;
    const next = !row.active;
    try {
      await api.put(`/admin/tenants/${org.id}`, { active: next, is_active: next });
      fetchOrgs(buildParams());
    } catch (e) {
      Swal.fire('Update failed', e?.response?.data?.message || '', 'error');
    }
  };

  return (
    <div className="container" style={{ padding: 16 }}>
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiBriefcase />
            <span>Organizations</span>
          </div>
          <div className="org-actions-right">
            <button className="pill-btn" onClick={openCreate}>+ New Organization</button>
          </div>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          Manage registered organizations and their contact details.
        </p>
      </div>

      <div className="card" style={{ padding:12, borderRadius:12, marginBottom:12 }}>
        <TableToolbar
          tableId={TABLE_ID}
          search={{ value:q, onChange: v => { setQ(v); fetchOrgs(buildParams({ q:v, page:1 })); }, placeholder:'Search (name / domain)…' }}
          filters={[]}
          columnPicker={columnPickerAdapter}
          onRefresh={() => fetchOrgs(buildParams())}
          onToggleFilters={() => setShowAdvanced(s => !s)}
          filtersBadgeCount={activeAdvCount}
        />
        <FilterPanel open={showAdvanced} fields={advancedFields} onClearAll={clearAdvanced} />
      </div>

      <div className="card" style={{ padding:12, borderRadius:12 }}>
        <TableLayout tableId={TABLE_ID} columns={columns} data={normalized} pageSize={perPage} actions={actions} columnPicker={false} hidePager={true} loading={loading} />

        <div className="lv-table-pager" style={{ marginTop:10, display:'flex', gap:8, alignItems:'center' }}>
          <button className="pill-btn ghost sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>&lt; Prev</button>
          <span className="pager-text">Page {page} of {meta.last_page} · {meta.total} total</span>
            <button className="pill-btn ghost sm" disabled={page >= meta.last_page} onClick={() => goPage(page + 1)}>Next &gt;</button>
        </div>
      </div>

      <OrganizationForm
        initialData={editingOrg || { name:'', type:'', contact_email:'', phone:'', address:'', active:true }}
        onSubmit={handleFormSubmit}
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={editingOrg ? 'Edit Organization' : 'New Organization'}
      />
      {openManage && manageOrg && (
        <OrganizationManageModal org={manageOrg} open={openManage} onClose={() => setOpenManage(false)} />
      )}
    </div>
  );
}
