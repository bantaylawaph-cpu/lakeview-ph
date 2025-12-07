import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMap } from "react-leaflet";
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
import SearchResultsPopover from "../../components/SearchResultsPopover";
import PublicSettingsModal from "../../components/settings/PublicSettingsModal";
import FeedbackModal from "../../components/feedback/FeedbackModal";
import HeatmapLoadingIndicator from "../../components/HeatmapLoadingIndicator";
import HeatmapLegend from "../../components/HeatmapLegend";
import BaseLakesLayer from "../../components/BaseLakesLayer";
import ElevationProfileTool from "../../components/ElevationProfileTool";
import SelectedLakeOverlays from "../../components/SelectedLakeOverlays";
import FlowsLayer from "../../components/FlowsLayer";
import { useAuthRole } from "./hooks/useAuthRole";
import { usePublicLakes } from "./hooks/usePublicLakes";
import { useLakeSelection } from "./hooks/useLakeSelection";
import { fetchPublicLayers } from "../../lib/layers";
import { usePopulationHeatmap } from "./hooks/usePopulationHeatmap";
import { useWaterQualityMarkers } from "./hooks/useWaterQualityMarkers";
import usePublicSearch from "./hooks/usePublicSearch";
import { alertError, alertInfo, showLoading, closeLoading } from "../../lib/alerts";
import DataPrivacyDisclaimer from "./DataPrivacyDisclaimer";
import AboutData from "./AboutData";
import DataSummaryTable from '../../components/stats-modal/DataSummaryTable';
import AboutPage from "./AboutPage";
import UserManual from "./UserManual";
import useOrgApplicationsBadge from "./hooks/useOrgApplicationsBadge";
import WelcomeModal, { shouldShowWelcome } from "../../components/modals/WelcomeModal";
function MapWithContextMenu({ children }) {
  const map = useMap();
  return children(map);
}
function MapRefBridge({ onReady }) {
  const map = useMap();
  useEffect(() => {
    if (map && typeof onReady === 'function') onReady(map);
  }, [map, onReady]);
  return null;
}

function MapPage() {
  const [selectedView, setSelectedView] = useState(() => {
    try { return localStorage.getItem('lv.defaultBasemap') || 'topographic'; } catch { return 'topographic'; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [lakePanelOpen, setLakePanelOpen] = useState(false);
  const [measureActive, setMeasureActive] = useState(false);
  const [measureMode, setMeasureMode] = useState("distance");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [aboutDataOpen, setAboutDataOpenModal] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [filterTrayOpen, setFilterTrayOpen] = useState(false);
  const [aboutDataMenuOpen, setAboutDataMenuOpen] = useState(false);
  const aboutDataMenuOpenRef = React.useRef(false);
  useEffect(() => { aboutDataMenuOpenRef.current = aboutDataMenuOpen; }, [aboutDataMenuOpen]);
  const [profileActive, setProfileActive] = useState(false);

  const [dataSummaryOpen, setDataSummaryOpen] = useState(false);
  const [dataSummaryLake, setDataSummaryLake] = useState('');
  const [dataSummaryOrg, setDataSummaryOrg] = useState('');
  const [dataSummaryStation, setDataSummaryStation] = useState('');

  const mapRef = useRef(null);
  const flowsRef = useRef({});

  const [showContours, setShowContours] = useState(false);
  const [showContourLabels, setShowContourLabels] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  // Pinning mode for map interactions (used for elevation point picking)
  const [gwPinMode, setGwPinMode] = useState(null);
  // Elevation profile seeding
  const [elevInitialPoints, setElevInitialPoints] = useState([]);

  useEffect(() => {
    const map = mapRef.current;
    const container = map?.getContainer?.();
    if (!container) return;
    const prev = container.style.cursor;
    if (gwPinMode) {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
    return () => { try { container.style.cursor = prev; } catch {} };
  }, [gwPinMode]);

  const waitForNextMapClick = () => new Promise((resolve) => {
    const map = mapRef.current;
    if (!map) return resolve(null);
    const once = (e) => { try { map.off('click', once); } catch {} resolve(e?.latlng || null); };
    map.once('click', once);
  });
  const { userRole, authUser, authOpen, authMode, openAuth, closeAuth, setAuthMode } = useAuthRole();

  // Organization application status badge (public users)
  const { count: appBadgeCount, hasBadge: hasAppBadge } = useOrgApplicationsBadge({ pollMs: 90000 });

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  useEffect(() => {
    try {
      const show = shouldShowWelcome({ user: authUser, pathname: location.pathname });
      setWelcomeOpen(show);
    } catch { setWelcomeOpen(false); }
  }, [authUser, location.pathname]);

  useEffect(() => {
    const onOpen = () => setSettingsOpen(true);
    window.addEventListener('lv-open-settings', onOpen);
    return () => window.removeEventListener('lv-open-settings', onOpen);
  }, []);

  // Initialize from server-side default basemap (public endpoint)
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch('/api/public/app-config', { credentials: 'include' });
        if (!res.ok) return;
        const js = await res.json();
        const value = js?.default_basemap || 'topographic';
        if (!abort) {
          setSelectedView(value);
          try { localStorage.setItem('lv.defaultBasemap', value); } catch {}
        }
      } catch {}
    })();
    return () => { abort = true; };
  }, []);

  // React to global default basemap changes
  useEffect(() => {
    const onDefaultBasemap = (e) => {
      const value = e.detail;
      setSelectedView(value);
    };
    window.addEventListener('lv-default-basemap', onDefaultBasemap);
    return () => window.removeEventListener('lv-default-basemap', onDefaultBasemap);
  }, []);

  useEffect(() => {
    const onOpen = () => setPrivacyOpen(true);
    window.addEventListener('lv-open-privacy', onOpen);
    return () => window.removeEventListener('lv-open-privacy', onOpen);
  }, []);

  useEffect(() => {
    const onOpen = () => setAboutDataOpenModal(true);
    window.addEventListener('lv-open-about-data', onOpen);
    return () => window.removeEventListener('lv-open-about-data', onOpen);
  }, []);

  useEffect(() => {
    if (location.pathname === '/' && location.state?.openSettings) {
      setSettingsOpen(true);
      navigate('.', { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    const p = location.pathname;
    if (p === '/login') {
      setAuthMode('login');
      openAuth('login');
    }
    if (p === '/register') {
      setAuthMode('register');
      openAuth('register');
    }
    if (p === '/about') { setAboutOpen(true); }
    if (p === '/manual') { setManualOpen(true); }
    if (p === '/data/privacy') { setPrivacyOpen(true); }
    if (p === '/data') { setAboutDataOpenModal(true); }
  }, [location.pathname, openAuth, setAuthMode]);
  
  useEffect(() => {
    if (/^\/data(\/.*)?$/.test(location.pathname || '')) {
      setSidebarOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      const { lakeId, orgId, stationId } = e.detail;
      setDataSummaryLake(lakeId);
      setDataSummaryOrg(orgId);
      setDataSummaryStation(stationId);
      setDataSummaryOpen(true);
    };
    window.addEventListener('lv-open-data-summary', handler);
    return () => window.removeEventListener('lv-open-data-summary', handler);
  }, []);

  const { publicFC, activeFilters, applyFilters, baseKey: lakesBaseKey } = usePublicLakes();

  const [isLoadingWatershed, setIsLoadingWatershed] = useState(false);
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  const [watershedHasLayer, setWatershedHasLayer] = useState(false);

  const {
    selectedLake, selectedLakeId, watershedToggleOn,
    lakeOverlayFeature, watershedOverlayFeature, lakeLayers, lakeActiveLayerId,
    baseMatchesSelectedLake, baseKeyBump,
    selectLakeFeature, applyOverlayByLayerId, handlePanelToggleWatershed, resetToActive,
    applyWatershedGeometry,
    baseIsPoint,
  } = useLakeSelection({ publicFC, mapRef, setPanelOpen: setLakePanelOpen, setIsLoadingWatershed });

  const searchApi = usePublicSearch({ mapRef, publicFC, selectLakeFeature, setLakePanelOpen });

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

  const themeClass = selectedView === "satellite" ? "map-dark" : "map-light";
  const worldBounds = [[4.6,116.4],[21.1,126.6]];

  const { jumpToStation } = useWaterQualityMarkers(mapRef);

  const [showFlows, setShowFlows] = useState(false);
  const [flows, setFlows] = useState(null);
  useEffect(()=>{
    let abort = false;
    const load = async () => {
      if (!selectedLakeId) { setFlows([]); return; }
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

  useEffect(() => {
    if (!flows || !Array.isArray(flows)) { flowsRef.current = {}; return; }
    const ids = new Set(flows.map(f => String(f.id)));
    for (const k of Object.keys(flowsRef.current || {})) {
      if (!ids.has(String(k))) delete flowsRef.current[k];
    }
  }, [flows]);

  // Determine whether the selected watershed has at least one public layer.
  useEffect(() => {
    let abort = false;
    (async () => {
      const wsId = selectedLake?.watershed_id ?? selectedLake?.watershedId;
      if (!wsId) { setWatershedHasLayer(false); return; }
      try {
        setIsLoadingWatershed(true);
        const rows = await fetchPublicLayers({ bodyType: 'watershed', bodyId: wsId });
        if (!abort) setWatershedHasLayer(Array.isArray(rows) && rows.length > 0);
      } catch (e) {
        if (!abort) setWatershedHasLayer(false);
      } finally {
        if (!abort) setIsLoadingWatershed(false);
      }
    })();
    return () => { abort = true; };
  }, [selectedLake?.watershed_id, selectedLake?.watershedId]);

  const jumpToFlow = (flow) => {
    if (!flow || !mapRef.current) return;
    if (flow.latitude && flow.longitude) {
      mapRef.current.flyTo([flow.latitude, flow.longitude], 14, { duration: 0.6 });
    }
    if (!showFlows) setShowFlows(true);
    const openPopupForFlow = () => {
      try {
        const layer = flowsRef.current?.[flow.id];
        if (layer && typeof layer.openPopup === 'function') {
          layer.openPopup();
        }
      } catch (err) { /* ignore */ }
    };

    if (showFlows) {
      setTimeout(openPopupForFlow, 80);
    } else {
      setTimeout(openPopupForFlow, 300);
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handlerClick = () => {
      if (sidebarPinned) return;
      if (aboutDataMenuOpenRef.current) return; 
      if (/^\/data(\/.*)?$/.test(location.pathname || '')) return;
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

  const fitToGeoJSON = (fc) => {
    try {
      if (!mapRef.current || !fc) return;
      const gjLayer = L.geoJSON(fc);
      const b = gjLayer.getBounds();
      if (b?.isValid?.()) {
        mapRef.current.fitBounds(b, { padding: [24,24], maxZoom: 13 });
      }
    } catch {}
  };


  // (Removed Global Watersheds actions)

  const startElevationMode = async () => {
    await alertInfo('Elevation Profile', 'Click a start point on the map. Then add more points and press Compute (or Enter). Esc to pause, Esc again to close.');
    setProfileActive(false);
    setGwPinMode('elev');
    const latlng = await waitForNextMapClick();
    setGwPinMode(null);
    if (latlng) {
      setElevInitialPoints([{ lat: Number(latlng.lat), lng: Number(latlng.lng) }]);
      setProfileActive(true);
    }
  };

  const clearOverlays = () => {
    try {
      if (typeof handlePanelToggleWatershed === 'function') {
        try { handlePanelToggleWatershed(false); } catch {}
      }
  setGwPinMode(null);
      setShowFlows(false);
      try { window.dispatchEvent(new CustomEvent('lv-wq-active', { detail: { active: false } })); } catch {}
      setMeasureActive(false);
      setProfileActive(false);
      setElevInitialPoints([]);
      try { typeof clearHeatmap === 'function' && clearHeatmap(); } catch {}
    } catch {}
  };

  return (
    <div className={themeClass} style={{ height: "100vh", width: "100vw", margin: 0, padding: 0, position: 'relative' }}>
  <AppMap view={selectedView} zoomControl={false} showPostgisContours={showContours} showContourLabels={showContourLabels} whenCreated={(m) => { mapRef.current = m; try { window.lv_map = m; } catch {} }}>
  <MapRefBridge onReady={(m) => { if (!mapRef.current) { mapRef.current = m; try { window.lv_map = m; } catch {} } }} />
        {publicFC && (
          <BaseLakesLayer
            key={`base-${lakesBaseKey + baseKeyBump}`}
            data={publicFC}
            hidePredicate={baseMatchesSelectedLake}
            onFeatureClick={selectLakeFeature}
          />
        )}
  <SelectedLakeOverlays watershedOverlayFeature={watershedOverlayFeature} lakeOverlayFeature={lakeOverlayFeature} />
        <FlowsLayer show={showFlows} flows={flows} flowsRef={flowsRef} />

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pinned={sidebarPinned}
          setPinned={setSidebarPinned}
          onOpenAuth={(m) => { openAuth(m || 'login'); }}
          onOpenKyc={() => setKycOpen(true)}
          onOpenFeedback={() => { setFeedbackOpen(true); if (!sidebarPinned) setSidebarOpen(false); }}
          onAboutDataToggle={(open) => setAboutDataMenuOpen(open)}
          appBadgeCount={appBadgeCount}
        />

        <MapWithContextMenu>
          {(map) => (
            <ContextMenu
              map={map}
              onMeasureDistance={() => { setMeasureMode("distance"); setMeasureActive(true); }}
              onMeasureArea={() => { setMeasureMode("area"); setMeasureActive(true); }}
              onElevationProfile={startElevationMode}
            />
          )}
        </MapWithContextMenu>

  <MeasureTool active={measureActive} mode={measureMode} onFinish={() => setMeasureActive(false)} />
  <ElevationProfileTool active={profileActive} initialPoints={elevInitialPoints} onClose={() => setProfileActive(false)} />
        <CoordinatesScale />
  <MapControls defaultBounds={worldBounds} onErase={clearOverlays} />
      </AppMap>

    <LakeInfoPanel
        isOpen={lakePanelOpen}
        onClose={() => setLakePanelOpen(false)}
        lake={selectedLake}
    isPointLake={baseIsPoint}
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
        canToggleWatershed={Boolean((selectedLake?.watershed_id || selectedLake?.watershedId) && watershedHasLayer)}
        onToggleWatershed={handlePanelToggleWatershed}
          authUser={authUser}
  onToggleFlows={(checked)=>setShowFlows(checked)}
  showFlows={showFlows}
  flows={flows}
  onJumpToFlow={jumpToFlow}
  hasHeatLayer={hasHeatLayer}
  isLoadingWatershed={isLoadingWatershed}
  isLoadingFlows={isLoadingFlows}
  />

      <SearchBar
        onMenuClick={() => setSidebarOpen(true)}
        onFilterClick={() => setFilterTrayOpen((v) => !v)}
        onSearch={searchApi.handleSearch}
        onClear={searchApi.handleClearSearch}
        onTyping={(val) => { if (val && val.length >= 2) { searchApi.setSearchMode('suggest'); searchApi.setSearchOpen(false); } }}
        mode={searchApi.searchMode}
        appBadgeCount={appBadgeCount}
      />
      <SearchResultsPopover
        open={searchApi.searchOpen}
        results={searchApi.searchResults}
        loading={searchApi.searchLoading}
        error={searchApi.searchError}
        onClose={() => searchApi.setSearchOpen(false)}
        onSelect={searchApi.handleSelectResult}
      />
      <FilterTray
        open={filterTrayOpen}
        onClose={() => setFilterTrayOpen(false)}
        onApply={(filters) => applyFilters(filters)}
        initial={activeFilters}
      />
  <LayerControl selectedView={selectedView} setSelectedView={setSelectedView} showContours={showContours} setShowContours={setShowContours} showContourLabels={showContourLabels} setShowContourLabels={setShowContourLabels} />
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
      {authUser && (
        <PublicSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      )}

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      <AboutPage
        open={aboutOpen}
        onClose={() => {
          setAboutOpen(false);
          if (location.pathname === "/about") {
            navigate("/", { replace: true });
          }
        }}
      />

      <UserManual
        open={manualOpen}
        onClose={() => {
          setManualOpen(false);
          if (location.pathname === "/manual") {
            navigate("/", { replace: true });
          }
        }}
      />

      <DataPrivacyDisclaimer
        open={privacyOpen}
        onClose={() => {
          setPrivacyOpen(false);
          if (location.pathname === "/data/privacy") {
            navigate("/", { replace: true });
          }
        }}
      />

      <AboutData
        open={aboutDataOpen}
        onClose={() => {
          setAboutDataOpenModal(false);
          if (location.pathname === "/data") {
            navigate("/", { replace: true });
          }
        }}
      />

      <DataSummaryTable
        open={dataSummaryOpen}
        onClose={() => setDataSummaryOpen(false)}
        initialLake={dataSummaryLake}
        initialOrg={dataSummaryOrg}
        initialStation={dataSummaryStation}
      />

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

      {!authUser && welcomeOpen && (
        <WelcomeModal
          open={welcomeOpen}
          onClose={() => setWelcomeOpen(false)}
          onLogin={() => {
            // Open login flow
            try { setWelcomeOpen(false); } catch {}
            openAuth('login');
          }}
        />
      )}

      {kycOpen && authUser && (!authUser.role || authUser.role === 'public') && (
        <KycPage embedded={true} open={kycOpen} onClose={() => setKycOpen(false)} />
      )}
    </div>
  );
}

export default MapPage;
