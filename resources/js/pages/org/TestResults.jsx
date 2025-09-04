import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../../../css/index.css";

/* --- Leaflet icon fix --- */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

/* ----------------------------------------------
   Parameter Catalog: labels + optional units
   ---------------------------------------------- */
const PARAM_CATALOG = {
  "Physico-Chemical": [
    { key: "pH", label: "pH" },
    { key: "chloride", label: "Chloride", unit: "mg/L" },
    { key: "bod", label: "BOD", unit: "mg/L" },
    { key: "ammonia", label: "Ammonia", unit: "mg/L" },
    { key: "nitrate", label: "Nitrate", unit: "mg/L" },
    { key: "phosphate", label: "Phosphate", unit: "mg/L" },
    { key: "tss", label: "TSS", unit: "mg/L" },
  ],
  Biological: [
    { key: "phytoplankton", label: "Phytoplankton", unit: "counts/mL" },
    { key: "zooplankton", label: "Zooplankton", unit: "counts/L" },
    { key: "chlorophyll", label: "Chlorophyll-a", unit: "µg/L" },
  ],
  Bacteriological: [
    { key: "totalColiform", label: "Total Coliform", unit: "MPN/100 mL" },
    { key: "fecalColiform", label: "Fecal Coliform", unit: "MPN/100 mL" },
  ],
};

const PROFILE_CATALOG = [
  { key: "doProfile", label: "Dissolved Oxygen by Depth", valueLabel: "DO (mg/L)" },
  { key: "tempProfile", label: "Temperature by Depth", valueLabel: "Temp (°C)" },
];

/* ----------------------------------------------
   Small helper: interactive map that writes coords
   ---------------------------------------------- */
function MapPicker({ value, onChange }) {
  const center = useMemo(() => {
    if (value) {
      const [lat, lng] = value.split(",").map((n) => parseFloat(n.trim()));
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng];
    }
    return [14.6, 121.0];
  }, [value]);

  function ClickHandler() {
    useMapEvents({
      click(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        onChange(`${lat}, ${lng}`);
      },
    });
    return null;
  }

  let markerPos = null;
  if (value) {
    const [lat, lng] = value.split(",").map((n) => parseFloat(n.trim()));
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) markerPos = [lat, lng];
  }

  return (
    <div className="map-container" style={{ height: 260 }}>
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {markerPos && (
          <Marker position={markerPos}>
            <Popup>Station: {value}</Popup>
          </Marker>
        )}
        <ClickHandler />
      </MapContainer>
    </div>
  );
}

export default function TestResults() {
  /* ---------- Core form state (kept minimal) ---------- */
  const [form, setForm] = useState({
    date: "",
    lake: "",
    station: "",
    coordinates: "",
    sampler: "",
    method: "",
    remarks: "",
    status: "Draft",

    /* scalar parameters live under params[key] */
    params: {},

    /* profiles: arrays of { depth, value } */
    profiles: {
      doProfile: [{ depth: "", value: "" }],
      tempProfile: [{ depth: "", value: "" }],
    },
  });

  /* Which parameters/profiles are currently visible */
  const [selectedParams, setSelectedParams] = useState([]);       // string keys from PARAM_CATALOG
  const [selectedProfiles, setSelectedProfiles] = useState([]);   // "doProfile" | "tempProfile"

  /* pickers */
  const [pickerParam, setPickerParam] = useState("");
  const [pickerProfile, setPickerProfile] = useState("");

  const lakes = ["Laguna de Bay", "Taal Lake", "Lake Bunot", "Tadlac Lake", "Sampaloc Lake"];
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /* scalar parameter change */
  const setParamValue = (key, v) =>
    setForm((f) => ({ ...f, params: { ...f.params, [key]: v } }));

  /* profile row operations */
  const changeProfileRow = (profileKey, i, field, v) =>
    setForm((f) => {
      const rows = [...f.profiles[profileKey]];
      rows[i] = { ...rows[i], [field]: v };
      return { ...f, profiles: { ...f.profiles, [profileKey]: rows } };
    });

  const addProfileRow = (profileKey) =>
    setForm((f) => ({
      ...f,
      profiles: { ...f.profiles, [profileKey]: [...f.profiles[profileKey], { depth: "", value: "" }] },
    }));

  const removeProfileRow = (profileKey, i) =>
    setForm((f) => {
      const rows = f.profiles[profileKey].slice();
      rows.splice(i, 1);
      return { ...f, profiles: { ...f.profiles, [profileKey]: rows } };
    });

  /* add/remove via pickers */
  const addParamFromPicker = () => {
    if (!pickerParam) return;
    if (!selectedParams.includes(pickerParam)) setSelectedParams((s) => [...s, pickerParam]);
    setPickerParam("");
  };

  const addProfileFromPicker = () => {
    if (!pickerProfile) return;
    if (!selectedProfiles.includes(pickerProfile)) setSelectedProfiles((s) => [...s, pickerProfile]);
    setPickerProfile("");
  };

  const removeParam = (key) => {
    setSelectedParams((s) => s.filter((k) => k !== key));
    setForm((f) => {
      const { [key]: _, ...rest } = f.params || {};
      return { ...f, params: rest };
    });
  };

  const removeProfile = (key) => setSelectedProfiles((s) => s.filter((k) => k !== key));

  /* submit */
  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      selectedParams,
      selectedProfiles,
    };
    console.log("Saved test result:", payload);
    alert("✅ Test result saved (mock). Check console for details.");
  };

  /* helpers to render catalog label/unit by key */
  const findParamMeta = (key) => {
    for (const group of Object.keys(PARAM_CATALOG)) {
      const hit = PARAM_CATALOG[group].find((p) => p.key === key);
      if (hit) return hit;
    }
    return { key, label: key, unit: "" };
  };

  return (
    <div className="dashboard-content">
      <h2 className="dashboard-title">Log Water Quality Test Results</h2>

      <form onSubmit={handleSubmit}>
        {/* ========== General Info (always visible) ========== */}
        <section className="form-card">
          <h3 className="form-section-title">General Information</h3>
          <div className="form-grid">
            <div>
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required />
            </div>
            <div>
              <label>Lake</label>
              <select value={form.lake} onChange={(e) => setField("lake", e.target.value)} required>
                <option value="">Select Lake</option>
                {lakes.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Station</label>
              <input value={form.station} onChange={(e) => setField("station", e.target.value)} placeholder="e.g., LB-02" required />
            </div>
            <div>
              <label>Coordinates</label>
              <input value={form.coordinates} onChange={(e) => setField("coordinates", e.target.value)} placeholder="14.600000, 121.000000" required />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <MapPicker value={form.coordinates} onChange={(v) => setField("coordinates", v)} />
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Tip: click the map to set coordinates.</div>
            </div>
          </div>
        </section>

        {/* ========== Parameter Picker (blank slate) ========== */}
        <section className="form-card">
          <h3 className="form-section-title">Add Measurements</h3>

          {/* Add scalar parameter */}
          <div className="form-grid">
            <div>
              <label>Add Parameter</label>
              <select value={pickerParam} onChange={(e) => setPickerParam(e.target.value)}>
                <option value="">Select parameter…</option>
                {Object.entries(PARAM_CATALOG).map(([group, items]) => (
                  <optgroup key={group} label={group}>
                    {items.map((p) => (
                      <option key={p.key} value={p.key}>{p.label}{p.unit ? ` (${p.unit})` : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label>&nbsp;</label>
              <button type="button" className="btn-add" onClick={addParamFromPicker}>+ Add Parameter</button>
            </div>

            {/* Add profile */}
            <div>
              <label>Add Profile</label>
              <select value={pickerProfile} onChange={(e) => setPickerProfile(e.target.value)}>
                <option value="">Select profile…</option>
                {PROFILE_CATALOG.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label>&nbsp;</label>
              <button type="button" className="btn-add" onClick={addProfileFromPicker}>+ Add Profile</button>
            </div>
          </div>

          {/* Chips of selected items */}
          {(selectedParams.length > 0 || selectedProfiles.length > 0) && (
            <div className="form-grid" style={{ marginTop: 0 }}>
              {/* params chips */}
              {selectedParams.map((k) => {
                const meta = findParamMeta(k);
                return (
                  <div key={k} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 12px", background: "#f9fafb"
                  }}>
                    <div style={{ fontSize: 14, color: "#111827" }}>
                      {meta.label}{meta.unit ? ` (${meta.unit})` : ""}
                    </div>
                    <button type="button" className="btn-remove" onClick={() => removeParam(k)}>Remove</button>
                  </div>
                );
              })}
              {/* profiles chips */}
              {selectedProfiles.map((k) => {
                const meta = PROFILE_CATALOG.find((p) => p.key === k);
                return (
                  <div key={k} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 12px", background: "#f9fafb"
                  }}>
                    <div style={{ fontSize: 14, color: "#111827" }}>{meta?.label || k}</div>
                    <button type="button" className="btn-remove" onClick={() => removeProfile(k)}>Remove</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ========== Render selected scalar parameters ========== */}
        {selectedParams.length > 0 && (
          <section className="form-card">
            <h3 className="form-section-title">Parameters</h3>
            <div className="form-grid">
              {selectedParams.map((k) => {
                const meta = findParamMeta(k);
                return (
                  <div key={k}>
                    <label>{meta.label}{meta.unit ? ` (${meta.unit})` : ""}</label>
                    <input value={form.params[k] || ""} onChange={(e) => setParamValue(k, e.target.value)} />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========== Render selected profiles (DO / Temp) ========== */}
        {selectedProfiles.map((profileKey) => {
          const meta = PROFILE_CATALOG.find((p) => p.key === profileKey);
          const rows = form.profiles[profileKey] || [];
          return (
            <section key={profileKey} className="form-card">
              <h3 className="form-section-title">{meta?.label || profileKey}</h3>
              {rows.map((row, idx) => (
                <div key={`${profileKey}-${idx}`} className="form-grid small-grid">
                  <input
                    type="number"
                    placeholder="Depth (m)"
                    value={row.depth}
                    onChange={(e) => changeProfileRow(profileKey, idx, "depth", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder={meta?.valueLabel || "Value"}
                    value={row.value}
                    onChange={(e) => changeProfileRow(profileKey, idx, "value", e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeProfileRow(profileKey, idx)}
                    aria-label={`Remove ${profileKey} row`}
                  >
                    ❌
                  </button>
                </div>
              ))}
              <button type="button" className="btn-add" onClick={() => addProfileRow(profileKey)}>
                + Add Depth
              </button>
            </section>
          );
        })}

        {/* ========== Metadata & Save ========== */}
        <section className="form-card">
          <h3 className="form-section-title">Metadata & QA/QC</h3>
          <div className="form-grid">
            <div>
              <label>Sampler Name</label>
              <input value={form.sampler} onChange={(e) => setField("sampler", e.target.value)} />
            </div>
            <div>
              <label>Method / Instrument</label>
              <input value={form.method} onChange={(e) => setField("method", e.target.value)} />
            </div>
            <div>
              <label>Status</label>
              <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option>Draft</option>
                <option>Needs Review</option>
                <option>Validated</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Remarks</label>
              <textarea value={form.remarks} onChange={(e) => setField("remarks", e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn-primary">+ Save Test Result</button>
        </section>
      </form>
    </div>
  );
}
