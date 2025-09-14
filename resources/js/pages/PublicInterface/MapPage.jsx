// src/pages/MapPage.jsx
// ----------------------------------------------------
// Main Map Page Component for LakeView PH
// ----------------------------------------------------
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { api } from "../../lib/api";
import { useMap, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import AppMap from "../../components/AppMap";
import MapControls from "../../components/MapControls";
import SearchBar from "../../components/SearchBar";
import LayerControl from "../../components/LayerControl";
import ScreenshotButton from "../../components/ScreenshotButton";
import Sidebar from "../../components/Sidebar";
import ContextMenu from "../../components/ContextMenu";
import MeasureTool from "../../components/MeasureTool";
import LakeInfoPanel from "../../components/LakeInfoPanel";
import AuthModal from "../../components/AuthModal";

// Utility: Context Menu Wrapper
function MapWithContextMenu({ children }) {
  const map = useMap();
  return children(map);
}

function MapPage() {
  // ---------------- State ----------------
  const [selectedView, setSelectedView] = useState("satellite");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  const [selectedLake, setSelectedLake] = useState(null);
  const [lakePanelOpen, setLakePanelOpen] = useState(false);

  const [measureActive, setMeasureActive] = useState(false);
  const [measureMode, setMeasureMode] = useState("distance");

  const [userRole, setUserRole] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  // Public FeatureCollection of lakes (active Public layer only)
  const [publicFC, setPublicFC] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);

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
  const loadPublicLakes = async () => {
    try {
      const fc = await api("/public/lakes-geo"); // FeatureCollection
      if (fc?.type === "FeatureCollection") {
        setPublicFC(fc);

        // Fit to all lakes
        if (mapRef.current && fc.features?.length) {
          const gj = L.geoJSON(fc);
          const b = gj.getBounds();
          if (b?.isValid?.() === true) {
            mapRef.current.fitBounds(b, { padding: [24, 24], maxZoom: 9, animate: false });
          }
        }
      } else {
        setPublicFC({ type: "FeatureCollection", features: [] });
      }
    } catch (e) {
      console.error("[MapPage] Failed to load public lakes", e);
      setPublicFC({ type: "FeatureCollection", features: [] });
    }
  };

  useEffect(() => { loadPublicLakes(); }, []);

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

  // ---------------- Heatmap stub ----------------
  const togglePopulationHeatmap = (on, distanceKm) => {
    console.log("[Heatmap]", on ? "ON" : "OFF", "distance:", distanceKm, "km");
  };

  // ---------------- Render ----------------
  const themeClass = selectedView === "satellite" ? "map-dark" : "map-light";
  const worldBounds = [[4.6,116.4],[21.1,126.6]];

  return (
    <div className={themeClass} style={{ height: "100vh", width: "100vw", margin: 0, padding: 0 }}>
      <AppMap
        view={selectedView}
        zoomControl={false}
        whenCreated={(m) => (mapRef.current = m)}
      >
        {/* Render all public default lake geometries */}
        {publicFC && (
          <GeoJSON
            key={JSON.stringify(publicFC).length}
            data={publicFC}
            style={{ weight: 2, fillOpacity: 0.12 }}
            onEachFeature={(feat, layer) => {
            layer.on("click", () => {
              const p = feat?.properties || {};
              setSelectedLake({
                name: p.name,
                alt_name: p.alt_name,
                region: p.region,
                province: p.province,
                municipality: p.municipality,
                watershed_name: p.watershed_name,
                surface_area_km2: p.surface_area_km2,
                elevation_m: p.elevation_m,
                mean_depth_m: p.mean_depth_m,
              });
              setLakePanelOpen(true);
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

        {/* Map Controls */}
        <MapControls defaultBounds={worldBounds} />
      </AppMap>

      {/* Lake Info Panel */}
      <LakeInfoPanel
        isOpen={lakePanelOpen}
        onClose={() => setLakePanelOpen(false)}
        lake={selectedLake}
        onToggleHeatmap={(on, km) => togglePopulationHeatmap(on, km)}
      />

      {/* UI overlays */}
      <SearchBar onMenuClick={() => setSidebarOpen(true)} />
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
