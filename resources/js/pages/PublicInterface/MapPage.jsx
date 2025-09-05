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
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Local Components
import SearchBar from "../../components/SearchBar";
import LayerControl from "../../components/LayerControl";
import CoordinatesScale from "../../components/CoordinatesScale";
import MapControls from "../../components/MapControls";
import ScreenshotButton from "../../components/ScreenshotButton";
import Sidebar from "../../components/Sidebar";
import ContextMenu from "../../components/ContextMenu";
import MeasureTool from "../../components/MeasureTool"; // Unified measuring tool
import LakeInfoPanel from "../../components/LakeInfoPanel";

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

  // ----------------------------------------------------
  // Map Layer Configurations
  // ----------------------------------------------------
  const basemaps = {
    satellite:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    street:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    topographic:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  };

  const attribution =
    '&copy; <a href="https://www.esri.com/">Esri</a>, ' +
    "Earthstar Geographics, GIS User Community, " +
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors';

  // Map bounds (Philippines extent)
  const worldBounds = [
    [4.6, 116.4], // Southwest (Mindanao sea area)
    [21.1, 126.6], // Northeast (Batanes area)
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
      <MapContainer
        center={[14.3409, 121.23477]} // Default center (Laguna de Bay area)
        zoom={11}
        maxBounds={worldBounds}
        maxBoundsViscosity={1.0}
        maxZoom={18}
        minZoom={6}
        zoomControl={false} // We provide custom controls
        style={{ height: "100%", width: "100%" }}
      >
        {/* Basemap Layer */}
        <TileLayer url={basemaps[selectedView]} attribution={attribution} noWrap />

        {/* Map Utilities */}
        <CoordinatesScale /> {/* Shows coordinates + scale */}
        <MapControls /> {/* Zoom, geolocate/reset view */}

        {/* Sidebar (with minimap + links) */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pinned={sidebarPinned}
          setPinned={setSidebarPinned}
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
      </MapContainer>

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
    </div>
  );
}

export default MapPage;
