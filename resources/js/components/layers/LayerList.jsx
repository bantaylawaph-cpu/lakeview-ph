// resources/js/components/layers/LayerList.jsx
import React, { useEffect, useState } from "react";
import {
  FiLayers, FiLoader, FiEye, FiToggleRight, FiLock, FiUnlock, FiTrash2,
} from "react-icons/fi";

import BodySelect from "./BodySelect";
import {
  fetchLayersForBody,
  activateLayer,
  toggleLayerVisibility,
  deleteLayer,
} from "../../lib/layers";

/**
 * LayerList
 * Props:
 * - initialBodyType?: 'lake' | 'watershed' (default 'lake')
 * - initialBodyId?: number|string
 * - allowActivate?: boolean (default true)
 * - allowToggleVisibility?: boolean (default true)
 * - allowDelete?: boolean (default true)
 * - showPreview?: boolean (default false) – show Preview button if onPreview provided
 * - onPreview?: (layer) => void
 */
export default function LayerList({
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

  const doActivate = async (id) => {
    try {
      await activateLayer(id);
      await refresh();
    } catch (e) {
      alert(e?.message || "Failed to activate layer");
    }
  };

  const doToggleVisibility = async (row) => {
    try {
      await toggleLayerVisibility(row);
      await refresh();
    } catch (e) {
      alert(e?.message || "Failed to toggle visibility");
    }
  };

  const doDelete = async (id) => {
    if (!confirm("Delete this layer? This cannot be undone.")) return;
    try {
      await deleteLayer(id);
      await refresh();
    } catch (e) {
      alert(e?.message || "Failed to delete layer");
    }
  };

  return (
    <div className="dashboard-card" style={{ marginTop: 16 }}>
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <FiLayers />
          <span>Layers for {bodyType} #{bodyId || "—"}</span>
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

          <BodySelect
            bodyType={bodyType}
            bodyId={bodyId}
            onChange={setBodyId}
            searchable
            allowManualId
            required
            className="bodyselect"
          />
        </div>

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
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Visibility</th>
                  <th>Status</th>
                  <th>Active</th>
                  <th>Area (km²)</th>
                  <th>Updated</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {layers.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.visibility === "public" ? "Public" : "Admin"}</td>
                    <td>{row.status}</td>
                    <td>{row.is_active ? "Yes" : "No"}</td>
                    <td>{row.area_km2 ?? "-"}</td>
                    <td>{row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}</td>
                    <td className="table-actions">
                      <div className="actions-row">
                        {showPreview && typeof onPreview === "function" && (
                          <button
                            className="action-btn"
                            title="Preview on map"
                            aria-label="Preview"
                            onClick={() => onPreview(row)}
                          >
                            <FiEye />
                          </button>
                        )}

                        {allowActivate && !row.is_active && (
                          <button
                            className="action-btn edit"
                            title="Make Active"
                            aria-label="Make Active"
                            onClick={() => doActivate(row.id)}
                          >
                            <FiToggleRight />
                          </button>
                        )}

                        {allowToggleVisibility && (
                          <button
                            className="action-btn"
                            title={row.visibility === "public" ? "Make Admin-only" : "Make Public"}
                            aria-label="Toggle Visibility"
                            onClick={() => doToggleVisibility(row)}
                          >
                            {row.visibility === "public" ? <FiLock /> : <FiUnlock />}
                          </button>
                        )}

                        {allowDelete && (
                          <button
                            className="action-btn delete"
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
  );
}
