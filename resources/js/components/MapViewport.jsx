import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

function normalizeBounds(bounds) {
  if (!bounds) return null;
  if (typeof bounds.isValid === 'function' && typeof bounds.getSouthWest === 'function') {
    return bounds;
  }

  try {
    if (Array.isArray(bounds) && bounds.length === 2) {
      return L.latLngBounds(bounds[0], bounds[1]);
    }

    if (bounds.type) {
      const layer = L.geoJSON(bounds);
      return layer.getBounds();
    }
  } catch (err) {
    console.error('[MapViewport] Failed to normalize bounds', err);
  }

  return null;
}

export default function MapViewport({
  bounds,
  maxZoom = 14,
  padding = [24, 24],
  pad = 0.02,
  version = 0,
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const target = normalizeBounds(bounds);
    if (!target || !target.isValid || !target.isValid()) return;

    const padded = target.clone ? target.clone().pad(pad) : target;

    const applyView = () => {
      try {
        const mapMaxZoom = typeof maxZoom === 'number' ? maxZoom : map.getMaxZoom();
        const effectivePadding = Array.isArray(padding) ? padding : [24, 24];
        map.stop();
        map.invalidateSize();
        map.fitBounds(padded, {
          padding: effectivePadding,
          maxZoom: mapMaxZoom,
          animate: false,
        });
      } catch (err) {
        console.error('[MapViewport] Failed to apply map view', err);
      }
    };

    if (!map._loaded) {
      const handler = () => {
        applyView();
        map.off('load', handler);
      };
      map.on('load', handler);
      return () => map.off('load', handler);
    }

    applyView();
  }, [map, pad, padding, maxZoom, version, bounds]);

  return null;
}
