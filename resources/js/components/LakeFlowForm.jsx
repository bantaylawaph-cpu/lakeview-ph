import React, { useEffect, useState } from 'react';
import Modal from './Modal';

const EMPTY = { id:null, lake_id:'', flow_type:'inflow', name:'', alt_name:'', source:'', is_primary:false, notes:'', lat:'', lon:'' };

export default function LakeFlowForm({ open, mode='create', initialValue=EMPTY, lakes=[], lakesLoading=false, loading=false, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [coordMode, setCoordMode] = useState('manual');

  useEffect(()=>{ setForm({ ...EMPTY, ...initialValue, flow_type: initialValue.flow_type || 'inflow' }); }, [initialValue, open]);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!form.lake_id) return;
    const payload = { ...form };
    if (payload.lat === '') payload.lat = undefined;
    if (payload.lon === '') payload.lon = undefined;
    onSubmit?.(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode==='create'?'Add Flow Point':'Edit Flow Point'}
      ariaLabel="Lake Flow Form"
      width={720}
      footer={<div className="lv-modal-actions">
        <button type="button" className="pill-btn ghost" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="pill-btn primary" form="lv-flow-form" disabled={loading}>{loading?'Saving...':(mode==='create'?'Create':'Save')}</button>
      </div>}
    >
      <form id="lv-flow-form" onSubmit={submit} className="lv-grid-2">
        <label className="lv-field">
          <span>Lake *</span>
          <select value={form.lake_id} required onChange={e=>setForm(f=>({...f,lake_id:e.target.value}))} disabled={lakesLoading}>
            <option value="">{lakesLoading ? 'Loading lakes...' : '-- Select Lake --'}</option>
            {!lakesLoading && lakes.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="lv-field">
          <span>Type *</span>
          <select value={form.flow_type} onChange={e=>setForm(f=>({...f,flow_type:e.target.value}))}>
            <option value="inflow">Inflow</option>
            <option value="outflow">Outflow</option>
          </select>
        </label>
        <label className="lv-field">
          <span>Name</span>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
        </label>
        <label className="lv-field">
          <span>Alt Name</span>
          <input value={form.alt_name} onChange={e=>setForm(f=>({...f,alt_name:e.target.value}))} />
        </label>
        <label className="lv-field">
          <span>Source (River/Stream)</span>
          <input value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))} placeholder="e.g. Agos River" />
        </label>
        <label className="lv-field">
          <span>Primary?</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className={`pill-btn ${form.is_primary ? 'primary' : 'ghost'}`}
              aria-pressed={!!form.is_primary}
              onClick={() => setForm(f => ({ ...f, is_primary: !f.is_primary }))}
              style={{ padding: '6px 10px' }}
            >
              {form.is_primary ? 'Primary' : 'Mark primary'}
            </button>
          </div>
        </label>
        <label className="lv-field" style={{gridColumn:'1 / span 2'}}>
          <span>Notes</span>
          <textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
        </label>
        <div className="lv-field" style={{gridColumn:'1 / span 2'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap', marginBottom:6}}>
            <strong style={{fontSize:14}}>Coordinates</strong>
            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:4}}><input type="radio" name="coord-mode" value="manual" checked={coordMode==='manual'} onChange={()=>setCoordMode('manual')} /> Manual</label>
            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:4}}><input type="radio" name="coord-mode" value="map" checked={coordMode==='map'} onChange={()=>setCoordMode('map')} /> Pin Drop</label>
            <span style={{fontSize:11,color:'#6b7280'}}>Optional but recommended</span>
          </div>
          {coordMode==='manual' && (
            <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
              <label className="lv-field" style={{flex:'1 1 160px'}}>
                <span>Latitude</span>
                <input type="number" step="0.000001" value={form.lat} onChange={e=>setForm(f=>({...f,lat:e.target.value}))} />
              </label>
              <label className="lv-field" style={{flex:'1 1 160px'}}>
                <span>Longitude</span>
                <input type="number" step="0.000001" value={form.lon} onChange={e=>setForm(f=>({...f,lon:e.target.value}))} />
              </label>
            </div>
          )}
          {coordMode==='map' && <MiniPickMap form={form} setForm={setForm} />}
        </div>
      </form>
    </Modal>
  );
}

function MiniPickMap({ form, setForm }) {
  const ref = React.useRef(null);
  const mapRef = React.useRef(null);
  const markerRef = React.useRef(null);
  const lakeLayerRef = React.useRef(null);

  // initialize map once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const L = await import('leaflet');
      if (!mounted || !ref.current) return;
      if (ref.current._leaflet_id) return; // already initialized
      const map = L.map(ref.current, { center: [form.lat || 12.8797, form.lon || 121.7740], zoom: 6 });
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        // place marker
        if (!markerRef.current) markerRef.current = L.marker([lat, lng]).addTo(map);
        else markerRef.current.setLatLng([lat, lng]);
        setForm((f) => ({ ...f, lat: Number(lat.toFixed(6)), lon: Number(lng.toFixed(6)) }));
      });

      // initial marker from form coordinates
      if (form.lat && form.lon) {
        markerRef.current = L.marker([form.lat, form.lon]).addTo(map);
        map.setView([form.lat, form.lon], 12);
      }
    })();

    return () => { mounted = false; try { if (mapRef.current) mapRef.current.remove(); } catch {} };
  }, []); // eslint-disable-line

  // react to lake selection changes: fetch lake detail and render geometry or fallback point
  useEffect(() => {
    let cancelled = false;
    const load = async (lakeId) => {
      if (!lakeId || !mapRef.current) return;
      try {
        const res = await fetch(`/api/lakes/${lakeId}`);
        if (!res.ok) return;
        const data = await res.json();

        // remove previous lake layer if any
        try { if (lakeLayerRef.current && mapRef.current) { mapRef.current.removeLayer(lakeLayerRef.current); lakeLayerRef.current = null; } } catch {}

        // try geom_geojson from lake show endpoint
        const gj = data?.geom_geojson ?? null;
        if (gj) {
          let geom = gj;
          if (typeof gj === 'string') {
            try { geom = JSON.parse(gj); } catch (e) { geom = null; }
          }
          if (geom) {
            const L = await import('leaflet');
            lakeLayerRef.current = L.geoJSON(geom, { style: { color: '#2563eb', weight: 2, fillOpacity: 0.08 } }).addTo(mapRef.current);
            try {
              const bounds = lakeLayerRef.current.getBounds();
              if (bounds && bounds.isValid && bounds.isValid()) mapRef.current.fitBounds(bounds, { maxZoom: 14 });
            } catch (e) {}
            return;
          }
        }

        // fallback: use latitude/longitude fields from lake payload if present
        const lat = data?.latitude ?? data?.lat ?? null;
        const lon = data?.longitude ?? data?.lon ?? null;
        if (lat && lon && mapRef.current) {
          if (!markerRef.current) markerRef.current = (await import('leaflet')).marker([lat, lon]).addTo(mapRef.current);
          else markerRef.current.setLatLng([lat, lon]);
          mapRef.current.setView([lat, lon], 12);
          return;
        }

        // last resort: try public show for geometry
        try {
          const r2 = await fetch(`/api/public/lakes/${lakeId}`);
          if (r2.ok) {
            const d2 = await r2.json();
            const g2 = d2?.geom_geojson ?? null;
            if (g2) {
              let geom2 = g2;
              if (typeof g2 === 'string') {
                try { geom2 = JSON.parse(g2); } catch (e) { geom2 = null; }
              }
              if (geom2) {
                const L = await import('leaflet');
                lakeLayerRef.current = L.geoJSON(geom2, { style: { color: '#2563eb', weight: 2, fillOpacity: 0.08 } }).addTo(mapRef.current);
                try { const bounds = lakeLayerRef.current.getBounds(); if (bounds && bounds.isValid && bounds.isValid()) mapRef.current.fitBounds(bounds, { maxZoom: 14 }); } catch (e) {}
              }
            }
          }
        } catch (e) {}
      } catch (e) {
        // ignore
      }
    };

    if (form.lake_id) load(form.lake_id);
    return () => { cancelled = true; };
  }, [form.lake_id]);

  // keep marker in sync if lat/lon inputs change
  useEffect(() => {
    if (!mapRef.current) return;
    const lat = form.lat; const lon = form.lon;
    if (lat && lon) {
      if (!markerRef.current) markerRef.current = (async () => { const L = await import('leaflet'); return L.marker([lat, lon]).addTo(mapRef.current); })();
      else markerRef.current.setLatLng([lat, lon]);
      mapRef.current.setView([lat, lon], 12);
    }
  }, [form.lat, form.lon]);

  return <div ref={ref} style={{ height: 240, border: '1px solid #d1d5db', borderRadius: 6 }} />;
}
