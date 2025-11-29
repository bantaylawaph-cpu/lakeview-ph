import React, { useEffect, useState, useMemo, useRef } from "react";
import { FiEdit2, FiBriefcase, FiSettings } from 'react-icons/fi';
// actions menu removed: using single Manage button per row
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";
import api from "../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../lib/httpCache";
import Swal from "sweetalert2";
import OrganizationForm from "../../components/OrganizationForm";
import OrganizationManageModal from "../../components/OrganizationManageModal";
import DashboardHeader from '../../components/DashboardHeader';
import { FiBriefcase as FiBriefcaseIcon } from 'react-icons/fi';
import TableLayout from "../../layouts/TableLayout";
import { TYPE_OPTIONS } from "../../components/OrganizationForm";

export default function AdminOrganizationsPage() {
  const TABLE_ID = 'admin-organizations';
  const ADV_KEY = TABLE_ID + '::filters_advanced';
  const VIS_KEY = TABLE_ID + '::visible';

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const PER_PAGE = 10;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [openForm, setOpenForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [openManage, setOpenManage] = useState(false);
  const [manageOrg, setManageOrg] = useState(null);

  // Sorting state (mirrors pattern from useWQTests: persisted locally, server-side fetch honors sort_by + sort_dir)
  const SORT_KEY = TABLE_ID + '::sort';
  const [sort, setSort] = useState(() => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.id === 'string' && (parsed.dir === 'asc' || parsed.dir === 'desc')) return parsed;
      }
    } catch {}
    // Default newest first by id (descending) even if id column not shown
    return { id: 'id', dir: 'desc' };
  });
  useEffect(() => { try { localStorage.setItem(SORT_KEY, JSON.stringify(sort)); } catch {} }, [sort]);

  const persisted = (() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}'); } catch { return {}; } })();
  // Persist 'type' and 'status' filters for organizations.
  const [fType, setFType] = useState(persisted.type || "");
  // status filter deprecated in UI; keep only type
  useEffect(() => { try { localStorage.setItem(ADV_KEY, JSON.stringify({ type: fType })); } catch {} }, [fType]);

  // Default visible columns (status deprecated; exclude active)
  const defaultVisible = useMemo(() => ({ name: true, type: true, phone: true, contact_email: true, created_at: false, updated_at: false }), []);
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

  const normalize = (rows=[]) => rows.map(t => ({
    id: t.id,
    name: t.name || '',
    type: t.type || '—',
    phone: t.phone || '—',
    address: t.address || '—',
    contact_email: t.contact_email || '—',
    created_at: t.created_at || null,
    updated_at: t.updated_at || null,
    _raw: t,
  }));

  const buildParams = (overrides={}) => {
    const page = overrides.page ?? meta.current_page;
    const per_page = overrides.per_page ?? PER_PAGE;
    const params = { q, page, per_page, ...overrides };
    if (fType) params.type = fType;
    if (sort && sort.id) {
      params.sort_by = sort.id;
      params.sort_dir = sort.dir === 'asc' ? 'asc' : 'desc';
    }
    // status filter removed from UI
    return params;
  };

  const fetchOrgs = async (params={}) => {
    setLoading(true);
    try {
      // Bypass cache to ensure fresh fields after backend changes
      const res = await cachedGet('/admin/tenants', { params, ttlMs: 0 });
      const payload = res.data;
      const items = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      setRows(items);
      // Robust pagination meta: support meta object or top-level fields
      const m = payload?.meta || {};
      const total = m.total ?? payload?.total ?? null;
      const per = m.per_page ?? payload?.per_page ?? params.per_page ?? PER_PAGE;
      const cp = Number(m.current_page ?? payload?.current_page ?? params.page ?? 1) || 1;
      let lp = m.last_page ?? payload?.last_page;
      if (lp == null) {
        if (total != null) {
          const t = Number(total);
          lp = Number.isFinite(t) ? Math.max(1, Math.ceil(t / Number(per || PER_PAGE))) : 1;
        } else {
          // No total provided: infer at least one more page if current page is full
          lp = cp + ((Array.isArray(items) && items.length >= Number(per || PER_PAGE)) ? 1 : 0);
        }
      }
      setMeta({
        current_page: cp,
        last_page: Number(lp) || 1,
        per_page: per,
        total: total != null ? Number(total) : items.length
      });
    } catch(e) { Swal.fire('Failed to load organizations', e?.response?.data?.message || '', 'error'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(buildParams()); /* initial load */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(()=>{ fetchOrgs(buildParams({ page:1 })); },400);
    return ()=>{ if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fType]);

  const page = meta.current_page;
  const perPage = PER_PAGE;
  const goPage = (p) => fetchOrgs(buildParams({ page: p }));

  // Handle header sort toggles (TableLayout will call onSortChange with column id)
  const handleSortChange = (colId) => {
    if (!colId) return;
    const nextDir = (sort.id === colId && sort.dir === 'asc') ? 'desc' : 'asc';
    const next = { id: colId, dir: nextDir };
    setSort(next);
    fetchOrgs(buildParams({ page: 1, sort_by: next.id, sort_dir: next.dir }));
  };

  const columns = useMemo(() => {
    const arr = [];
    if (visibleMap.name) arr.push({ id:'name', header:'Name', accessor:'name' });
    if (visibleMap.type) arr.push({ id:'type', header:'Type', accessor:'type', width:140 });
    if (visibleMap.phone) arr.push({ id:'phone', header:'Phone', accessor:'phone', width:140 });
    if (visibleMap.contact_email) arr.push({ id:'contact_email', header:'Contact Email', accessor:'contact_email', width:220 });
    if (visibleMap.created_at) arr.push({ id:'created_at', header:'Created', accessor:'created_at', width:160, sortValue: r => r.created_at ? new Date(r.created_at) : null });
    if (visibleMap.updated_at) arr.push({ id:'updated_at', header:'Updated', accessor:'updated_at', width:160, sortValue: r => r.updated_at ? new Date(r.updated_at) : null });
    return arr;
  }, [visibleMap]);

  const normalized = useMemo(() => normalize(rows).map(r => ({ ...r, created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '—', updated_at: r.updated_at ? new Date(r.updated_at).toLocaleString() : '—' })), [rows]);

  // Inline actions removed in favor of kebab dropdown; actions array empty => hide default column
  const actions = useMemo(() => [], []);

  const advancedFields = [
    { id:'type', label:'Type', type:'select', value:fType, onChange:v=>setFType(v), options:[{ value:'', label:'All Types' }, ...TYPE_OPTIONS.map(t=>({ value:t, label:t }))] },
  ];
  const clearAdvanced = () => { setFType(''); fetchOrgs(buildParams({ page:1 })); };
  const activeAdvCount = [fType].filter(Boolean).length;

  const columnPickerAdapter = { columns: [
    { id:'name', header:'Name' },
    { id:'type', header:'Type' },
    { id:'phone', header:'Phone' },
    { id:'contact_email', header:'Contact Email' },
    { id:'created_at', header:'Created' },
    { id:'updated_at', header:'Updated' },
  ], visibleMap, onVisibleChange: (m)=> setVisibleMap(m) };

  const openCreate = () => { setEditingOrg(null); setOpenForm(true); };
  const openEdit = (row) => { /* edit now happens inside Manage modal - open manage */ setManageOrg(row._raw || row); setOpenManage(true); };
  const openOrgManage = (row) => { setManageOrg(row._raw || row); setOpenManage(true); };

  const handleFormSubmit = async (payload) => {
    try {
      if (editingOrg) {
        await api.put(`/admin/tenants/${editingOrg.id}`, payload);
        Swal.fire('Organization updated','','success');
      } else {
        await api.post('/admin/tenants', payload);
        Swal.fire('Organization created','','success');
      }
      setOpenForm(false);
      invalidateHttpCache('/admin/tenants');
      fetchOrgs(buildParams({ page:1 }));
    } catch(e){
      Swal.fire('Save failed', e?.response?.data?.message || '', 'error');
    }
  };
  const handleSoftDelete = async (row) => {
    const org = row._raw || row;
    const { isConfirmed } = await Swal.fire({ title: 'Delete organization?', text: `This will delete ${org.name}.`, icon:'warning', showCancelButton:true, confirmButtonText: 'Delete', confirmButtonColor:'#dc2626' });
    if (!isConfirmed) return;
    try {
      await api.delete(`/admin/tenants/${org.id}`);
      Swal.fire('Deleted','Organization deleted.','success');
      invalidateHttpCache('/admin/tenants');
      fetchOrgs(buildParams({ page }));
    } catch (e) { Swal.fire('Delete failed', formatApiError(e), 'error'); }
  };

  const handleRestore = async (row) => {
    const org = row._raw || row;
    const { isConfirmed } = await Swal.fire({ title: 'Restore organization?', text: `Restore ${org.name}?`, icon:'question', showCancelButton:true, confirmButtonText:'Restore' });
    if (!isConfirmed) return;
    try {
      await api.post(`/admin/tenants/${org.id}/restore`);
      Swal.fire('Restored','Organization restored.','success');
      invalidateHttpCache('/admin/tenants');
      fetchOrgs(buildParams({ page }));
    } catch (e) { Swal.fire('Restore failed', formatApiError(e), 'error'); }
  };

  // Helper to format API errors (validation messages or message field)
  const formatApiError = (e) => {
    if (!e) return 'Unknown error';
    const resp = e.response;
    if (!resp) return e.message || 'Network error';
    const data = resp.data || {};
    if (typeof data.message === 'string' && data.message.length) return data.message;
    if (data.errors && typeof data.errors === 'object') {
      // collect first error message
      for (const k of Object.keys(data.errors)) {
        const val = data.errors[k];
        if (Array.isArray(val) && val.length) return val.join(' ');
        if (typeof val === 'string') return val;
      }
    }
    return resp.statusText || `HTTP ${resp.status}`;
  };

  // Status handling removed (deprecated)

  // Enhance actions menu after any rows update (keyboard interaction wiring)
  // actions menu removed; no DOM wiring required

  return (
    <div className="container" style={{ padding: 16 }}>
      <DashboardHeader
        icon={<FiBriefcaseIcon />}
        title="Organizations"
        description="Manage registered organizations and their contact details."
      />

      <div className="card" style={{ padding:12, borderRadius:12, marginBottom:12 }}>
        <TableToolbar
          tableId={TABLE_ID}
          search={{ value:q, onChange: v => { setQ(v); fetchOrgs(buildParams({ q:v, page:1 })); }, placeholder:'Search Organizations...' }}
          filters={[]}
          columnPicker={columnPickerAdapter}
          onRefresh={() => fetchOrgs(buildParams())}
          onAdd={openCreate}
          onToggleFilters={() => setShowAdvanced(s => !s)}
          filtersBadgeCount={activeAdvCount}
        />
        <FilterPanel open={showAdvanced} fields={advancedFields} onClearAll={clearAdvanced} />
      </div>

      <div className="card" style={{ padding:12, borderRadius:12 }}>
        <TableLayout tableId={TABLE_ID} columns={[...columns, {
          id:'__actions', header:'Actions', width:70, alwaysVisible:true, render: (raw, row) => (
            <div style={{ display:'flex', gap:8 }}>
              <button className="pill-btn ghost" aria-label="Manage organization" onClick={()=>openOrgManage(row)} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36 }}>
                <FiSettings />
              </button>
            </div>
          )}]} data={normalized} pageSize={perPage} actions={actions} columnPicker={false} hidePager={false} loading={loading} serverSide={true} pagination={{ page: page, totalPages: meta.last_page }} onPageChange={goPage} sort={sort} onSortChange={handleSortChange} />
      </div>

      <OrganizationForm
        initialData={editingOrg || { name:'', type:'', contact_email:'', phone:'', address:'' }}
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
