// src/pages/MapPage.jsx
// ----------------------------------------------------
// Main Map Page Component for LakeView PH
// ----------------------------------------------------
// Responsibilities:
// - Render the interactive map with basemap layers
// - Integrate sidebar, context menu, and map utilities
// - Handle measurement tools (distance & area)
// - Provide layout for search, layer control, and screenshots
//
// Notes:
// - Built with react-leaflet
// - Uses state hooks for sidebar, basemap, and measurement control
// - Map utilities are modular components imported from /components
// ----------------------------------------------------

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { api } from "../../lib/api";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import AppMap from "../../components/AppMap";
import MapControls from "../../components/MapControls";

// Local Components
import SearchBar from "../../components/SearchBar";
import LayerControl from "../../components/LayerControl";
// CoordinatesScale and MapControls are included in AppMap
import ScreenshotButton from "../../components/ScreenshotButton";
import Sidebar from "../../components/Sidebar";
import ContextMenu from "../../components/ContextMenu";
import MeasureTool from "../../components/MeasureTool"; // Unified measuring tool
import LakeInfoPanel from "../../components/LakeInfoPanel";
import AuthModal from "../../components/AuthModal";

// ----------------------------------------------------
// Utility: Context Menu Wrapper
// Passes map instance to children so they can bind events
// ----------------------------------------------------
function MapWithContextMenu({ children }) {
  const map = useMap();
  return children(map);
}

function MapPage() {
  // ----------------------------------------------------
  // State Management
  // ----------------------------------------------------

  // Selected basemap view: "satellite", "street", "topographic", "osm"
  const [selectedView, setSelectedView] = useState("satellite");

  // Sidebar toggle and pinned state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  // Lake Info Panel state
  const [selectedLake, setSelectedLake] = useState(null);
  const [lakePanelOpen, setLakePanelOpen] = useState(false);

  // Measurement tool (distance / area)
  const [measureActive, setMeasureActive] = useState(false);
  const [measureMode, setMeasureMode] = useState("distance"); // "distance" | "area"

  // Determine if a logged-in user with a dashboard is present
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api('/auth/me');
        if (!mounted) return;
        if (['superadmin','org_admin','contributor'].includes(me.role)) {
          setUserRole(me.role);
        } else {
          setUserRole(null);
        }
      } catch {
        if (mounted) setUserRole(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Auth modal visibility and mode, controlled by URL path or sidebar action
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  // Open modal if route is /login or /register
  useEffect(() => {
    const p = location.pathname;
    if (p === "/login") {
      setAuthMode("login");
      setAuthOpen(true);
    } else if (p === "/register") {
      setAuthMode("register");
      setAuthOpen(true);
    }
  }, [location.pathname]);

  // Map basemap and bounds come from AppMap
  const worldBounds = [
    [4.6, 116.4], // SW
    [21.1, 126.6], // NE
  ];

  // Theme class toggled depending on basemap
  const themeClass = selectedView === "satellite" ? "map-dark" : "map-light";

  // ----------------------------------------------------
  // TEMP: Hotkeys (L to toggle panel, Esc to close)
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      // Avoid triggering hotkeys while typing in inputs/textareas/selects
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      const k = e.key?.toLowerCase?.();

      // Toggle Lake Info Panel with "L"
      if (k === "l") {
        setLakePanelOpen((prev) => {
          const opening = !prev;
          if (opening) {
            // Prefill mock lake data on open (replace with real selection later)
            setSelectedLake({
              name: "Laguna de Bay",
              location: "Luzon, Philippines",
              area: "≈ 911 km²",
              depth: "≈ 2.8 m (avg)",
              description:
                "The largest inland water body in the Philippines. Used for fisheries, recreation, and water supply.",
              image: "/laguna-de-bay.jpg", // optional; add asset if available
            });
          }
          return opening;
        });
      }

      // Close panel with Escape
      if (k === "escape") {
        setLakePanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // ----------------------------------------------------
  // TEMP: Population heatmap toggle (stub)
  // ----------------------------------------------------
  const togglePopulationHeatmap = (on, distanceKm) => {
    // TODO: wire to real heatmap layer
    // For now, just log the intent so you can verify the panel is calling it.
    console.log("[Heatmap]", on ? "ON" : "OFF", "distance:", distanceKm, "km");
  };

  // ----------------------------------------------------
  // Component Render
  // ----------------------------------------------------
  return (
    <div
      className={themeClass}
      style={{ height: "100vh", width: "100vw", margin: 0, padding: 0 }}
    >
      {/* Main Map Container */}
      <AppMap view={selectedView} zoomControl={false}>

        {/* Sidebar (with minimap + links) */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pinned={sidebarPinned}
          setPinned={setSidebarPinned}
          onOpenAuth={(m) => {
            setAuthMode(m || "login");
            setAuthOpen(true);
          }}
        />

        {/* Context Menu (right-click actions) */}
        <MapWithContextMenu>
          {(map) => {
            // Auto-close sidebar when clicking/dragging if not pinned
            map.on("click", () => {
              if (!sidebarPinned) setSidebarOpen(false);
            });
            map.on("dragstart", () => {
              if (!sidebarPinned) setSidebarOpen(false);
            });

            // Inject Context Menu component
            return (
              <ContextMenu
                map={map}
                onMeasureDistance={() => {
                  setMeasureMode("distance");
                  setMeasureActive(true);
                }}
                onMeasureArea={() => {
                  setMeasureMode("area");
                  setMeasureActive(true);
                }}
              />
            );
          }}
        </MapWithContextMenu>

        {/* Measurement Tool Overlay (distance/area) */}
        <MeasureTool
          active={measureActive}
          mode={measureMode}
          onFinish={() => setMeasureActive(false)}
        />

        {/* Right-side floating controls (only on MapPage) */}
        <MapControls defaultBounds={worldBounds} />
      </AppMap>

      {/* Lake Info Panel (hotkey-controlled) */}
      <LakeInfoPanel
        isOpen={lakePanelOpen}
        onClose={() => setLakePanelOpen(false)}
        lake={selectedLake}
        onToggleHeatmap={(on, distanceKm) => togglePopulationHeatmap(on, distanceKm)}
      />

      {/* UI Overlays outside MapContainer */}
      <SearchBar onMenuClick={() => setSidebarOpen(true)} /> {/* Top-left search */}
      <LayerControl selectedView={selectedView} setSelectedView={setSelectedView} />{" "}
      {/* Basemap switcher */}
      <ScreenshotButton /> {/* Bottom-center screenshot */}

      {/* Back to Dashboard button for logged-in roles */}
      {userRole && (
        <button
          className="map-back-btn"
          onClick={() => {
            if (userRole === 'superadmin') navigate('/admin-dashboard');
            else if (userRole === 'org_admin') navigate('/org-dashboard');
            else if (userRole === 'contributor') navigate('/contrib-dashboard');
          }}
          title="Back to Dashboard"
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 1100,
            display: 'inline-flex'
          }}
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
          // If modal was opened via /login or /register, navigate back to /
          if (location.pathname === "/login" || location.pathname === "/register") {
            navigate("/", { replace: true });
          }
        }}
      />
    </div>
  );
}

export default MapPage;
