// resources/js/components/AppMap.jsx
import React from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// No default overlays here; keep AppMap minimal.

// Shared basemap definitions (mirrors MapPage.jsx)
const BASEMAPS = {
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  street:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  topographic:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

const ATTRIBUTION =
  '&copy; <a href="https://www.esri.com/">Esri</a>, ' +
  "Earthstar Geographics, GIS User Community, " +
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors';

// Philippines extent
const PH_BOUNDS = [
  [4.6, 116.4],
  [21.1, 126.6],
];

function AppMap({
  view = "osm",
  className,
  style,
  children,
  whenCreated,
  center,
  zoom,
  minZoom = 6,
  maxZoom = 18,
  maxBounds = PH_BOUNDS,
  scrollWheelZoom = true,
  zoomControl = true,
  noWrap = true,
  tileAttribution = ATTRIBUTION,
  tileUrl, // optional override, else derived from view
}) {
  // Prefer explicit tileUrl when provided; otherwise derive from view
  const url = tileUrl || BASEMAPS[view] || BASEMAPS.osm;

  // Start with Philippines fully visible by default. If center/zoom provided, use them.
  const mapProps = center && typeof zoom !== "undefined"
    ? { center, zoom }
    : { bounds: PH_BOUNDS };

  return (
    <MapContainer
      {...mapProps}
      maxBounds={maxBounds}
      maxBoundsViscosity={1.0}
      minZoom={minZoom}
      maxZoom={maxZoom}
      zoomControl={zoomControl}
      scrollWheelZoom={scrollWheelZoom}
      whenCreated={whenCreated}
      style={{ height: "100%", width: "100%", ...(style || {}) }}
      className={className}
    >
      <TileLayer url={url} attribution={tileAttribution} noWrap={noWrap} />

      {children}
    </MapContainer>
  );
}

export default AppMap;
