import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiLayers, FiLoader, FiEye, FiTrash2, FiEdit2 } from "react-icons/fi";

import Modal from "../Modal";
import { confirm, alertError, alertSuccess, alertWarning, showLoading, closeLoading } from "../../lib/alerts";
import { fetchAllLayers, toggleLayerVisibility, deleteLayer, updateLayer, computeNextVisibility } from "../../lib/layers";
import TableLayout from "../../layouts/TableLayout";
import TableToolbar from "../table/TableToolbar";
import FilterPanel from "../table/FilterPanel";
import LayerPreviewModal from "./LayerPreviewModal";
import LayerEditModal from "./LayerEditModal";

const VISIBILITY_LABELS = {
  public: "Public",
  admin: "Admin",
  organization: "Admin (legacy)",
  organization_admin: "Admin (legacy)",
};

const DEFAULT_VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "admin", label: "Admin" },
];

const getVisibilityLabel = (value) => VISIBILITY_LABELS[value] || value || "Unknown";

function LayerList({
  allowActivate = true,
  allowToggleVisibility = true,
  allowDelete = true,
  visibilityOptions = DEFAULT_VISIBILITY_OPTIONS,
  currentUserRole = null,
  initialSearch = "",
}) {
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [search, setSearch] = useState(() => {
    // Prefer prop; fallback to URL query ?search=
    if (initialSearch) return initialSearch;
    try {
      const usp = new URLSearchParams(window.location.search);
      return usp.get("search") || usp.get("q") || "";
    } catch {
      return "";
    }
  });

  // Filters (advanced panel)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fBodyType, setFBodyType] = useState(""); // '', 'lake', 'watershed'
  const [fVisibility, setFVisibility] = useState(""); // '', 'public','admin'
  const [fDownloadableOnly, setFDownloadableOnly] = useState(""); // '', 'yes', 'no'
  const [fDefaultOnly, setFDefaultOnly] = useState(""); // '', 'yes', 'no'
  const [fCreatedBy, setFCreatedBy] = useState(""); // '' or specific creator

  // Column visibility management
  const defaultVisible = useMemo(() => ({ name: true, body: true, visibility: true, downloadable: true, default: true, creator: true, area: false, updated: false }), []);
  const [visibleMap, setVisibleMap] = useState(defaultVisible);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const normalizedVisibilityOptions = useMemo(() => {
    const base = Array.isArray(visibilityOptions) && visibilityOptions.length
      ? visibilityOptions
      : DEFAULT_VISIBILITY_OPTIONS;
    const mapped = base.map((opt) => (typeof opt === 'string'
      ? { value: opt, label: getVisibilityLabel(opt) }
      : { value: opt.value, label: opt.label ?? getVisibilityLabel(opt.value) }
    )).filter((opt) => opt && opt.value);
    return mapped.length ? mapped : DEFAULT_VISIBILITY_OPTIONS;
  }, [visibilityOptions]);

  // Role-based allowed cycles:
  // superadmin: whatever provided (both public/admin)
  // org_admin: can see both public & admin but cannot toggle if not uploader's tenant? (API already filters list server-side)
  // contributors/public: should not be able to toggle at UI level
  const allowedVisibilityValues = useMemo(() => {
    const base = normalizedVisibilityOptions.map((opt) => opt.value);
    if (!currentUserRole) return base;
    if (currentUserRole === 'superadmin') return base;
    if (currentUserRole === 'org_admin') return base; // server restricts rows to tenant uploads
    // read-only roles
    return [base[0]]; // only show first (likely 'public') so toggle disabled
  }, [normalizedVisibilityOptions, currentUserRole]);

  const formatCreator = (row) => {
    if (row?.uploaded_by_org) return row.uploaded_by_org;
    return 'System Administrator';
  };

  const uniqueCreators = useMemo(() => {
    const creators = new Set();
    layers.forEach(row => {
      const creator = formatCreator(row);
      creators.add(creator);
    });
    return Array.from(creators).sort();
  }, [layers]);

  const [previewLayer, setPreviewLayer] = useState(null);
  const viewMapRef = React.useRef(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const handlePreviewClick = (row) => {
    if (!row) return;

    // Try to parse geometry and update viewport immediately (like MapPage.applyOverlayByLayerId)
    if (row?.geom_geojson) {
      try {
        const geometry = JSON.parse(row.geom_geojson);
        setPreviewGeometry(geometry);
        try {
          const gj = L.geoJSON(geometry);
          const b = gj.getBounds();
          if (b && b.isValid && b.isValid()) {
            setPreviewBounds(b);
            updateViewport(b, { maxZoom: row?.body_type === 'watershed' ? 12 : 13 });
          } else {
            setPreviewBounds(null);
          }
        } catch (err) {
          console.warn('[LayerList] Could not compute bounds for preview', err);
          setPreviewBounds(null);
        }
      } catch (err) {
        console.warn('[LayerList] Failed to parse preview geometry', err);
        setPreviewGeometry(null);
        setPreviewBounds(null);
      }
    } else {
      setPreviewGeometry(null);
      setPreviewBounds(null);
    }

    // Attach a token so React remounts the GeoJSON even if the same id is clicked
    setPreviewLayer({ ...row, _previewToken: Date.now() });
    setPreviewOpen(true);
  };

  const [previewGeometry, setPreviewGeometry] = useState(null);
  const [previewBounds, setPreviewBounds] = useState(null);

  const [mapViewport, setMapViewport] = useState({
    bounds: null,
    maxZoom: 13,
    padding: [24, 24],
    pad: 0.02,
    token: 0,
  });

  const updateViewport = useCallback((nextBounds, options = {}) => {
    if (!nextBounds?.isValid?.()) return;
    const clone = nextBounds.clone ? nextBounds.clone() : L.latLngBounds(nextBounds);
    setMapViewport({
      bounds: clone,
      maxZoom: options.maxZoom ?? 13,
      padding: options.padding ?? [24, 24],
      pad: options.pad ?? 0.02,
      token: Date.now(),
    });
  }, []);

  const resetViewport = useCallback(() => {
    setMapViewport((prev) => ({ ...prev, bounds: null, token: Date.now() }));
  }, []);

  const refresh = async () => {
    setLoading(true);
    setErr("");
    try {
      // Include geom,bounds for preview support
      const rows = await fetchAllLayers({ includeGeom: true, includeBounds: true });
      setLayers(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error('[LayerList] Failed to fetch layers', e);
      setErr(e?.message || "Failed to fetch layers");
      setLayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!previewLayer?.geom_geojson) {
      setPreviewGeometry(null);
      setPreviewBounds(null);
      resetViewport();
      return;
    }

    let geometry = null;
    try {
      geometry = JSON.parse(previewLayer.geom_geojson);
    } catch (err) {
      console.error('[LayerList] Failed to parse preview geometry', err);
      setPreviewGeometry(null);
      setPreviewBounds(null);
      return;
    }

    setPreviewGeometry(geometry);

    try {
      const layer = L.geoJSON(geometry);
      const bounds = layer.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        setPreviewBounds(bounds);
        updateViewport(bounds, { maxZoom: previewLayer?.body_type === "watershed" ? 12 : 13 });
      } else {
        setPreviewBounds(null);
        resetViewport();
      }
    } catch (err) {
      console.error('[LayerList] Failed to compute preview bounds', err);
      setPreviewBounds(null);
      resetViewport();
    }
  }, [previewLayer, updateViewport, resetViewport]);

  // No body options needed; table shows all layers by default

  const doToggleVisibility = async (row) => {
    if (allowedVisibilityValues.length < 2) return; // read-only context
    if (currentUserRole && !['superadmin','org_admin'].includes(currentUserRole)) return; // guard
    try {
  showLoading('Updating visibility', 'Please wait…');
      await toggleLayerVisibility(row, allowedVisibilityValues);
      await refresh();
    } catch (e) {
      console.error('[LayerList] Toggle visibility failed', e);
      await alertError('Failed to toggle visibility', e?.message || '');
    } finally {
      closeLoading();
    }
  };

  const doDelete = async (target) => {
    if (!['superadmin','org_admin'].includes(currentUserRole)) return; // reflect backend permissions
    const id = target && typeof target === 'object' ? target.id : target;
    const name = target && typeof target === 'object' ? target.name : null;
    if (!(await confirm({ title: 'Delete this layer?', text: 'This cannot be undone.', confirmButtonText: 'Delete' }))) return;
    try {
  showLoading('Deleting layer', 'Please wait…');
      await deleteLayer(id);
      await refresh();
      await alertSuccess('Deleted', name ? `"${name}" was deleted.` : 'Layer deleted.');
    } catch (e) {
      console.error('[LayerList] Delete failed', e);
      await alertError('Failed to delete layer', e?.message || '');
    } finally {
      closeLoading();
    }
  };

  const doToggleDefault = async (row) => {
    try {
  showLoading(row.is_active ? 'Updating layer' : 'Setting as default', 'Please wait…');
      if (row.is_active) {
        // Turn OFF current default
        await updateLayer(row.id, { is_active: false });
        await refresh();
        return;
      }
      // Trying to turn ON -> block if another layer is already default
      const existing = layers.find((l) => l.is_active && l.id !== row.id);
      if (existing) {
        await alertWarning('Default Layer Exists', `"${existing.name}" is already set as the default layer.\n\nPlease turn it OFF first, then set "${row.name}" as the default.`);
        return;
      }
      await updateLayer(row.id, { is_active: true });
      await refresh();
      } catch (e) {
      console.error('[LayerList] Toggle default failed', e);
      await alertError('Failed to toggle default', e?.message || '');
    } finally {
      closeLoading();
    }
  };

  // Derived filtered rows
  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase();
    return (layers || []).filter((row) => {
      if (fBodyType && String(row.body_type) !== fBodyType) return false;
      if (fVisibility && String(row.visibility) !== fVisibility) return false;
      if (fDownloadableOnly === 'yes' && !row.is_downloadable) return false;
      if (fDownloadableOnly === 'no' && row.is_downloadable) return false;
      if (fDefaultOnly === 'yes' && !row.is_active) return false;
      if (fDefaultOnly === 'no' && row.is_active) return false;
      if (fCreatedBy && formatCreator(row) !== fCreatedBy) return false;
      if (q) {
        const hay = [row.name, row.notes, row.uploaded_by_org, row.body_type, row.visibility].map((v) => (v || "").toString().toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [layers, search, fBodyType, fVisibility, fDownloadableOnly, fDefaultOnly, fCreatedBy]);

  const filtersBadgeCount = (fBodyType ? 1 : 0) + (fVisibility ? 1 : 0) + (fDownloadableOnly ? 1 : 0) + (fDefaultOnly ? 1 : 0) + (fCreatedBy ? 1 : 0);

  const columns = useMemo(() => {
    const arr = [];
    if (visibleMap.name) arr.push({ id: 'name', header: 'Name', accessor: 'name' });
    if (visibleMap.body) arr.push({ id: 'body', header: 'Body', render: (r) => (r.body_type === 'watershed' ? 'Watershed' : 'Lake'), sortValue: (r) => (r.body_type || '') });
    if (visibleMap.visibility) arr.push({ id: 'visibility', header: 'Visibility', render: (r) => getVisibilityLabel(r.visibility), sortValue: (r) => r.visibility });
    if (visibleMap.downloadable) arr.push({ id: 'downloadable', header: 'Downloadable', render: (r) => (r.is_downloadable ? 'Yes' : 'No'), sortValue: (r) => (r.is_downloadable ? 1 : 0), width: 120 });
    if (visibleMap.default) arr.push({ id: 'default', header: 'Default Layer', render: (r) => (r.is_active ? 'Yes' : 'No'), sortValue: (r) => (r.is_active ? 1 : 0), width: 120 });
    if (visibleMap.creator) arr.push({ id: 'creator', header: 'Created by', render: (r) => formatCreator(r) });
  if (visibleMap.area) arr.push({ id: 'area', header: 'Surface Area (km²)', render: (r) => (r.area_km2 ?? '-'), sortValue: (r) => (typeof r.area_km2 === 'number' ? r.area_km2 : -1), width: 120 });
    if (visibleMap.updated) arr.push({ id: 'updated', header: 'Updated', render: (r) => (r.updated_at ? new Date(r.updated_at).toLocaleString() : '-'), sortValue: (r) => (r.updated_at || ''), width: 200 });
    return arr;
  }, [visibleMap]);

  const actions = useMemo(() => [
    {
      label: 'View', title: 'View on map', icon: <FiEye />, onClick: (row) => handlePreviewClick(row),
    },
    {
      label: 'Edit', title: 'Edit metadata', icon: <FiEdit2 />, onClick: (row) => {
        const initialEditVisibility = (() => {
          const current = ['organization', 'organization_admin'].includes(row.visibility) ? 'admin' : row.visibility;
          if (allowedVisibilityValues.includes(current)) return current;
          return normalizedVisibilityOptions[0]?.value || 'public';
        })();
        setEditRow(row);
        setEditOpen(true);
      }, visible: () => ['superadmin','org_admin'].includes(currentUserRole)
    },
    {
      label: 'Delete', title: 'Delete', icon: <FiTrash2 />, type: 'delete', onClick: (row) => doDelete(row.id), visible: () => allowDelete && ['superadmin','org_admin'].includes(currentUserRole)
    }
  ], [allowedVisibilityValues, normalizedVisibilityOptions, currentUserRole, allowDelete]);

  const columnPickerAdapter = { columns: [
    { id: 'name', header: 'Name' },
    { id: 'body', header: 'Body' },
    { id: 'visibility', header: 'Visibility' },
    { id: 'downloadable', header: 'Downloadable' },
    { id: 'default', header: 'Default Layer' },
    { id: 'creator', header: 'Created by' },
  { id: 'area', header: 'Surface Area (km²)' },
    { id: 'updated', header: 'Updated' },
  ], visibleMap, onVisibleChange: (m) => setVisibleMap(m) };

  const toolbarTop = (
    <TableToolbar
      tableId="layers-table"
      search={{ value: search, onChange: setSearch, placeholder: 'Search layers…' }}
      onResetWidths={() => setResetSignal((v) => v + 1)}
      onRefresh={refresh}
      onToggleFilters={() => setFiltersOpen((v) => !v)}
      filtersBadgeCount={filtersBadgeCount}
      columnPicker={columnPickerAdapter}
    />
  );

  const filterFields = [
    { id: 'body_type', label: 'Body Type', type: 'select', value: fBodyType, onChange: setFBodyType, options: [
      { value: '', label: 'All' },
      { value: 'lake', label: 'Lake' },
      { value: 'watershed', label: 'Watershed' },
    ]},
    { id: 'visibility', label: 'Visibility', type: 'select', value: fVisibility, onChange: setFVisibility, options: [
      { value: '', label: 'All' },
      ...normalizedVisibilityOptions
    ]},
    { id: 'downloadable', label: 'Downloadable', type: 'select', value: fDownloadableOnly, onChange: setFDownloadableOnly, options: [
      { value: '', label: 'All' },
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ]},
    { id: 'default', label: 'Default Layer', type: 'select', value: fDefaultOnly, onChange: setFDefaultOnly, options: [
      { value: '', label: 'All' },
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ]},
    { id: 'created_by', label: 'Created by', type: 'select', value: fCreatedBy, onChange: setFCreatedBy, options: [
      { value: '', label: 'All' },
      ...uniqueCreators.map(c => ({ value: c, label: c }))
    ]},
  ];

  return (
    <>
      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiLayers />
            <span>Layers</span>
          </div>
        </div>

        <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
          {toolbarTop}
          <FilterPanel
            open={filtersOpen}
            fields={filterFields}
            onClearAll={() => {
              setFBodyType("");
              setFVisibility("");
              setFDownloadableOnly("");
              setFDefaultOnly("");
              setFCreatedBy("");
            }}
          />

          {err && (
            <div className="alert-note" style={{ marginBottom: 8 }}>
              {err}
            </div>
          )}

          <TableLayout
            tableId="layers-table"
            columns={columns}
            data={filtered}
            pageSize={15}
            actions={actions}
            resetSignal={resetSignal}
            columnPicker={false}
            loading={loading}
            loadingLabel={loading ? 'Loading layers…' : null}
          />

          {/* Preview modal */}
          <LayerPreviewModal
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            layer={previewLayer}
            geometry={previewGeometry}
            viewport={mapViewport}
            viewportVersion={mapViewport.token}
          />
        </div>

        <style>{`
          .spin { animation: spin 1.2s linear infinite; }
          @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        `}</style>
      </div>

      <LayerEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        layer={editRow}
        currentUserRole={currentUserRole}
        normalizedVisibilityOptions={normalizedVisibilityOptions}
        allLayers={layers}
        onSave={async (id, patch) => {
          try {
            showLoading('Saving layer', 'Please wait…');
            await updateLayer(id, patch);
            await refresh();
            await alertSuccess('Saved', 'Layer updated.');
          } catch (e) {
            console.error('[LayerList] Edit save failed', e);
            await alertError('Save failed', e?.message || 'Failed to save layer');
          } finally {
            closeLoading();
          }
        }}
      />
    </>
  );
}

export default LayerList;

