import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

/**
 * Props
 * - lake
 * - onToggleHeatmap?: (enabled:boolean, km:number) => void
 */
function HeatmapTab({ lake, onToggleHeatmap, currentLayerId = null }) {
  const [distance, setDistance] = useState(0);
  const [estimatedPop, setEstimatedPop] = useState(0);
  const [year, setYear] = useState(2025);
  const [loading, setLoading] = useState(false);
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
      try {
        // cancel any in-flight estimate request immediately
        if (estimateAbortRef.current) {
          try { estimateAbortRef.current.abort(); } catch {}
        }
        const controller = new AbortController();
        estimateAbortRef.current = controller;
        setLoading(true);
        const params = {
          lake_id: lake.id,
          radius_km: distance,
          year,
        };
        if (currentLayerId) params.layer_id = currentLayerId;
        const { data } = await axios.get('/api/population/estimate', { params, signal: controller.signal });
        if (!cancel) setEstimatedPop(Number(data?.estimate || 0));
      } catch (e) {
        const isCanceled = e?.name === 'CanceledError' || e?.name === 'AbortError' || e?.code === 'ERR_CANCELED';
        if (!cancel && !isCanceled) setEstimatedPop(0);
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    run();
    return () => { cancel = true; };
  }, [distance, year, currentLayerId, lake?.id]);

  // When sliders/selects (or lake) change, update the heatmap if it's currently ON
  useEffect(() => {
    if (!heatOn) return;
    if (!didInitRef.current) { didInitRef.current = true; return; }
    // Trigger map to cancel any in-flight heat request and start a fresh one with new params
    onToggleHeatmap?.(true, { km: distance, year, layerId: currentLayerId, loading: true });
    // We intentionally do not include onToggleHeatmap to avoid re-creating effect on parent renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatOn, distance, year, currentLayerId, lake?.id]);

  const handleToggleHeat = () => {
    if (!heatOn) {
      setHeatOn(true);
      onToggleHeatmap?.(true, { km: distance, year, layerId: currentLayerId, loading: true });
    } else {
      setHeatOn(false);
      onToggleHeatmap?.(false);
    }
  };

  return (
    <>
  <h3>Population Density Heatmap</h3>
      <p>Heatmap of population living around <strong>{lake?.name}</strong>.</p>

      <div
        className="slider-container"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <label htmlFor="distanceRange">Distance from shoreline: {distance} km</label>
        <input
          id="distanceRange"
          type="range"
          min="0"
          max="3"
          step="0.5"
          value={distance}
          onChange={(e) => setDistance(parseFloat(e.target.value))}
        />
      </div>

      <div
        className="select-container"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
        style={{ marginTop: 8 }}
      >
        <label htmlFor="yearSelect">Dataset Year</label>
        <select id="yearSelect" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
          <option value={2025}>2025 (default)</option>
          <option value={2020}>2020</option>
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={handleToggleHeat}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #2563eb',
            background: heatOn ? '#2563eb' : 'transparent',
            color: heatOn ? '#ffffff' : '#2563eb',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          aria-pressed={heatOn}
        >
          {heatOn ? 'Hide Heatmap' : 'Show Heatmap'}
        </button>
      </div>

      <div className="insight-card">
        <h4>Estimated Population</h4>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="lv-progress" role="progressbar" aria-busy="true" aria-label="Estimating population">
              <div className="lv-progress-bar" />
            </div>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Estimating…</span>
          </div>
        ) : (
          <p>
            ~ <strong>{estimatedPop.toLocaleString()}</strong> people within {distance} km of the shoreline
          </p>
        )}
      </div>
    </>
  );
}

export default HeatmapTab;
