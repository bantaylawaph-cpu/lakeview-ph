/*
 * PopulationHeat: vector tile source + heat layer for population raster points converted to MVT
 * Requires backend tiles at /api/tiles/pop/{z}/{x}/{y}
 */

export type PopSourceParams = {
  lakeId: number;
  year: number;
  radiusKm: number;
  layerId?: number | null;
};

export const POP_SOURCE_ID = 'pop';
export const POP_LAYER_ID = 'pop-heat';

export function buildPopTilesURL(params: PopSourceParams) {
  const base = `/api/tiles/pop/{z}/{x}/{y}`;
  const qs = new URLSearchParams();
  qs.set('lake_id', String(params.lakeId));
  qs.set('year', String(params.year));
  qs.set('radius_km', String(params.radiusKm));
  if (params.layerId) qs.set('layer_id', String(params.layerId));
  return `${base}?${qs.toString()}`;
}

export function addPopSource(map: any, params: PopSourceParams) {
  if (!map || typeof map.addSource !== 'function') return;
  const url = buildPopTilesURL(params);
  if (map.getSource(POP_SOURCE_ID)) {
    try { map.removeLayer(POP_LAYER_ID); } catch {}
    try { map.removeSource(POP_SOURCE_ID); } catch {}
  }
  map.addSource(POP_SOURCE_ID, {
    type: 'vector',
    tiles: [url],
    minzoom: 0,
    maxzoom: 14,
  });
}

export function updatePopSource(map: any, params: PopSourceParams) {
  const src: any = map?.getSource?.(POP_SOURCE_ID);
  if (!src) {
    addPopSource(map, params);
    return;
  }
  const url = buildPopTilesURL(params);
  if (typeof src.setTiles === 'function') {
    src.setTiles([url]);
  } else {
    // Fallback: recreate source
    try { map.removeLayer(POP_LAYER_ID); } catch {}
    try { map.removeSource(POP_SOURCE_ID); } catch {}
    addPopSource(map, params);
  }
  try { map.triggerRepaint?.(); } catch {}
}

export function addPopHeatLayer(map: any) {
  if (!map || typeof map.addLayer !== 'function') return;
  if (!map.getSource(POP_SOURCE_ID)) return;
  if (map.getLayer(POP_LAYER_ID)) return;

  map.addLayer({
    id: POP_LAYER_ID,
    type: 'heatmap',
    source: POP_SOURCE_ID,
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
  });
}
