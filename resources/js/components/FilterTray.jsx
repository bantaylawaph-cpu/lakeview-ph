// resources/js/components/FilterTray.jsx
import React, { useState, useEffect, useCallback } from "react";

function NumberInput({ label, value, onChange, placeholder }) {
  return (
    <div className="ft-row">
      <label>{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={value == null ? "" : value}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") onChange(null);
          else {
            const n = Number(v);
            onChange(Number.isNaN(n) ? null : n);
          }
        }}
      />
    </div>
  );
}

export default function FilterTray({ open, onClose, onApply, initial = {} }) {
  const [region, setRegion] = useState(initial.region || "");
  const [province, setProvince] = useState(initial.province || "");
  const [municipality, setMunicipality] = useState(initial.municipality || "");
  const [classCode, setClassCode] = useState(initial.class_code || "");

  const [surfaceMin, setSurfaceMin] = useState(initial.surface_area_min ?? null);
  const [surfaceMax, setSurfaceMax] = useState(initial.surface_area_max ?? null);
  const [elevationMin, setElevationMin] = useState(initial.elevation_min ?? null);
  const [elevationMax, setElevationMax] = useState(initial.elevation_max ?? null);
  const [depthMin, setDepthMin] = useState(initial.mean_depth_min ?? null);
  const [depthMax, setDepthMax] = useState(initial.mean_depth_max ?? null);

  const [classOptions, setClassOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [municipalityOptions, setMunicipalityOptions] = useState([]);

  useEffect(() => {
    // load water quality classes for dropdown
    (async () => {
      try {
        const res = await fetch('/api/options/water-quality-classes');
        const j = await res.json();
        const rows = (j?.data || j || []).map((r) => ({ code: r.code || r.id || r, name: r.name || r.code || r }));
        setClassOptions(rows);
      } catch (e) {}
    })();

    // load region/province/municipality distinct lists
    (async () => {
      const flattenList = (raw) => {
        const out = [];
        const pushMany = (arr) => arr.forEach((v) => { if (typeof v === 'string' && v.trim()) out.push(v.trim()); });
        (raw || []).forEach((item) => {
          if (!item && item !== 0) return;
            if (Array.isArray(item)) { pushMany(item); return; }
            if (typeof item === 'string') {
              const trimmed = item.trim();
              if (!trimmed) return;
              // Try JSON array
              if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                  const parsed = JSON.parse(trimmed);
                  if (Array.isArray(parsed)) { pushMany(parsed); return; }
                } catch (e) { /* fall through */ }
              }
              // Split on commas if present
              if (trimmed.includes(',')) { pushMany(trimmed.split(',').map(s => s.trim())); return; }
              // As-is fallback
              out.push(trimmed);
              return;
            }
            // Non-string scalars
            out.push(String(item));
        });
        // De-dupe & sort natural, case-insensitive
        return Array.from(new Set(out)).sort((a,b) => a.localeCompare(b,'en',{sensitivity:'base'}));
      };

      // Preferred endpoints that already flatten JSON arrays
      const endpoints = {
        regions: ['/api/options/lake-regions','/api/options/regions'], // fall back
        provinces: ['/api/options/lake-provinces','/api/options/provinces'],
        municipalities: ['/api/options/lake-municipalities','/api/options/municipalities'],
      };

      const fetchList = async (list) => {
        for (const url of list) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const j = await res.json();
            const arr = Array.isArray(j) ? j : (j?.data || []);
            if (Array.isArray(arr)) return flattenList(arr);
          } catch (e) { /* try next */ }
        }
        return [];
      };

      try { setRegionOptions(await fetchList(endpoints.regions)); } catch (e) {}
      try { setProvinceOptions(await fetchList(endpoints.provinces)); } catch (e) {}
      try { setMunicipalityOptions(await fetchList(endpoints.municipalities)); } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    // initialize from props
    setRegion(initial.region || "");
    setProvince(initial.province || "");
    setMunicipality(initial.municipality || "");
    setClassCode(initial.class_code || "");
    setSurfaceMin(initial.surface_area_min ?? null);
    setSurfaceMax(initial.surface_area_max ?? null);
    setElevationMin(initial.elevation_min ?? null);
    setElevationMax(initial.elevation_max ?? null);
    setDepthMin(initial.mean_depth_min ?? null);
    setDepthMax(initial.mean_depth_max ?? null);
  }, [open, initial]);

  // Close on Escape for accessibility
  const onKey = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose && onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onKey]);

  const handleApply = () => {
    const payload = {
      region: region || undefined,
      province: province || undefined,
      municipality: municipality || undefined,
      class_code: classCode || undefined,
      surface_area_min: surfaceMin == null ? undefined : surfaceMin,
      surface_area_max: surfaceMax == null ? undefined : surfaceMax,
      elevation_min: elevationMin == null ? undefined : elevationMin,
      elevation_max: elevationMax == null ? undefined : elevationMax,
      mean_depth_min: depthMin == null ? undefined : depthMin,
      mean_depth_max: depthMax == null ? undefined : depthMax,
    };
    onApply(payload);
  };

  const handleReset = () => {
    setRegion("");
    setProvince("");
    setMunicipality("");
    setClassCode("");
    setSurfaceMin(null);
    setSurfaceMax(null);
    setElevationMin(null);
    setElevationMax(null);
    setDepthMin(null);
    setDepthMax(null);
    // also re-fetch unfiltered results
    onApply && onApply({});
  };

  return (
    <div className={`filter-tray ${open ? 'open' : ''}`} aria-hidden={!open} role="region" aria-label="Lake filters">
      <div className="filter-tray-inner">
        <div className="ft-grid">
          <div className="ft-row">
            <label>Region</label>
            <select aria-label="Region" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">(any)</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="ft-row">
            <label>Province</label>
            <select aria-label="Province" value={province} onChange={(e) => setProvince(e.target.value)}>
              <option value="">(any)</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="ft-row">
            <label>Municipality</label>
            <select aria-label="Municipality" value={municipality} onChange={(e) => setMunicipality(e.target.value)}>
              <option value="">(any)</option>
              {municipalityOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="ft-row full-row">
            <label>Water Quality Class</label>
            <select aria-label="Water Quality Class" value={classCode} onChange={(e) => setClassCode(e.target.value)}>
              <option value="">(any)</option>
              {classOptions.map((c) => (
                <option key={c.code || c.name} value={c.code || c.name}>{c.name || c.code}</option>
              ))}
            </select>
          </div>

          <NumberInput label="Surface area — min (km²)" value={surfaceMin} onChange={setSurfaceMin} />
          <NumberInput label="Surface area — max (km²)" value={surfaceMax} onChange={setSurfaceMax} />
          <NumberInput label="Elevation — min (m)" value={elevationMin} onChange={setElevationMin} />
          <NumberInput label="Elevation — max (m)" value={elevationMax} onChange={setElevationMax} />
          <NumberInput label="Mean depth — min (m)" value={depthMin} onChange={setDepthMin} />
          <NumberInput label="Mean depth — max (m)" value={depthMax} onChange={setDepthMax} />
        </div>

        <div className="ft-actions">
          <button className="btn btn-secondary" onClick={() => { handleReset(); onClose && onClose(); }}>
            Reset
          </button>
          <button className="btn btn-primary" onClick={() => { handleApply(); onClose && onClose(); }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
