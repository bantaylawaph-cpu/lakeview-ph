import { useState, useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';
import { createHeatLayer, fetchPopPointsProgressive } from '../../../map/leafletHeat';

export function usePopulationHeatmap({ mapRef, selectedLake, lakeBounds = null }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resolution, setResolution] = useState(null); // 'preview' | 'final'
  const paramsRef = useRef(null);
  const heatLayerRef = useRef(null);
  const rawPointsRef = useRef([]); // store raw points for hover calculations
  const gridIndexRef = useRef({ cell: 0, cells: new Map() });
  const hoverTooltipRef = useRef(null);
  const hoverHandlersRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const inFlightRef = useRef(false);
  const estimateInFlightRef = useRef(false);
  const pendingFetchRef = useRef(null);

  const clearLayer = () => {
    const map = mapRef?.current;
    if (map && heatLayerRef.current) { try { map.removeLayer(heatLayerRef.current); } catch {} }
    heatLayerRef.current = null;
  };

  const clear = useCallback(() => {
    // Cancel in-flight fetches and pending timers
    if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    pendingFetchRef.current = null; inFlightRef.current = false; estimateInFlightRef.current = false;
    // Remove hover tooltip and clear raw data so no stale values are shown
    const map = mapRef?.current;
    const hh = hoverHandlersRef.current;
    if (map && hh) { try { map.off('mousemove', hh.onMove); map.off('mouseout', hh.onOut); } catch {} }
    hoverHandlersRef.current = null;
    if (hoverTooltipRef.current && hoverTooltipRef.current._map) { try { hoverTooltipRef.current.remove(); } catch {} }
    rawPointsRef.current = [];
    gridIndexRef.current = { cell: 0, cells: new Map() };
    // Remove the current heat layer
    clearLayer();
    // Reset UI state and disable the feature so it won't auto-refresh until re-enabled
    setEnabled(false); setLoading(false); setResolution(null); setError(null);
  }, [mapRef]);

  const runFetch = useCallback(() => {
    const map = mapRef?.current;
    if (!map || !paramsRef.current || !selectedLake?.id) return;
    if (inFlightRef.current && abortRef.current) { try { abortRef.current.abort(); } catch {} }
    if (estimateInFlightRef.current) { pendingFetchRef.current = runFetch; setLoading(true); setResolution(null); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    const zoom = map.getZoom?.() || 8;
    const maxPoints = zoom >= 13 ? 50000 : zoom >= 11 ? 50000 : zoom >= 9 ? 50000 : 50000;
    const smallPoints = Math.min(1200, Math.floor(maxPoints / 4));
    const b = map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    const params = {
      lakeId: selectedLake.id,
      year: paramsRef.current.year,
      radiusKm: paramsRef.current.km,
      layerId: paramsRef.current.layerId,
      bbox: `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`,
      maxPoints,
      smallPoints,
    };
    inFlightRef.current = true;
    setLoading(true); setResolution(null); setError(null);
    const runner = fetchPopPointsProgressive(params, {
      onIntermediate: (payload) => {
        const pts = payload?.normalized || [];
        rawPointsRef.current = Array.isArray(payload?.raw) ? payload.raw : [];
        // Rebuild lightweight spatial grid index for hover queries
        try {
          const map = mapRef?.current;
          if (map) {
            const layerRadiusPx = Number(heatLayerRef.current?.options?.radius) || 18;
            const center = map.getCenter?.();
            if (center) {
              const pt = map.latLngToContainerPoint(center);
              const pt2 = L.point(pt.x + layerRadiusPx, pt.y);
              const latlng2 = map.containerPointToLatLng(pt2);
              const radiusMeters = map.distance(center, latlng2) || 250;
              const cellSize = Math.max(50, Math.min(1000, Math.floor(radiusMeters))); // clamp to [50m, 1000m]
              const proj = L.CRS.EPSG3857;
              const cells = new Map();
              const raw = rawPointsRef.current || [];
              for (let i = 0; i < raw.length; i++) {
                const p = raw[i];
                const ll = L.latLng(p[0], p[1]);
                const m = proj.project(ll);
                const cx = Math.floor(m.x / cellSize);
                const cy = Math.floor(m.y / cellSize);
                const key = cx + ':' + cy;
                let bucket = cells.get(key);
                if (!bucket) { bucket = []; cells.set(key, bucket); }
                bucket.push([m.x, m.y, Number(p[2]) || 0]);
              }
              gridIndexRef.current = { cell: cellSize, cells };
            }
          }
        } catch {}
        if (!heatLayerRef.current) {
          const layer = createHeatLayer(pts);
          heatLayerRef.current = layer; layer.addTo(map);
        } else { heatLayerRef.current.__setData?.(pts); }
        setResolution('preview');
      },
      onFinal: (payload) => {
        const pts = payload?.normalized || [];
        rawPointsRef.current = Array.isArray(payload?.raw) ? payload.raw : rawPointsRef.current;
        // Rebuild grid index using full payload
        try {
          const map = mapRef?.current;
          if (map) {
            const layerRadiusPx = Number(heatLayerRef.current?.options?.radius) || 18;
            const center = map.getCenter?.();
            if (center) {
              const pt = map.latLngToContainerPoint(center);
              const pt2 = L.point(pt.x + layerRadiusPx, pt.y);
              const latlng2 = map.containerPointToLatLng(pt2);
              const radiusMeters = map.distance(center, latlng2) || 250;
              const cellSize = Math.max(50, Math.min(1000, Math.floor(radiusMeters)));
              const proj = L.CRS.EPSG3857;
              const cells = new Map();
              const raw = rawPointsRef.current || [];
              for (let i = 0; i < raw.length; i++) {
                const p = raw[i];
                const ll = L.latLng(p[0], p[1]);
                const m = proj.project(ll);
                const cx = Math.floor(m.x / cellSize);
                const cy = Math.floor(m.y / cellSize);
                const key = cx + ':' + cy;
                let bucket = cells.get(key);
                if (!bucket) { bucket = []; cells.set(key, bucket); }
                bucket.push([m.x, m.y, Number(p[2]) || 0]);
              }
              gridIndexRef.current = { cell: cellSize, cells };
            }
          }
        } catch {}
        if (heatLayerRef.current) { heatLayerRef.current.__setData?.(pts); }
        else { const layer = createHeatLayer(pts); heatLayerRef.current = layer; layer.addTo(map); }
        setLoading(false); setResolution('final'); setError(null);
      },
      onError: (e) => {
        if (e?.name === 'AbortError') return;
        setLoading(false); setResolution(null); setError('Failed to load population points');
      }
    }, { signal: controller.signal });
    controller.signal.addEventListener('abort', () => setLoading(false));
    runner.promise.finally(() => { inFlightRef.current = false; });
  }, [mapRef, selectedLake]);

  const toggle = useCallback((on, opts = {}) => {
    const map = mapRef?.current;
    if (!map) return;
    if (!on) {
      // Disable the heatmap but keep the last-used params so a later toggle(true)
      // without options can reuse them.
      setEnabled(false); setLoading(false); setResolution(null); setError(null);
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
      // Tear down hover tooltip and handlers
      const map = mapRef?.current;
      const hh = hoverHandlersRef.current;
      if (map && hh) { try { map.off('mousemove', hh.onMove); map.off('mouseout', hh.onOut); } catch {} }
      hoverHandlersRef.current = null;
      if (hoverTooltipRef.current && hoverTooltipRef.current._map) { try { hoverTooltipRef.current.remove(); } catch {} }
      clearLayer();
      return;
    }
    if (!selectedLake?.id) return;
    // If caller provided explicit options, validate them and use them. If no
    // explicit options were provided, reuse the last-known params (if any),
    // otherwise fall back to the previous defaults.
    const hasExplicitOpts = opts && (typeof opts.km !== 'undefined' || typeof opts.year !== 'undefined' || typeof opts.layerId !== 'undefined');
    if (hasExplicitOpts && Number(opts.km) <= 0) { clearLayer(); setEnabled(false); setLoading(false); return; }
    const paramsToUse = hasExplicitOpts
      ? { year: Number(opts.year ?? 2025), km: Number(opts.km ?? 2), layerId: opts.layerId ?? null }
      : (paramsRef.current || { year: Number(opts.year ?? 2025), km: Number(opts.km ?? 2), layerId: opts.layerId ?? null });
    setEnabled(true);
    paramsRef.current = paramsToUse;
    if (opts.loading) setLoading(true);
    runFetch();
  }, [runFetch, selectedLake]);

  // React to map zoom when enabled (do not refetch on pan so the layer persists)
  useEffect(() => {
    const map = mapRef?.current;
    if (!map || !enabled) return;
    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          // If entire lake bounds are visible, skip refetch on pan/zoom
          if (lakeBounds && typeof map.getBounds === 'function') {
            const v = map.getBounds();
            if (v && v.contains && v.contains(lakeBounds)) {
              return; // fully visible: no refetch
            }
          }
        } catch {}
        runFetch();
      }, 200);
    };
    map.on('zoomend', schedule);
    return () => { try { map.off('zoomend', schedule); } catch {}; if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [enabled, runFetch, lakeBounds]);

  // Hover tooltip: show value at point or sum of aggregated points within heat radius
  useEffect(() => {
    const map = mapRef?.current;
    const layer = heatLayerRef.current;
    const hasData = Array.isArray(rawPointsRef.current) && rawPointsRef.current.length > 0;
    if (!map || !enabled || !layer || !hasData) return;

    // Create (or reuse) a tooltip
    let tooltip = hoverTooltipRef.current;
    if (!tooltip) {
      try {
        tooltip = L.tooltip({
          permanent: false,
          direction: 'top',
          opacity: 0.95,
          offset: [0, -8],
          className: 'lv-heat-hover'
        });
        hoverTooltipRef.current = tooltip;
      } catch (e) {
        // Leaflet not available or other issue; bail out gracefully
        return;
      }
    }

    let rafId = null;
    let lastTs = 0;
    const throttleMs = 60; // ~16 FPS max compute rate

    const computeAt = (e) => {
      try {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (now - lastTs < throttleMs) return;
        lastTs = now;

        const latlng = e?.latlng;
        if (!latlng) return;
        const radiusPx = Number(layer?.options?.radius) || 18;
        const pt = map.latLngToContainerPoint(latlng);
        const pt2 = L.point(pt.x + radiusPx, pt.y);
        const latlng2 = map.containerPointToLatLng(pt2);
        const metersRadius = map.distance(latlng, latlng2) || 250;

        // Fast hover sum using a simple grid index in EPSG:3857 meters
        const proj = L.CRS.EPSG3857;
        const m = proj.project(latlng);
        const grid = gridIndexRef.current || { cell: 0, cells: new Map() };
        const cell = grid.cell || Math.max(50, Math.min(1000, Math.floor(metersRadius)));
        const cells = grid.cells || new Map();
        const cx = Math.floor(m.x / cell);
        const cy = Math.floor(m.y / cell);
        const rCells = Math.max(1, Math.ceil(metersRadius / cell));
        let sum = 0;
        let count = 0;
        for (let dx = -rCells; dx <= rCells; dx++) {
          for (let dy = -rCells; dy <= rCells; dy++) {
            const bucket = cells.get((cx + dx) + ':' + (cy + dy));
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
              const p = bucket[i]; // [mx, my, val]
              const dxm = p[0] - m.x;
              const dym = p[1] - m.y;
              const d2 = dxm*dxm + dym*dym;
              if (d2 <= metersRadius * metersRadius) {
                count++;
                const v = p[2];
                if (Number.isFinite(v)) sum += v;
              }
            }
          }
        }

        if (count > 0) {
          // Show approximate integer value (no decimals) as population is whole people
          const approx = Math.round(sum || 0);
          const content = `~${approx.toLocaleString()}`;
          tooltip.setLatLng(latlng).setContent(content);
          if (!tooltip._map) tooltip.addTo(map);
        } else {
          if (tooltip._map) tooltip.remove();
        }
      } catch {}
    };

    const onMove = (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        computeAt(e);
      });
    };
    const onOut = () => {
      if (tooltip && tooltip._map) {
        try { tooltip.remove(); } catch {}
      }
    };

    map.on('mousemove', onMove);
    map.on('mouseout', onOut);
    hoverHandlersRef.current = { onMove, onOut };

    return () => {
      if (rafId) { try { cancelAnimationFrame(rafId); } catch {} rafId = null; }
      try { map.off('mousemove', onMove); map.off('mouseout', onOut); } catch {}
      if (hoverTooltipRef.current && hoverTooltipRef.current._map) {
        try { hoverTooltipRef.current.remove(); } catch {}
      }
      hoverHandlersRef.current = null;
    };
  }, [enabled, resolution, mapRef]);

  // When selected lake changes: immediately cancel any in-flight fetch, remove the
  // existing heat layer, clear pending debounces, and reset UI state so no stale
  // data or listeners linger from the previous lake.
  useEffect(() => {
    // Abort network and progressive runners
    if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
    inFlightRef.current = false;
    // Clear any scheduled fetch
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    pendingFetchRef.current = null;
    // Remove hover tooltip and handlers
    const map = mapRef?.current;
    const hh = hoverHandlersRef.current;
    if (map && hh) { try { map.off('mousemove', hh.onMove); map.off('mouseout', hh.onOut); } catch {} }
    hoverHandlersRef.current = null;
    if (hoverTooltipRef.current && hoverTooltipRef.current._map) { try { hoverTooltipRef.current.remove(); } catch {} }
    // Clear layer from the map
    clearLayer();
    gridIndexRef.current = { cell: 0, cells: new Map() };
    // Reset UI flags; keep enabled=false unless user toggles again for the new lake
    setLoading(false); setResolution(null); setError(null); setEnabled(false);
    // Also reset estimate lifecycle state to avoid auto-refetch from previous cycle
    estimateInFlightRef.current = false;
  }, [selectedLake?.id]);

  // On unmount: abort, clear timers and layer to prevent leaks
  useEffect(() => {
    return () => {
      if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      pendingFetchRef.current = null; estimateInFlightRef.current = false; inFlightRef.current = false;
      // Remove hover tooltip and handlers
      const map = mapRef?.current;
      const hh = hoverHandlersRef.current;
      if (map && hh) { try { map.off('mousemove', hh.onMove); map.off('mouseout', hh.onOut); } catch {} }
      hoverHandlersRef.current = null;
      if (hoverTooltipRef.current && hoverTooltipRef.current._map) { try { hoverTooltipRef.current.remove(); } catch {} }
      clearLayer();
    };
  }, []);

  // Listen for population estimate lifecycle events
  useEffect(() => {
    const handler = (e) => {
      const st = e?.detail?.state;
      if (st === 'start') {
        estimateInFlightRef.current = true;
        if (abortRef.current) { try { abortRef.current.abort(); } catch {} }
        if (enabled) { setLoading(true); setResolution(null); }
      } else if (st === 'done') {
        estimateInFlightRef.current = false;
        const queued = pendingFetchRef.current;
        if (queued) { pendingFetchRef.current = null; setTimeout(() => queued(), 0); }
        else if (enabled && paramsRef.current) { runFetch(); }
      }
    };
    window.addEventListener('lv-pop-estimate', handler);
    return () => window.removeEventListener('lv-pop-estimate', handler);
  }, [enabled, runFetch]);

  const clearError = () => setError(null);
  const hasLayer = !!heatLayerRef.current;
  return { enabled, loading, error, resolution, toggle, clear, hasLayer, clearError };
}
