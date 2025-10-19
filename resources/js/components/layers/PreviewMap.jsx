import React, { useRef } from "react";
import { GeoJSON } from "react-leaflet";
import AppMap from "../../components/AppMap";
import MapViewport from "../../components/MapViewport";
import { boundsFromGeom } from "../../utils/geo";

export default function PreviewMap({ geometry, color = "#2563eb", viewport, viewportVersion = 0, whenCreated }) {
  const mapRef = useRef(null);
  return (
    <div style={{ height: 420, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
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
        <MapViewport
          bounds={viewport ? [[viewport.bounds[0], viewport.bounds[1]], [viewport.bounds[2], viewport.bounds[3]]] : (geometry ? boundsFromGeom(geometry) : null)}
          version={viewportVersion}
        />
      </AppMap>
    </div>
  );
}
