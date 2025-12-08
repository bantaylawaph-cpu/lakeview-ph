import React, { useRef, useMemo } from "react";
import { GeoJSON } from "react-leaflet";
import AppMap from "../../components/AppMap";
import MapViewport from "../../components/MapViewport";
import { boundsFromGeom } from "../../utils/geo";
import L from "leaflet";

export default function PreviewMap({ geometry, color = "#2563eb", viewport, viewportVersion = 0, whenCreated, height = 420 }) {
  const mapRef = useRef(null);
  const boundsProp = useMemo(() => {
    // Prefer explicit viewport if provided and valid
    if (viewport && viewport.bounds) {
      const b = viewport.bounds;
      // Case 1: already a Leaflet LatLngBounds-like object
      if (b && typeof b.isValid === 'function') {
        return b;
      }
      // Case 2: 4-number flat array [minLat, minLng, maxLat, maxLng]
      if (Array.isArray(b) && b.length === 4 && b.every((n) => typeof n === 'number' && Number.isFinite(n))) {
        const sw = [b[0], b[1]];
        const ne = [b[2], b[3]];
        try { return L.latLngBounds(sw, ne); } catch { /* fall through */ }
      }
      // Case 3: 2x2 array [[minLat,minLng],[maxLat,maxLng]]
      if (Array.isArray(b) && b.length === 2 && Array.isArray(b[0]) && Array.isArray(b[1])) {
        try { return L.latLngBounds(b[0], b[1]); } catch { /* fall through */ }
      }
    }
    // Fallback to geometry-derived bounds
    if (geometry) return boundsFromGeom(geometry);
    return null;
  }, [viewport, geometry]);
  return (
    <div className="map-preview" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb", height }}>
      <AppMap
        view="osm"
        style={{ height: "100%", width: "100%" }}
        whenCreated={(m) => {
          if (m && !mapRef.current) mapRef.current = m;
          if (typeof whenCreated === 'function') whenCreated(m);
        }}
      >
        {geometry && (
          <GeoJSON
            key="geom"
            data={{ type: "Feature", geometry }}
            style={{ color, opacity: 1, weight: 2, fill: true, fillColor: color, fillOpacity: 0.3 }}
          />)
        }
        {boundsProp && (
          <MapViewport
            bounds={boundsProp}
            version={viewportVersion}
          />
        )}
      </AppMap>
    </div>
  );
}
