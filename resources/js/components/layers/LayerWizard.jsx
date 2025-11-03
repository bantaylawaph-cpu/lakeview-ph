import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuthRole } from '../../pages/PublicInterface/hooks/useAuthRole';
import "leaflet/dist/leaflet.css";
import {
  FiUploadCloud, FiCheckCircle, FiMap, FiGlobe, FiAlertTriangle, FiInfo,
} from "react-icons/fi";

import Wizard from "../../components/Wizard";

import {
  boundsFromGeom,
  detectEpsg,
  normalizeForPreview,
  reprojectMultiPolygonTo4326,
  toMultiPolygon,
} from "../../utils/geo";

import { createLayer, fetchLakeOptions, fetchWatershedOptions } from "../../lib/layers";
import { alertSuccess, alertError, showLoading, closeLoading } from "../../lib/alerts";
import { parseSpatialFile, ACCEPTED_EXT_REGEX } from "../../utils/parsers";
import PolygonChooser from '../../components/PolygonChooser';
import FileDropzone from './FileDropzone';
import PreviewMap from './PreviewMap';
import BodySelector from './BodySelector';
import MetadataForm from './MetadataForm';
import PublishControls from './PublishControls';

export default function LayerWizard({
  defaultBodyType = "lake",
  defaultVisibility = "public",
  allowSetActive = true,
  allowedBodyTypes = ["lake", "watershed"],
  visibilityOptions = [
    { value: "public", label: "Public" },
    { value: "admin", label: "Admin" },
  ],
  initialBodyId = "",
  onPublished,
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
    fileName: "",
    geomText: "",
    uploadGeom: null,
    previewGeom: null,
    sourceSrid: 4326,
    bodyType: allowedBodyTypes.includes(defaultBodyType) ? defaultBodyType : (allowedBodyTypes[0] || "lake"),
    bodyId: initialBodyId ? String(initialBodyId) : "",
    name: "",
    notes: "",
    visibility: resolvedDefaultVisibility,
    isActive: false,
    isDownloadable: false,
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
  // Use the shared auth hook so UI reacts correctly on refresh/navigation
  const { userRole } = useAuthRole();
  // Multi-feature selection state
  const [pendingFeatures, setPendingFeatures] = useState([]);
  const [pendingCrs, setPendingCrs] = useState(null); // carry CRS from source if provided
  const [pendingFileName, setPendingFileName] = useState("");
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [featureSelectedIdx, setFeatureSelectedIdx] = useState("");
  const [featureMapVersion, setFeatureMapVersion] = useState(0);
  const modalMapRef = useRef(null);

  // Memoize preview-ready geometries (in 4326) for each pending feature so rendering
  // and bounds computation are deterministic and fast during re-renders.
  const previewGeometries = useMemo(() => {
    if (!pendingFeatures || !pendingFeatures.length) return [];
    return pendingFeatures.map((f) => {
      try {
        const mp = toMultiPolygon(f.geometry);
        let srid = null;
        if (pendingCrs) {
          try { srid = detectEpsg({ crs: pendingCrs }); } catch (_) { srid = null; }
        }
        return srid && srid !== 4326 ? reprojectMultiPolygonTo4326(mp, srid) : mp;
      } catch (e) { return null; }
    });
  }, [pendingFeatures, pendingCrs]);

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

  // -------- file handlers ----------
  const acceptedExt = ACCEPTED_EXT_REGEX;

  // --- Multi-feature helpers ---
  const polygonFeaturesFrom = (root) => {
    if (!root || typeof root !== 'object') return { features: [], crs: null };
    const crs = root.crs || null;
    const t = (root.type || '').toLowerCase();
    const onlyPoly = (f) => f && typeof f === 'object' && f.type === 'Feature' && f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
    if (t === 'featurecollection') {
      const feats = (root.features || []).filter(onlyPoly);
      return { features: feats, crs };
    }
    if (t === 'feature') {
      return onlyPoly(root) ? { features: [root], crs } : { features: [], crs };
    }
    if (t === 'polygon' || t === 'multipolygon') {
      return { features: [{ type: 'Feature', geometry: root, properties: {} }], crs };
    }
    return { features: [], crs };
  };

  const guessFeatureLabel = (feat, idx) => {
    const props = feat?.properties || {};
    const keys = ['name', 'NAME', 'lake', 'lake_name', 'Lake', 'LName', 'id', 'ID'];
    for (const k of keys) {
      if (props[k]) return String(props[k]);
    }
    return `Feature ${idx + 1}`;
  };

  const beginFeatureSelection = (feats, crs, fileName) => {
    setPendingFeatures(feats);
    setPendingCrs(crs || null);
    setPendingFileName(fileName || '');
    setError('Multiple polygons found. Please pick one to continue.');
    // Clear any prior parsed geom to block navigation until selection
    setData((d) => ({ ...d, uploadGeom: null, previewGeom: null, geomText: '', fileName }));
    try { wizardSetRef.current?.({ uploadGeom: null, previewGeom: null, geomText: '', fileName }); } catch (_) {}
  setFeatureSelectedIdx("");
    setFeatureModalOpen(true);
    setFeatureMapVersion((v) => v + 1);
  };

  // When the modal opens, invalidate Leaflet map size to ensure tiles and layers render
  useEffect(() => {
    if (featureModalOpen && modalMapRef.current) {
      setTimeout(() => {
        try { modalMapRef.current.invalidateSize(); } catch (_) {}
      }, 50);
    }
  }, [featureModalOpen]);

  const chooseFeature = (index) => {
    const feat = pendingFeatures[index];
    if (!feat) return;
    // Attach CRS hint (if any) so SRID detection sees it
    const single = { type: 'Feature', geometry: feat.geometry, properties: feat.properties || {} };
    if (pendingCrs) single.crs = pendingCrs;
    // You can pass Feature directly; normalizeForPreview handles Feature
    handleParsedGeoJSON(single, pendingFileName || data.fileName || '');
    setPendingFeatures([]);
    setPendingCrs(null);
    setPendingFileName('');
    setFeatureModalOpen(false);
  };

  // --- Nominatim helpers (uses server proxy /api/geocode/nominatim by default) ---
  // Helper: derive a concise name from a Nominatim item
  const shortNameFromNominatim = (item) => {
    if (!item) return '';
    // Prefer explicit name if present; fallback to first part of display_name
    const n = (item.name || '').toString().trim();
    if (n) return n;
    const dn = (item.display_name || '').toString();
    if (!dn) return '';
    const first = dn.split(',')[0]?.trim();
    return first || dn.trim();
  };

  // Helper: attribution string for OSM/Nominatim usage
  const nominatimAttribution = () =>
    'Source: OpenStreetMap Nominatim — © OpenStreetMap contributors (ODbL 1.0)';

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
    // Autofill Layer Name, Category, and Notes with attribution
    const suggestedName = shortNameFromNominatim(item);
    const suggestedNotes = `${suggestedName ? `${suggestedName} — ` : ''}${nominatimAttribution()}`.trim();
    setData((d) => {
      const next = {
        ...d,
        sourceSrid: 4326,
        name: d.name && d.name.trim() ? d.name : (suggestedName || d.name),
        notes: d.notes && d.notes.trim() ? d.notes : suggestedNotes,
      };
      // Keep wizard internal state in sync so step validation reflects updates
      try { wizardSetRef.current?.({ name: next.name, notes: next.notes, sourceSrid: next.sourceSrid }); } catch (e) { /* ignore */ }
      return next;
    });
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

  const handleUploadGeoJSON = (parsed, fileName = "") => {
    const { features, crs } = polygonFeaturesFrom(parsed);
    if (!features.length) {
      setError('No Polygon/MultiPolygon geometries found in the file.');
      return;
    }
    if (features.length === 1) {
      const single = { type: 'Feature', geometry: features[0].geometry, properties: features[0].properties || {} };
      if (crs) single.crs = crs;
      handleParsedGeoJSON(single, fileName);
      return;
    }
    // Multiple: let user pick
    beginFeatureSelection(features, crs, fileName);
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!acceptedExt.test(file.name)) {
      setError("Only .geojson, .json, .kml, .zip (shapefile), or .gpkg are supported.");
      return;
    }
    try {
      const gj = await parseSpatialFile(file);
      handleUploadGeoJSON(gj, file.name);
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
  // Removed: updateSourceSrid function

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
        else if (lf.endsWith('.gpkg')) sourceType = 'gpkg';
        else if (lf.endsWith('.geojson') || lf.endsWith('.json')) sourceType = 'geojson';
      }

      const payload = {
        body_type: form.bodyType,
        body_id: Number(form.bodyId),
        name: form.name,
        srid: Number(form.sourceSrid) || 4326,
  visibility: form.visibility,          // e.g. public, organization
        is_active: allowSetActive ? !!form.isActive : false,
  is_downloadable: !!form.isDownloadable,
        status: "ready",
        notes: form.notes || null,
        source_type: sourceType,
        geom_geojson: JSON.stringify(form.uploadGeom),
      };

      // Show loading while publishing
  showLoading('Publishing layer', 'Please wait…');
      const res = await createLayer(payload);
      if (typeof onPublished === "function") onPublished(res);
      await alertSuccess("Layer created successfully.");
    } catch (e) {
      console.error('[LayerWizard] Publish failed', e);
      // Try to produce a friendly, actionable error for admins when the DB unique
      // constraint for a single active layer per body is violated.
      const apiData = e?.response?.data;
      const rawMsg = (typeof apiData === 'string') ? apiData : (apiData?.message || e?.message || '');

      const uniqueDefaultPattern = /uq_layers_active_per_body|duplicate key value|already exists|UniqueConstraint/i;
      let friendly = rawMsg || 'Failed to publish layer.';
      if (uniqueDefaultPattern.test(String(rawMsg))) {
        friendly = 'A default layer already exists for the selected body. Disable the "Default Enabled" flag on the existing layer, or uncheck "Set as Default" here before publishing.';
      } else {
        // If the API returned a more specific nested message, try to surface it without stack traces
        try {
          const parsed = typeof e.message === 'string' ? JSON.parse(e.message) : null;
          const pm = parsed?.message || parsed?.error || null;
          if (pm && typeof pm === 'string' && pm.trim()) {
            friendly = pm.replace(/\r?\n/g, ' ');
          }
        } catch (_) {
          // ignore parse errors
        }
      }

      setError(friendly);
      await alertError('Failed to publish layer', friendly);
    } finally {
      closeLoading();
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

          <FileDropzone onFile={handleFile} />

          {userRole === 'superadmin' && (
            <div className="org-form" style={{ marginTop: 10 }}>

            <div className="form-group" style={{ flexBasis: '100%' }}>
              <label>Import from place name</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  value={geocodeQuery}
                  onChange={(e) => setGeocodeQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchPlace(); }}
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
          )}

          {pendingFeatures.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <button type="button" className="pill-btn primary" onClick={() => setFeatureModalOpen(true)}>Choose a Polygon</button>
            </div>
          )}
          {wdata.fileName && (
            <div className="info-row" style={{ marginTop: 6 }}>
              <FiInfo /> Loaded: <strong>{data.fileName}</strong>
            </div>
          )}
          {featureModalOpen && pendingFeatures.length > 1 && (
            <PolygonChooser
              open={featureModalOpen}
              onClose={() => setFeatureModalOpen(false)}
              pendingFeatures={pendingFeatures}
              pendingCrs={pendingCrs}
              featureSelectedIdx={featureSelectedIdx}
              setFeatureSelectedIdx={setFeatureSelectedIdx}
              featureMapVersion={featureMapVersion}
              setFeatureMapVersion={setFeatureMapVersion}
              chooseFeature={chooseFeature}
              previewColor={previewColor}
            />
          )}
        </div>
      ),
    },

    // Step 2: Preview
    {
      key: "preview",
      title: "Preview",
    render: ({ data: wdata, setData: wSetData }) => (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiCheckCircle />
              <span>Preview</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div className="info-row" style={{ marginBottom: 8 }}>
              <FiInfo /> The map shows a <strong>WGS84 (EPSG:4326)</strong> preview. Your original geometry will be saved with the detected SRID.
            </div>
            <PreviewMap
              geometry={wdata.previewGeom}
              color={previewColor}
              viewport={wdata.viewport}
              viewportVersion={wdata.viewportVersion || 0}
              whenCreated={(m) => { if (m && !mapRef.current) mapRef.current = m; }}
            />

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
            <BodySelector
              allowedBodyTypes={allowedBodyTypes}
              bodyType={wdata.bodyType}
              onBodyTypeChange={(val) => wSetData((d) => ({ ...d, bodyType: val, bodyId: "" }))}
              bodyId={wdata.bodyId}
              onBodyIdChange={(val) => wSetData((d) => ({ ...d, bodyId: val }))}
              lakeOptions={lakeOptions}
              watershedOptions={watershedOptions}
            />
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
            <MetadataForm
              name={wdata.name}
              notes={wdata.notes}
              onChange={(patch) => wSetData((d) => ({ ...d, ...patch }))}
            />
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
            <PublishControls
              visibilityOptions={normalizedVisibilityOptions}
              value={wdata.visibility}
              onChange={(val) => wSetData((d) => ({ ...d, visibility: val }))}
              allowSetActive={allowSetActive}
              isActive={wdata.isActive}
              onToggleActive={() => wSetData((d) => ({ ...d, isActive: !d.isActive }))}
              isDownloadable={wdata.isDownloadable}
              onToggleDownloadable={() => wSetData((d) => ({ ...d, isDownloadable: !d.isDownloadable }))}
            />
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
