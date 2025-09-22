// ----------------------------------------------------
// Main Map Page Component for LakeView PH
// ----------------------------------------------------
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { api } from "../../lib/api";
import { fetchPublicLayers, fetchLakeOptions, fetchPublicLayerGeo } from "../../lib/layers";
import { useMap, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import AppMap from "../../components/AppMap";
import MapControls from "../../components/MapControls";
import SearchBar from "../../components/SearchBar";
import LayerControl from "../../components/LayerControl";
import ScreenshotButton from "../../components/ScreenshotButton";
import CoordinatesScale from "../../components/CoordinatesScale"
import Sidebar from "../../components/Sidebar";
import ContextMenu from "../../components/ContextMenu";
import MeasureTool from "../../components/MeasureTool";
import LakeInfoPanel from "../../components/LakeInfoPanel";
import AuthModal from "../../components/modals/AuthModal";
import FilterTray from "../../components/FilterTray";
import { buildQuery } from "../../lib/api";

function MapWithContextMenu({ children }) {
  const map = useMap();
  return children(map);
}

// Bridge component to ensure we capture the Leaflet map instance reliably
function MapRefBridge({ onReady }) {
  const map = useMap();
  useEffect(() => {
    if (map && typeof onReady === 'function') onReady(map);
  }, [map, onReady]);
  return null;
}

// Extract a lake id from a Feature robustly
const getLakeIdFromFeature = (feat) => {
  const p = feat?.properties || {};
  return feat?.id ?? p.id ?? p.lake_id ?? p.lakeId ?? p.lakeID ?? null;
};

function MapPage() {
  // ---------------- State ----------------
  const [selectedView, setSelectedView] = useState("satellite");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  const [selectedLake, setSelectedLake] = useState(null);
  const [selectedLakeId, setSelectedLakeId] = useState(null);
  const [selectedLakeName, setSelectedLakeName] = useState(null);
  const [selectedWatershedId, setSelectedWatershedId] = useState(null);
  const [watershedToggleOn, setWatershedToggleOn] = useState(false);
  const [lakePanelOpen, setLakePanelOpen] = useState(false);

  const [lakeLayers, setLakeLayers] = useState([]);
  const [lakeActiveLayerId, setLakeActiveLayerId] = useState(null);

  // Overlay feature to show (and trigger hiding of the base feature)
  const [lakeOverlayFeature, setLakeOverlayFeature] = useState(null);
  const [watershedOverlayFeature, setWatershedOverlayFeature] = useState(null);
  const [baseKey, setBaseKey] = useState(0); // force base GeoJSON remount when needed
  const [wqMarker, setWqMarker] = useState(null); // {lat, lon}

  const [measureActive, setMeasureActive] = useState(false);
  const [measureMode, setMeasureMode] = useState("distance");

  const [userRole, setUserRole] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const [publicFC, setPublicFC] = useState(null);
  const [filterTrayOpen, setFilterTrayOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);
  const wqLayerRef = useRef(null); // persistent WQ markers layer
  const queuedWqMarkersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const zoomLockedRef = useRef(true);
  // ---------------- Auth / route modal ----------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api("/auth/me");
        if (!mounted) return;
        setUserRole(['superadmin','org_admin','contributor'].includes(me.role) ? me.role : null);
      } catch { if (mounted) setUserRole(null); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const p = location.pathname;
    if (p === "/login")  { setAuthMode("login"); setAuthOpen(true); }
    if (p === "/register") { setAuthMode("register"); setAuthOpen(true); }
  }, [location.pathname]);

  // ---------------- Fetch public lake geometries ----------------
  const loadPublicLakes = async (filters = {}) => {
    try {
      const qs = buildQuery(filters || {});
      const fc = await api(`/public/lakes-geo${qs}`); // FeatureCollection (server-side filtered)
      if (fc?.type === "FeatureCollection") {
        setPublicFC(fc);

        // Force remount of the base GeoJSON so leaflet replaces the layer
        setBaseKey((v) => v + 1);

        // Do not auto-fit to all lakes when the GeoJSON renders.
        // Zoom/fitting should only occur on explicit user actions (click/select).
      } else {
        setPublicFC({ type: "FeatureCollection", features: [] });
      }
    } catch (e) {
      console.error("[MapPage] Failed to load public lakes", e);
      setPublicFC({ type: "FeatureCollection", features: [] });
    }
  };
  useEffect(() => { loadPublicLakes(); }, []);

  // Apply filters manually when user submits
  const handleApplyFilters = async (filters) => {
    setActiveFilters(filters || {});
    try {
      await loadPublicLakes(filters || {});
    } catch (e) {
      console.error('[MapPage] Failed to load filtered lakes', e);
    }
  };

  // ---------------- Layers list for selected lake (PUBLIC) ----------------
  const loadPublicLayersForLake = async (lakeId) => {
    // Clear overlays when switching lakes
    setLakeOverlayFeature(null);
    setWatershedOverlayFeature(null);
    setWatershedToggleOn(false);
    setBaseKey((v) => v + 1);

    if (!lakeId) {
      setLakeLayers([]);
      setLakeActiveLayerId(null);
      return;
    }
    try {
      const rows = await fetchPublicLayers({ bodyType: "lake", bodyId: lakeId });
      setLakeLayers(rows);
      const active = rows.find((r) => r.is_active);
      setLakeActiveLayerId(active ? active.id : null);
    } catch (e) {
      console.error("[MapPage] Failed to load public layers for lake", e);
      setLakeLayers([]);
      setLakeActiveLayerId(null);
    }
  };

  // Apply a selected layer as overlay (and hide base feature for that lake)
  const applyOverlayByLayerId = async (layerId, { fit = true } = {}) => {
    try {
      const row = await fetchPublicLayerGeo(layerId); // expects geom_geojson
      if (!row) {
        console.warn("[MapPage] Public layer not found:", layerId);
        setLakeOverlayFeature(null);
        setWatershedOverlayFeature(null);
        setBaseKey((v) => v + 1);
        return;
      }
      const geomStr = row.geom_geojson || null;
      if (!geomStr) {
        console.warn("[MapPage] No geometry returned for layer", layerId);
        if ((row.body_type || '').toLowerCase() === 'watershed') {
          setWatershedOverlayFeature(null);
          setWatershedToggleOn(false);
        } else {
          setLakeOverlayFeature(null);
          setBaseKey((v) => v + 1);
        }
        return;
      }
      let geometry = null;
      try { geometry = JSON.parse(geomStr); } catch (e) {
        console.warn("[MapPage] Failed to parse geometry for layer", layerId, e);
        if ((row.body_type || '').toLowerCase() === 'watershed') {
          setWatershedOverlayFeature(null);
          setWatershedToggleOn(false);
        } else {
          setLakeOverlayFeature(null);
          setBaseKey((v) => v + 1);
        }
        return;
      }

      const feature = {
        type: "Feature",
        properties: {
          layer_id: row.id,
          body_type: row.body_type || "lake",
          name: row.name,
          organization: row.uploaded_by_org || "LakeView",
        },
        geometry,
      };

      if ((feature.properties.body_type || "lake").toLowerCase() === "watershed") {
        setWatershedOverlayFeature(feature);
        if (fit && mapRef.current) {
          try {
            const gj = L.geoJSON(feature);
            const b = gj.getBounds();
            if (b?.isValid?.() === true) {
              mapRef.current.fitBounds(b, { padding: [24, 24], maxZoom: 13 });
            }
          } catch (e) {
            console.warn('[MapPage] Could not compute bounds for watershed overlay', e);
          }
        }
      } else {
        setLakeOverlayFeature(feature);
        setBaseKey((v) => v + 1);
        if (fit && mapRef.current) {
          try {
            const gj = L.geoJSON(feature);
            const b = gj.getBounds();
            if (b?.isValid?.() === true) {
              mapRef.current.fitBounds(b, { padding: [24, 24], maxZoom: 13 });
            }
          } catch (e) {
            console.warn("[MapPage] Could not compute bounds for overlay", e);
          }
        }
      }
    } catch (e) {
      console.error("[MapPage] Failed to fetch overlay layer", layerId, e);
      setLakeOverlayFeature(null);
      setWatershedOverlayFeature(null);
      setBaseKey((v) => v + 1);
    }
  };

  // Helper: does a base feature correspond to the selected lake?
  const baseMatchesSelectedLake = (feat) => {
    if (!lakeOverlayFeature) return false; // only hide base lake when a lake overlay exists
    const fid = getLakeIdFromFeature(feat);
    if (selectedLakeId != null && fid != null) {
      return String(fid) === String(selectedLakeId);
    }
    // fallback by name if we don't have an id
    const fname = (feat?.properties?.name || "").trim().toLowerCase();
    return selectedLakeId == null &&
           !!selectedLakeName &&
           fname === String(selectedLakeName).trim().toLowerCase();
  };

  const handlePanelToggleWatershed = async (checked) => {
    setWatershedToggleOn(checked);
    if (!checked) {
      setWatershedOverlayFeature(null);
      return;
    }
    if (!selectedWatershedId) {
      setWatershedToggleOn(false);
      return;
    }
    try {
      const candidates = await fetchPublicLayers({ bodyType: 'watershed', bodyId: selectedWatershedId });
      const target = candidates?.find((l) => l.is_active) || candidates?.[0];
      if (!target) {
        setWatershedToggleOn(false);
        return;
      }
      await applyOverlayByLayerId(target.id, { fit: true });
    } catch (err) {
      console.error('[MapPage] Failed to toggle watershed overlay', err);
      setWatershedToggleOn(false);
    }
  };

  // ---------------- Hotkeys (L / Esc) ----------------
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (["input","textarea","select"].includes(tag)) return;
      const k = e.key?.toLowerCase?.();
      if (k === "l") setLakePanelOpen(v => !v);
      if (k === "escape") setLakePanelOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const togglePopulationHeatmap = (on, distanceKm) => {
    console.log("[Heatmap]", on ? "ON" : "OFF", "distance:", distanceKm, "km");
  };

  const themeClass = selectedView === "satellite" ? "map-dark" : "map-light";
  const worldBounds = [[4.6,116.4],[21.1,126.6]];

  // Listen for jump-to-station events (fallback)
  useEffect(() => {
    const onJump = (e) => {
      const lat = Number(e?.detail?.lat);
      const lon = Number(e?.detail?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !mapRef.current) {
        console.log('[MapPage] ignoring lv-jump-to-station - invalid or map not ready', e?.detail);
        return;
      }
      setWqMarker({ lat, lon });
      console.log('[MapPage] lv-jump-to-station flying to', lat, lon);
      try { mapRef.current.flyTo([lat, lon], 13, { duration: 0.8 }); } catch {}
    };
    window.addEventListener('lv-jump-to-station', onJump);
    return () => window.removeEventListener('lv-jump-to-station', onJump);
  }, []);

  // Persistent Water Quality markers: listen for list updates
  useEffect(() => {
    const onWqMarkers = (e) => {
      const markers = Array.isArray(e?.detail?.markers) ? e.detail.markers : [];
      // If map isn't ready yet, queue markers to be flushed later
      if (!mapRef.current) {
        queuedWqMarkersRef.current = markers || [];
        console.log('[MapPage] map not ready - queued lv-wq-markers', queuedWqMarkersRef.current);
        return;
      }
      try {
        if (!wqLayerRef.current) {
          wqLayerRef.current = L.layerGroup().addTo(mapRef.current);
        }
        wqLayerRef.current.clearLayers();
        console.log('[MapPage] received lv-wq-markers', markers);
        markers.forEach((m) => {
          if (m && Number.isFinite(m.lat) && Number.isFinite(m.lon)) {
            const cm = L.circleMarker([m.lat, m.lon], { radius: 6, color: '#ff6b6b', weight: 2, fillColor: '#ffffff', fillOpacity: 0.9 });
            if (m.label) cm.bindPopup(m.label);
            cm.addTo(wqLayerRef.current);
          }
        });
      } catch (err) {
        console.warn('[MapPage] Failed updating WQ markers layer', err);
      }
    };
    const onWqActive = (e) => {
      const active = !!e?.detail?.active;
      if (!active && wqLayerRef.current) {
        try { wqLayerRef.current.clearLayers(); } catch {}
      }
    };
    window.addEventListener('lv-wq-markers', onWqMarkers);
    window.addEventListener('lv-wq-active', onWqActive);
    return () => {
      window.removeEventListener('lv-wq-markers', onWqMarkers);
      window.removeEventListener('lv-wq-active', onWqActive);
    };
  }, []);

  // Flush queued markers once the map becomes ready
  useEffect(() => {
    if (!mapReady) return;
    const queued = queuedWqMarkersRef.current || [];
    if (queued.length && mapRef.current) {
      try {
        console.log('[MapPage] flushing queued lv-wq-markers', queued);
        if (!wqLayerRef.current) wqLayerRef.current = L.layerGroup().addTo(mapRef.current);
        wqLayerRef.current.clearLayers();
        queued.forEach((m) => {
          if (m && Number.isFinite(m.lat) && Number.isFinite(m.lon)) {
            const cm = L.circleMarker([m.lat, m.lon], { radius: 6, color: '#ff6b6b', weight: 2, fillColor: '#ffffff', fillOpacity: 0.9 });
            if (m.label) cm.bindPopup(m.label);
            cm.addTo(wqLayerRef.current);
          }
        });
      } catch (err) {
        console.warn('[MapPage] Failed flushing queued WQ markers', err);
      }
    }
    queuedWqMarkersRef.current = [];
  }, [mapReady]);

  // Fallback: poll for mapRef availability and flush queued markers once
  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (mapRef.current) {
        if (!mapReady) setMapReady(true);
        const queued = queuedWqMarkersRef.current || [];
        if (queued.length) {
          try {
            console.log('[MapPage] fallback flush of queued lv-wq-markers', queued);
            if (!wqLayerRef.current) wqLayerRef.current = L.layerGroup().addTo(mapRef.current);
            wqLayerRef.current.clearLayers();
            queued.forEach((m) => {
              if (m && Number.isFinite(m.lat) && Number.isFinite(m.lon)) {
                const cm = L.circleMarker([m.lat, m.lon], { radius: 6, color: '#ff6b6b', weight: 2, fillColor: '#ffffff', fillOpacity: 0.9 });
                if (m.label) cm.bindPopup(m.label);
                cm.addTo(wqLayerRef.current);
              }
            });
            queuedWqMarkersRef.current = [];
          } catch (err) {
            console.warn('[MapPage] Failed fallback flush of WQ markers', err);
          }
        }
        clearInterval(interval);
      } else if (attempts > 60) { // ~12s at 200ms
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Render a temporary marker when wqMarker changes
  useEffect(() => {
    if (!wqMarker || !mapRef.current) return;
    let marker;
    try {
      marker = L.circleMarker([wqMarker.lat, wqMarker.lon], { radius: 7, color: '#2563eb', weight: 2, fillColor: '#93c5fd', fillOpacity: 0.9 }).addTo(mapRef.current);
    } catch {}
    const t = setTimeout(() => { try { marker && marker.remove(); } catch {} }, 4000);
    return () => { clearTimeout(t); try { marker && marker.remove(); } catch {} };
  }, [wqMarker]);

  return (
    <div className={themeClass} style={{ height: "100vh", width: "100vw", margin: 0, padding: 0 }}>
  <AppMap view={selectedView} zoomControl={false} whenCreated={(m) => { mapRef.current = m; try { window.lv_map = m; } catch {} setMapReady(true); }}>
    {/* Ensure mapRef is set even if whenCreated timing varies */}
    <MapRefBridge onReady={(m) => { if (!mapRef.current) { mapRef.current = m; try { window.lv_map = m; } catch {} setMapReady(true); } }} />
        {/* Base layer of all lakes; hides selected lake when an overlay is active */}
        {publicFC && (
          <GeoJSON
            key={`base-${baseKey}`}
            data={publicFC}
            filter={(feat) => !baseMatchesSelectedLake(feat)}
            style={{ color: "#3388ff", weight: 2, fillOpacity: 0.12 }}
            onEachFeature={(feat, layer) => {
              layer.on("click", () => {
                const p = feat?.properties || {};
                let lakeId =
                  getLakeIdFromFeature(feat) ??
                  (p && (p.lake_id ?? p.lakeId ?? p.id)) ??
                  null;

                setWatershedToggleOn(false);
                setSelectedWatershedId(null);
                setWatershedOverlayFeature(null);
                setSelectedLake({
                  id: lakeId,
                  name: p.name,
                  alt_name: p.alt_name,
                  region: p.region,
                  province: p.province,
                  municipality: p.municipality,
                  watershed_name: p.watershed_name,
                  watershed_id: null,
                  surface_area_km2: p.surface_area_km2,
                  elevation_m: p.elevation_m,
                  mean_depth_m: p.mean_depth_m,
                });
                setSelectedLakeId(lakeId);
                setSelectedLakeName(p?.name || null);
                setLakePanelOpen(true);

                (async () => {
                  if (lakeId == null && p?.name) {
                    try {
                      const opts = await fetchLakeOptions(p.name);
                      const exact = opts.find(o => (o.name || "").toLowerCase() === String(p.name).toLowerCase());
                      const candidate = exact || opts[0];
                      if (candidate?.id != null) {
                        lakeId = candidate.id;
                        setSelectedLakeId(lakeId);
                      }
                    } catch (e) {
                      console.warn("[MapPage] lake id lookup by name failed", e);
                    }
                  }

                  if (lakeId != null) {
                    try {
                      const detail = await api(`/lakes/${lakeId}`);
                      if (detail?.id && String(detail.id) === String(lakeId)) {
                        setSelectedLake((prev) => ({ ...prev, ...detail }));
                        setSelectedWatershedId(detail?.watershed_id ?? null);
                      }
                    } catch (err) {
                      console.warn('[MapPage] Failed to load lake detail', err);
                      setSelectedWatershedId(null);
                    }
                    await loadPublicLayersForLake(lakeId);
                  } else {
                    console.warn("[MapPage] No lakeId found on clicked feature; skipping layers fetch.", feat);
                    setSelectedWatershedId(null);
                    setLakeLayers([]);
                    setLakeActiveLayerId(null);
                  }
                })();

                // Fit to lake bounds
                if (mapRef.current) {
                  const b = layer.getBounds();
                  if (b?.isValid?.() === true) {
                    mapRef.current.fitBounds(b, { padding: [24, 24], maxZoom: 12 });
                  }
                }
              });

              layer.on("mouseover", () => layer.setStyle({ weight: 3 }));
              layer.on("mouseout",  () => layer.setStyle({ weight: 2 }));
            }}
          />
        )}

        {/* Watershed overlay (green) */}
        {watershedOverlayFeature && (
          <GeoJSON
            key={`watershed-${watershedOverlayFeature?.properties?.layer_id || 'x'}-${JSON.stringify(watershedOverlayFeature?.geometry ?? {}).length}`}
            data={watershedOverlayFeature}
            style={{ color: '#16a34a', weight: 2, fillOpacity: 0.15 }}
            onEachFeature={(feat, layer) => {
              const nm = feat?.properties?.name || 'Watershed';
              layer.bindTooltip(nm, { sticky: true });
            }}
          />
        )}

        {/* Lake overlay (blue) */}
        {lakeOverlayFeature && (
          <GeoJSON
            key={`lake-overlay-${lakeOverlayFeature?.properties?.layer_id || 'x'}-${JSON.stringify(lakeOverlayFeature?.geometry ?? {}).length}`}
            data={lakeOverlayFeature}
            style={{ color: '#3388ff', weight: 2.5, fillOpacity: 0.20 }}
            onEachFeature={(feat, layer) => {
              const nm = feat?.properties?.name || 'Layer';
              layer.bindTooltip(nm, { sticky: true });
            }}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pinned={sidebarPinned}
          setPinned={setSidebarPinned}
          onOpenAuth={(m) => { setAuthMode(m || "login"); setAuthOpen(true); }}
        />

        {/* Context Menu */}
        <MapWithContextMenu>
          {(map) => {
            map.on("click", () => { if (!sidebarPinned) setSidebarOpen(false); });
            map.on("dragstart", () => { if (!sidebarPinned) setSidebarOpen(false); });
            return (
              <ContextMenu
                map={map}
                onMeasureDistance={() => { setMeasureMode("distance"); setMeasureActive(true); }}
                onMeasureArea={() => { setMeasureMode("area"); setMeasureActive(true); }}
              />
            );
          }}
        </MapWithContextMenu>

        {/* Measure Tool */}
        <MeasureTool active={measureActive} mode={measureMode} onFinish={() => setMeasureActive(false)} />
        <CoordinatesScale />
        {/* Map Controls */}
        <MapControls defaultBounds={worldBounds} />
      </AppMap>

      {/* Lake Info Panel */}
      <LakeInfoPanel
        isOpen={lakePanelOpen}
        onClose={() => setLakePanelOpen(false)}
        lake={selectedLake}
        onJumpToStation={(lat, lon) => {
          if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || !mapRef.current) return;
          setWqMarker({ lat: Number(lat), lon: Number(lon) });
          try { mapRef.current.flyTo([Number(lat), Number(lon)], 13, { duration: 0.8 }); } catch {}
        }}
        onToggleHeatmap={(on, km) => {
          console.log("[Heatmap]", on ? "ON" : "OFF", "distance:", km, "km");
        }}
        layers={lakeLayers}
        activeLayerId={lakeActiveLayerId}
        onResetToActive={async () => {
          // Clear overlay and show the base feature again
          setWatershedToggleOn(false);
          setLakeOverlayFeature(null);
          setWatershedOverlayFeature(null);
          setBaseKey((v) => v + 1);

          // Fit back to the base geometry for this lake
          if (!publicFC || !selectedLakeId || !mapRef.current) return;
          const f = publicFC.features?.find((feat) => {
            const id = getLakeIdFromFeature(feat);
            return id != null && String(id) === String(selectedLakeId);
          });
          if (f) {
            try {
              const gj = L.geoJSON(f);
              const b = gj.getBounds();
              if (b?.isValid?.() === true) {
                mapRef.current.fitBounds(b, { padding: [24, 24], maxZoom: 13 });
              }
            } catch {}
          }
        }}
        onSelectLayer={async (layer) => {
          // Fetch overlay geometry and show it; base feature will be hidden for this lake
          await applyOverlayByLayerId(layer.id, { fit: true });
        }}
        showWatershed={watershedToggleOn}
        canToggleWatershed={Boolean(selectedWatershedId)}
        onToggleWatershed={handlePanelToggleWatershed}
      />

      {/* UI overlays */}
      <SearchBar onMenuClick={() => setSidebarOpen(true)} onFilterClick={() => setFilterTrayOpen((v) => !v)} />
      <FilterTray
        open={filterTrayOpen}
        onClose={() => setFilterTrayOpen(false)}
        onApply={(filters) => handleApplyFilters(filters)}
        initial={activeFilters}
      />
      <LayerControl selectedView={selectedView} setSelectedView={setSelectedView} />
      <ScreenshotButton />
      {/* Back to Dashboard */}
      {userRole && (
        <button
          className="map-back-btn"
          onClick={() => {
            if (userRole === "superadmin") navigate("/admin-dashboard");
            else if (userRole === "org_admin") navigate("/org-dashboard");
            else if (userRole === "contributor") navigate("/contrib-dashboard");
          }}
          title="Back to Dashboard"
          style={{ position: "absolute", bottom: 20, right: 20, zIndex: 1100, display: "inline-flex" }}
        >
          <FiArrowLeft />
        </button>
      )}

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => {
          setAuthOpen(false);
          if (location.pathname === "/login" || location.pathname === "/register") {
            navigate("/", { replace: true });
          }
        }}
      />
    </div>
  );
}

export default MapPage;
