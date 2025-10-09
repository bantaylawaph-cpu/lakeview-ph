import React, { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser } from '../../lib/authState';
import { GeoJSON } from "react-leaflet";
import AppMap from "../../components/AppMap";
import "leaflet/dist/leaflet.css";
import {
  FiUploadCloud, FiCheckCircle, FiMap, FiGlobe, FiAlertTriangle, FiInfo,
} from "react-icons/fi";

import Wizard from "../../components/Wizard";

import {
  boundsFromGeom,
  normalizeForPreview,
  reprojectMultiPolygonTo4326,
} from "../../utils/geo";

import { createLayer, fetchLakeOptions, fetchWatershedOptions } from "../../lib/layers";
import { alertSuccess, alertError } from "../../lib/alerts";
import MapViewport from "../../components/MapViewport";
import { kml as kmlToGeoJSON } from "@tmcw/togeojson";
import shp from "shpjs";

export default function LayerWizard({
  defaultBodyType = "lake",
  defaultVisibility = "public",
  allowSetActive = true,
  // Reusability knobs (kept for compatibility, but both types use dropdowns now)
  allowedBodyTypes = ["lake", "watershed"],
  selectionModeLake = "dropdown",
  selectionModeWatershed = "dropdown",
  visibilityOptions = [
    { value: "public", label: "Public" },
    { value: "admin", label: "Admin" },
  ],
  initialBodyId = "",
  onPublished,             // (layerResponse) => void
}) {
  const normalizedVisibilityOptions = useMemo(() => {
    const base = Array.isArray(visibilityOptions) && visibilityOptions.length
      ? visibilityOptions
      : [
          { value: "public", label: "Public" },
          { value: "admin", label: "Admin" },
        ];
    return base
      .map((opt) => (typeof opt === "string"
        ? { value: opt, label: opt.charAt(0).toUpperCase() + opt.slice(1) }
        : { value: opt.value, label: opt.label ?? opt.value }
      ))
      .filter((opt) => opt && opt.value);
  }, [visibilityOptions]);

  const resolvedDefaultVisibility = useMemo(() => {
    if (normalizedVisibilityOptions.some((opt) => opt.value === defaultVisibility)) {
      return defaultVisibility;
    }
    return normalizedVisibilityOptions[0]?.value || "public";
  }, [defaultVisibility, normalizedVisibilityOptions]);

  const [data, setData] = useState({
    // file/geom
    fileName: "",
    geomText: "",
    uploadGeom: null,
    previewGeom: null,
    sourceSrid: 4326,

    // link
    bodyType: allowedBodyTypes.includes(defaultBodyType) ? defaultBodyType : (allowedBodyTypes[0] || "lake"),
    bodyId: initialBodyId ? String(initialBodyId) : "",

    // meta
    name: "",
    category: "",
    notes: "",
    visibility: resolvedDefaultVisibility,
    isActive: false,
  isDownloadable: false,

    // viewport
    includeViewport: true,
    viewport: null,
    viewportVersion: 0,
  });

  const [error, setError] = useState("");
  const mapRef = useRef(null);
  const wizardSetRef = useRef(null);
  const [lakeOptions, setLakeOptions] = useState([]);
  const [watershedOptions, setWatershedOptions] = useState([]);
  // Geocode/nominatim state
  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);

  useEffect(() => {
    if (initialBodyId === undefined || initialBodyId === null || initialBodyId === "") return;
    const nextId = String(initialBodyId);
    setData((prev) => (prev.bodyId === nextId ? prev : { ...prev, bodyId: nextId }));
  }, [initialBodyId]);

  useEffect(() => {
    setData((d) => {
      if (normalizedVisibilityOptions.some((opt) => opt.value === d.visibility)) {
        return d;
      }
      return { ...d, visibility: resolvedDefaultVisibility };
    });
  }, [normalizedVisibilityOptions, resolvedDefaultVisibility]);

  useEffect(() => {
    if (allowSetActive) return;
    setData((d) => (d.isActive ? { ...d, isActive: false } : d));
  }, [allowSetActive]);

  // Map viewport is now controlled by MapViewport inside the Preview render

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
  const acceptedExt = /\.(geojson|json|kml|zip)$/i;

  // --- Nominatim helpers (uses server proxy /api/geocode/nominatim by default) ---
  const fetchNominatimCandidates = async (q, limit = 5) => {
    if (!q || !q.trim()) return [];
    setGeocodeLoading(true);
    try {
      const url = `/api/geocode/nominatim?q=${encodeURIComponent(q)}&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    } finally {
      setGeocodeLoading(false);
    }
  };

  const geomFromNominatim = (item) => {
    if (!item) return null;
    if (item.geojson) {
      const t = item.geojson.type;
      if (t === "Polygon" || t === "MultiPolygon") return item.geojson;
      // if it's a GeometryCollection, try to take first polygon
      if (t === "GeometryCollection" && Array.isArray(item.geojson.geometries)) {
        const poly = item.geojson.geometries.find((g) => g.type === 'Polygon' || g.type === 'MultiPolygon');
        if (poly) return poly;
      }
    }
    if (item.boundingbox && item.boundingbox.length === 4) {
      const [south, north, west, east] = item.boundingbox.map(Number);
      const polygon = {
        type: "Polygon",
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ]],
      };
      return polygon;
    }
    return null;
  };

  const searchPlace = async () => {
    if (!geocodeQuery) return;
    setError("");
    try {
      const candidates = await fetchNominatimCandidates(geocodeQuery, 6);
      setGeocodeResults(candidates);
      if (!candidates.length) setError("No matches found.");
    } catch (e) {
      console.error('[LayerWizard] Geocode failed', e);
      setError(e?.message || 'Geocode failed.');
      setGeocodeResults([]);
    }
  };

  const useNominatimCandidate = (item) => {
    const geom = geomFromNominatim(item);
    if (!geom) {
      setError('Selected place has no polygon geometry.');
      return;
    }
    const gj = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: geom, properties: { name: item.display_name } }] };
    handleParsedGeoJSON(gj, `nominatim:${item.osm_type}/${item.osm_id}`);
    setData((d) => ({ ...d, sourceSrid: 4326 }));
    setGeocodeResults([]);
    setGeocodeQuery('');
  };

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
    // also update wizard internal state so canNext sees the change
    try { wizardSetRef.current?.({ uploadGeom, previewGeom, sourceSrid, geomText: JSON.stringify(parsed, null, 2), fileName }); } catch (e) { /* ignore */ }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!acceptedExt.test(file.name)) {
      setError("Only .geojson, .json, .kml, or .zip (shapefile) are supported.");
      return;
    }
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.kml')) {
        const text = await file.text();
        const dom = new DOMParser().parseFromString(text, 'text/xml');
        const gj = kmlToGeoJSON(dom);
        handleParsedGeoJSON(gj, file.name);
        return;
      }
      if (lower.endsWith('.zip')) {
        const buf = await file.arrayBuffer();
        let gj = await shp(buf);
        if (!gj || typeof gj !== 'object') throw new Error('Invalid shapefile contents');
        if (!gj.type && !gj.features) {
          const all = [];
          for (const key of Object.keys(gj)) {
            const layer = gj[key];
            if (layer && Array.isArray(layer.features)) all.push(...layer.features);
          }
          gj = { type: 'FeatureCollection', features: all };
        }
        handleParsedGeoJSON(gj, file.name);
        return;
      }
      const text = await file.text();
      const parsed = JSON.parse(text);
      handleParsedGeoJSON(parsed, file.name);
    } catch (e) {
      console.error('[LayerWizard] Failed to parse file', e);
      setError(e?.message || "Failed to parse file.");
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
      try { wizardSetRef.current?.({ sourceSrid: s }); } catch (e) { /* ignore */ }
      return;
    }
    const preview =
      s === 4326 ? data.uploadGeom : reprojectMultiPolygonTo4326(data.uploadGeom, s);
    setData((d) => ({ ...d, sourceSrid: s, previewGeom: preview }));
    try { wizardSetRef.current?.({ sourceSrid: s, previewGeom: preview }); } catch (e) { /* ignore */ }
  };

  // -------- publish ----------
  const onPublish = async (wizardData) => {
    setError("");
    try {
      const form = wizardData || data;
      if (!form.uploadGeom) throw new Error("Please upload or paste a valid Polygon/MultiPolygon GeoJSON first.");
      if (!form.bodyType || !form.bodyId) throw new Error("Select a target (lake or watershed) and its ID.");
      if (!form.name) throw new Error("Layer name is required.");
      // Determine source_type from uploaded filename when available
      let sourceType = 'geojson';
      if (form.fileName) {
        const lf = String(form.fileName).toLowerCase();
        if (lf.endsWith('.kml')) sourceType = 'kml';
        else if (lf.endsWith('.zip')) sourceType = 'shp';
        else if (lf.endsWith('.geojson') || lf.endsWith('.json')) sourceType = 'geojson';
      }

      const payload = {
        body_type: form.bodyType,
        body_id: Number(form.bodyId),
        name: form.name,
        type: "base",
        category: form.category,
        srid: Number(form.sourceSrid) || 4326,
  visibility: form.visibility,          // e.g. public, organization
        is_active: allowSetActive ? !!form.isActive : false,
  is_downloadable: !!form.isDownloadable,
        status: "ready",
        notes: form.notes || null,
        source_type: sourceType,
        geom_geojson: JSON.stringify(form.uploadGeom),
      };


      const res = await createLayer(payload);
      if (typeof onPublished === "function") onPublished(res);

      await alertSuccess("Layer created successfully.");
    } catch (e) {
      console.error('[LayerWizard] Publish failed', e);
      setError(e?.message || "Failed to publish layer.");
      await alertError('Failed to publish layer', e?.message || '');
    }
  };

  // -------- steps ----------
  const previewColor = data.bodyType === "watershed" ? "#16a34a" : "#2563eb";

  const steps = [
  // Step 1: Upload
    {
      key: "upload",
  title: "Upload Spatial File",
      canNext: (d) => !!d.uploadGeom,
    render: ({ data: wdata, setData: wSetData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiUploadCloud />
              <span>Upload</span>
            </div>
          </div>

          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("layer-file-input")?.click()}
          >
            <p>Drop a spatial file here or click to select</p>
            <small>Accepted: .geojson, .json, .kml, .zip (zipped Shapefile with .shp/.dbf/.prj; Polygon/MultiPolygon geometries)</small>
            <input
              id="layer-file-input"
              type="file"
              accept=".geojson,.json,.kml,.zip"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {(() => {
            const me = getCurrentUser?.();
            if (!me || me.role !== 'superadmin') return null;
            return (
              <div className="org-form" style={{ marginTop: 10 }}>
          
            <div className="form-group" style={{ flexBasis: '100%' }}>
              <label>Import from place name</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  value={geocodeQuery}
                  onChange={(e) => setGeocodeQuery(e.target.value)}
                  placeholder="Search place name (e.g., 'Laguna de Bay')"
                  style={{ flex: 1 }}
                />
                <button type="button" className={`pill-btn ${geocodeLoading ? 'ghost' : 'primary'}`} onClick={searchPlace} disabled={geocodeLoading}>
                  {geocodeLoading ? 'Searching…' : 'Search'}
                </button>
              </div>
              {geocodeResults.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div className="info-row"><small>Click a result to use its boundary:</small></div>
                  <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 8 }}>
                    {geocodeResults.map((r) => (
                      <div key={`${r.osm_type}-${r.osm_id}`} className="info-row" style={{ cursor: 'pointer', padding: '8px 6px' }} onClick={() => useNominatimCandidate(r)}>
                        <div style={{ fontWeight: 600 }}>{r.display_name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{r.class}/{r.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
            );
          })()}

          {error && (
            <div className="alert-note" style={{ marginTop: 8 }}>
              <FiAlertTriangle /> {error}
            </div>
          )}
          {wdata.fileName && (
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
    render: ({ data: wdata, setData: wSetData }) => (
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
                {wdata.previewGeom && (
                  <GeoJSON key="geom" data={{ type: "Feature", geometry: wdata.previewGeom }} style={{ color: previewColor, weight: 2, fillOpacity: 0.15 }} />
                )}
                {/* MapViewport will fit map to either previewGeom or to a captured viewport (if present) */}
                <MapViewport
                  bounds={wdata.viewport ? [[wdata.viewport.bounds[0], wdata.viewport.bounds[1]], [wdata.viewport.bounds[2], wdata.viewport.bounds[3]]] : (wdata.previewGeom ? boundsFromGeom(wdata.previewGeom) : null)}
                  version={wdata.viewportVersion || 0}
                />
              </AppMap>
            </div>

            <div className="org-form" style={{ marginTop: 10 }}>
              <div className="form-group">
                <label>Detected/Source SRID</label>
                <input
                  type="number"
                  value={wdata.sourceSrid}
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
      canNext: (d) => !!d.bodyId,
    render: ({ data: wdata, setData: wSetData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiMap />
                <span>Link to a {wdata.bodyType === "lake" ? "Lake" : "Watershed"}</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="org-form">
              {allowedBodyTypes.length > 1 && (
                <div className="form-group">
                  <label>Body Type</label>
                  <select
                      value={wdata.bodyType}
                      onChange={(e) =>
                        wSetData((d) => ({ ...d, bodyType: e.target.value, bodyId: "" }))
                      }
                  >
                    {allowedBodyTypes.includes("lake") && (<option value="lake">Lake</option>)}
                    {allowedBodyTypes.includes("watershed") && (<option value="watershed">Watershed</option>)}
                  </select>
                </div>
              )}

                {wdata.bodyType === "lake" ? (
                <div className="form-group" style={{ minWidth: 260 }}>
                  <label>Select Lake</label>
                  <select
                      value={wdata.bodyId}
                      onChange={(e) => wSetData((d) => ({ ...d, bodyId: e.target.value }))}
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
                      value={wdata.bodyId}
                      onChange={(e) => wSetData((d) => ({ ...d, bodyId: e.target.value }))}
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
      canNext: (d) => !!d.name,
      render: ({ data: wdata, setData: wSetData }) => (
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
                  value={wdata.name}
                  onChange={(e) => wSetData((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g., Official shoreline 2024"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={wdata.category}
                  onChange={(e) => wSetData((d) => ({ ...d, category: e.target.value }))}
                >
                  <option value="" disabled>Select category…</option>
                  <option value="Profile">Profile</option>
                  <option value="Boundary">Boundary</option>
                </select>
              </div>

              <div className="form-group" style={{ flexBasis: "100%" }}>
                <label>Notes</label>
                <input
                  type="text"
                  value={wdata.notes}
                  onChange={(e) => wSetData((d) => ({ ...d, notes: e.target.value }))}
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
      canNext: (d) => !!d.uploadGeom && !!d.bodyType && !!d.bodyId && !!d.name,
      render: ({ data: wdata, setData: wSetData }) => (
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
                  value={wdata.visibility}
                  onChange={(e) => wSetData((d) => ({ ...d, visibility: e.target.value }))}
                >
                  {normalizedVisibilityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {allowSetActive && (
                <div className="form-group">
                  <label>Default Layer</label>
                  <div>
                    <button
                      type="button"
                      className={`pill-btn ${wdata.isActive ? 'primary' : 'ghost'}`}
                      onClick={() => wSetData((d) => ({ ...d, isActive: !d.isActive }))}
                      title="Toggle default layer"
                    >
                      {wdata.isActive ? 'Default Enabled' : 'Set as Default'}
                    </button>
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Downloadable</label>
                <div>
                  <button
                    type="button"
                    className={`pill-btn ${wdata.isDownloadable ? 'primary' : 'ghost'}`}
                    onClick={() => wSetData((d) => ({ ...d, isDownloadable: !d.isDownloadable }))}
                    title="Toggle whether this layer can be downloaded"
                  >
                    {wdata.isDownloadable ? 'Download Enabled' : 'Allow Download'}
                  </button>
                </div>
              </div>
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
      onSetDataRef={(fn) => { wizardSetRef.current = fn; }}
      labels={{ back: "Back", next: "Next", finish: "Publish" }}
      onFinish={onPublish}
  onChange={(payload) => setTimeout(() => setData((d) => ({ ...d, ...payload })), 0)}
    />
  );
}
