import React, { useEffect, useRef, useState } from "react";
import { GeoJSON } from "react-leaflet";
import AppMap from "../../components/AppMap";
import "leaflet/dist/leaflet.css";
import {
  FiUploadCloud, FiCheckCircle, FiMap, FiGlobe, FiAlertTriangle, FiInfo,
} from "react-icons/fi";

import Wizard from "../../components/Wizard";
// BodySelect removed to keep the UX uniform (dropdown for both)

import {
  boundsFromGeom,
  normalizeForPreview,
  reprojectMultiPolygonTo4326,
} from "../../utils/geo";

import { createLayer, fetchLakeOptions, fetchWatershedOptions } from "../../lib/layers";

export default function LayerWizard({
  defaultBodyType = "lake",
  defaultVisibility = "public",
  allowSetActive = true,
  // Reusability knobs (kept for compatibility, but both types use dropdowns now)
  allowedBodyTypes = ["lake", "watershed"],
  selectionModeLake = "dropdown",
  selectionModeWatershed = "dropdown",
  onPublished,             // (layerResponse) => void
}) {
  const [data, setData] = useState({
    // file/geom
    fileName: "",
    geomText: "",
    uploadGeom: null,       // original MultiPolygon (source SRID)
    previewGeom: null,      // WGS84 for map preview
    sourceSrid: 4326,

    // link
    bodyType: allowedBodyTypes.includes(defaultBodyType) ? defaultBodyType : allowedBodyTypes[0] || "lake",
    bodyId: "",

    // meta
    name: "",
    category: "",
    notes: "",
    visibility: defaultVisibility, // 'admin' | 'public'
    isActive: false,
  });

  const [error, setError] = useState("");
  const mapRef = useRef(null);
  const [lakeOptions, setLakeOptions] = useState([]);
  const [watershedOptions, setWatershedOptions] = useState([]);

  // fit map when preview changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data.previewGeom) return;
    const b = boundsFromGeom(data.previewGeom);
    if (b && b.isValid()) map.fitBounds(b.pad(0.2));
  }, [data.previewGeom]);

  // Load lake options (names only) when selecting a lake
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (data.bodyType !== "lake") return;
      try {
        const rows = await fetchLakeOptions("");
        if (!cancelled) setLakeOptions(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error('[LayerWizard] Failed to load lake options', e);
        if (!cancelled) setLakeOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [data.bodyType]);

  // Load watershed options (names only) when selecting a watershed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (data.bodyType !== "watershed") return;
      try {
        const rows = await fetchWatershedOptions("");
        if (!cancelled) setWatershedOptions(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error('[LayerWizard] Failed to load watershed options', e);
        if (!cancelled) setWatershedOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [data.bodyType]);

  const worldBounds = [
    [4.6, 116.4],
    [21.1, 126.6],
  ];

  // -------- file handlers ----------
  const acceptedExt = /\.(geojson|json)$/i;

  const handleParsedGeoJSON = (parsed, fileName = "") => {
    const { uploadGeom, previewGeom, sourceSrid } = normalizeForPreview(parsed);
    setData((d) => ({
      ...d,
      uploadGeom,
      previewGeom,
      sourceSrid,
      geomText: JSON.stringify(parsed, null, 2),
      fileName,
    }));
    setError("");
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!acceptedExt.test(file.name)) {
      setError("Only .geojson or .json files are supported.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      handleParsedGeoJSON(parsed, file.name);
    } catch (e) {
      console.error('[LayerWizard] Failed to parse GeoJSON file', e);
      setError(e?.message || "Failed to parse GeoJSON file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])];
    const f = files.find((ff) => acceptedExt.test(ff.name));
    if (f) handleFile(f);
  };

  // -------- manual SRID change (recompute preview from original) ----------
  const updateSourceSrid = (srid) => {
    const s = Number(srid) || 4326;
    if (!data.uploadGeom) {
      setData((d) => ({ ...d, sourceSrid: s }));
      return;
    }
    const preview =
      s === 4326 ? data.uploadGeom : reprojectMultiPolygonTo4326(data.uploadGeom, s);
    setData((d) => ({ ...d, sourceSrid: s, previewGeom: preview }));
  };

  // -------- publish ----------
  const onPublish = async () => {
    setError("");
    try {
      if (!data.uploadGeom) throw new Error("Please upload or paste a valid Polygon/MultiPolygon GeoJSON first.");
      if (!data.bodyType || !data.bodyId) throw new Error("Select a target (lake or watershed) and its ID.");
      if (!data.name) throw new Error("Layer name is required.");

      const payload = {
        body_type: data.bodyType,
        body_id: Number(data.bodyId),
        name: data.name,
        type: "base",
        category: data.category,
        srid: Number(data.sourceSrid) || 4326,
        visibility: data.visibility,          // 'admin' | 'public'
        is_active: !!data.isActive,
        status: "ready",
        notes: data.notes || null,
        source_type: "geojson",
        geom_geojson: JSON.stringify(data.uploadGeom),
      };

      const res = await createLayer(payload);
      if (typeof onPublished === "function") onPublished(res);

      alert("Layer created successfully.");
    } catch (e) {
      console.error('[LayerWizard] Publish failed', e);
      setError(e?.message || "Failed to publish layer.");
    }
  };

  // -------- steps ----------
  const steps = [
    // Step 1: Upload / Paste
    {
      key: "upload",
      title: "Upload / Paste GeoJSON",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiUploadCloud />
              <span>Upload or Paste</span>
            </div>
          </div>

          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("layer-file-input")?.click()}
          >
            <p>Drop a GeoJSON file here or click to select</p>
            <small>Accepted: .geojson, .json (Polygon / MultiPolygon, or Feature/FeatureCollection of polygons)</small>
            <input
              id="layer-file-input"
              type="file"
              accept=".geojson,.json"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="org-form" style={{ marginTop: 12 }}>
            <div className="form-group" style={{ flexBasis: "100%" }}>
              <label>Or paste GeoJSON</label>
              <textarea
                rows={8}
                value={data.geomText}
                onChange={(e) => {
                  const text = e.target.value;
                  setData((d) => ({ ...d, geomText: text }));
                  try {
                    const parsed = JSON.parse(text);
                    handleParsedGeoJSON(parsed, "");
                  } catch {
                    // keep as user types
                  }
                }}
                placeholder='e.g. {"type":"Polygon","coordinates":[...]} or a Feature/FeatureCollection of polygons'
              />
            </div>
          </div>

          {error && (
            <div className="alert-note" style={{ marginTop: 8 }}>
              <FiAlertTriangle /> {error}
            </div>
          )}
          {data.fileName && (
            <div className="info-row" style={{ marginTop: 6 }}>
              <FiInfo /> Loaded: <strong>{data.fileName}</strong>
            </div>
          )}
        </div>
      ),
    },

    // Step 2: Preview & CRS
    {
      key: "preview",
      title: "Preview & CRS",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiCheckCircle />
              <span>Preview & Coordinate System</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="info-row" style={{ marginBottom: 8 }}>
              <FiInfo /> The map shows a <strong>WGS84 (EPSG:4326)</strong> preview. Your original geometry will be saved with the detected/selected SRID.
            </div>
            <div style={{ height: 420, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
              <AppMap
                view="osm"
                style={{ height: "100%", width: "100%" }}
                whenCreated={(m) => { if (m && !mapRef.current) mapRef.current = m; }}
              >
                {data.previewGeom && (
                  <GeoJSON key="geom" data={{ type: "Feature", geometry: data.previewGeom }} />
                )}
              </AppMap>
            </div>

            <div className="org-form" style={{ marginTop: 10 }}>
              <div className="form-group">
                <label>Detected/Source SRID</label>
                <input
                  type="number"
                  value={data.sourceSrid}
                  onChange={(e) => updateSourceSrid(e.target.value)}
                  placeholder="e.g., 4326 or 32651"
                />
              </div>
              <div className="alert-note">
                <FiAlertTriangle /> If the file declares a CRS e.g., EPSG::32651 or CRS84,
                it’s auto-detected. Adjust only if detection was wrong.
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Step 3: Link to Body (UNIFIED: dropdown for both Lake & Watershed)
    {
      key: "link",
      title: "Link to Body",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiMap />
              <span>Link to a {data.bodyType === "lake" ? "Lake" : "Watershed"}</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              {allowedBodyTypes.length > 1 && (
                <div className="form-group">
                  <label>Body Type</label>
                  <select
                    value={data.bodyType}
                    onChange={(e) =>
                      setData((d) => ({ ...d, bodyType: e.target.value, bodyId: "" }))
                    }
                  >
                    {allowedBodyTypes.includes("lake") && (<option value="lake">Lake</option>)}
                    {allowedBodyTypes.includes("watershed") && (<option value="watershed">Watershed</option>)}
                  </select>
                </div>
              )}

              {data.bodyType === "lake" ? (
                <div className="form-group" style={{ minWidth: 260 }}>
                  <label>Select Lake</label>
                  <select
                    value={data.bodyId}
                    onChange={(e) => setData((d) => ({ ...d, bodyId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Choose a lake</option>
                    {lakeOptions.map((o) => (
                      <option key={`lake-${o.id}`} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group" style={{ minWidth: 260 }}>
                  <label>Select Watershed</label>
                  <select
                    value={data.bodyId}
                    onChange={(e) => setData((d) => ({ ...d, bodyId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select category…</option>
                    {watershedOptions.map((o) => (
                      <option key={`ws-${o.id}`} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },

    // Step 4: Metadata
    {
      key: "meta",
      title: "Metadata",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiGlobe />
              <span>Metadata</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              <div className="form-group">
                <label>Layer Name</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g., Official shoreline 2024"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={data.category}
                  onChange={(e) => setData((d) => ({ ...d, category: e.target.value }))}
                >
                  <option value="" disabled>Select category…</option>
                  <option value="Profile">Profile</option>
                  <option value="Boundary">Boundary</option>
                  <option value="Bathymetry">Bathymetry</option>
                </select>
              </div>

              <div className="form-group" style={{ flexBasis: "100%" }}>
                <label>Notes</label>
                <input
                  type="text"
                  value={data.notes}
                  onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="Short description / source credits"
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Step 5: Publish & Visibility
    {
      key: "publish",
      title: "Publish",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiGlobe />
              <span>Publish</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              <div className="form-group">
                <label>Visibility</label>
                <select
                  value={data.visibility}
                  onChange={(e) => setData((d) => ({ ...d, visibility: e.target.value }))}
                >
                  <option value="public">Public</option>
                  <option value="admin">Admin only</option>
                </select>
              </div>

              {allowSetActive && (
                <div className="form-group">
                  <label>Default Layer</label>
                  <div>
                    <button
                      type="button"
                      className={`pill-btn ${data.isActive ? 'primary' : 'ghost'}`}
                      onClick={() => setData((d) => ({ ...d, isActive: !d.isActive }))}
                      title="Toggle default layer"
                    >
                      {data.isActive ? 'Default Enabled' : 'Set as Default'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {error && (
              <div className="alert-note" style={{ marginTop: 8 }}>
                <FiAlertTriangle /> {error}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      initialData={data}
      labels={{ back: "Back", next: "Next", finish: "Publish" }}
      onFinish={onPublish}
      onChange={(payload) => setData((d) => ({ ...d, ...payload }))}
    />
  );
}
