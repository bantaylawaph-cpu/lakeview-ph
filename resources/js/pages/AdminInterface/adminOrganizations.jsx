import React, { useEffect, useState, useMemo, useRef } from "react";
import { FiEdit, FiTrash, FiBriefcase } from 'react-icons/fi';
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
  const [fName, setFName] = useState(persisted.name || "");
  const [fType, setFType] = useState(persisted.type || "");
  const [fPhone, setFPhone] = useState(persisted.phone || "");
  const [fAddress, setFAddress] = useState(persisted.address || "");
  const [fContact, setFContact] = useState(persisted.contact_email || "");
  const [fCreatedRange, setFCreatedRange] = useState(Array.isArray(persisted.created_range) ? persisted.created_range : [null, null]);
  const [fUpdatedRange, setFUpdatedRange] = useState(Array.isArray(persisted.updated_range) ? persisted.updated_range : [null, null]);

  useEffect(() => {
    try { localStorage.setItem(ADV_KEY, JSON.stringify({ name: fName, type: fType, phone: fPhone, address: fAddress, contact_email: fContact, created_range: fCreatedRange, updated_range: fUpdatedRange })); } catch {}
  }, [fName, fType, fPhone, fAddress, fContact, fCreatedRange, fUpdatedRange]);

  const defaultVisible = useMemo(() => ({ name:true, type:true, phone:true, address:true, contact_email:true, created_at:true, updated_at:true, active:true }), []);
  const [visibleMap, setVisibleMap] = useState(() => { try { const raw = localStorage.getItem(VIS_KEY); return raw ? { ...defaultVisible, ...JSON.parse(raw) } : defaultVisible; } catch { return defaultVisible; } });
  useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);

  const normalize = (rows=[]) => rows.map(t => ({
    id: t.id,
    name: t.name || '',
    type: t.type || '—',
    phone: t.phone || '—',
    address: t.address || '—',
    contact_email: t.contact_email || '—',
    created_at: t.created_at || null,
    updated_at: t.updated_at || null,
    active: t.active ? 'Yes' : 'No',
    _raw: t,
  }));

  const buildParams = (overrides={}) => {
    const page = overrides.page ?? meta.current_page;
    const per_page = overrides.per_page ?? meta.per_page;
    const params = { q, page, per_page, ...overrides };
    if (fName) params.name = fName;
    if (fType) params.type = fType;
    if (fPhone) params.phone = fPhone;
    if (fAddress) params.address = fAddress;
    if (fContact) params.contact_email = fContact;
    const [cFrom,cTo] = fCreatedRange; if (cFrom) params.created_from = cFrom; if (cTo) params.created_to = cTo;
    const [uFrom,uTo] = fUpdatedRange; if (uFrom) params.updated_from = uFrom; if (uTo) params.updated_to = uTo;
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
  useEffect(() => { if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(()=>{ fetchOrgs(buildParams({ page:1 })); },400); return ()=>{ if (debounceRef.current) clearTimeout(debounceRef.current); }; // eslint-disable-next-line
  }, [fName,fType,fPhone,fAddress,fContact,fCreatedRange,fUpdatedRange]);

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
    if (visibleMap.active) arr.push({ id:'active', header:'Active', accessor:'active', width:90 });
    return arr;
  }, [visibleMap]);

  const normalized = useMemo(() => normalize(rows).map(r => ({ ...r, created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '—', updated_at: r.updated_at ? new Date(r.updated_at).toLocaleString() : '—' })), [rows]);

  const actions = useMemo(() => [
    { label:'Edit', title:'Edit', type:'edit', icon:<FiEdit />, onClick: (row) => openEdit(row) },
    { label:'Delete', title:'Delete', type:'delete', icon:<FiTrash />, onClick: (row) => handleDelete(row) },
    { label:'Manage', title:'Manage', icon:<FiBriefcase />, onClick: (row) => openOrgManage(row) },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const advancedFields = [
    { id:'name', label:'Name', type:'text', value:fName, onChange:v=>setFName(v) },
    { id:'type', label:'Type', type:'select', value:fType, onChange:v=>setFType(v), options:[{ value:'', label:'All Types' }, ...TYPE_OPTIONS.map(t=>({ value:t, label:t }))] },
    { id:'phone', label:'Phone', type:'text', value:fPhone, onChange:v=>setFPhone(v) },
    { id:'address', label:'Address', type:'text', value:fAddress, onChange:v=>setFAddress(v) },
    { id:'contact_email', label:'Contact Email', type:'text', value:fContact, onChange:v=>setFContact(v) },
    { id:'created-range', label:'Created Date Range', type:'date-range', value:fCreatedRange, onChange:r=>setFCreatedRange(r) },
    { id:'updated-range', label:'Updated Date Range', type:'date-range', value:fUpdatedRange, onChange:r=>setFUpdatedRange(r) },
  ];

  const clearAdvanced = () => {
    setFName(''); setFType(''); setFPhone(''); setFAddress(''); setFContact(''); setFCreatedRange([null,null]); setFUpdatedRange([null,null]); fetchOrgs(buildParams({ page:1 }));
  };
  const activeAdvCount = [fName,fType,fPhone,fAddress,fContact,fCreatedRange[0],fCreatedRange[1],fUpdatedRange[0],fUpdatedRange[1]].filter(Boolean).length;

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
    try { if (editingOrg) { await api.put(`/admin/tenants/${editingOrg.id}`, payload); Swal.fire('Organization updated','','success'); } else { await api.post('/admin/tenants', payload); Swal.fire('Organization created','','success'); } setOpenForm(false); fetchOrgs(buildParams({ page:1 })); } catch(e){ Swal.fire('Save failed', e?.response?.data?.message || '', 'error'); }
  };
  const handleDelete = async (row) => {
    const org = row._raw || row;
    const { isConfirmed } = await Swal.fire({ title:'Delete organization?', text:`This will permanently delete ${org.name}.`, icon:'warning', showCancelButton:true, confirmButtonText:'Delete', confirmButtonColor:'#dc2626' });
    if (!isConfirmed) return;
    try { await api.delete(`/admin/tenants/${org.id}`); Swal.fire('Organization deleted','','success'); const nextPage = rows.length === 1 && page > 1 ? page - 1 : page; fetchOrgs(buildParams({ page: nextPage })); } catch(e){ Swal.fire('Delete failed', e?.response?.data?.message || '', 'error'); }
  };

  return (
    <div className="container" style={{ padding: 16 }}>
      <div className="flex-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h2 style={{ margin:0 }}>Admin · Organizations</h2>
        <button className="pill-btn" onClick={openCreate}>+ New Organization</button>
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
        {loading && <div className="lv-empty" style={{ padding:16 }}>Loading…</div>}
        {!loading && <TableLayout tableId={TABLE_ID} columns={columns} data={normalized} pageSize={perPage} actions={actions} columnPicker={false} hidePager={true} />}
        <div className="lv-table-pager" style={{ marginTop:10, display:'flex', gap:8, alignItems:'center' }}>
          <button className="pill-btn ghost sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>&lt; Prev</button>
          <span className="pager-text">Page {page} of {meta.last_page} · {meta.total} total</span>
            <button className="pill-btn ghost sm" disabled={page >= meta.last_page} onClick={() => goPage(page + 1)}>Next &gt;</button>
        </div>
      </div>

      <OrganizationForm
        initialData={editingOrg || { name:'', type:'', domain:'', contact_email:'', phone:'', address:'', metadata:'', active:true }}
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
