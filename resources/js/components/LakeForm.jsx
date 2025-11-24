import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { api } from "../lib/api";
import { cachedGet } from "../lib/httpCache";
import CoordinatePicker from './CoordinatePicker';
import { useWindowSize } from "../hooks/useWindowSize";

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
  const { width: windowW } = useWindowSize();

  useEffect(() => {
    // Fetch facet lists (regions, provinces, municipalities) just like FilterTray for full coverage
    cachedGet('/filters/lakes', { ttlMs: 60 * 60 * 1000, auth: false }).then(res => {
      const data = res?.data || res || {};
      const regionList = Array.isArray(data.regions) ? data.regions.map(r => r.value || r).filter(Boolean) : [];
      const provinceList = Array.isArray(data.provinces) ? data.provinces.map(p => p.value || p).filter(Boolean) : [];
      const municipalityList = Array.isArray(data.municipalities) ? data.municipalities.map(m => m.value || m).filter(Boolean) : [];
      setRegions(regionList.sort());
      setProvinces(provinceList.sort());
      setMunicipalities(municipalityList.sort());
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
    const list = lastPart === '' ? regions : regions.filter(r => r.toLowerCase().includes(lastPart.toLowerCase()));
    setFilteredRegions(list);
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
    const list = lastPart === '' ? provinces : provinces.filter(p => p.toLowerCase().includes(lastPart.toLowerCase()));
    setProvinceFiltered(list);
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
    const list = lastPart === '' ? municipalities : municipalities.filter(m => m.toLowerCase().includes(lastPart.toLowerCase()));
    setMunicipalityFiltered(list);
    setMunicipalityDropdownOpen(true);
  };

  const computeModalWidth = (w) => {
    if (!w) return 760;
    if (w >= 2561) return 1400; // 4k
    if (w >= 1441) return 1080; // Laptop L
    if (w >= 1025) return 860;  // Laptop
    if (w >= 769) return 720;   // Tablet
    // mobile: keep it responsive to viewport rather than fixed pixels
    if (w <= 420) return '92vw';
    return '94vw';
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === "create" ? "Add Lake" : "Edit Lake"}
      ariaLabel="Lake Form"
      width={computeModalWidth(windowW)}
      footer={
        <div className="lv-modal-actions" style={{ padding: '12px 16px' }}>
          <button type="button" className="pill-btn ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="pill-btn primary" form="lv-lake-form" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
          </button>
        </div>
      }
    >
      <form id="lv-lake-form" onSubmit={submit} className="lv-grid" style={{ display: 'grid', gap: 16, gridTemplateColumns: windowW <= 768 ? '1fr' : 'repeat(2, 1fr)' }}>
        <label className="lv-field">
          <span>Name*</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Tributaries</span>
          <select
            value={(form.flows_status || "unknown")}
            onChange={(e) => setForm({ ...form, flows_status: e.target.value })}
            disabled={form.flows_status === 'present'}
          >
            {form.flows_status === 'present' && <option value="present">Exists</option>}
            <option value="none">None</option>
            <option value="unknown">Not yet recorded</option>
          </select>
        </label>

        <label className="lv-field">
          <span>Other Name</span>
          <input
            value={form.alt_name}
            onChange={(e) => setForm({ ...form, alt_name: e.target.value })}
          />
        </label>

        <label className="lv-field" style={{ position: 'relative' }}>
          <span>Region*</span>
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
          <span>Province*</span>
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
          <span>Municipality/City*</span>
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
          <span>Surface Area (km²)</span>
          <input
            type="number"
            step="0.001"
            value={form.surface_area_km2}
            onChange={(e) => setForm({ ...form, surface_area_km2: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Surface Elevation (m)</span>
          <input
            type="number"
            step="0.001"
            value={form.elevation_m}
            onChange={(e) => setForm({ ...form, elevation_m: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Average Depth (m)</span>
          <input
            type="number"
            step="0.001"
            value={form.mean_depth_m}
            onChange={(e) => setForm({ ...form, mean_depth_m: e.target.value })}
          />
        </label>

        <div className="lv-field" style={{ gridColumn: windowW <= 768 ? '1 / span 1' : '1 / span 2' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 160px' }} className="lv-field">
              <span>Latitude*</span>
              <input
                type="number"
                step="0.000001"
                placeholder="14.1702"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                required={false}
              />
            </label>
            <label style={{ flex: '1 1 160px' }} className="lv-field">
              <span>Longitude*</span>
              <input
                type="number"
                step="0.000001"
                placeholder="121.2245"
                value={form.lon}
                onChange={(e) => setForm({ ...form, lon: e.target.value })}
                required={false}
              />
            </label>
            <CoordinatePicker form={form} setForm={setForm} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
