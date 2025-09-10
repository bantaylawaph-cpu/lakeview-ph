// resources/js/components/layers/LayerWizard.jsx
import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  FiUploadCloud, FiCheckCircle, FiMap, FiGlobe, FiAlertTriangle, FiInfo,
} from "react-icons/fi";

import Wizard from "../../components/Wizard";
import BodySelect from "./BodySelect";

import {
  boundsFromGeom,
  normalizeForPreview,
  reprojectMultiPolygonTo4326,
} from "../../utils/geo";

import { createLayer } from "../../lib/layers";

export default function LayerWizard({
  defaultBodyType = "lake",
  defaultVisibility = "public",
  allowSetActive = true,
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
    bodyType: defaultBodyType,  // 'lake' | 'watershed'
    bodyId: "",

    // meta
    name: "",
    category: "Hydrology",
    notes: "",
    visibility: defaultVisibility, // 'admin' | 'public'
    isActive: !!allowSetActive,
  });

  const [error, setError] = useState("");
  const mapRef = useRef(null);

  // fit map when preview changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data.previewGeom) return;
    const b = boundsFromGeom(data.previewGeom);
    if (b && b.isValid()) map.fitBounds(b.pad(0.2));
  }, [data.previewGeom]);

    const worldBounds = [
    [4.6, 116.4], // Southwest (Mindanao sea area)
    [21.1, 126.6], // Northeast (Batanes area)
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
        category: data.category || null,
        srid: Number(data.sourceSrid) || 4326,
        visibility: data.visibility,          // 'admin' | 'public'
        is_active: !!data.isActive,
        status: "ready",
        notes: data.notes || null,
        source_type: "geojson",
        geom_geojson: JSON.stringify(data.uploadGeom), // send original geometry (source SRID)
      };

      const res = await createLayer(payload);
      if (typeof onPublished === "function") onPublished(res);

      // keep preview on map; just show a gentle confirmation
      alert("Layer created successfully.");
    } catch (e) {
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
              <MapContainer
                center={[14.3409, 121.23477]} // Default center (Laguna de Bay area)
                zoom={9}
                maxBounds={worldBounds}
                maxBoundsViscosity={1.0}
                maxZoom={18}
                minZoom={6}
                zoomControl={false} // We provide custom controls
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {data.previewGeom && (
                  <GeoJSON key="geom" data={{ type: "Feature", geometry: data.previewGeom }} />
                )}
              </MapContainer>
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
                <FiAlertTriangle /> If the file declares a CRS (e.g., <code>EPSG::32651</code> or <code>CRS84</code>),
                it’s auto-detected. Adjust only if detection was wrong.
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Step 3: Link to Body
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
              <div className="form-group">
                <label>Body Type</label>
                <select
                  value={data.bodyType}
                  onChange={(e) =>
                    setData((d) => ({ ...d, bodyType: e.target.value, bodyId: "" }))
                  }
                >
                  <option value="lake">Lake</option>
                  <option value="watershed">Watershed</option>
                </select>
              </div>

              <BodySelect
                bodyType={data.bodyType}
                bodyId={data.bodyId}
                onChange={(id) => setData((d) => ({ ...d, bodyId: id }))}
                searchable
                allowManualId
                required
                className="bodyselect"
              />
            </div>

            <div className="info-row" style={{ marginTop: 8 }}>
              <FiInfo /> The <strong>active</strong> layer becomes the default geometry for the selected body.
            </div>
          </div>
        </div>
      ),
    },

    // Step 4: Metadata & Publish
    {
      key: "meta",
      title: "Metadata & Publish",
      render: () => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiGlobe />
              <span>Metadata & Publish</span>
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
                  <option>Hydrology</option>
                  <option>Administrative</option>
                  <option>Boundaries</option>
                  <option>Bathymetry</option>
                  <option>Reference</option>
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

            <div className="org-form" style={{ marginTop: 8 }}>
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
                  <label>Set as Active</label>
                  <label
                    className="auth-checkbox"
                    style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={!!data.isActive}
                      onChange={(e) => setData((d) => ({ ...d, isActive: e.target.checked }))}
                    />
                    <span>Make this the default geometry</span>
                  </label>
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
