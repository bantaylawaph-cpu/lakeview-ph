// resources/js/components/FilterTray.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { cachedGet } from "../lib/httpCache";

function NumberInput({ label, value, onChange, placeholder, mapRef = null }) {
  const handleFocus = () => {
    // Disable map interactions while typing
    if (mapRef?.current) {
      try {
        const map = mapRef.current;
        if (map.dragging) map.dragging.disable();
        if (map.touchZoom) map.touchZoom.disable();
        if (map.doubleClickZoom) map.doubleClickZoom.disable();
        if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
      } catch {}
    }
  };
  
  const handleBlur = () => {
    // Re-enable map interactions after typing
    if (mapRef?.current) {
      try {
        const map = mapRef.current;
        if (map.dragging) map.dragging.enable();
        if (map.touchZoom) map.touchZoom.enable();
        if (map.doubleClickZoom) map.doubleClickZoom.enable();
        if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
      } catch {}
    }
  };
  
  return (
    <div className="ft-row">
      <label>{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={value == null ? "" : value}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
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

export default function FilterTray({ open, onClose, onApply, initial = {}, mapRef = null }) {
  const trayRef = useRef(null);
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

  // Dynamic options provided by backend facets based on current selection
  const [classOptions, setClassOptions] = useState([]); // [{code,name}]
  const [regionOptions, setRegionOptions] = useState([]); // [string]
  const [provinceOptions, setProvinceOptions] = useState([]); // [string]
  const [municipalityOptions, setMunicipalityOptions] = useState([]); // [string]

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Apply + count state
  const [applying, setApplying] = useState(false);
  const [count, setCount] = useState(null); // number | null
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState("");

  // Fetch facets from server for current selections
  const fetchFacets = useCallback(async (params) => {
    setLoadError("");
    try {
      setLoading(true);
      const res = await cachedGet('/filters/lakes', { params, ttlMs: 60 * 60 * 1000, auth: false });
      const data = res?.data || res || {};
      const r = Array.isArray(data.regions) ? data.regions.map(x => x.value).filter(Boolean) : [];
      const p = Array.isArray(data.provinces) ? data.provinces.map(x => x.value).filter(Boolean) : [];
      const m = Array.isArray(data.municipalities) ? data.municipalities.map(x => x.value).filter(Boolean) : [];
      const c = Array.isArray(data.classes) ? data.classes.map(x => ({ code: x.code || x.name, name: x.name || x.code })) : [];
      setRegionOptions(r);
      setProvinceOptions(p);
      setMunicipalityOptions(m);
      setClassOptions(c);

      // Clear invalid selections if they no longer exist
      if (params.region && !r.includes(params.region)) setRegion("");
      if (params.province && !p.includes(params.province)) setProvince("");
      if (params.municipality && !m.includes(params.municipality)) setMunicipality("");
      if (params.class_code && !c.some(cc => cc.code === params.class_code)) setClassCode("");
    } catch (e) {
      setLoadError('Failed to load filters');
    } finally {
      setLoading(false);
    }
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
    setCount(null); setCountLoading(false); setCountError(""); setApplying(false);
    // Fetch facets on open with initial params
    fetchFacets({
      region: initial.region || undefined,
      province: initial.province || undefined,
      municipality: initial.municipality || undefined,
      class_code: initial.class_code || undefined,
    });
    // Fetch initial total count (no filters)
    fetchCount({});
  }, [open, initial, fetchFacets]);

  // When the tray is hidden (aria-hidden=true) ensure interactive descendants are not focusable.
  // This prevents accessibility tools from flagging focusable elements inside aria-hidden containers.
  useEffect(() => {
    const root = trayRef.current;
    if (!root) return;

    const focusableSelector = 'a,button,input,select,textarea,[tabindex]';
    const nodes = Array.from(root.querySelectorAll(focusableSelector));

    if (!open) {
      nodes.forEach((el) => {
        // store previous tabindex if any
        if (el.hasAttribute('tabindex')) el.setAttribute('data-prev-tabindex', el.getAttribute('tabindex'));
        el.setAttribute('tabindex', '-1');
        // For form controls make them disabled while hidden so screen readers won't interact
        if (['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(el.tagName)) {
          el.setAttribute('data-was-disabled', el.disabled ? 'true' : 'false');
          el.disabled = true;
        }
      });
    } else {
      nodes.forEach((el) => {
        if (el.hasAttribute('data-prev-tabindex')) {
          el.setAttribute('tabindex', el.getAttribute('data-prev-tabindex'));
          el.removeAttribute('data-prev-tabindex');
        } else {
          el.removeAttribute('tabindex');
        }
        if (el.hasAttribute('data-was-disabled')) {
          const was = el.getAttribute('data-was-disabled') === 'true';
          el.disabled = was;
          el.removeAttribute('data-was-disabled');
        } else if (['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(el.tagName)) {
          // restore as enabled by default
          el.disabled = false;
        }
      });
    }
    // cleanup when unmount
    return () => {
      nodes.forEach((el) => {
        if (el.hasAttribute('data-prev-tabindex')) {
          el.setAttribute('tabindex', el.getAttribute('data-prev-tabindex'));
          el.removeAttribute('data-prev-tabindex');
        } else {
          el.removeAttribute('tabindex');
        }
        if (el.hasAttribute('data-was-disabled')) {
          const was = el.getAttribute('data-was-disabled') === 'true';
          el.disabled = was;
          el.removeAttribute('data-was-disabled');
        }
      });
    };
  }, [open]);

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

  // Whenever selections change (while tray open), ask backend for new option sets
  useEffect(() => {
    if (!open) return;
    fetchFacets({
      region: region || undefined,
      province: province || undefined,
      municipality: municipality || undefined,
      class_code: classCode || undefined,
    });
  }, [open, region, province, municipality, classCode, fetchFacets]);

  // Build adv object expected by backend count/index filters
  const buildAdv = () => ({
    region: region || undefined,
    province: province || undefined,
    municipality: municipality || undefined,
    class_code: classCode || undefined,
    area_km2: [surfaceMin ?? null, surfaceMax ?? null],
    elevation_m: [elevationMin ?? null, elevationMax ?? null],
    mean_depth_m: [depthMin ?? null, depthMax ?? null],
  });

  const fetchCount = useCallback(async (advObj) => {
    setCountLoading(true); setCountError("");
    try {
      const res = await cachedGet('/lakes/count', { params: { adv: JSON.stringify(advObj || {}) }, ttlMs: 15 * 1000, auth: false });
      const data = res?.data || res || {};
      const total = typeof data.total === 'number' ? data.total : null;
      setCount(total);
    } catch (e) {
      setCount(null);
      setCountError('Failed to load count');
    } finally {
      setCountLoading(false);
    }
  }, []);

  const handleApply = async () => {
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
    setApplying(true);
    try {
      const maybePromise = onApply && onApply(payload);
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise;
      }
    } finally {
      setApplying(false);
    }
    // Update count only after apply is triggered
    await fetchCount(buildAdv());
  };

  const handleReset = async () => {
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
    setApplying(true);
    try {
      const maybePromise = onApply && onApply({});
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise;
      }
    } finally {
      setApplying(false);
    }
    await fetchCount({});
  };

  return (
    <div ref={trayRef} className={`filter-tray ${open ? 'open' : ''}`} aria-hidden={!open} role="region" aria-label="Lake filters" onTouchStart={(e) => e.stopPropagation()}>
      <div className="filter-tray-inner">
        <div className="ft-grid">
          <div className="ft-row">
            <label>Region</label>
            <select aria-label="Region" value={region} onChange={(e) => setRegion(e.target.value)} disabled={loading}>
              <option value="">All Regions</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="ft-row">
            <label>Province</label>
            <select aria-label="Province" value={province} onChange={(e) => setProvince(e.target.value)} disabled={loading}>
              <option value="">All Provinces</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="ft-row">
            <label>Municipality/City</label>
            <select aria-label="Municipality/City" value={municipality} onChange={(e) => setMunicipality(e.target.value)} disabled={loading}>
              <option value="">All Municipalities</option>
              {municipalityOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="ft-row full-row">
            <label>Water Body Classification</label>
            <select aria-label="Water Body Classification" value={classCode} onChange={(e) => setClassCode(e.target.value)} disabled={loading}>
              <option value="">All Classifications</option>
              {classOptions.map((c) => (
                <option key={c.code || c.name} value={c.code || c.name}>{c.name || c.code}</option>
              ))}
            </select>
          </div>

          <NumberInput label="Surface area — min (km²)" value={surfaceMin} onChange={setSurfaceMin} mapRef={mapRef} />
          <NumberInput label="Surface area — max (km²)" value={surfaceMax} onChange={setSurfaceMax} mapRef={mapRef} />
          <NumberInput label="Surface Elev. — min (m)" value={elevationMin} onChange={setElevationMin} mapRef={mapRef} />
          <NumberInput label="Surface Elev. — max (m)" value={elevationMax} onChange={setElevationMax} mapRef={mapRef} />
          <NumberInput label="Average depth — min (m)" value={depthMin} onChange={setDepthMin} mapRef={mapRef} />
          <NumberInput label="Average depth — max (m)" value={depthMax} onChange={setDepthMax} mapRef={mapRef} />
        </div>

        <div className="ft-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div aria-live="polite" style={{ fontSize: 13 }}>
            {countLoading
              ? 'Showing — lakes.'
              : (count != null
                  ? (count === 0
                      ? 'No lakes match your filters.'
                      : `Showing ${count} ${count === 1 ? 'lake' : 'lakes'}.`)
                  : 'Showing — lakes.')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => { handleReset(); }} disabled={applying} aria-busy={applying ? true : undefined}>
              Reset
            </button>
            <button className="btn btn-primary" onClick={() => { handleApply(); }} disabled={applying} aria-busy={applying ? true : undefined}>
              {applying ? 'Filtering…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
