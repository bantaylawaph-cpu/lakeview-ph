// MapLibre GL overlay for Leaflet to render population MVT heatmap
// Requires dependencies: maplibre-gl, maplibre-gl-leaflet

export function buildTilesURL({ lakeId, year, radiusKm, layerId }) {
  const base = `/api/tiles/pop/{z}/{x}/{y}`;
  const qs = new URLSearchParams();
  qs.set('lake_id', String(lakeId));
  qs.set('year', String(year));
  qs.set('radius_km', String(radiusKm));
  if (layerId) qs.set('layer_id', String(layerId));
  return `${base}?${qs.toString()}`;
}

function buildStyle(params) {
  const tiles = buildTilesURL(params);
  return {
    version: 8,
    sources: {
      pop: {
        type: 'vector',
        tiles: [tiles],
        minzoom: 0,
        maxzoom: 14,
      },
    },
    layers: [
      {
        id: 'pop-heat',
        type: 'heatmap',
        source: 'pop',
        'source-layer': 'pop',
        paint: {
          'heatmap-weight': [
            'interpolate', ['linear'], ['get', 'pop'],
            0, 0,
            5000, 1
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            6, 10,
            12, 30
          ],
          'heatmap-opacity': 0.85
        }
      }
    ]
  };
}

export async function createPopHeatOverlay(params) {
  const L = (await import('leaflet')).default || (await import('leaflet'));
  await import('maplibre-gl');
  const leafletMaplibre = await import('maplibre-gl-leaflet');
  // Importing the plugin registers L.maplibreGL factory
  const style = buildStyle(params);
  const layer = L.maplibreGL({ style, interactive: false });
  // Attach helper to update tiles
  layer.__updateParams = (next) => {
    try {
      const m = layer.getMaplibreMap ? layer.getMaplibreMap() : layer._glMap;
      if (!m) return false;
      const src = m.getSource('pop');
      if (src && typeof src.setTiles === 'function') {
        src.setTiles([buildTilesURL(next)]);
        m.triggerRepaint?.();
        return true;
      }
      return false;
    } catch (e) { return false; }
  };
  return layer;
}
