import React, { useEffect, useRef, useState } from "react";
import {
  FiLayers, FiLoader, FiEye, FiToggleRight, FiLock, FiUnlock, FiTrash2, FiEdit2,
} from "react-icons/fi";

// BodySelect removed from UI to unify with lake dropdown UX
import Modal from "../Modal";
import {
  fetchLayersForBody,
  activateLayer,
  toggleLayerVisibility,
  deleteLayer,
  fetchBodyName,
  updateLayer,
  fetchLakeOptions,
  fetchWatershedOptions,
} from "../../lib/layers";
import AppMap from "../../components/AppMap";
import { GeoJSON } from "react-leaflet";
import L from "leaflet";

function LayerList({
  initialBodyType = "lake",
  initialBodyId = "",
  allowActivate = true,
  allowToggleVisibility = true,
  allowDelete = true,
  showPreview = false,
  onPreview,
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
  const [previewLayer, setPreviewLayer] = useState(null);
  const previewMapRef = useRef(null);

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

  // Fit preview bounds when map or selection changes
  useEffect(() => {
    const map = previewMapRef.current;
    if (!map || !previewLayer) return;
    try {
      const gj = previewLayer.geom_geojson ? JSON.parse(previewLayer.geom_geojson) : null;
      if (!gj) return;
      const layer = L.geoJSON(gj);
      const b = layer.getBounds();
      if (b && b.isValid && b.isValid()) map.fitBounds(b.pad(0.1));
    } catch (_) {}
  }, [previewLayer]);

  const doActivate = async (id) => {
    try {
      await activateLayer(id);
      await refresh();
    } catch (e) {
      console.error('[LayerList] Activate layer failed', e);
      alert(e?.message || "Failed to activate layer");
    }
  };

  const doToggleVisibility = async (row) => {
    try {
      await toggleLayerVisibility(row);
      await refresh();
    } catch (e) {
      console.error('[LayerList] Toggle visibility failed', e);
      alert(e?.message || "Failed to toggle visibility");
    }
  };

  const doDelete = async (id) => {
    if (!confirm("Delete this layer? This cannot be undone.")) return;
    try {
      await deleteLayer(id);
      await refresh();
    } catch (e) {
      console.error('[LayerList] Delete failed', e);
      alert(e?.message || "Failed to delete layer");
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
          {previewLayer && previewLayer.geom_geojson && (
            <div style={{ height: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 12 }}>
              <AppMap view="osm" whenCreated={(m) => (previewMapRef.current = m)}>
                <GeoJSON
                  key={`gj-${previewLayer.id}`}
                  data={JSON.parse(previewLayer.geom_geojson)}
                  style={{ weight: 2, fillOpacity: 0.1 }}
                />
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
                  {layers.map((row) => (
                    <tr key={row.id}>
                      <td className="lv-td">{row.name}</td>
                      <td className="lv-td">{row.category || '-'}</td>
                      <td className="lv-td">{row.visibility === "public" ? "Public" : "Admin"}</td>
                      <td className="lv-td">{row.is_active ? "Yes" : "No"}</td>
                      <td className="lv-td">{row.uploaded_by_name || '-'}</td>
                      <td className="lv-td">{row.area_km2 ?? "-"}</td>
                      <td className="lv-td">{row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}</td>
                      <td className="lv-td sticky-right lv-td-actions">
                        <div className="lv-actions-inline">
                          <button
                            className="icon-btn simple"
                            title="View on map"
                            aria-label="View"
                            onClick={() => setPreviewLayer(row)}
                          >
                            <FiEye />
                          </button>

                          <button
                            className="icon-btn simple"
                            title="Edit metadata"
                            aria-label="Edit"
                            onClick={() => {
                              setEditRow(row);
                              setEditForm({
                                name: row.name || "",
                                category: row.category || "",
                                notes: row.notes || "",
                                visibility: row.visibility || "public",
                              });
                              setEditOpen(true);
                            }}
                          >
                            <FiEdit2 />
                          </button>

                          {allowActivate && !row.is_active && (
                            <button
                              className="icon-btn simple accent"
                              title="Set as Default"
                              aria-label="Make Active"
                              onClick={() => doActivate(row.id)}
                            >
                              <FiToggleRight />
                            </button>
                          )}
                          {allowActivate && row.is_active && (
                            <button className="icon-btn simple" title="Default" aria-label="Default" disabled>
                              <FiToggleRight />
                            </button>
                          )}

                          {allowToggleVisibility && (
                            <button
                              className="icon-btn simple"
                              title={row.visibility === "public" ? "Make Admin-only" : "Make Public"}
                              aria-label="Toggle Visibility"
                              onClick={() => doToggleVisibility(row)}
                            >
                              {row.visibility === "public" ? <FiLock /> : <FiUnlock />}
                            </button>
                          )}

                          {allowDelete && (
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
                  ))}
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

      {editOpen && (
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
                    await updateLayer(editRow.id, {
                      name: editForm.name,
                      category: editForm.category || null,
                      notes: editForm.notes || null,
                      visibility: editForm.visibility,
                    });
                    setEditOpen(false);
                    await refresh();
                  } catch (e) {
                    console.error('[LayerList] Update layer failed', e);
                    alert(e?.message || 'Failed to update layer');
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
            <div className="form-group">
              <label>Visibility</label>
              <select
                value={editForm.visibility}
                onChange={(e) => setEditForm((f) => ({ ...f, visibility: e.target.value }))}
              >
                <option value="public">Public</option>
                <option value="admin">Admin only</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default LayerList;
