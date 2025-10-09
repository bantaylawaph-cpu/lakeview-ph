import { useState, useRef, useCallback, useEffect } from 'react';
import { createHeatLayer, fetchPopPointsProgressive } from '../../../map/leafletHeat';

export function usePopulationHeatmap({ mapRef, selectedLake }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resolution, setResolution] = useState(null); // 'preview' | 'final'
  const paramsRef = useRef(null);
  const heatLayerRef = useRef(null);
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

  const runFetch = useCallback(() => {
    const map = mapRef?.current;
    if (!map || !paramsRef.current || !selectedLake?.id) return;
    if (inFlightRef.current && abortRef.current) { try { abortRef.current.abort(); } catch {} }
    if (estimateInFlightRef.current) { pendingFetchRef.current = runFetch; setLoading(true); setResolution(null); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    const zoom = map.getZoom?.() || 8;
    const maxPoints = zoom >= 13 ? 8000 : zoom >= 11 ? 6000 : zoom >= 9 ? 4000 : 2500;
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
      onIntermediate: (pts) => {
        if (!heatLayerRef.current) {
          const layer = createHeatLayer(pts);
          heatLayerRef.current = layer; layer.addTo(map);
        } else { heatLayerRef.current.__setData?.(pts); }
        setResolution('preview');
      },
      onFinal: (pts) => {
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

  // React to map move/zoom when enabled
  useEffect(() => {
    const map = mapRef?.current;
    if (!map || !enabled) return;
    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { runFetch(); }, 200);
    };
    map.on('moveend', schedule); map.on('zoomend', schedule);
    return () => { try { map.off('moveend', schedule); map.off('zoomend', schedule); } catch {}; if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [enabled, runFetch]);

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
  return { enabled, loading, error, resolution, toggle, clearError };
}
