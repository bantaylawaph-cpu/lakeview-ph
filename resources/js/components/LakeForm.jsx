import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { api } from "../lib/api";
import { cachedGet } from "../lib/httpCache";

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
  flows_status: "", // optional override: '', 'unknown', 'none', 'present'
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
  const [regions, setRegions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filteredRegions, setFilteredRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [provinceDropdownOpen, setProvinceDropdownOpen] = useState(false);
  const [provinceFiltered, setProvinceFiltered] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [municipalityDropdownOpen, setMunicipalityDropdownOpen] = useState(false);
  const [municipalityFiltered, setMunicipalityFiltered] = useState([]);

  useEffect(() => {
    // Fetch existing regions, provinces, municipalities from lakes via shared cache
    cachedGet('/lakes', { ttlMs: 10 * 60 * 1000, auth: false }).then(res => {
      const lakes = res.data || res || [];
      const allRegions = new Set();
      const allProvinces = new Set();
      const allMunicipalities = new Set();
      lakes.forEach(lake => {
        if (lake.region) {
          lake.region.split(',').forEach(r => allRegions.add(r.trim()));
        }
        if (lake.province) {
          lake.province.split(',').forEach(p => allProvinces.add(p.trim()));
        }
        if (lake.municipality) {
          lake.municipality.split(',').forEach(m => allMunicipalities.add(m.trim()));
        }
      });
      setRegions(Array.from(allRegions).sort());
      setProvinces(Array.from(allProvinces).sort());
      setMunicipalities(Array.from(allMunicipalities).sort());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Normalize initial value
    const normalized = { ...EMPTY, ...initialValue };
    setForm(normalized);
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
      flows_status: form.flows_status === "" ? undefined : form.flows_status,
    };
    return onSubmit?.(payload);
  };

  const denrOptions = Array.isArray(classOptions) ? classOptions : [];

  const selectRegion = (selected) => {
    const parts = form.region.split(',');
    parts[parts.length - 1] = selected;
    setForm({ ...form, region: parts.join(', ') });
    setDropdownOpen(false);
  };

  const handleRegionChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, region: value });
    const lastPart = value.split(',').pop().trim();
    setFilteredRegions(regions.filter(r => r.toLowerCase().includes(lastPart.toLowerCase())));
    setDropdownOpen(true);
  };

  const selectProvince = (selected) => {
    const parts = form.province.split(',');
    parts[parts.length - 1] = selected;
    setForm({ ...form, province: parts.join(', ') });
    setProvinceDropdownOpen(false);
  };

  const handleProvinceChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, province: value });
    const lastPart = value.split(',').pop().trim();
    setProvinceFiltered(provinces.filter(p => p.toLowerCase().includes(lastPart.toLowerCase())));
    setProvinceDropdownOpen(true);
  };

  const selectMunicipality = (selected) => {
    const parts = form.municipality.split(',');
    parts[parts.length - 1] = selected;
    setForm({ ...form, municipality: parts.join(', ') });
    setMunicipalityDropdownOpen(false);
  };

  const handleMunicipalityChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, municipality: value });
    const lastPart = value.split(',').pop().trim();
    setMunicipalityFiltered(municipalities.filter(m => m.toLowerCase().includes(lastPart.toLowerCase())));
    setMunicipalityDropdownOpen(true);
  };

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
          <span>Flows data</span>
          <select
            // Force default to 'unknown' when no value is set so the UI shows
            // "Not yet recorded" by default.
            value={(form.flows_status || "unknown")}
            onChange={(e) => setForm({ ...form, flows_status: e.target.value })}
            disabled={form.flows_status === 'present'}
          >
            <option value="none">None</option>
            <option value="unknown">Not yet recorded</option>
          </select>
        </label>

        <label className="lv-field">
          <span>Alt Name</span>
          <input
            value={form.alt_name}
            onChange={(e) => setForm({ ...form, alt_name: e.target.value })}
          />
        </label>

        <label className="lv-field" style={{ position: 'relative' }}>
          <span>Region * <small style={{fontWeight:400,color:'#6b7280'}}>(comma-separated)</small></span>
          <input
            required
            placeholder="e.g. Region IV-A, Region V"
            value={form.region}
            onChange={handleRegionChange}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
          />
          {dropdownOpen && filteredRegions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              maxHeight: 200,
              overflowY: 'auto',
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {filteredRegions.map(r => (
                <div
                  key={r}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                  onMouseDown={() => selectRegion(r)}
                >
                  {r}
                </div>
              ))}
            </div>
          )}
        </label>

        <label className="lv-field" style={{ position: 'relative' }}>
          <span>Province * <small style={{fontWeight:400,color:'#6b7280'}}>(comma-separated)</small></span>
          <input
            required
            placeholder="Laguna, Batangas"
            value={form.province}
            onChange={handleProvinceChange}
            onFocus={() => setProvinceDropdownOpen(true)}
            onBlur={() => setTimeout(() => setProvinceDropdownOpen(false), 200)}
          />
          {provinceDropdownOpen && provinceFiltered.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              maxHeight: 200,
              overflowY: 'auto',
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {provinceFiltered.map(p => (
                <div
                  key={p}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                  onMouseDown={() => selectProvince(p)}
                >
                  {p}
                </div>
              ))}
            </div>
          )}
        </label>

        <label className="lv-field" style={{ position: 'relative' }}>
          <span>Municipality/City * <small style={{fontWeight:400,color:'#6b7280'}}>(comma-separated)</small></span>
          <input
            required
            placeholder="Los Baños, Calamba"
            value={form.municipality}
            onChange={handleMunicipalityChange}
            onFocus={() => setMunicipalityDropdownOpen(true)}
            onBlur={() => setTimeout(() => setMunicipalityDropdownOpen(false), 200)}
          />
          {municipalityDropdownOpen && municipalityFiltered.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              maxHeight: 200,
              overflowY: 'auto',
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {municipalityFiltered.map(m => (
                <div
                  key={m}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                  onMouseDown={() => selectMunicipality(m)}
                >
                  {m}
                </div>
              ))}
            </div>
          )}
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
          <span>Water Body Classification</span>
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
  const markerRef = React.useRef(null);

  React.useEffect(() => {
    if (mode !== 'map') return;
    // Lazy load leaflet only when needed
    (async () => {
      const L = await import('leaflet');
      if (mapRef.current && !mapRef.current._leaflet_id) {
        const map = L.map(mapRef.current, { center: [form.lat || 12.8797, form.lon || 121.7740], zoom: 6 });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);

        // initial marker from form
        if (form.lat && form.lon) {
          markerRef.current = L.circleMarker([form.lat, form.lon], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(map);
          map.setView([form.lat, form.lon], 12);
        }

        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setForm(f => ({ ...f, lat: Number(lat.toFixed(6)), lon: Number(lng.toFixed(6)) }));
          if (!markerRef.current) markerRef.current = L.circleMarker([lat, lng], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(map);
          else markerRef.current.setLatLng([lat, lng]);
        });
      }
    })();
  }, [mode]);

  // keep marker in sync if lat/lon change while map is open
  React.useEffect(() => {
    if (mode !== 'map') return;
    if (!mapRef.current || !mapRef.current._leaflet_id) return;
    const lat = form.lat; const lon = form.lon;
    if (lat && lon) {
      (async () => {
        const L = await import('leaflet');
        if (!markerRef.current) markerRef.current = L.circleMarker([lat, lon], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(mapRef.current);
        else markerRef.current.setLatLng([lat, lon]);
        mapRef.current.setView([lat, lon], 12);
      })();
    }
  }, [mode, form.lat, form.lon]);

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
