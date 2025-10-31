// resources/js/components/FilterTray.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { cachedGet } from "../lib/httpCache";

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

  // Dynamic options derived from current selection and lakes dataset
  const [classOptions, setClassOptions] = useState([]); // [{code,name}]
  const [regionOptions, setRegionOptions] = useState([]); // [string]
  const [provinceOptions, setProvinceOptions] = useState([]); // [string]
  const [municipalityOptions, setMunicipalityOptions] = useState([]); // [string]

  // Reference data
  const [classAllOptions, setClassAllOptions] = useState([]); // full list from API
  const [lakes, setLakes] = useState([]); // full lakes dataset for client-side filtering
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Load reference data (classes) and lakes dataset for client-side cascading
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setLoadError("");
      try {
        // Use shared HTTP cache to persist across pages (public/admin)
        const [classesJson, lakesJson] = await Promise.all([
          cachedGet('/options/water-quality-classes', { ttlMs: 60 * 60 * 1000, auth: false }),
          cachedGet('/lakes', { ttlMs: 10 * 60 * 1000, auth: false }),
        ]);

        if (!alive) return;

        const classesList = (classesJson?.data || classesJson || []).map((r) => ({
          code: r.code || r.id || r,
          name: r.name || r.code || r,
        }));
        setClassAllOptions(classesList);
        setLakes(Array.isArray(lakesJson) ? lakesJson : (lakesJson?.data || []));
      } catch (e) {
        if (!alive) return;
        setLoadError('Failed to load filters');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
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

  // Helpers to normalize multi-value fields on lakes
  const normalizeList = (val, fallbackStr) => {
    if (Array.isArray(val)) return val.filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
    if (typeof fallbackStr === 'string' && fallbackStr.trim()) {
      return fallbackStr.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const includesValue = (list, value) => {
    if (!value) return true; // empty filter doesn't restrict
    const arr = normalizeList(list, list);
    return arr.includes(value);
  };

  const sortStrings = (arr) => Array.from(new Set(arr)).sort((a,b) => String(a).localeCompare(String(b), 'en', { sensitivity: 'base' }));

  // Recompute cascading options whenever lakes or a selection changes
  useEffect(() => {
    if (!lakes || lakes.length === 0) {
      // nothing loaded yet
      return;
    }

    // Apply current selections to narrow down the dataset
    const filtered = lakes.filter((row) => {
      const rList = normalizeList(row.region_list, row.region);
      const pList = normalizeList(row.province_list, row.province);
      const mList = normalizeList(row.municipality_list, row.municipality);
      const cls = row.class_code || row.classCode || null;
      return (
        includesValue(rList, region) &&
        includesValue(pList, province) &&
        includesValue(mList, municipality) &&
        (!classCode || (cls === classCode))
      );
    });

    // Build option sets from filtered dataset
    const rOpts = [];
    const pOpts = [];
    const mOpts = [];
    const cSet = new Set();
    filtered.forEach((row) => {
      normalizeList(row.region_list, row.region).forEach((v) => rOpts.push(v));
      normalizeList(row.province_list, row.province).forEach((v) => pOpts.push(v));
      normalizeList(row.municipality_list, row.municipality).forEach((v) => mOpts.push(v));
      const code = row.class_code || row.classCode;
      if (code) cSet.add(code);
    });

    const nextRegionOptions = sortStrings(rOpts);
    const nextProvinceOptions = sortStrings(pOpts);
    const nextMunicipalityOptions = sortStrings(mOpts);

    // Map class codes to names but only those present in filtered results
    const nextClassOptions = Array.from(cSet).sort((a,b) => String(a).localeCompare(String(b), 'en', { sensitivity: 'base' }))
      .map((code) => {
        const meta = classAllOptions.find((c) => (c.code || c.id) === code);
        return { code, name: meta?.name || code };
      });

    setRegionOptions(nextRegionOptions);
    setProvinceOptions(nextProvinceOptions);
    setMunicipalityOptions(nextMunicipalityOptions);
    setClassOptions(nextClassOptions);

    // If current selections became invalid, clear them
    if (region && !nextRegionOptions.includes(region)) setRegion("");
    if (province && !nextProvinceOptions.includes(province)) setProvince("");
    if (municipality && !nextMunicipalityOptions.includes(municipality)) setMunicipality("");
    if (classCode && !nextClassOptions.some((c) => c.code === classCode)) setClassCode("");
  }, [lakes, classAllOptions, region, province, municipality, classCode]);

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
            <select aria-label="Region" value={region} onChange={(e) => setRegion(e.target.value)} disabled={loading}>
              <option value="">(any)</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="ft-row">
            <label>Province</label>
            <select aria-label="Province" value={province} onChange={(e) => setProvince(e.target.value)} disabled={loading}>
              <option value="">(any)</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="ft-row">
            <label>Municipality/City</label>
            <select aria-label="Municipality/City" value={municipality} onChange={(e) => setMunicipality(e.target.value)} disabled={loading}>
              <option value="">(any)</option>
              {municipalityOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="ft-row full-row">
            <label>Water Body Classification</label>
            <select aria-label="Water Body Classification" value={classCode} onChange={(e) => setClassCode(e.target.value)} disabled={loading}>
              <option value="">(any)</option>
              {classOptions.map((c) => (
                <option key={c.code || c.name} value={c.code || c.name}>{c.name || c.code}</option>
              ))}
            </select>
          </div>

          <NumberInput label="Surface area — min (km²)" value={surfaceMin} onChange={setSurfaceMin} />
          <NumberInput label="Surface area — max (km²)" value={surfaceMax} onChange={setSurfaceMax} />
          <NumberInput label="Surface Elevation — min (m)" value={elevationMin} onChange={setElevationMin} />
          <NumberInput label="Surface Elevation — max (m)" value={elevationMax} onChange={setElevationMax} />
          <NumberInput label="Average depth — min (m)" value={depthMin} onChange={setDepthMin} />
          <NumberInput label="Average depth — max (m)" value={depthMax} onChange={setDepthMax} />
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
