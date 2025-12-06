import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiLayers, FiEye, FiTrash2, FiEdit2 } from "react-icons/fi";

import { confirm, alertError, alertSuccess, showLoading, closeLoading } from "../../lib/alerts";
import { fetchLayersPaged, deleteLayer, updateLayer } from "../../lib/layers";
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function LayerList({
  allowDelete = true,
  visibilityOptions = DEFAULT_VISIBILITY_OPTIONS,
  currentUserRole = null,
  initialSearch = "",
}) {
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [pagination, setPagination] = useState({ page: 1, perPage: 5, total: 0, lastPage: 1 });
  const [resetSignal, setResetSignal] = useState(0);
  const [search, setSearch] = useState(() => {
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

  // Column visibility management
  const defaultVisible = useMemo(() => ({ name: true, body: true, visibility: true, downloadable: true, creator: false, updated: false }), []);
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

  const formatCreator = (row) => {
    // Prefer the uploader's user name; avoid falling back to organization labels like "LakeView".
    if (row?.uploaded_by_name) return row.uploaded_by_name;
    return 'System Administrator';
  };

  const [previewLayer, setPreviewLayer] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreviewClick = async (row) => {
    if (!row) return;
    // quick loading before opening preview
    try { closeLoading(); } catch { }
    try { showLoading('Loading', 'Preparing preview…'); } catch { }

    // Try to parse geometry and update viewport immediately (like MapPage.applyOverlayByLayerId)
    if (row?.geom_geojson) {
      try {
        const geometry = JSON.parse(row.geom_geojson);
        setPreviewGeometry(geometry);
        try {
          const gj = L.geoJSON(geometry);
          const b = gj.getBounds();
          if (b && b.isValid && b.isValid()) {
            updateViewport(b, { maxZoom: row?.body_type === 'watershed' ? 12 : 13 });
          }
        } catch (err) {
          console.warn('[LayerList] Could not compute bounds for preview', err);
        }
      } catch (err) {
        console.warn('[LayerList] Failed to parse preview geometry', err);
        setPreviewGeometry(null);
      }
    } else {
      setPreviewGeometry(null);
    }

    // Attach a token so React remounts the GeoJSON even if the same id is clicked
    setPreviewLayer({ ...row, _previewToken: Date.now() });
    try { await sleep(150); } catch { }
    closeLoading();
    setPreviewOpen(true);
  };

  const [previewGeometry, setPreviewGeometry] = useState(null);

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

  const refresh = async (pageOverride = null) => {
    setLoading(true);
    setErr("");
    try {
      // Include geom,bounds for preview support per page
      const { rows, page, perPage, total, lastPage } = await fetchLayersPaged({
        page: pageOverride ?? pagination.page,
        perPage: pagination.perPage,
        includeGeom: true,
        includeBounds: true,
        bodyType: fBodyType || undefined,
        visibility: fVisibility || undefined,
        downloadable: fDownloadableOnly || undefined,
        q: search || undefined,
        sortBy: 'created_at',
        sortDir: 'desc',
      });
      setLayers(Array.isArray(rows) ? rows : []);
      setPagination({ page, perPage, total, lastPage });
    } catch (e) {
      console.error('[LayerList] Failed to fetch layers', e);
      setErr(e?.message || "Failed to fetch layers");
      setLayers([]);
      setPagination((p) => ({ ...p, lastPage: 1, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let did = false;
    if (!did) refresh();
    return () => { did = true; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refresh(1), 250);
    return () => clearTimeout(t);
  }, [search, fBodyType, fVisibility, fDownloadableOnly]);

  useEffect(() => {
    if (!previewLayer?.geom_geojson) {
      setPreviewGeometry(null);
      resetViewport();
      return;
    }

    let geometry = null;
    try {
      geometry = JSON.parse(previewLayer.geom_geojson);
    } catch (err) {
      console.error('[LayerList] Failed to parse preview geometry', err);
      setPreviewGeometry(null);
      return;
    }

    setPreviewGeometry(geometry);

    try {
      const layer = L.geoJSON(geometry);
      const bounds = layer.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        updateViewport(bounds, { maxZoom: previewLayer?.body_type === "watershed" ? 12 : 13 });
      } else {
        resetViewport();
      }
    } catch (err) {
      console.error('[LayerList] Failed to compute preview bounds', err);
      resetViewport();
    }
  }, [previewLayer, updateViewport, resetViewport]);

  const doDelete = async (target) => {
    if (currentUserRole !== 'superadmin') return; // reflect backend permissions
    const id = target && typeof target === 'object' ? target.id : target;
    const name = target && typeof target === 'object' ? target.name : null;
    try { closeLoading(); } catch { }
    try { showLoading('Loading', 'Preparing delete…'); } catch { }
    try { await sleep(150); } catch { }
    closeLoading();
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

  const filtersBadgeCount = (fBodyType ? 1 : 0) + (fVisibility ? 1 : 0) + (fDownloadableOnly ? 1 : 0);

  const columns = useMemo(() => {
    const arr = [];
    if (visibleMap.name) arr.push({ id: 'name', header: 'Name', accessor: 'name' });
    if (visibleMap.body) arr.push({ id: 'body', header: 'Body', render: (r) => (r.body_type === 'watershed' ? 'Watershed' : 'Lake'), sortValue: (r) => (r.body_type || '') });
    if (visibleMap.visibility) arr.push({ id: 'visibility', header: 'Visibility', render: (r) => getVisibilityLabel(r.visibility), sortValue: (r) => r.visibility });
    if (visibleMap.downloadable) arr.push({ id: 'downloadable', header: 'Downloadable', render: (r) => (r.is_downloadable ? 'Yes' : 'No'), sortValue: (r) => (r.is_downloadable ? 1 : 0), width: 120 });
    if (visibleMap.creator) arr.push({ id: 'creator', header: 'Created by', render: (r) => formatCreator(r) });
    if (visibleMap.updated) arr.push({ id: 'updated', header: 'Updated', render: (r) => (r.updated_at ? new Date(r.updated_at).toLocaleString() : '-'), sortValue: (r) => (r.updated_at || ''), width: 200 });
    return arr;
  }, [visibleMap]);

  const actions = useMemo(() => [
    {
      label: 'View', title: 'View on map', icon: <FiEye />, onClick: (row) => handlePreviewClick(row),
    },
    {
      label: 'Edit', title: 'Edit metadata', icon: <FiEdit2 />, onClick: async (row) => {
        try { closeLoading(); } catch { }
        try { showLoading('Loading', 'Preparing edit form…'); } catch { }
        try { await sleep(150); } catch { }
        closeLoading();
        setEditRow(row);
        setEditOpen(true);
      }, visible: () => currentUserRole === 'superadmin'
    },
    {
      label: 'Delete', title: 'Delete', icon: <FiTrash2 />, type: 'delete', onClick: (row) => doDelete(row.id), visible: () => allowDelete && currentUserRole === 'superadmin'
    }
  ], [currentUserRole, allowDelete]);

  const columnPickerAdapter = {
    columns: [
      { id: 'name', header: 'Name' },
      { id: 'body', header: 'Body' },
      { id: 'visibility', header: 'Visibility' },
      { id: 'downloadable', header: 'Downloadable' },
      { id: 'creator', header: 'Created by' },
      { id: 'updated', header: 'Updated' },
    ], visibleMap, onVisibleChange: (m) => setVisibleMap(m)
  };

  const toolbarTop = (
    <TableToolbar
      tableId="layers-table"
      search={{ value: search, onChange: setSearch, placeholder: 'Search layers…' }}
      onResetWidths={() => {
        setResetSignal((v) => v + 1);
        setSearch("");
        setFBodyType("");
        setFVisibility("");
        setFDownloadableOnly("");
        setPagination((p) => ({ ...p, page: 1 }));
        refresh(1);
      }}
      onRefresh={refresh}
      onToggleFilters={() => setFiltersOpen((v) => !v)}
      filtersBadgeCount={filtersBadgeCount}
      columnPicker={columnPickerAdapter}
    />
  );

  const filterFields = [
    {
      id: 'body_type', label: 'Body Type', type: 'select', value: fBodyType, onChange: setFBodyType, options: [
        { value: '', label: 'All' },
        { value: 'lake', label: 'Lake' },
        { value: 'watershed', label: 'Watershed' },
      ]
    },
    {
      id: 'visibility', label: 'Visibility', type: 'select', value: fVisibility, onChange: setFVisibility, options: [
        { value: '', label: 'All' },
        ...normalizedVisibilityOptions
      ]
    },
    {
      id: 'downloadable', label: 'Downloadable', type: 'select', value: fDownloadableOnly, onChange: setFDownloadableOnly, options: [
        { value: '', label: 'All' },
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ]
    },
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
            data={layers}
            actions={actions}
            resetSignal={resetSignal}
            columnPicker={false}
            loading={loading}
            loadingLabel={loading ? 'Loading layers…' : null}
            serverSide={true}
            pagination={{ page: pagination.page, totalPages: pagination.lastPage || 1 }}
            onPageChange={(newPage) => {
              setPagination((p) => ({ ...p, page: newPage }));
              refresh(newPage);
            }}
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