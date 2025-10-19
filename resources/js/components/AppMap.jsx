// resources/js/components/AppMap.jsx
import React from "react";
import { MapContainer, TileLayer, useMapEvent, useMap } from "react-leaflet";
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
  onClick,
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
  { /* Map click handler: if parent passes onClick, attach it via a small component */ }
  {typeof onClick === 'function' ? <MapClickHandler onClick={onClick} /> : null}
  {typeof disableDrag !== 'undefined' ? <MapInteractionHandler disableDrag={disableDrag} /> : null}
      <TileLayer url={url} attribution={tileAttribution} noWrap={noWrap} />

      {children}
    </MapContainer>
  );
}

function MapClickHandler({ onClick }) {
  const map = useMap();
  const startRef = React.useRef(null);

  React.useEffect(() => {
    if (!map) return;
    const handleDown = (e) => { startRef.current = e.containerPoint; };
    const handleUp = (e) => {
      try {
        const sp = startRef.current;
        const ep = e.containerPoint;
        if (!sp || !ep) return;
        const dx = ep.x - sp.x;
        const dy = ep.y - sp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 6) {
          onClick && onClick(e);
        }
      } finally { startRef.current = null; }
    };
    const handleClick = (e) => onClick && onClick(e);

    map.on('mousedown', handleDown);
    map.on('mouseup', handleUp);
    map.on('click', handleClick);

    return () => {
      try { map.off('mousedown', handleDown); } catch {}
      try { map.off('mouseup', handleUp); } catch {}
      try { map.off('click', handleClick); } catch {}
    };
  }, [map, onClick]);

  return null;
}

function MapInteractionHandler({ disableDrag = false }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map) return;
    try {
      if (disableDrag) {
        if (map.dragging && map.dragging.disable) map.dragging.disable();
        map.getContainer().style.cursor = 'crosshair';
      } else {
        if (map.dragging && map.dragging.enable) map.dragging.enable();
        map.getContainer().style.cursor = '';
      }
    } catch (err) {
      // ignore
    }
    return () => {
      try { if (map && map.dragging && map.dragging.enable) map.dragging.enable(); } catch {}
      try { if (map && map.getContainer) map.getContainer().style.cursor = ''; } catch {}
    };
  }, [map, disableDrag]);
  return null;
}

export default AppMap;
