import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';

export function useWaterQualityMarkers(mapRef) {
  const wqLayerRef = useRef(null);
  const queuedWqMarkersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [highlightMarker, setHighlightMarker] = useState(null);

  // Basic map ready detection (consumer sets mapRef.current)
  useEffect(() => {
    if (mapRef.current && !mapReady) setMapReady(true);
  }, [mapRef, mapReady]);

  useEffect(() => {
    const onMarkers = (e) => {
      const markers = Array.isArray(e?.detail?.markers) ? e.detail.markers : [];
      if (!mapRef.current) { queuedWqMarkersRef.current = markers; return; }
      try {
        if (!wqLayerRef.current) wqLayerRef.current = L.layerGroup().addTo(mapRef.current);
        wqLayerRef.current.clearLayers();
        markers.forEach(m => {
          if (m && Number.isFinite(m.lat) && Number.isFinite(m.lon)) {
            const cm = L.circleMarker([m.lat, m.lon], { radius: 6, color: '#ff6b6b', weight: 2, fillColor: '#ffffff', fillOpacity: 0.9 });
            const popupContent = `
              <div style="font-size: 14px; color: #000;">
                <strong>${m.label || 'Station'}</strong><br>
                <button class="view-station-btn" onclick="window.dispatchEvent(new CustomEvent('lv-open-data-summary', { detail: { lakeId: '${m.lakeId}', orgId: '${m.orgId}', stationId: '${m.stationId}' } }))" style="margin-top: 5px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">View Station Data</button>
              </div>
            `;
            cm.bindPopup(popupContent);
            cm.addTo(wqLayerRef.current);
          }
        });
      } catch (err) { console.warn('[useWaterQualityMarkers] update failed', err); }
    };
    const onActive = (e) => { if (!e?.detail?.active && wqLayerRef.current) { try { wqLayerRef.current.clearLayers(); } catch {} } };
    window.addEventListener('lv-wq-markers', onMarkers);
    window.addEventListener('lv-wq-active', onActive);
    return () => { window.removeEventListener('lv-wq-markers', onMarkers); window.removeEventListener('lv-wq-active', onActive); };
  }, []);

  // Flush queued markers once ready
  useEffect(() => {
    if (mapReady && queuedWqMarkersRef.current.length) {
      try {
        if (!wqLayerRef.current) wqLayerRef.current = L.layerGroup().addTo(mapRef.current);
        wqLayerRef.current.clearLayers();
        queuedWqMarkersRef.current.forEach(m => {
          if (m && Number.isFinite(m.lat) && Number.isFinite(m.lon)) {
            const cm = L.circleMarker([m.lat, m.lon], { radius: 6, color: '#ff6b6b', weight: 2, fillColor: '#ffffff', fillOpacity: 0.9 });
            const popupContent = `
              <div style="font-size: 14px; color: #000;">
                <strong>${m.label || 'Station'}</strong><br>
                <button class="view-station-btn" onclick="window.dispatchEvent(new CustomEvent('lv-open-data-summary', { detail: { lakeId: '${m.lakeId}', orgId: '${m.orgId}', stationId: '${m.stationId}' } }))" style="margin-top: 5px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">View Station Data</button>
              </div>
            `;
            cm.bindPopup(popupContent);
            cm.addTo(wqLayerRef.current);
          }
        });
      } catch (e) { console.warn('[useWaterQualityMarkers] flush failed', e); }
      queuedWqMarkersRef.current = [];
    }
  }, [mapReady]);

  // Highlight single station (temporary)
  useEffect(() => {
    if (!highlightMarker || !mapRef.current) return;
    let marker; let timer;
    try {
      marker = L.circleMarker([highlightMarker.lat, highlightMarker.lon], { radius: 7, color: '#2563eb', weight: 2, fillColor: '#93c5fd', fillOpacity: 0.9 }).addTo(mapRef.current);
    } catch {}
    timer = setTimeout(() => { try { marker && marker.remove(); } catch {} }, 4000);
    return () => { clearTimeout(timer); try { marker && marker.remove(); } catch {} };
  }, [highlightMarker, mapRef]);

  const jumpToStation = useCallback((lat, lon) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || !mapRef.current) return;
    setHighlightMarker({ lat: Number(lat), lon: Number(lon) });
    try { mapRef.current.flyTo([Number(lat), Number(lon)], 13, { duration: 0.8 }); } catch {}
  }, [mapRef]);

  // External event to jump (backwards compatibility)
  useEffect(() => {
    const handler = (e) => {
      const lat = Number(e?.detail?.lat); const lon = Number(e?.detail?.lon);
      jumpToStation(lat, lon);
    };
    window.addEventListener('lv-jump-to-station', handler);
    return () => window.removeEventListener('lv-jump-to-station', handler);
  }, [jumpToStation]);

  return { jumpToStation };
}
