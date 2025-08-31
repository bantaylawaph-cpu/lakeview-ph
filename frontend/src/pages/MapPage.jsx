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

import React, { useState } from "react";
import { MapContainer, TileLayer, useMap, Marker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Local Components
import SearchBar from "../components/SearchBar";
import LayerControl from "../components/LayerControl";
import CoordinatesScale from "../components/CoordinatesScale";
import MapControls from "../components/MapControls";
import ScreenshotButton from "../components/ScreenshotButton";
import Sidebar from "../components/Sidebar";
import ContextMenu from "../components/ContextMenu";
import MeasureTool from "../components/MeasureTool"; 
import LakeInfoPanel from "../components/LakeInfoPanel";// Unified measuring tool

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

  // Sidebar toggle for lake information panel
  const [selectedLake, setSelectedLake] = useState(null);
  const [lakePanelOpen, setLakePanelOpen] = useState(false);
  
  /* Dummy Data */}
  const lakeBunot = {
    name: "Lake Bunot",
    location: "San Pablo City, Laguna, Philippines",
    area: "30.5 hectares",
    depth: "Average 23 m",
    description:
      "Lake Bunot is one of the Seven Lakes of San Pablo in Laguna. It is known for its deep waters and for tilapia and fish farming. The lake is a popular local fishing and sightseeing spot.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/7/76/Lake_Bunot.jpg" // ✅ static picture
  };



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

  // Map bounds (world extent)
  const worldBounds = [
    [-85, -180],
    [85, 180],
  ];

  // Theme class toggled depending on basemap
  const themeClass = selectedView === "satellite" ? "map-dark" : "map-light";

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
        center={[14.3409, 121.23477]} // Default center (Laguna de Bay area?)
        zoom={11}
        maxBounds={worldBounds}
        maxBoundsViscosity={1.0}
        maxZoom={18}
        minZoom={3}
        zoomControl={false} // We provide custom controls
        style={{ height: "100%", width: "100%" }}
      >
        {/* Basemap Layer */}
        <TileLayer
          url={basemaps[selectedView]}
          attribution={attribution}
          noWrap={true}
        />
        {/* Dummy Marker */}
        {/* Lake Bunot marker */}
        <Marker
          position={[14.08111, 121.34389]}
          eventHandlers={{
            click: () => {
              setSelectedLake(lakeBunot);
              setLakePanelOpen(true);
            }
          }}
        >
          <Tooltip direction="top" offset={[0, -20]} permanent>
            Lake Bunot
          </Tooltip>
        </Marker>

        {/* Map Utilities */}
        <CoordinatesScale /> {/* Shows coordinates + scale */}
        <MapControls /> {/* Zoom, reset view, etc. */}

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
      <LakeInfoPanel
        isOpen={lakePanelOpen}
        onClose={() => setLakePanelOpen(false)}
        lake={selectedLake}
        onToggleHeatmap={(on, distanceKm) => {
          // implement in MapPage: toggles your heatmap layer (see below)
          togglePopulationHeatmap(on, distanceKm);
        }}
      />
      {/* UI Overlays outside MapContainer */}
      <SearchBar onMenuClick={() => setSidebarOpen(true)} /> {/* Top-left search */}
      <LayerControl selectedView={selectedView} setSelectedView={setSelectedView} /> {/* Basemap switcher */}
      <ScreenshotButton /> {/* Bottom-center screenshot */}
    </div>
  );
}

export default MapPage;
