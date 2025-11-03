import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';
import LakeFlowForm from '../../../components/LakeFlowForm';
import Modal from '../../../components/Modal';
import AppMap from '../../../components/AppMap';
import MapViewport from '../../../components/MapViewport';
import { GeoJSON, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../../lib/api';
import { cachedGet, invalidateHttpCache } from '../../../lib/httpCache';
import { confirm, alertError, alertSuccess, showLoading, closeLoading } from '../../../lib/alerts';
import TableToolbar from '../../../components/table/TableToolbar';
import TableLayout from '../../../layouts/TableLayout';

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
    try {
      const raw = localStorage.getItem(VIS_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          parsed.updated_at = false;
          return parsed;
        } catch (e) {
        }
      }
      return { lake:true, flow_type:true, name:true, source:true, is_primary:true, latitude:true, longitude:true, updated_at:false };
    } catch {
      return { lake:true, flow_type:true, name:true, source:true, is_primary:true, latitude:true, longitude:true, updated_at:false };
    }
  });
  useEffect(()=>{ try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);
  const [resetSignal, setResetSignal] = useState(0);
  const triggerResetWidths = () => setResetSignal(n=>n+1);

  const fetchLakesOptions = useCallback(async () => {
    setLakesLoading(true);
    try {
      const res = await cachedGet('/options/lakes', { ttlMs: 10 * 60 * 1000 });
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
      const res = await cachedGet('/lake-flows', { params, ttlMs: 5 * 60 * 1000 });
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setRows(normalizeRows(list));
    } catch (e) {
      setRows([]); setErrorMsg(e.message || 'Failed to load tributaries');
    } finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(()=>{ fetchLakesOptions(); }, [fetchLakesOptions]);
  useEffect(()=>{ fetchRows(); }, [fetchRows]);

  const openCreate = () => { setFormMode('create'); setFormInitial({}); setFormOpen(true); };
  const openEdit = (row) => { const src = row?._raw ?? row; setFormMode('edit'); setFormInitial(src); setFormOpen(true); };
  const openDelete = async (row) => {
    const src = row?._raw ?? row; if (!src) return;
    const ok = await confirm({ title: 'Delete tributary?', text: `Delete "${src.name || 'this tributary'}"?`, confirmButtonText: 'Delete' });
    if (!ok) return;
    try { 
  showLoading('Deleting tributary', 'Please wait…');
      await api(`/lake-flows/${src.id}`, { method: 'DELETE' }); 
      invalidateHttpCache('/lake-flows');
      await alertSuccess('Deleted', `"${src.name || 'Tributary'}" has been deleted successfully.`);
      fetchRows(); 
    } catch (e) { 
      await alertError('Delete failed', e.message || 'Failed to delete tributary'); 
    } finally {
      closeLoading();
    }
  };

  // View flow: show lake geometry and the flow point on a modal map
  const [viewOpen, setViewOpen] = useState(false);
  const [viewFeature, setViewFeature] = useState(null);
  const [viewFlowPoint, setViewFlowPoint] = useState(null);
  const viewMapRef = useRef(null);

  const viewFlow = useCallback(async (row) => {
    const src = row?._raw ?? row;
    if (!src) return;
    setViewFeature(null); setViewFlowPoint(null);
    try {
      // fetch lake detail to get geometry
      const lakeId = src.lake_id ?? src._raw?.lake_id ?? src.lake_id;
      const lakeResp = await api(`/lakes/${lakeId}`);
      const geom = lakeResp?.geom_geojson ? (typeof lakeResp.geom_geojson === 'string' ? JSON.parse(lakeResp.geom_geojson) : lakeResp.geom_geojson) : null;
      if (geom) {
        const feature = { type: 'Feature', properties: { id: lakeResp.id, name: lakeResp.name || '' }, geometry: geom };
        setViewFeature(feature);
      }
    } catch (e) {
      // ignore geometry errors; we'll still show point
    }
    // point
    const lat = src.latitude ?? src.lat ?? (src._raw && (src._raw.latitude ?? src._raw.lat));
    const lon = src.longitude ?? src.lon ?? (src._raw && (src._raw.longitude ?? src._raw.lon));
    if (lat && lon) setViewFlowPoint({ lat: Number(lat), lon: Number(lon), ...src });
    setViewOpen(true);
  }, []);

  const submit = async (payload) => {
    // Validate required fields
    const missing = [];
    if (!payload.lake_id) missing.push('Lake selection');
    if (!payload.flow_type) missing.push('Type');
    if (!payload.name?.trim()) missing.push('Name');
    if (!payload.source?.trim()) missing.push('Source');
    if (payload.lat == null || payload.lon == null) missing.push('Latitude/Longitude');

    if (missing.length > 0) {
      await alertError('Required Fields Missing', `Please fill in the following required fields: ${missing.join(', ')}`);
      return;
    }

    // Find lake name for success message
    const selectedLake = lakes.find(l => String(l.id) === String(payload.lake_id));
    const lakeName = selectedLake?.name || `Lake ${payload.lake_id}`;

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
  showLoading(formMode === 'create' ? 'Creating tributary' : 'Saving tributary', 'Please wait…');
      await api(path, { method, body });
      await alertSuccess('Success', formMode === 'create' ? `Tributary "${payload.name}" created successfully in ${lakeName}!` : 'Tributary updated successfully!');
    } catch (e) {
      await alertError('Save failed', e.message || 'Failed to save tributary');
      return;
    } finally { closeLoading(); }
    setFormOpen(false); invalidateHttpCache('/lake-flows'); fetchRows();
  };

  const columns = useMemo(()=>[
    { id:'lake', header:'Lake', accessor:'lake', width:200 },
    { id:'flow_type', header:'Type', accessor:'flow_type', width:110, render:(r)=> {
      const t = r.flow_type === 'inflow' ? 'Inlet' : (r.flow_type === 'outflow' ? 'Outlet' : r.flow_type);
      return <span>{t}</span>;
    } },
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
    { label:'View', title:'View', icon:<FiEye />, onClick: (row) => viewFlow(row), type:'view' },
    { label:'Edit', title:'Edit', icon:<FiEdit2 />, onClick: openEdit, type:'edit' },
    { label:'Delete', title:'Delete', icon:<FiTrash2 />, onClick: openDelete, type:'delete' },
  ], [openEdit]);

  return (
    <div className="dashboard-card">
      <TableToolbar
        tableId={TABLE_ID}
        search={{ value: query, onChange: setQuery, placeholder: 'Search tributaries by lake, name, or source...' }}
        filters={[{
          id:'flow_type', label:'Type', type:'select', value:typeFilter, onChange:setTypeFilter, options:[
            { value:'', label:'All Types' },
            { value:'inflow', label:'Inlets' },
            { value:'outflow', label:'Outlets' },
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
              loadingLabel={loading ? 'Loading tributaries…' : null}
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
      <Modal open={viewOpen} onClose={()=>setViewOpen(false)} title="View Flow Point" width={900} ariaLabel="View Flow">
        <div style={{ height: 480, borderRadius: 8, overflow: 'hidden' }}>
          <AppMap view="osm" whenCreated={(m)=>{ viewMapRef.current = m; }}>
            {viewFeature && (
              <GeoJSON data={viewFeature} style={{ color:'#2563eb', weight:2, fillOpacity:0.08 }} />
            )}
            {viewFlowPoint && (
              <CircleMarker center={[viewFlowPoint.lat, viewFlowPoint.lon]} radius={8} pathOptions={{ color:'#ef4444', fillColor:'#ef4444', fillOpacity:0.9 }}>
                {/* Popup handled by map's default behavior */}
              </CircleMarker>
            )}
            {/* If geometry exists, fit bounds after creation */}
            {viewFeature && <MapViewport bounds={L.geoJSON(viewFeature).getBounds()} maxZoom={14} />}
            {!viewFeature && viewFlowPoint && <MapViewport bounds={[[viewFlowPoint.lat-0.02, viewFlowPoint.lon-0.02],[viewFlowPoint.lat+0.02, viewFlowPoint.lon+0.02]]} maxZoom={14} />}
          </AppMap>
        </div>
      </Modal>
    </div>
  );
}
