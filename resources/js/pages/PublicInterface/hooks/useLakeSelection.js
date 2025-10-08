import { useState, useCallback } from 'react';
import L from 'leaflet';
import { fetchPublicLayers, fetchLakeOptions, fetchPublicLayerGeo } from '../../../lib/layers';
import { apiPublic } from '../../../lib/api';

// Helper to extract id (works for polygon layers or point fallback markers)
const getLakeIdFromFeature = (feat) => {
  const p = feat?.properties || {};
  return feat?.id ?? p.id ?? p.lake_id ?? p.lakeId ?? p.lakeID ?? null;
};

export function useLakeSelection({ publicFC, mapRef, setPanelOpen, setFilterWatershedId }) {
  const [selectedLake, setSelectedLake] = useState(null);
  const [selectedLakeId, setSelectedLakeId] = useState(null);
  const [selectedLakeName, setSelectedLakeName] = useState(null);
  const [selectedWatershedId, setSelectedWatershedId] = useState(null);
  const [watershedToggleOn, setWatershedToggleOn] = useState(false);
  const [lakeOverlayFeature, setLakeOverlayFeature] = useState(null);
  const [watershedOverlayFeature, setWatershedOverlayFeature] = useState(null);
  const [lakeLayers, setLakeLayers] = useState([]);
  const [lakeActiveLayerId, setLakeActiveLayerId] = useState(null);
  const [baseKeyBump, setBaseKeyBump] = useState(0);

  const loadPublicLayersForLake = useCallback(async (lakeId) => {
    setLakeOverlayFeature(null);
    setWatershedOverlayFeature(null);
    setWatershedToggleOn(false);
    setBaseKeyBump(v => v + 1);
    if (!lakeId) { setLakeLayers([]); setLakeActiveLayerId(null); return; }
    try {
      const rows = await fetchPublicLayers({ bodyType: 'lake', bodyId: lakeId });
      setLakeLayers(rows);
      const active = rows.find(r => r.is_active);
      setLakeActiveLayerId(active ? active.id : null);
    } catch (e) {
      console.warn('[useLakeSelection] layer fetch failed', e);
      setLakeLayers([]); setLakeActiveLayerId(null);
    }
  }, []);

  const applyOverlayByLayerId = useCallback(async (layerId, { fit = true } = {}) => {
    try {
      const row = await fetchPublicLayerGeo(layerId);
      if (!row || !row.geom_geojson) { console.warn('[useLakeSelection] Missing geometry for layer', layerId); return; }
      let geometry; try { geometry = JSON.parse(row.geom_geojson); } catch { return; }
      const feature = { type: 'Feature', properties: { layer_id: row.id, body_type: row.body_type || 'lake', name: row.name, organization: row.uploaded_by_org || 'LakeView' }, geometry };
      if ((feature.properties.body_type || 'lake').toLowerCase() === 'watershed') {
        setWatershedOverlayFeature(feature);
      } else {
        setLakeOverlayFeature(feature);
        setBaseKeyBump(v => v + 1);
      }
      if (fit && mapRef?.current) {
        try { const gj = L.geoJSON(feature); const b = gj.getBounds(); if (b?.isValid?.()) mapRef.current.fitBounds(b, { padding: [24,24], maxZoom: 13 }); } catch {}
      }
    } catch (e) { console.warn('[useLakeSelection] overlay fetch failed', e); }
  }, [mapRef]);

  const selectLakeFeature = useCallback((feat, layer) => {
    const p = feat?.properties || {};
    let lakeId = getLakeIdFromFeature(feat) ?? (p && (p.lake_id ?? p.lakeId ?? p.id)) ?? null;
    setWatershedToggleOn(false);
    setSelectedWatershedId(null);
    setWatershedOverlayFeature(null);
    setSelectedLake({
      id: lakeId,
      name: p.name,
      alt_name: p.alt_name,
      region: p.region,
      province: p.province,
      municipality: p.municipality,
      watershed_name: p.watershed_name,
      watershed_id: null,
      surface_area_km2: p.surface_area_km2,
      elevation_m: p.elevation_m,
      mean_depth_m: p.mean_depth_m,
    });
    setSelectedLakeId(lakeId);
    setSelectedLakeName(p?.name || null);
    setPanelOpen?.(true);

    (async () => {
      if (lakeId == null && p?.name) {
        try {
          const opts = await fetchLakeOptions(p.name);
          const exact = opts.find(o => (o.name || '').toLowerCase() === String(p.name).toLowerCase());
          const candidate = exact || opts[0];
          if (candidate?.id != null) { lakeId = candidate.id; setSelectedLakeId(lakeId); }
        } catch (e) { console.warn('[useLakeSelection] lake id lookup failed', e); }
      }
      if (lakeId != null) {
        try {
          const pub = await apiPublic(`/public/lakes/${lakeId}`);
          const detail = pub?.id ? pub : await apiPublic(`/lakes/${lakeId}`);
          if (detail?.id && String(detail.id) === String(lakeId)) {
            setSelectedLake(prev => ({ ...prev, ...detail }));
            setSelectedWatershedId(detail?.watershed_id ?? null);
            setFilterWatershedId?.(detail?.watershed_id ?? null);
          }
        } catch (err) { console.warn('[useLakeSelection] lake detail fetch failed', err); setSelectedWatershedId(null); }
        await loadPublicLayersForLake(lakeId);
      } else {
        setSelectedWatershedId(null); setLakeLayers([]); setLakeActiveLayerId(null);
      }
    })();

    if (mapRef?.current && layer) {
      try {
        // Polygons / multi geometries: use fitBounds
        if (typeof layer.getBounds === 'function') {
          const b = layer.getBounds();
          if (b?.isValid?.()) {
            mapRef.current.fitBounds(b, { padding: [24,24], maxZoom: 12 });
            return;
          }
        }
        // Point-like layers (circleMarker / marker): center and zoom in
        if (typeof layer.getLatLng === 'function') {
          const latlng = layer.getLatLng();
          // prefer a closer zoom for points
          const targetZoom = Math.min(12, mapRef.current.getMaxZoom ? mapRef.current.getMaxZoom() : 12);
          try { mapRef.current.flyTo([latlng.lat, latlng.lng], targetZoom, { duration: 0.6 }); } catch { mapRef.current.setView([latlng.lat, latlng.lng], targetZoom); }
        }
      } catch (err) {
        console.warn('[useLakeSelection] map zoom failed', err);
      }
    }
  }, [mapRef, loadPublicLayersForLake, setPanelOpen, setFilterWatershedId]);

  const baseMatchesSelectedLake = useCallback((feat) => {
    if (!lakeOverlayFeature) return false;
    const fid = getLakeIdFromFeature(feat);
    if (selectedLakeId != null && fid != null) return String(fid) === String(selectedLakeId);
    const fname = (feat?.properties?.name || '').trim().toLowerCase();
    return selectedLakeId == null && !!selectedLakeName && fname === String(selectedLakeName).trim().toLowerCase();
  }, [lakeOverlayFeature, selectedLakeId, selectedLakeName]);

  const handlePanelToggleWatershed = useCallback(async (checked) => {
    setWatershedToggleOn(checked);
    if (!checked) { setWatershedOverlayFeature(null); return; }
    if (!selectedWatershedId) { setWatershedToggleOn(false); return; }
    try {
      const candidates = await fetchPublicLayers({ bodyType: 'watershed', bodyId: selectedWatershedId });
      const target = candidates?.find(l => l.is_active) || candidates?.[0];
      if (!target) { setWatershedToggleOn(false); return; }
      await applyOverlayByLayerId(target.id, { fit: true });
    } catch (err) { console.warn('[useLakeSelection] toggle watershed failed', err); setWatershedToggleOn(false); }
  }, [selectedWatershedId, applyOverlayByLayerId]);

  const resetToActive = useCallback(() => {
    setWatershedToggleOn(false);
    setLakeOverlayFeature(null);
    setWatershedOverlayFeature(null);
    setBaseKeyBump(v => v + 1);
    if (!publicFC || !selectedLakeId || !mapRef?.current) return;
    try {
      const f = publicFC.features?.find(ft => {
        const id = getLakeIdFromFeature(ft); return id != null && String(id) === String(selectedLakeId);
      });
      if (f) { const gj = L.geoJSON(f); const b = gj.getBounds(); if (b?.isValid?.()) mapRef.current.fitBounds(b, { padding: [24,24], maxZoom: 13 }); }
    } catch {}
  }, [publicFC, selectedLakeId, mapRef]);

  return {
    // state
    selectedLake, selectedLakeId, selectedWatershedId, watershedToggleOn,
    lakeOverlayFeature, watershedOverlayFeature, lakeLayers, lakeActiveLayerId,
    baseMatchesSelectedLake, baseKeyBump,
    // actions
    selectLakeFeature, applyOverlayByLayerId, handlePanelToggleWatershed, resetToActive,
  };
}
