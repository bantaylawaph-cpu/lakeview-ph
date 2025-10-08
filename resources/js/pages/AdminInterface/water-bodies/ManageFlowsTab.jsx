import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import LakeFlowForm from '../../../components/LakeFlowForm';
import { api } from '../../../lib/api';
import TableToolbar from '../../../components/table/TableToolbar';
import TableLayout from '../../../layouts/TableLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';

const TABLE_ID = 'admin-watercat-flows';
const VIS_KEY = `${TABLE_ID}::visible`;

const fmtDt = (value) => (value ? new Date(value).toLocaleString() : '');

const normalizeRows = (items=[]) => items.map(r => ({
  id: r.id,
  lake: r.lake?.name || r.lake_name || r.lake_id,
  flow_type: r.flow_type,
  name: r.name || '',
  source: r.source || '',
  is_primary: !!r.is_primary,
  latitude: r.latitude ?? null,
  longitude: r.longitude ?? null,
  updated_at: r.updated_at || null,
  _raw: r,
}));

export default function ManageFlowsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lakes, setLakes] = useState([]);
  const [lakesLoading, setLakesLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formInitial, setFormInitial] = useState(null);

  const [visibleMap, setVisibleMap] = useState(() => {
    try { const raw = localStorage.getItem(VIS_KEY); return raw ? JSON.parse(raw) : { lake:true, flow_type:true, name:true, source:true, is_primary:true, latitude:true, longitude:true, updated_at:true }; } catch { return { lake:true, flow_type:true, name:true, source:true, is_primary:true, latitude:true, longitude:true, updated_at:true }; }
  });
  useEffect(()=>{ try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);
  const [resetSignal, setResetSignal] = useState(0);
  const triggerResetWidths = () => setResetSignal(n=>n+1);

  const fetchLakesOptions = useCallback(async () => {
    setLakesLoading(true);
    try {
      const res = await api('/options/lakes');
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setLakes(list);
    } catch (err) {
      setLakes([]);
    } finally {
      setLakesLoading(false);
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true); setErrorMsg('');
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      const res = await api('/lake-flows', { method: 'GET', params });
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setRows(normalizeRows(list));
    } catch (e) {
      setRows([]); setErrorMsg(e.message || 'Failed to load flow points');
    } finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(()=>{ fetchLakesOptions(); }, [fetchLakesOptions]);
  useEffect(()=>{ fetchRows(); }, [fetchRows]);

  const openCreate = () => { setFormMode('create'); setFormInitial({}); setFormOpen(true); };
  const openEdit = (row) => { const src = row?._raw ?? row; setFormMode('edit'); setFormInitial(src); setFormOpen(true); };
  const openDelete = async (row) => {
    const src = row?._raw ?? row; if (!src) return; if (!window.confirm('Delete flow point?')) return;
    try { await api(`/lake-flows/${src.id}`, { method: 'DELETE' }); fetchRows(); } catch (e) { alert(e.message || 'Delete failed'); }
  };

  const submit = async (payload) => {
    const body = { ...payload };
    if (!body.lat) body.lat = payload.latitude ?? undefined;
    if (!body.lon) body.lon = payload.longitude ?? undefined;
    // Ensure numeric lake_id for validation (Laravel accepts string but we normalize)
    if (body.lake_id != null) body.lake_id = Number(body.lake_id);
    // is_primary should be boolean
    body.is_primary = !!body.is_primary;
    const method = formMode === 'create' ? 'POST' : 'PUT';
    try {
      const path = formMode === 'create' ? '/lake-flows' : `/lake-flows/${formInitial.id}`;
      // Pass plain object; api wrapper will JSON.stringify once. Previously we double-stringified causing 422.
      await api(path, { method, body });
    } catch (e) {
      alert(e.message || 'Save failed');
      return;
    }
    setFormOpen(false); fetchRows();
  };

  const columns = useMemo(()=>[
    { id:'lake', header:'Lake', accessor:'lake', width:200 },
    { id:'flow_type', header:'Type', accessor:'flow_type', width:110, render:(r)=> <span style={{textTransform:'capitalize'}}>{r.flow_type}</span> },
    { id:'name', header:'Name', accessor:'name', width:200 },
    { id:'source', header:'Source', accessor:'source', width:200 },
    { id:'is_primary', header:'Primary', accessor:'is_primary', width:90, render:(r)=> r.is_primary ? 'Yes' : '' },
    { id:'latitude', header:'Lat', accessor:'latitude', width:120 },
    { id:'longitude', header:'Lon', accessor:'longitude', width:120 },
    { id:'updated_at', header:'Updated', accessor:'updated_at', width:180, render:(r)=> fmtDt(r.updated_at) },
  ], []);

  const visibleColumns = useMemo(()=> columns.filter(c => visibleMap[c.id] !== false), [columns, visibleMap]);

  const filteredRows = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if (!q && !typeFilter) return rows;
    return rows.filter(r => (
      (!q || `${r.lake} ${r.name} ${r.source}`.toLowerCase().includes(q)) &&
      (!typeFilter || r.flow_type === typeFilter)
    ));
  }, [rows, query, typeFilter]);

  const exportCsv = () => {
    const headers = visibleColumns.map(c => typeof c.header === 'string' ? c.header : c.id);
    const csvRows = filteredRows.map(row => visibleColumns.map(col => {
      const value = row[col.accessor];
      const str = value == null ? '' : String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g,'""')}"` : str;
    }).join(','));
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'lake_flows.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },0);
  };

  const actions = useMemo(()=>[
    { label:'Edit', title:'Edit', icon:<FiEdit2 />, onClick: openEdit, type:'edit' },
    { label:'Delete', title:'Delete', icon:<FiTrash2 />, onClick: openDelete, type:'delete' },
  ], [openEdit]);

  return (
    <div className="dashboard-card">
      <TableToolbar
        tableId={TABLE_ID}
        search={{ value: query, onChange: setQuery, placeholder: 'Search flows by lake, name, or source...' }}
        filters={[{
          id:'flow_type', label:'Type', type:'select', value:typeFilter, onChange:setTypeFilter, options:[
            { value:'', label:'All Types' },
            { value:'inflow', label:'Inflows' },
            { value:'outflow', label:'Outflows' },
          ]
        }]}
        columnPicker={{ columns, visibleMap, onVisibleChange: setVisibleMap }}
        onResetWidths={triggerResetWidths}
        onRefresh={fetchRows}
        onExport={exportCsv}
        onAdd={openCreate}
        onToggleFilters={undefined}
        filtersBadgeCount={0}
      />

      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        <div className="table-wrapper" style={{ position:'relative' }}>
          {loading && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.6)', zIndex:2 }}>
              <LoadingSpinner label="Loading flows…" />
            </div>
          )}

          {/* Render error inside the table area so it's visually associated with the table */}
          {!loading && errorMsg ? (
            <div className="no-data" style={{ padding: 24 }}>{errorMsg}</div>
          ) : (
            <TableLayout
              tableId={TABLE_ID}
              columns={visibleColumns}
              data={filteredRows}
              pageSize={5}
              actions={actions}
              resetSignal={resetSignal}
              loading={loading}
              loadingLabel={loading ? 'Loading flows…' : null}
            />
          )}
        </div>
      </div>

      <LakeFlowForm
        open={formOpen}
        mode={formMode}
        initialValue={formInitial || {}}
        lakes={lakes}
        lakesLoading={lakesLoading}
        onCancel={()=>setFormOpen(false)}
        onSubmit={submit}
      />
    </div>
  );
}
