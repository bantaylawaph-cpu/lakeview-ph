// ----------------------------------------------------
// Main Map Page Component for LakeView PH
// ----------------------------------------------------
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMap, GeoJSON, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import AppMap from "../../components/AppMap";
import MapControls from "../../components/MapControls";
import SearchBar from "../../components/SearchBar";
import LayerControl from "../../components/LayerControl";
import ScreenshotButton from "../../components/ScreenshotButton";
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
// ...existing code...
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
import KycPage from "./KycPage";
// ...existing code...
// KYC wizard removed from MapPage; documents are reviewed via admin/org pages
// ...existing code...
import KycPage from "./KycPage";

function MapWithContextMenu({ children }) {
  const map = useMap();
  return children(map);
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
// ...existing code...
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
// ...existing code...

  const [userRole, setUserRole] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false); // settings modal for any logged-in user
  const [feedbackOpen, setFeedbackOpen] = useState(false); // feedback modal
  const [authUser, setAuthUser] = useState(() => getCurrentUser());
  const [authMode, setAuthMode] = useState("login");
  // KYC wizard removed; keep admin/org review flows only
// ...existing code...
  const [kycOpen, setKycOpen] = useState(false);
  const [filterTrayOpen, setFilterTrayOpen] = useState(false);

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
      navigate('.', { replace: true, state: {} });
    }
  }, [location, navigate]);

  // KYC overlay routing removed

  useEffect(() => {
    const p = location.pathname;
    if (p === '/login') { setAuthMode('login'); openAuth('login'); }
    if (p === '/register') { setAuthMode('register'); openAuth('register'); }
  }, [location.pathname, openAuth, setAuthMode]);

  // ---------------- Fetch public lake geometries ----------------
  const { publicFC, activeFilters, applyFilters, baseKey: lakesBaseKey } = usePublicLakes();

  // ---------------- Layers list for selected lake (PUBLIC) ----------------
  const {
    selectedLake, selectedLakeId, watershedToggleOn,
    lakeOverlayFeature, watershedOverlayFeature, lakeLayers, lakeActiveLayerId,
    baseMatchesSelectedLake, baseKeyBump,
    selectLakeFeature, applyOverlayByLayerId, handlePanelToggleWatershed, resetToActive
  } = useLakeSelection({ publicFC, mapRef, setPanelOpen: setLakePanelOpen });

  useHotkeys({ toggleLakePanel: () => setLakePanelOpen(v => !v), closeLakePanel: () => setLakePanelOpen(false) });

  const { enabled: heatEnabled, loading: heatLoading, error: heatError, resolution: heatResolution, toggle: togglePopulationHeatmap, clearError: clearHeatError } = usePopulationHeatmap({ mapRef, selectedLake });

  // population estimate event handling now inside hook

  // auto-refresh handled inside population heatmap hook

  const themeClass = selectedView === "satellite" ? "map-dark" : "map-light";
  const worldBounds = [[4.6,116.4],[21.1,126.6]];

  const { jumpToStation } = useWaterQualityMarkers(mapRef);

  // Flows state
  const [showFlows, setShowFlows] = useState(false);
  const [flows, setFlows] = useState([]);
  // fetch flows whenever selected lake changes (so Overview can list even if markers hidden)
  useEffect(()=>{
    let abort = false;
    const load = async () => {
      if (!selectedLakeId) { setFlows([]); return; }
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
        onJumpToStation={jumpToStation}
        onToggleHeatmap={togglePopulationHeatmap}
        layers={lakeLayers}
        activeLayerId={lakeActiveLayerId}
        onResetToActive={resetToActive}
        onSelectLayer={async (layer) => {
          // Fetch overlay geometry and show it; base feature will be hidden for this lake
          await applyOverlayByLayerId(layer.id, { fit: true });
        }}
        showWatershed={watershedToggleOn}
        canToggleWatershed={Boolean(selectedLake?.watershed_id || selectedLake?.watershedId || true)}
        onToggleWatershed={handlePanelToggleWatershed}
          authUser={authUser}
  onToggleFlows={(checked)=>setShowFlows(checked)}
  showFlows={showFlows}
  flows={flows}
  onJumpToFlow={jumpToFlow}
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
      {heatEnabled && !heatLoading && <HeatmapLegend resolution={heatResolution} />}
      {/* Back to Dashboard */}
      <BackToDashboardButton role={userRole} />

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

export default MapPage;
