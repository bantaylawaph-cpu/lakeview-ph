// ----------------------------------------------------
// Main Map Page Component for LakeView PH
// ----------------------------------------------------
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMap, GeoJSON, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import AppMap from "../../components/AppMap";
import MapControls from "../../components/MapControls";
import SearchBar from "../../components/SearchBar";
import LayerControl from "../../components/LayerControl";
import ScreenshotButton from "../../components/Screenshotbutton";
import CoordinatesScale from "../../components/CoordinatesScale"
import Sidebar from "../../components/Sidebar";
import KycPage from "./KycPage";
import ContextMenu from "../../components/ContextMenu";
import MeasureTool from "../../components/MeasureTool";
import LakeInfoPanel from "../../components/LakeInfoPanel";
import AuthModal from "../../components/modals/AuthModal";
import FilterTray from "../../components/FilterTray";
import PublicSettingsModal from "../../components/settings/PublicSettingsModal";
import FeedbackModal from "../../components/feedback/FeedbackModal";
import HeatmapLoadingIndicator from "../../components/HeatmapLoadingIndicator";
import HeatmapLegend from "../../components/HeatmapLegend";
import BackToDashboardButton from "../../components/BackToDashboardButton";
import BaseLakesLayer from "../../components/BaseLakesLayer";
import { useAuthRole } from "./hooks/useAuthRole";
import { usePublicLakes } from "./hooks/usePublicLakes";
import { useLakeSelection } from "./hooks/useLakeSelection";
import { usePopulationHeatmap } from "./hooks/usePopulationHeatmap";
import { useWaterQualityMarkers } from "./hooks/useWaterQualityMarkers";
import { useHotkeys } from "./hooks/useHotkeys";
import DataPrivacyDisclaimer from "./DataPrivacyDisclaimer";
import AboutData from "./AboutData";

function MapWithContextMenu({ children }) {
  const map = useMap();
  return children(map);
}
// ...existing code...

// Bridge component to ensure we capture the Leaflet map instance reliably
function MapRefBridge({ onReady }) {
  const map = useMap();
  useEffect(() => {
    if (map && typeof onReady === 'function') onReady(map);
  }, [map, onReady]);
  return null;
}

// getLakeIdFromFeature no longer used directly in MapPage (handled inside hooks)

function MapPage() {
  // ---------------- State ----------------
  const [selectedView, setSelectedView] = useState("osm");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [lakePanelOpen, setLakePanelOpen] = useState(false);
  const [measureActive, setMeasureActive] = useState(false);
  const [measureMode, setMeasureMode] = useState("distance");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false); // data privacy modal
  const [aboutDataOpen, setAboutDataOpenModal] = useState(false); // about data modal
  const [kycOpen, setKycOpen] = useState(false);
  const [filterTrayOpen, setFilterTrayOpen] = useState(false);
  const [aboutDataMenuOpen, setAboutDataMenuOpen] = useState(false);
  const aboutDataMenuOpenRef = React.useRef(false);
  useEffect(() => { aboutDataMenuOpenRef.current = aboutDataMenuOpen; }, [aboutDataMenuOpen]);

  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);
  // ---------------- Auth / route modal (centralized auth state) ----------------
  const { userRole, authUser, authOpen, authMode, openAuth, closeAuth, setAuthMode } = useAuthRole();

  // Listen for global open-settings events (from Sidebar or elsewhere)
  useEffect(() => {
    const onOpen = () => setSettingsOpen(true);
    window.addEventListener('lv-open-settings', onOpen);
    return () => window.removeEventListener('lv-open-settings', onOpen);
  }, []);

  // Global trigger to open Data Privacy modal
  useEffect(() => {
    const onOpen = () => setPrivacyOpen(true);
    window.addEventListener('lv-open-privacy', onOpen);
    return () => window.removeEventListener('lv-open-privacy', onOpen);
  }, []);

  // Global trigger to open About Data modal
  useEffect(() => {
    const onOpen = () => setAboutDataOpenModal(true);
    window.addEventListener('lv-open-about-data', onOpen);
    return () => window.removeEventListener('lv-open-about-data', onOpen);
  }, []);

  // Support navigation with state { openSettings: true }
  useEffect(() => {
    if (location.pathname === '/' && location.state?.openSettings) {
      setSettingsOpen(true);
      // clear state so back button doesn't reopen repeatedly
      navigate('.', { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Route-based auth/privacy handling
  useEffect(() => {
    const p = location.pathname;
    if (p === '/login') { setAuthMode('login'); openAuth('login'); }
    if (p === '/register') { setAuthMode('register'); openAuth('register'); }
    if (p === '/data/privacy') { setPrivacyOpen(true); }
    if (p === '/data') { setAboutDataOpenModal(true); }
  }, [location.pathname, openAuth, setAuthMode]);
  
  // Keep sidebar open when navigating to /data routes (so submenu doesn't appear collapsed after auto-close)
  useEffect(() => {
    if (/^\/data(\/.*)?$/.test(location.pathname || '')) {
      setSidebarOpen(true);
    }
  }, [location.pathname]);
// Data Privacy Disclaimer integration resolved

  // ---------------- Fetch public lake geometries ----------------
  const { publicFC, activeFilters, applyFilters, baseKey: lakesBaseKey } = usePublicLakes();

  // ---------------- Layers list for selected lake (PUBLIC) ----------------
  const {
    selectedLake, selectedLakeId, watershedToggleOn,
    lakeOverlayFeature, watershedOverlayFeature, lakeLayers, lakeActiveLayerId,
    baseMatchesSelectedLake, baseKeyBump,
    selectLakeFeature, applyOverlayByLayerId, handlePanelToggleWatershed, resetToActive,
    canToggleNominatim, nominatimEnabled, setNominatimEnabled, nominatimLoading,
  } = useLakeSelection({ publicFC, mapRef, setPanelOpen: setLakePanelOpen });

  useHotkeys({ toggleLakePanel: () => setLakePanelOpen(v => !v), closeLakePanel: () => setLakePanelOpen(false) });

  // Compute selected lake bounds (prefer overlay; else from base FeatureCollection)
  const selectedLakeBounds = useMemo(() => {
    try {
      if (lakeOverlayFeature) {
        const gj = L.geoJSON(lakeOverlayFeature); const b = gj.getBounds();
        if (b && b.isValid && b.isValid()) return b;
      }
      if (publicFC && selectedLakeId != null) {
        const getLakeIdFromFeature = (feat) => {
          const p = feat?.properties || {};
          return feat?.id ?? p.id ?? p.lake_id ?? p.lakeId ?? p.lakeID ?? null;
        };
        const f = publicFC.features?.find(ft => {
          const id = getLakeIdFromFeature(ft);
          return id != null && String(id) === String(selectedLakeId);
        });
        if (f) { const gj = L.geoJSON(f); const b = gj.getBounds(); if (b && b.isValid && b.isValid()) return b; }
      }
    } catch {}
    return null;
  }, [lakeOverlayFeature, publicFC, selectedLakeId]);

  const { enabled: heatEnabled, loading: heatLoading, error: heatError, resolution: heatResolution, toggle: togglePopulationHeatmap, clear: clearHeatmap, hasLayer: hasHeatLayer, clearError: clearHeatError } = usePopulationHeatmap({ mapRef, selectedLake, lakeBounds: selectedLakeBounds });

  // population estimate event handling now inside hook

  // auto-refresh handled inside population heatmap hook

  const themeClass = selectedView === "satellite" ? "map-dark" : "map-light";
  const worldBounds = [[4.6,116.4],[21.1,126.6]];

  const { jumpToStation } = useWaterQualityMarkers(mapRef);

  // Flows state
  const [showFlows, setShowFlows] = useState(false);
  // null = loading, [] = loaded but empty, array = loaded
  const [flows, setFlows] = useState(null);
  // fetch flows whenever selected lake changes (so Overview can list even if markers hidden)
  useEffect(()=>{
    let abort = false;
    const load = async () => {
      if (!selectedLakeId) { setFlows([]); return; }
      // indicate loading
      setFlows(null);
      try {
        const res = await fetch(`/api/public/lake-flows?lake_id=${selectedLakeId}`);
        if (!res.ok) return; const js = await res.json();
        if (!abort) setFlows(Array.isArray(js) ? js : []);
      } catch(e) { if (!abort) setFlows([]); }
    };
    load();
    return () => { abort = true; };
  }, [selectedLakeId]);

  const jumpToFlow = (flow) => {
    if (!flow || !mapRef.current) return;
    if (flow.latitude && flow.longitude) {
      mapRef.current.flyTo([flow.latitude, flow.longitude], 14, { duration: 0.6 });
    }
    if (!showFlows) setShowFlows(true);
  };

  // Dedicated effect for map interaction close logic to avoid stale closures & duplicates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handlerClick = () => {
      if (sidebarPinned) return;
      if (aboutDataMenuOpenRef.current) return; // keep open when submenu open
      if (/^\/data(\/.*)?$/.test(location.pathname || '')) return; // keep for data routes
      setSidebarOpen(false);
    };
    const handlerDrag = handlerClick;
    map.on('click', handlerClick);
    map.on('dragstart', handlerDrag);
    return () => {
      map.off('click', handlerClick);
      map.off('dragstart', handlerDrag);
    };
  }, [sidebarPinned, location.pathname]);

  return (
    <div className={themeClass} style={{ height: "100vh", width: "100vw", margin: 0, padding: 0, position: 'relative' }}>
  <AppMap view={selectedView} zoomControl={false} whenCreated={(m) => { mapRef.current = m; try { window.lv_map = m; } catch {} }}>
    {/* Ensure mapRef is set even if whenCreated timing varies */}
  <MapRefBridge onReady={(m) => { if (!mapRef.current) { mapRef.current = m; try { window.lv_map = m; } catch {} } }} />
        {/* Base layer of all lakes; hides selected lake when an overlay is active */}
        {publicFC && (
          <BaseLakesLayer
            key={`base-${lakesBaseKey + baseKeyBump}`}
            data={publicFC}
            hidePredicate={baseMatchesSelectedLake}
            onFeatureClick={selectLakeFeature}
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

        {/* Lake overlay (blue by default; violet when from Nominatim) */}
        {lakeOverlayFeature && (
          <GeoJSON
            key={`lake-overlay-${lakeOverlayFeature?.properties?.layer_id || 'x'}-${JSON.stringify(lakeOverlayFeature?.geometry ?? {}).length}`}
            data={lakeOverlayFeature}
            style={() => {
              const isNominatim = (lakeOverlayFeature?.properties?.layer_id === 'nominatim' || lakeOverlayFeature?.properties?.source === 'nominatim');
              return { color: isNominatim ? '#7c3aed' : '#3388ff', weight: 2.5, fillOpacity: 0.20 };
            }}
            onEachFeature={(feat, layer) => {
              const nm = feat?.properties?.name || 'Layer';
              layer.bindTooltip(nm, { sticky: true });
            }}
          />
        )}

        {showFlows && flows && flows.map((f) => {
          const lat = Number(f.latitude);
          const lon = Number(f.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          const isInflow = f.flow_type === 'inflow';
          const color = isInflow ? '#14b8a6' : '#7c3aed'; // teal / purple
          return (
            <CircleMarker
              key={`flow-${f.id}`}
              center={[lat, lon]}
              radius={7}
              pathOptions={{ color: color, fillColor: color, weight: 1, fillOpacity: 0.95 }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong style={{ textTransform: 'capitalize' }}>{f.flow_type}</strong><br />
                  {f.name || f.source || 'Flow Point'} {f.is_primary ? <em style={{ color: '#fbbf24' }}>★</em> : null}<br />
                  <small>Lat: {lat} Lon: {lon}</small>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pinned={sidebarPinned}
          setPinned={setSidebarPinned}
          onOpenAuth={(m) => { openAuth(m || 'login'); }}
          onOpenKyc={() => setKycOpen(true)}
          onOpenFeedback={() => { setFeedbackOpen(true); if (!sidebarPinned) setSidebarOpen(false); }}
          onAboutDataToggle={(open) => setAboutDataMenuOpen(open)}
        />

        {/* Context Menu */}
        <MapWithContextMenu>
          {(map) => (
            <ContextMenu
              map={map}
              onMeasureDistance={() => { setMeasureMode("distance"); setMeasureActive(true); }}
              onMeasureArea={() => { setMeasureMode("area"); setMeasureActive(true); }}
            />
          )}
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
        onJumpToStation={jumpToStation}
        onToggleHeatmap={togglePopulationHeatmap}
  onClearHeatmap={clearHeatmap}
  heatEnabled={heatEnabled}
  heatLoading={heatLoading}
        layers={lakeLayers}
        activeLayerId={lakeActiveLayerId}
        onResetToActive={resetToActive}
        onSelectLayer={async (layer) => {
          // Fetch overlay geometry and show it; base feature will be hidden for this lake
          await applyOverlayByLayerId(layer.id, { fit: true });
        }}
        showWatershed={watershedToggleOn}
        canToggleWatershed={Boolean(selectedLake?.watershed_id || selectedLake?.watershedId)}
        onToggleWatershed={handlePanelToggleWatershed}
          canToggleNominatim={canToggleNominatim}
          nominatimEnabled={nominatimEnabled}
          nominatimLoading={nominatimLoading}
          onToggleNominatim={setNominatimEnabled}
          authUser={authUser}
  onToggleFlows={(checked)=>setShowFlows(checked)}
  showFlows={showFlows}
  flows={flows}
  onJumpToFlow={jumpToFlow}
  hasHeatLayer={hasHeatLayer}
  />

      {/* UI overlays */}
      <SearchBar onMenuClick={() => setSidebarOpen(true)} onFilterClick={() => setFilterTrayOpen((v) => !v)} />
      <FilterTray
        open={filterTrayOpen}
        onClose={() => setFilterTrayOpen(false)}
        onApply={(filters) => applyFilters(filters)}
        initial={activeFilters}
      />
      <LayerControl selectedView={selectedView} setSelectedView={setSelectedView} />
      <ScreenshotButton />
      {heatLoading && <HeatmapLoadingIndicator />}
      {heatError && !heatLoading && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1200, background: 'rgba(127,29,29,0.8)', color: '#fff', padding: '8px 10px', borderRadius: 6, fontSize: 12, maxWidth: 220 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Heatmap Error</div>
          <div style={{ lineHeight: 1.3 }}>{heatError}</div>
          <button onClick={clearHeatError} style={{ marginTop: 6, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Dismiss</button>
        </div>
      )}
  {hasHeatLayer && !heatLoading && <HeatmapLegend resolution={heatResolution} />}
      {/* Back to Dashboard */}
      <BackToDashboardButton role={userRole} />

      {/* Settings Modal (public context) */}
      {authUser && (
        <PublicSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      )}

      {/* Feedback Modal */}
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* Data Privacy Modal */}
      <DataPrivacyDisclaimer
        open={privacyOpen}
        onClose={() => {
          setPrivacyOpen(false);
          if (location.pathname === "/data/privacy") {
            // Return to map after closing modal that was opened via route
            navigate("/", { replace: true });
          }
        }}
      />

      {/* About Data Modal */}
      <AboutData
        open={aboutDataOpen}
        onClose={() => {
          setAboutDataOpenModal(false);
          if (location.pathname === "/data") {
            navigate("/", { replace: true });
          }
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => {
          closeAuth();
          if (location.pathname === '/login' || location.pathname === '/register') {
            navigate('/', { replace: true });
          }
        }}
      />

      {/* KYC modal (embedded) for public users */}
      {kycOpen && authUser && (!authUser.role || authUser.role === 'public') && (
        <KycPage embedded={true} open={kycOpen} onClose={() => setKycOpen(false)} />
      )}
      {/* Control KYC modal visibility via Modal within KycPage using open/close from state if needed */}
    </div>
  );
}

// Attach / reattach map interaction handlers outside of JSX to avoid stale closures / duplicates
// Placed after component so we can reuse internal hooks if reorganized; could also be inside component above return.
// NOTE: We rely on aboutDataMenuOpenRef for real-time state.
MapPage.prototype = {}; // no-op to keep file patch context

// Move effect inside component (must patch above before export) - adjusting by inserting below definition would not work; instead we embed effect earlier.

export default MapPage;
