import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import LoadingSpinner from "../LoadingSpinner";
import useDebounce from "../../hooks/useDebounce";

/**
 * Props
 * - lake
 * - onToggleHeatmap?: (enabled:boolean, km:number) => void
 */
function HeatmapTab({ lake, onToggleHeatmap, currentLayerId = null }) {
  // Start at 0 so nothing is fetched until user explicitly sets a distance
  // Immediate UI distance while sliding
  const [distance, setDistance] = useState(0);
  // Debounced distance for network effects (avoid spamming requests while dragging)
  const debouncedDistance = useDebounce(distance, 300);
  const [estimatedPop, setEstimatedPop] = useState(0);
  const [year, setYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [yearsError, setYearsError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estimateError, setEstimateError] = useState(null);
  const didInitRef = useRef(false);
  const [heatOn, setHeatOn] = useState(false);
  const estimateAbortRef = useRef(null);

  // Inject lightweight CSS for an indeterminate progress bar once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('lv-progress-css')) return;
    try {
      const s = document.createElement('style');
      s.id = 'lv-progress-css';
      s.textContent = `
        .lv-progress{position:relative;height:6px;background:rgba(0,0,0,0.08);border-radius:999px;overflow:hidden}
        .lv-progress-bar{position:absolute;height:100%;width:40%;background:linear-gradient(90deg,#3b82f6,#93c5fd);animation:lvIndeterminate 1.2s infinite;border-radius:999px}
        @keyframes lvIndeterminate{0%{left:-40%}100%{left:100%}}
      `;
      document.head.appendChild(s);
    } catch {}
  }, []);

  // Cleanup: if heat is on, ensure we disable it on unmount
  useEffect(() => {
    return () => {
      if (heatOn) onToggleHeatmap?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatOn]);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      if (!lake?.id) return;
      // Skip estimate when distance is 0 (no ring selected yet)
      if (debouncedDistance <= 0 || !year) {
        setEstimatedPop(0);
        setEstimateError(null);
        setLoading(false);
        return;
      }
      try {
        // cancel any in-flight estimate request immediately
        if (estimateAbortRef.current) {
          try { estimateAbortRef.current.abort(); } catch {}
        }
        const controller = new AbortController();
        estimateAbortRef.current = controller;
        setLoading(true);
        // Signal estimate start (for global coordination / prioritization)
        try { window.dispatchEvent(new CustomEvent('lv-pop-estimate', { detail: { state: 'start', lakeId: lake.id } })); } catch {}
        const params = {
          lake_id: lake.id,
          radius_km: debouncedDistance,
          year,
        };
        if (currentLayerId) params.layer_id = currentLayerId;
        const { data } = await axios.get('/api/population/estimate', { params, signal: controller.signal });
        if (!cancel) {
          if (data?.status === 'error') {
            setEstimateError(data?.message || 'Estimate failed');
            setEstimatedPop(0);
          } else {
            setEstimatedPop(Number(data?.estimate || 0));
            setEstimateError(null);
          }
        }
      } catch (e) {
        const isCanceled = e?.name === 'CanceledError' || e?.name === 'AbortError' || e?.code === 'ERR_CANCELED';
        if (!cancel && !isCanceled) {
          setEstimatedPop(0);
          setEstimateError('Failed to compute estimate');
        }
      } finally {
        if (!cancel) setLoading(false);
        // Signal estimate completion
        try { window.dispatchEvent(new CustomEvent('lv-pop-estimate', { detail: { state: 'done', lakeId: lake?.id } })); } catch {}
      }
    };
    run();
    return () => { cancel = true; };
  }, [debouncedDistance, year, currentLayerId, lake?.id]);

  // Fetch available dataset years once (or when lake changes, though global so only once needed)
  useEffect(() => {
    let active = true;
    const fetchYears = async () => {
      setYearsLoading(true);
      setYearsError(null);
      try {
        const { data } = await axios.get('/api/population/dataset-years');
        if (!active) return;
        const yrs = Array.isArray(data?.years) ? data.years.slice().sort((a,b) => Number(b) - Number(a)) : [];
        setAvailableYears(yrs);
        // Use the most recent year (max) as default if none selected
        if (yrs.length > 0) {
          setYear(prev => (prev && yrs.includes(prev) ? prev : yrs[0]));
        } else {
          setYear(null);
        }
      } catch (e) {
        if (!active) return;
        setAvailableYears([]);
        setYear(null);
        setYearsError('Failed to load years');
      } finally {
        if (active) setYearsLoading(false);
      }
    };
    fetchYears();
    return () => { active = false; };
  }, []);

  // When sliders/selects (or lake) change, update the heatmap if it's currently ON
  useEffect(() => {
    if (!heatOn) return;
    if (!didInitRef.current) { didInitRef.current = true; return; }
    // If distance is 0, ensure any existing heatmap is turned off and wait for user input
    if (debouncedDistance <= 0 || !year) {
      onToggleHeatmap?.(false);
      return;
    }
    onToggleHeatmap?.(true, { km: debouncedDistance, year, layerId: currentLayerId, loading: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatOn, debouncedDistance, year, currentLayerId, lake?.id]);

  const handleToggleHeat = () => {
    if (!heatOn) {
      setHeatOn(true);
      if (debouncedDistance > 0 && year) {
        onToggleHeatmap?.(true, { km: debouncedDistance, year, layerId: currentLayerId, loading: true });
      }
    } else {
      setHeatOn(false);
      onToggleHeatmap?.(false);
    }
  };

  return (
  <div style={{ display: 'grid', gap: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>Population Density Heatmap</h3>
        <div style={{ fontSize: 13, color: '#ddd' }}>Heatmap of population living around <strong style={{ color: '#fff' }}>{lake?.name}</strong>.</div>
      </div>
    </div>

    <div
      className="slider-container"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <label htmlFor="distanceRange" style={{ color: '#fff', fontSize: 13 }}>Distance from shoreline (buffer)</label>
        <div style={{ color: '#fff', fontSize: 13 }}>{distance} km</div>
      </div>
      <input
        id="distanceRange"
        type="range"
        min="0"
        max="3"
        step="1"
        value={distance}
        onChange={(e) => setDistance(parseInt(e.target.value, 10))}
        style={{ width: '100%', appearance: 'none', height: 8, borderRadius: 8, background: 'linear-gradient(90deg,#3b82f6,#60a5fa)', outline: 'none' }}
      />
    </div>

    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <label htmlFor="yearSelect" style={{ color: '#fff' }}>Dataset Year</label>
      <select
        id="yearSelect"
        value={year || ''}
        disabled={yearsLoading || availableYears.length === 0}
        onChange={(e) => {
          const val = e.target.value;
          setYear(val ? parseInt(val, 10) : null);
        }}
        style={{ padding: '6px 8px', background: '#fff', color: '#111', borderRadius: 6 }}
      >
        {yearsLoading && <option value="">Loading...</option>}
        {!yearsLoading && availableYears.length === 0 && <option value="">No datasets</option>}
        {!yearsLoading && availableYears.map(y => (
          <option key={y} value={y}>{y}{availableYears[0] === y ? ' (latest)' : ''}</option>
        ))}
      </select>
    </div>

    <div className="insight-card" style={{ padding: 12 }}>
      <h4 style={{ margin: 0, color: '#fff' }}>Estimated Population</h4>
      <div style={{ marginTop: 8 }}>
        {loading ? (
          <div style={{ margin: '2px 0 8px 0' }}>
            <LoadingSpinner label="Estimating population…" color="#fff" />
          </div>
        ) : estimateError ? (
          <p style={{ margin: 0, color: '#fca5a5' }}>{estimateError}</p>
        ) : (
          <p style={{ margin: 0, color: '#fff' }}>
            ~ <strong>{estimatedPop.toLocaleString()}</strong> people within {distance} km of the shoreline
          </p>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#bbb', marginTop: 4, lineHeight: 1.4 }}>
        {distance <= 0 ? 'Set the buffer > 0 km to enable heatmap & estimation.'
          : !year ? 'Select a dataset year to enable estimation.'
          : 'Toggle the heatmap to visualize relative population density (higher intensity = more people). Adjust the buffer and year to refine.'}
      </div>
      <div style={{ fontSize: 11, color: '#ccc', marginTop: 6 }}>
        <em>Approximate counts based on gridded population data; relative, not exact.</em>
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleToggleHeat}
          disabled={!(distance > 0 && year)}
          title={!(distance > 0 && year) ? (distance <= 0 ? 'Set buffer distance first' : 'Select dataset year first') : ''}
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: heatOn ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: '#fff',
            fontWeight: 600,
            cursor: !(distance > 0 && year) ? 'not-allowed' : 'pointer',
            width: 160,
            backdropFilter: 'blur(6px)'
          }}
          aria-pressed={heatOn}
        >
          {heatOn ? 'Hide Heatmap' : (distance <= 0 ? 'Enable (set km first)' : (!year ? 'Enable (select year)' : 'Show Heatmap'))}
        </button>
      </div>
    </div>
  </div>
  );
}

export default HeatmapTab;
