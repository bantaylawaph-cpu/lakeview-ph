import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiLayers, FiLoader, FiEye, FiTrash2, FiEdit2,
} from "react-icons/fi";

import Modal from "../Modal";
import { confirm, alertError, alertSuccess, alertWarning } from "../../lib/alerts";
import {
  fetchLayersForBody,
  toggleLayerVisibility,
  deleteLayer,
  fetchBodyName,
  updateLayer,
  fetchLakeOptions,
  fetchWatershedOptions,
  computeNextVisibility,
} from "../../lib/layers";
import AppMap from "../../components/AppMap";
import MapViewport from "../../components/MapViewport";
import { GeoJSON } from "react-leaflet";
import L from "leaflet";

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
  initialBodyType = "lake",
  initialBodyId = "",
  allowActivate = true,
  allowToggleVisibility = true,
  allowDelete = true,
  showPreview = false,
  onPreview,
  visibilityOptions = DEFAULT_VISIBILITY_OPTIONS,
  currentUserRole = null,
}) {
  const [bodyType, setBodyType] = useState(initialBodyType);
  const [bodyId, setBodyId] = useState(initialBodyId);
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [bodyName, setBodyName] = useState("");
  const [lakeOptions, setLakeOptions] = useState([]);
  const [watershedOptions, setWatershedOptions] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", category: "", notes: "", visibility: "public" });
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

  const [previewLayer, setPreviewLayer] = useState(null);
  
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
    if (!bodyType || !bodyId) {
      setLayers([]);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const rows = await fetchLayersForBody(bodyType, bodyId);
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
  }, [bodyType, bodyId]);

  useEffect(() => {
    (async () => {
      const n = await fetchBodyName(bodyType, bodyId);
      setBodyName(n || "");
    })();
  }, [bodyType, bodyId]);

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

  // Load lake options (names only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (bodyType !== "lake") return;
      try {
        const rows = await fetchLakeOptions("");
        if (!cancelled) setLakeOptions(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setLakeOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [bodyType]);

  // Load watershed options (names only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (bodyType !== "watershed") return;
      try {
        const rows = await fetchWatershedOptions("");
        if (!cancelled) setWatershedOptions(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setWatershedOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [bodyType]);

  const doToggleVisibility = async (row) => {
    if (allowedVisibilityValues.length < 2) return; // read-only context
    if (currentUserRole && !['superadmin','org_admin'].includes(currentUserRole)) return; // guard
    try {
      await toggleLayerVisibility(row, allowedVisibilityValues);
      await refresh();
    } catch (e) {
      console.error('[LayerList] Toggle visibility failed', e);
      await alertError('Failed to toggle visibility', e?.message || '');
    }
  };

  const doDelete = async (target) => {
    if (!['superadmin','org_admin'].includes(currentUserRole)) return; // reflect backend permissions
    const id = target && typeof target === 'object' ? target.id : target;
    const name = target && typeof target === 'object' ? target.name : null;
    if (!(await confirm({ title: 'Delete this layer?', text: 'This cannot be undone.', confirmButtonText: 'Delete' }))) return;
    try {
      await deleteLayer(id);
      await refresh();
      await alertSuccess('Deleted', name ? `"${name}" was deleted.` : 'Layer deleted.');
    } catch (e) {
      console.error('[LayerList] Delete failed', e);
      await alertError('Failed to delete layer', e?.message || '');
    }
  };

  const doToggleDefault = async (row) => {
    try {
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
    }
  };

  return (
    <>
      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiLayers />
            <span>Layers for {bodyName || (bodyId ? "..." : "-")}</span>
          </div>
          <div className="org-actions-right">
            <button
              className="pill-btn ghost"
              onClick={refresh}
              title="Refresh"
              aria-label="Refresh"
            >
              {loading ? <FiLoader className="spin" /> : "Refresh"}
            </button>
          </div>
        </div>

        {/* Body selector row */}
        <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
          <div className="org-form" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label>Body Type</label>
              <select
                value={bodyType}
                onChange={(e) => {
                  setBodyType(e.target.value);
                  setBodyId("");
                }}
              >
                <option value="lake">Lake</option>
                <option value="watershed">Watershed</option>
              </select>
            </div>

            {bodyType === "lake" ? (
              <div className="form-group" style={{ minWidth: 260 }}>
                <label>Select Lake</label>
                <select
                  value={bodyId}
                  onChange={(e) => setBodyId(e.target.value)}
                  required
                >
                  <option value="" disabled>Choose a lake</option>
                  {lakeOptions.map((o) => (
                    <option key={`lake-${o.id}`} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group" style={{ minWidth: 260 }}>
                <label>Select Watershed</label>
                <select
                  value={bodyId}
                  onChange={(e) => setBodyId(e.target.value)}
                  required
                >
                  <option value="" disabled>Choose a watershed</option>
                  {watershedOptions.map((o) => (
                    <option key={`ws-${o.id}`} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Inline preview map (optional) */}
          {previewGeometry && (
            <div style={{ height: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 12 }}>
              <AppMap view="osm">
                <GeoJSON
                  key={`preview-${previewLayer?.id ?? 'layer'}-${previewLayer?._previewToken ?? previewLayer?.geom_geojson?.length ?? 0}`}
                  data={previewGeometry}
                  style={{ weight: 2, fillOpacity: 0.1, color: (previewLayer?.body_type === 'watershed' ? '#16a34a' : '#2563eb') }}
                />

                {mapViewport.bounds ? (
                  <MapViewport
                    bounds={mapViewport.bounds}
                    maxZoom={mapViewport.maxZoom}
                    padding={mapViewport.padding}
                    pad={mapViewport.pad}
                    version={mapViewport.token}
                  />
                ) : null}
              </AppMap>
            </div>
          )}

          {err && (
            <div className="alert-note" style={{ marginBottom: 8 }}>
              {err}
            </div>
          )}

          {!layers.length ? (
            <div className="no-data">
              {bodyId ? "No layers found for this body." : "Select a lake or watershed to view layers."}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="lv-table">
                <thead>
                  <tr>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Name</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Category</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Visibility</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Default Layer</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Created by</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Area (km2)</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Updated</span></div></th>
                    <th className="lv-th lv-th-actions sticky-right"><div className="lv-th-inner"><span className="lv-th-label">Actions</span></div></th>
                  </tr>
                </thead>
                <tbody>
                  {layers.map((row) => {
                    const nextVisibility = computeNextVisibility(row.visibility, allowedVisibilityValues);
                    const canToggleVisibility = allowToggleVisibility && allowedVisibilityValues.length >= 2 && nextVisibility !== row.visibility;
                    const initialEditVisibility = (() => {
                      const current = ['organization', 'organization_admin'].includes(row.visibility) ? 'admin' : row.visibility;
                      if (allowedVisibilityValues.includes(current)) return current;
                      return normalizedVisibilityOptions[0]?.value || 'public';
                    })();

                    return (
                      <tr key={row.id}>
                        <td className="lv-td">{row.name}</td>
                        <td className="lv-td">{row.category || '-'}</td>
                        <td className="lv-td">{getVisibilityLabel(row.visibility)}</td>
                        <td className="lv-td">{row.is_active ? 'Yes' : 'No'}</td>
                        <td className="lv-td">{formatCreator(row)}</td>
                        <td className="lv-td">{row.area_km2 ?? '-'}</td>
                        <td className="lv-td">{row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}</td>
                        <td className="lv-td sticky-right lv-td-actions">
                          <div className="lv-actions-inline">
                            <button
                              className="icon-btn simple"
                              title="View on map"
                              aria-label="View"
                              onClick={() => handlePreviewClick(row)}
                            >
                              <FiEye />
                            </button>

                            {(['superadmin','org_admin'].includes(currentUserRole)) && (
                              <button
                                className="icon-btn simple"
                                title="Edit metadata"
                                aria-label="Edit"
                                onClick={() => {
                                  setEditRow(row);
                                  setEditForm({
                                    name: row.name || '',
                                    category: row.category || '',
                                    notes: row.notes || '',
                                    visibility: initialEditVisibility,
                                    is_active: !!row.is_active,
                                  });
                                  setEditOpen(true);
                                }}
                              >
                                <FiEdit2 />
                              </button>
                            )}


                            {allowDelete && ['superadmin','org_admin'].includes(currentUserRole) && (
                              <button
                                className="icon-btn simple danger"
                                title="Delete"
                                aria-label="Delete"
                                onClick={() => doDelete(row.id)}
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>
          )}
        </div>

        <style>{`
          .spin { animation: spin 1.2s linear infinite; }
          @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        `}</style>
      </div>

      {editOpen && (['superadmin','org_admin'].includes(currentUserRole)) && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Layer Metadata"
          width={640}
          ariaLabel="Edit Layer"
          footer={
            <div className="lv-modal-actions">
              <button className="pill-btn ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button
                className="pill-btn primary"
                onClick={async () => {
                  try {
                    // If user is trying to enable default, ensure no other layer is default
                    if (editForm.is_active) {
                      const existing = layers.find((l) => l.is_active && l.id !== editRow.id);
                      if (existing) {
                        await alertWarning('Default Layer Exists', `"${existing.name}" is already set as the default layer.\n\nPlease unset it first or turn off default for this layer.`);
                        return;
                      }
                    }

                    // Only superadmin may change visibility or default flag per backend; org_admin limited to name/category/notes.
                    const patch = {
                      name: editForm.name,
                      category: editForm.category || null,
                      notes: editForm.notes || null,
                    };
                    if (currentUserRole === 'superadmin') {
                      patch.visibility = editForm.visibility;
                      patch.is_active = !!editForm.is_active;
                    }
                    // Apply patch (visibility & is_active included only for superadmin)
                    await updateLayer(editRow.id, patch);

                    setEditOpen(false);
                    await refresh();
                    await alertSuccess('Layer updated', 'Changes saved successfully.');
                  } catch (e) {
                    console.error('[LayerList] Update layer failed', e);
                    await alertError('Failed to update layer', e?.message || '');
                  }
                }}
              >
                Save Changes
              </button>
            </div>
          }
        >
          <div className="org-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g., Hydrology"
              />
            </div>
            <div className="form-group" style={{ flexBasis: '100%' }}>
              <label>Notes</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Short description / source credits"
              />
            </div>
            {currentUserRole === 'superadmin' && (
              <>
                <div className="form-group">
                  <label>Visibility</label>
                  <select
                    value={editForm.visibility}
                    onChange={(e) => setEditForm((f) => ({ ...f, visibility: e.target.value }))}
                  >
                    {[...normalizedVisibilityOptions,
                      ...(editRow && editRow.visibility && !normalizedVisibilityOptions.some((opt) => opt.value === editRow.visibility)
                        ? [{ value: editRow.visibility, label: getVisibilityLabel(editRow.visibility) }]
                        : []
                      )].map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Default Layer</label>
                  <div>
                    <button
                      type="button"
                      className={`pill-btn ${editForm.is_active ? 'primary' : 'ghost'}`}
                      onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
                    >
                      {editForm.is_active ? 'Default Enabled' : 'Set as Default'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export default LayerList;

