import React from 'react';

// Reusable coordinate picker with manual/map (pin drop) modes. Accepts
// - form: the current form object containing lat/lon
// - setForm: setter to update the form
// - mapHeight: optional map height
// - showLakeLayer: optional boolean to show lake geometry when lake_id is provided (used by LakeFlowForm)
// - lakeId: optional lake id used to fetch geometry for lake preview
export default function CoordinatePicker({ form, setForm, mapHeight = 240, showLakeLayer = false, lakeId = null }) {
  const mapRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const markerRef = React.useRef(null);
  const lakeLayerRef = React.useRef(null);

  // helper to fetch and render lake geometry or fallback point
  const renderLakeOverlay = React.useCallback(async (targetLakeId) => {
    if (!showLakeLayer || !targetLakeId || !mapRef.current) return;
    try {
      const { api } = await import('../lib/api');
      const data = await api(`/lakes/${targetLakeId}`);
      // remove previous layer
      try { if (lakeLayerRef.current && mapRef.current) { mapRef.current.removeLayer(lakeLayerRef.current); lakeLayerRef.current = null; } } catch {}
      const gj = data?.geom_geojson ?? null;
      let geom = gj;
      if (typeof gj === 'string') { try { geom = JSON.parse(gj); } catch { geom = null; } }
      if (geom) {
        const L = await import('leaflet');
        // remove any simple marker placed earlier so the geojson layer is the single visual
        try { if (markerRef.current && mapRef.current) { mapRef.current.removeLayer(markerRef.current); markerRef.current = null; } } catch {}
        lakeLayerRef.current = L.geoJSON(geom, {
          style: { color: '#2563eb', weight: 2, fillOpacity: 0.08 },
          pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 8, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9 })
        }).addTo(mapRef.current);
        try {
          const bounds = lakeLayerRef.current.getBounds();
          if (bounds && bounds.isValid && bounds.isValid()) mapRef.current.fitBounds(bounds, { maxZoom: 14 });
        } catch {}
        return;
      }

      // fallback: use lake lat/lon
      const lat = data?.latitude ?? data?.lat ?? null;
      const lon = data?.longitude ?? data?.lon ?? null;
      if (lat && lon && mapRef.current) {
        const L = await import('leaflet');
        if (!markerRef.current) markerRef.current = L.circleMarker([lat, lon], { radius: 8, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9 }).addTo(mapRef.current);
        else {
          markerRef.current.setLatLng([lat, lon]);
          try { markerRef.current.setStyle({ color: '#2563eb', fillColor: '#2563eb' }); } catch {}
        }
        // Preserve the user's current zoom level when centering; use panTo instead of forcing a zoom change
        mapRef.current.panTo([lat, lon]);
      }
    } catch {}
  }, [showLakeLayer]);

  // initialize map lazily on mount (always pin-drop mode)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const L = await import('leaflet');
      if (!mounted || !containerRef.current) return;
      // avoid re-initializing
      if (containerRef.current._leaflet_id) {
        mapRef.current = containerRef.current; // fallback reference
        return;
      }
      const map = L.map(containerRef.current, { center: [form.lat || 12.8797, form.lon || 121.7740], zoom: 6 });
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setForm((f) => ({ ...f, lat: Number(lat.toFixed(6)), lon: Number(lng.toFixed(6)) }));
        if (!markerRef.current) markerRef.current = L.circleMarker([lat, lng], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(map);
        else {
          markerRef.current.setLatLng([lat, lng]);
          // user-interaction should show the red style
          try { markerRef.current.setStyle({ color: '#ef4444', fillColor: '#ef4444' }); } catch (e) {}
        }
      });

      // initial marker
      if (form.lat && form.lon) {
        markerRef.current = L.circleMarker([form.lat, form.lon], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(map);
        // Keep current zoom when centering an initial marker
        map.panTo([form.lat, form.lon]);
      }

      // if a lake is provided, render its overlay immediately after map init
      if (showLakeLayer && lakeId) {
        try { await renderLakeOverlay(lakeId); } catch {}
      }
    })();

    return () => { mounted = false; try { if (mapRef.current && mapRef.current.remove) { mapRef.current.remove(); mapRef.current = null; } } catch (e) {} };
  }, [renderLakeOverlay, showLakeLayer, lakeId]);

  // keep marker in sync when lat/lon change
  React.useEffect(() => {
    if (!mapRef.current) return;
    const lat = form.lat; const lon = form.lon;
    if (lat && lon) {
      (async () => {
        const L = await import('leaflet');
        if (!markerRef.current) markerRef.current = L.circleMarker([lat, lon], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(mapRef.current);
        else markerRef.current.setLatLng([lat, lon]);
        try { mapRef.current.panTo([lat, lon]); } catch (e) {}
      })();
    }
  }, [form.lat, form.lon]);

  // if requested, fetch and render lake geometry when lakeId changes (used by LakeFlowForm)
  React.useEffect(() => {
    // re-render overlay when lakeId changes post-init
    renderLakeOverlay(lakeId);
  }, [renderLakeOverlay, lakeId]);

  return (
    <div style={{ width: '100%' }}>
      <div ref={containerRef} style={{ height: mapHeight, border: '1px solid #d1d5db', borderRadius: 6 }} />
    </div>
  );
}
