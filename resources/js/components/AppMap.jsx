// resources/js/components/AppMap.jsx
import React from "react";
import { MapContainer, TileLayer, useMapEvent, useMap } from "react-leaflet";
import L from "leaflet";
import 'leaflet.vectorgrid';
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

const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const BASemap_ATTRIBUTIONS = {
  satellite: '&copy; <a href="https://www.esri.com">Esri</a> contributors, ' +
             'Sources: Esri, USGS, NOAA',
  street: '&copy; <a href="https://www.esri.com">Esri</a> contributors',
  topographic: '&copy; <a href="https://www.esri.com">Esri</a> contributors',
  osm: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

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
  tileAttribution,
  tileUrl, // optional override, else derived from view
  onClick,
  showPostgisContours = false,
  contoursUrl = "/api/tiles/contours/{z}/{x}/{y}.pbf",
  // optional: disable panning/dragging (used by measurement tools, etc.)
  disableDrag = false,
  // separate toggle for label markers
  showContourLabels = true,
}) {
  // Prefer explicit tileUrl when provided; otherwise derive from view
  const url = tileUrl || BASEMAPS[view] || BASEMAPS.osm;
  // choose attribution: explicit prop > per-basemap > default ATTRIBUTION
  const attribution = tileAttribution || BASemap_ATTRIBUTIONS[view] || ATTRIBUTION;

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
  <TileLayer url={url} attribution={attribution} noWrap={noWrap} />

  {showPostgisContours ? <ContoursVectorLayer url={contoursUrl} /> : null}
  {showPostgisContours ? <ContourLabelsLayer /> : null}

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

function ContoursVectorLayer({ url }) {
  const map = useMap();
  const layerRef = React.useRef(null);

  React.useEffect(() => {
    if (!map) return;

    const ensureLayer = () => {
      const z = map.getZoom();
      // Only display contours at zoom >= 11
      if (z >= 11) {
        if (!layerRef.current) {
          const layer = L.vectorGrid.protobuf(url, {
            vectorTileLayerStyles: {
              contours: (props) => {
                const isIndex = props?.idx === 1 || (props?.elev % 50 === 0);
                return {
                  color: isIndex ? '#111' : '#444',
                  weight: isIndex ? 1.4 : 0.8,
                  opacity: 1,
                };
              }
            },
            interactive: false,
            maxNativeZoom: 14,
            maxZoom: 22,
          }).addTo(map);

          // No hover/click UI; labels handled by ContourLabelsLayer

          layerRef.current = layer;
        }
      } else {
        if (layerRef.current) {
          try { map.removeLayer(layerRef.current); } catch {}
          layerRef.current = null;
        }
      }
    };

    // Initialize based on current zoom
    ensureLayer();
    // Update layer presence on zoom changes
    map.on('zoomend', ensureLayer);

    return () => {
      map.off('zoomend', ensureLayer);
      if (layerRef.current) {
        try { map.removeLayer(layerRef.current); } catch {}
        layerRef.current = null;
      }
    };
  }, [map, url]);
  return null;
}

function ContourLabelsLayer() {
  const map = useMap();
  const markersRef = React.useRef([]);
  const pendingRef = React.useRef(null);

  const clearMarkers = React.useCallback(() => {
    if (!map) return;
    try {
      for (const m of markersRef.current) {
        try { map.removeLayer(m); } catch {}
      }
    } finally {
      markersRef.current = [];
    }
  }, [map]);

  const fetchAndRender = React.useCallback(async () => {
    if (!map) return;
    const z = map.getZoom();
    // Only render labels at zoom >= 14
    if (z < 14) { clearMarkers(); return; }
    const b = map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
    const url = `/api/contours/labels?bbox=${encodeURIComponent(bbox)}&z=${z}`;
    try {
      // debounce in-flight
      if (pendingRef.current) { try { pendingRef.current.abort(); } catch {} }
      const ctrl = new AbortController();
      pendingRef.current = ctrl;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const gj = await res.json();
      clearMarkers();
      if (!gj || !Array.isArray(gj.features)) return;
      const ms = [];
      for (const f of gj.features) {
        const coords = f?.geometry?.coordinates;
        const elev = f?.properties?.elev;
  const angle = Number.isFinite(f?.properties?.angle) ? f.properties.angle : 0;
        if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) continue;
        const el = document.createElement('div');
        // inline styles for subtle, rotated text with white halo
        el.style.fontSize = '11px';
        el.style.fontWeight = '600';
        el.style.lineHeight = '1';
        el.style.color = '#111';
        el.style.whiteSpace = 'nowrap';
        el.style.pointerEvents = 'none';
        // text halo for readability
        el.style.textShadow = '0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff';
  // rotate so text runs parallel to the contour line: add 90deg and normalize to keep upright
  let corrected = angle + 90;
  // normalize into (-90, 90]
  while (corrected > 90) corrected -= 180;
  while (corrected <= -90) corrected += 180;
  el.style.transform = `translate(-50%, -50%) rotate(${corrected}deg)`;
        el.textContent = typeof elev !== 'undefined' ? `${elev} m` : '';
        const icon = L.divIcon({ html: el, className: 'contour-label', iconSize: null });
        const m = L.marker([coords[1], coords[0]], { icon, interactive: false, keyboard: false });
        m.addTo(map);
        ms.push(m);
      }
      markersRef.current = ms;
    } catch (e) {
      // swallow errors (network/abort)
    }
  }, [map, clearMarkers]);

  React.useEffect(() => {
    if (!map) return;
    let raf = null;
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { fetchAndRender(); });
    };
    // initial
    schedule();
    map.on('moveend', schedule);
    map.on('zoomend', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      map.off('moveend', schedule);
      map.off('zoomend', schedule);
      clearMarkers();
      if (pendingRef.current) { try { pendingRef.current.abort(); } catch {} }
    };
  }, [map, fetchAndRender, clearMarkers]);

  return null;
}
