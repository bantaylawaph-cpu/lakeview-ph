import React, { useEffect, useState } from "react";
import Modal from "./Modal";

const EMPTY = {
  id: null,
  name: "",
  alt_name: "",
  region: "",
  province: "",
  municipality: "",
  watershed_id: "",
  class_code: "",
  surface_area_km2: "",
  elevation_m: "",
  mean_depth_m: "",
  lat: "",
  lon: "",
};

export default function LakeForm({
  open,
  mode = "create",                // "create" | "edit"
  initialValue = EMPTY,
  watersheds = [],
  classOptions = [],
  loading = false,
  onSubmit,                        // (formObject) => void
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm({ ...EMPTY, ...initialValue });
  }, [initialValue, open]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.name?.trim()) return; // minimal guard
    // Normalize comma-separated multi-value fields (region/province/municipality)
    const normalizeCsv = (val) => {
      if (val == null) return "";
      return String(val)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', ');
    };
    const payload = {
      ...form,
      region: normalizeCsv(form.region),
      province: normalizeCsv(form.province),
      municipality: normalizeCsv(form.municipality),
      lat: form.lat === "" ? undefined : Number(form.lat),
      lon: form.lon === "" ? undefined : Number(form.lon),
    };
    return onSubmit?.(payload);
  };

  const denrOptions = Array.isArray(classOptions) ? classOptions : [];

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === "create" ? "Add Lake" : "Edit Lake"}
      ariaLabel="Lake Form"
      width={760}
      footer={
        <div className="lv-modal-actions">
          <button type="button" className="pill-btn ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="pill-btn primary" form="lv-lake-form" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
          </button>
        </div>
      }
    >
  <form id="lv-lake-form" onSubmit={submit} className="lv-grid-2">
        <label className="lv-field">
          <span>Name *</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Alt Name</span>
          <input
            value={form.alt_name}
            onChange={(e) => setForm({ ...form, alt_name: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Region <small style={{fontWeight:400,color:'#6b7280'}}>(comma-separated)</small></span>
          <input
            placeholder="e.g. Region IV-A, Region V"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Province <small style={{fontWeight:400,color:'#6b7280'}}>(comma-separated)</small></span>
          <input
            placeholder="Laguna, Batangas"
            value={form.province}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Municipality/City <small style={{fontWeight:400,color:'#6b7280'}}>(comma-separated)</small></span>
          <input
            placeholder="Los Baños, Calamba"
            value={form.municipality}
            onChange={(e) => setForm({ ...form, municipality: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Watershed</span>
          <select
            value={form.watershed_id ?? ""}
            onChange={(e) => setForm({ ...form, watershed_id: e.target.value })}
          >
            <option value="">-- None --</option>
            {watersheds.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </label>

        <label className="lv-field">
          <span>DENR Classification</span>
          <select
            value={form.class_code ?? ""}
            onChange={(e) => setForm({ ...form, class_code: e.target.value })}
          >
            <option value="">Unspecified</option>
            {denrOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name ? `${opt.code} - ${opt.name}` : opt.code}
              </option>
            ))}
          </select>
        </label>

        <label className="lv-field">
          <span>Surface Area (km^2)</span>
          <input
            type="number"
            step="0.001"
            value={form.surface_area_km2}
            onChange={(e) => setForm({ ...form, surface_area_km2: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Elevation (m)</span>
          <input
            type="number"
            step="0.001"
            value={form.elevation_m}
            onChange={(e) => setForm({ ...form, elevation_m: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Mean Depth (m)</span>
          <input
            type="number"
            step="0.001"
            value={form.mean_depth_m}
            onChange={(e) => setForm({ ...form, mean_depth_m: e.target.value })}
          />
        </label>

        <div className="lv-field" style={{gridColumn:'1 / span 2'}}>
          <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
            <label style={{flex:'1 1 160px'}} className="lv-field">
              <span>Latitude</span>
              <input
                type="number"
                step="0.000001"
                placeholder="14.1702"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
              />
            </label>
            <label style={{flex:'1 1 160px'}} className="lv-field">
              <span>Longitude</span>
              <input
                type="number"
                step="0.000001"
                placeholder="121.2245"
                value={form.lon}
                onChange={(e) => setForm({ ...form, lon: e.target.value })}
              />
            </label>
            <CoordinatePickToggle form={form} setForm={setForm} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// Inline coordinate picker toggle + mini map (lazy simple implementation)
function CoordinatePickToggle({ form, setForm }) {
  const [mode, setMode] = React.useState('manual'); // 'manual' | 'map'
  const mapRef = React.useRef(null);

  React.useEffect(() => {
    if (mode !== 'map') return;
    // Lazy load leaflet only when needed
    (async () => {
      const L = await import('leaflet');
      if (mapRef.current && !mapRef.current._leaflet_id) {
        const map = L.map(mapRef.current, { center: [form.lat || 12.8797, form.lon || 121.7740], zoom: 6 });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);
        let marker = null;
        const placeMarker = (latlng) => {
          if (marker) marker.setLatLng(latlng); else marker = L.marker(latlng).addTo(map);
        };
        if (form.lat && form.lon) placeMarker([form.lat, form.lon]);
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
            setForm(f => ({ ...f, lat: Number(lat.toFixed(6)), lon: Number(lng.toFixed(6)) }));
            placeMarker(e.latlng);
        });
      }
    })();
  }, [mode, form.lat, form.lon, setForm]);

  return (
    <div style={{flex:'1 1 100%', minWidth:300}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
        <label style={{display:'flex',alignItems:'center',gap:4,fontSize:12}}>
          <input type="radio" name="coord-mode" value="manual" checked={mode==='manual'} onChange={()=>setMode('manual')} /> Manual
        </label>
        <label style={{display:'flex',alignItems:'center',gap:4,fontSize:12}}>
          <input type="radio" name="coord-mode" value="map" checked={mode==='map'} onChange={()=>setMode('map')} /> Pin Drop
        </label>
        <span style={{fontSize:11,color:'#6b7280'}}>Coordinates are an optional fallback marker.</span>
      </div>
      {mode === 'map' && (
        <div ref={mapRef} style={{height:240,border:'1px solid #d1d5db',borderRadius:6}} />
      )}
    </div>
  );
}

