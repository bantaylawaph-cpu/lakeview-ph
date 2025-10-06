// ----------------------------------------------------
// Main Map Page Component for LakeView PH
// ----------------------------------------------------
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { api, getToken, apiPublic } from "../../lib/api";
import { getCurrentUser, isStale, setCurrentUser } from "../../lib/authState";
import { fetchPublicLayers, fetchLakeOptions, fetchPublicLayerGeo } from "../../lib/layers";
import { useMap, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { createHeatLayer, fetchPopPoints, fetchPopPointsProgressive } from "../../map/leafletHeat";

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
import Modal from "../../components/Modal"; // retained for other modals if needed
import PublicSettingsModal from "../../components/settings/PublicSettingsModal";
import FeedbackModal from "../../components/feedback/FeedbackModal";

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
  const [selectedView, setSelectedView] = useState("osm");
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
  const popHeatLayerRef = useRef(null); // Leaflet.heat layer

  const [measureActive, setMeasureActive] = useState(false);
  const [measureMode, setMeasureMode] = useState("distance");

  const [userRole, setUserRole] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false); // settings modal for any logged-in user
  const [feedbackOpen, setFeedbackOpen] = useState(false); // feedback modal
  const [authUser, setAuthUser] = useState(() => getCurrentUser());
  const [authMode, setAuthMode] = useState("login");

  const [publicFC, setPublicFC] = useState(null);
  const [filterTrayOpen, setFilterTrayOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [heatLoading, setHeatLoading] = useState(false);
  const [heatProgress, setHeatProgress] = useState(null); // null=indeterminate, 0..1 determinate
  const [heatEnabled, setHeatEnabled] = useState(false);
  const [heatError, setHeatError] = useState(null);
  const [heatResolution, setHeatResolution] = useState(null); // 'preview' | 'final'
  const lastHeatRef = useRef(null); // cache last heat dataset (points + bbox + meta)
  const heatParamsRef = useRef(null); // { year, km, layerId }
  const heatDebounceRef = useRef(null);
  const heatAbortRef = useRef(null);
  const heatInFlightRef = useRef(false);
  const estimateInFlightRef = useRef(false); // track population estimate priority
  const pendingHeatFetchRef = useRef(null); // queued heat fetch while estimate running

  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);
  const wqLayerRef = useRef(null); // persistent WQ markers layer
  const queuedWqMarkersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const zoomLockedRef = useRef(true);
  // ---------------- Auth / route modal (centralized auth state) ----------------
  useEffect(() => {
    // Helper to derive role from cached/current user object
    const deriveRole = (u) => {
      if (!u) return null;
      return ['superadmin','org_admin','contributor'].includes(u.role) ? u.role : null;
    };

    const applyFromCache = () => {
      const cached = getCurrentUser();
      setUserRole(deriveRole(cached));
    };

    if (!getToken()) {
      setUserRole(null);
    } else {
      // Immediate optimistic role from cache
      applyFromCache();
      // Fetch fresh if absent or stale
      const needFetch = !getCurrentUser() || isStale();
      if (needFetch) {
        (async () => {
          try {
            const res = await api('/auth/me');
            const u = res?.data || res;
            setCurrentUser(u, { silent: true }); // we'll emit a separate event manually for control
            setUserRole(deriveRole(u));
            // Manually dispatch update so other listeners sync (authState set silent)
            try { window.dispatchEvent(new CustomEvent('lv-user-update', { detail: u })); } catch {}
          } catch {
            setUserRole(null);
          }
        })();
      }
    }

    const onUserUpdate = (e) => {
      const u = e.detail || getCurrentUser();
      setUserRole(deriveRole(u));
      setAuthUser(u);
    };
    const onAuthChange = () => {
      if (!getToken()) { setUserRole(null); return; }
      const u = getCurrentUser();
      if (u) { setUserRole(deriveRole(u)); setAuthUser(u); } else {
        // fetch once if cache empty
        (async () => {
          try {
            const res = await api('/auth/me');
            const fetched = res?.data || res;
            setCurrentUser(fetched);
            setUserRole(deriveRole(fetched));
            setAuthUser(fetched);
          } catch { setUserRole(null); }
        })();
      }
    };
    window.addEventListener('lv-user-update', onUserUpdate);
    window.addEventListener('lv-auth-change', onAuthChange);
    return () => {
      window.removeEventListener('lv-user-update', onUserUpdate);
      window.removeEventListener('lv-auth-change', onAuthChange);
    };
  }, []);

  // Listen for global open-settings events (from Sidebar or elsewhere)
  useEffect(() => {
    const onOpen = () => setSettingsOpen(true);
    window.addEventListener('lv-open-settings', onOpen);
    return () => window.removeEventListener('lv-open-settings', onOpen);
  }, []);

  // Support navigation with state { openSettings: true }
  useEffect(() => {
    if (location.pathname === '/' && location.state?.openSettings) {
      setSettingsOpen(true);
      // clear state so back button doesn't reopen repeatedly
      navigate('.', { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    const p = location.pathname;
    if (p === "/login")  { setAuthMode("login"); setAuthOpen(true); }
    if (p === "/register") { setAuthMode("register"); setAuthOpen(true); }
  }, [location.pathname]);

  // ---------------- Fetch public lake geometries ----------------
  const loadPublicLakes = async (filters = {}) => {
    try {
      const qs = buildQuery(filters || {});
  const fc = await apiPublic(`/public/lakes-geo${qs}`); // FeatureCollection (server-side filtered)
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

  const togglePopulationHeatmap = useCallback((on, opts) => {
    const map = mapRef.current;
    if (!map) return;
    if (!on) {
      try {
        if (popHeatLayerRef.current) {
          map.removeLayer(popHeatLayerRef.current);
          popHeatLayerRef.current = null;
        }
      } catch {}
      setHeatLoading(false);
      setHeatEnabled(false);
      heatParamsRef.current = null;
      if (heatDebounceRef.current) { clearTimeout(heatDebounceRef.current); heatDebounceRef.current = null; }
      if (heatAbortRef.current) { try { heatAbortRef.current.abort(); } catch {} heatAbortRef.current = null; }
      heatInFlightRef.current = false;
      return;
    }
    if (!selectedLake?.id) return;
    // Guard: if requested km is 0 or falsy, treat as disabled (no fetch)
    if (!opts || Number(opts.km) <= 0) {
      try {
        if (popHeatLayerRef.current) {
          map.removeLayer(popHeatLayerRef.current);
          popHeatLayerRef.current = null;
        }
      } catch {}
      setHeatEnabled(false);
      setHeatLoading(false);
      return;
    }
    setHeatEnabled(true);
    heatParamsRef.current = {
      year: Number(opts?.year || 2025),
      km: Number(opts?.km || 2),
      layerId: opts?.layerId ?? null,
    };

    if (opts?.loading) setHeatLoading(true);

    const fetchAndRender = () => {
      const p = heatParamsRef.current;
      if (!p) return;
      if (heatInFlightRef.current) {
        try { heatAbortRef.current && heatAbortRef.current.abort(); } catch {}
      }
        // If estimate is in flight, queue this heat fetch until estimate completes
        if (estimateInFlightRef.current) {
          pendingHeatFetchRef.current = fetchAndRender;
          setHeatLoading(true);
          setHeatResolution(null);
          return;
        }
      const controller = new AbortController();
      heatAbortRef.current = controller;
      const zoom = map.getZoom?.() || 8;
      // Adaptive max points by zoom (coarse zoom fewer points)
      const maxPoints = zoom >= 13 ? 8000 : zoom >= 11 ? 6000 : zoom >= 9 ? 4000 : 2500;
      const smallPoints = Math.min(1200, Math.floor(maxPoints / 4));
      const params = {
        lakeId: selectedLake.id,
        year: p.year,
        radiusKm: p.km,
        layerId: p.layerId,
        bbox: (() => {
          try {
            const b = map.getBounds();
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            return `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
          } catch { return null; }
        })(),
        maxPoints,
        smallPoints,
      };
      heatInFlightRef.current = true;
      setHeatProgress(null);
      const runner = fetchPopPointsProgressive(params, {
        onIntermediate: (pts) => {
          if (!popHeatLayerRef.current) {
            const layer = createHeatLayer(pts);
            popHeatLayerRef.current = layer;
            layer.addTo(map);
          } else {
            popHeatLayerRef.current.__setData?.(pts);
          }
          setHeatError(null);
          setHeatLoading(true); // still loading final
          setHeatResolution('preview');
        },
        onFinal: (pts) => {
          if (popHeatLayerRef.current) {
            popHeatLayerRef.current.__setData?.(pts);
          } else {
            const layer = createHeatLayer(pts);
            popHeatLayerRef.current = layer;
            layer.addTo(map);
          }
          setHeatLoading(false);
          setHeatError(null);
          setHeatResolution('final');
        },
        onError: (e) => {
          if (e?.name === 'CanceledError' || e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') return;
          console.warn('[Heatmap] progressive fetch failed', e);
          setHeatError('Failed to load population points');
          setHeatLoading(false);
          setHeatResolution(null);
        }
      }, { signal: controller.signal });
      controller.signal.addEventListener('abort', () => {
        setHeatLoading(false);
      });
      // We could use onDownloadProgress from underlying calls; intermediate already quick
      runner.promise.finally(() => {
        heatInFlightRef.current = false;
        setHeatProgress(null);
      });
    };

    fetchAndRender();
  }, [selectedLake?.id]);

  // Listen for population estimate lifecycle to prioritize its network over heat requests
  useEffect(() => {
    const handler = (e) => {
      const st = e?.detail?.state;
      if (st === 'start') {
        estimateInFlightRef.current = true;
        // Abort any in-flight heat fetch to free network/CPU
        if (heatAbortRef.current) { try { heatAbortRef.current.abort(); } catch {} }
        // Keep heat layer displayed (stale) but show loading indicator if enabled
        if (heatEnabled) { setHeatLoading(true); setHeatResolution(null); }
      } else if (st === 'done') {
        estimateInFlightRef.current = false;
        // If a heat fetch was queued, run it now
        const queued = pendingHeatFetchRef.current;
        if (queued) {
          pendingHeatFetchRef.current = null;
          // slight microtask delay to ensure estimate UI updates flush
          setTimeout(() => { try { queued(); } catch (err) { console.warn('[Heatmap] queued fetch failed', err); } }, 0);
        } else if (heatEnabled) {
          // If no queued fetch but heat is enabled & we aborted earlier, re-trigger refresh
          const p = heatParamsRef.current;
            if (p) togglePopulationHeatmap(true, { km: p.km, year: p.year, layerId: p.layerId });
        }
      }
    };
    window.addEventListener('lv-pop-estimate', handler);
    return () => window.removeEventListener('lv-pop-estimate', handler);
  }, [heatEnabled, togglePopulationHeatmap]);

  // Auto-refresh heat points when the map moves/zooms and heat is enabled
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const schedule = () => {
      if (!heatEnabled) return;
      if (heatDebounceRef.current) clearTimeout(heatDebounceRef.current);
      // slight debounce to avoid rapid refetches during quick pans/zooms
      heatDebounceRef.current = setTimeout(async () => {
        heatDebounceRef.current = null;
        // Reuse toggle handler to fetch with current params and bbox
        try {
          setHeatLoading(true);
          const p = heatParamsRef.current || {};
          // Call as an update (on already true)
          togglePopulationHeatmap(true, { km: p.km, year: p.year, layerId: p.layerId });
        } catch {}
      }, 200);
    };

    if (heatEnabled) {
      map.on('moveend', schedule);
      map.on('zoomend', schedule);
    }
    return () => {
      if (heatEnabled) {
        try { map.off('moveend', schedule); } catch {}
        try { map.off('zoomend', schedule); } catch {}
      }
      if (heatDebounceRef.current) { clearTimeout(heatDebounceRef.current); heatDebounceRef.current = null; }
      if (heatAbortRef.current) { try { heatAbortRef.current.abort(); } catch {} heatAbortRef.current = null; }
    };
  }, [heatEnabled]);

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
    <div className={themeClass} style={{ height: "100vh", width: "100vw", margin: 0, padding: 0, position: 'relative' }}>
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
                      // Try public detail first to avoid 401s when unauthenticated
                      const pub = await apiPublic(`/public/lakes/${lakeId}`);
                      const detail = pub?.id ? pub : await apiPublic(`/lakes/${lakeId}`);
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
          onOpenFeedback={() => { setFeedbackOpen(true); if (!sidebarPinned) setSidebarOpen(false); }}
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
        onToggleHeatmap={togglePopulationHeatmap}
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
      {heatLoading && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1200, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '8px 10px', borderRadius: 6, fontSize: 12, minWidth: 180 }}>
          <div style={{ marginBottom: 6 }}>Loading heatmap…</div>
          <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 999 }}>
            {heatProgress === null ? (
              <div style={{ position: 'absolute', height: '100%', width: '40%', left: 0, background: 'linear-gradient(90deg,#3b82f6,#93c5fd)', borderRadius: 999, animation: 'lvHeatInd 1.1s infinite' }} />
            ) : (
              <div style={{ position: 'absolute', height: '100%', width: `${Math.round(heatProgress * 100)}%`, left: 0, background: 'linear-gradient(90deg,#3b82f6,#93c5fd)', borderRadius: 999 }} />
            )}
          </div>
          <style>{`@keyframes lvHeatInd {0%{left:-40%}100%{left:100%}}`}</style>
        </div>
      )}
      {heatError && !heatLoading && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1200, background: 'rgba(127,29,29,0.8)', color: '#fff', padding: '8px 10px', borderRadius: 6, fontSize: 12, maxWidth: 220 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Heatmap Error</div>
          <div style={{ lineHeight: 1.3 }}>{heatError}</div>
          <button onClick={() => { setHeatError(null); }} style={{ marginTop: 6, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Dismiss</button>
        </div>
      )}
      {heatEnabled && !heatLoading && (
        <div style={{ position: 'absolute', bottom: 90, left: 12, zIndex: 900, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: 11, maxWidth: 220 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Population Density</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 10, background: 'linear-gradient(90deg, rgba(0,0,255,0), #2563eb, #10b981, #fbbf24, #ef4444)', borderRadius: 4 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ opacity: 0.8 }}>low</span>
              <span style={{ opacity: 0.8 }}>high</span>
            </div>
          </div>
          <div style={{ marginTop: 6, lineHeight: 1.3, opacity: 0.85 }}>
            Relative intensity scaled to local distribution (95th percentile cap & sqrt compression).
          </div>
          {heatResolution === 'preview' && (
            <div style={{ marginTop: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 }}>Preview sample… refining</div>
          )}
          {heatResolution === 'final' && (
            <div style={{ marginTop: 4, fontSize: 10, opacity: 0.55 }}>Final resolution</div>
          )}
        </div>
      )}
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

      {/* Settings Modal (public context) */}
      {authUser && (
        <PublicSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      )}

      {/* Feedback Modal */}
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

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
