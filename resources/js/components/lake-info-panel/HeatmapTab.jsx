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
        <label htmlFor="distanceRange" style={{ color: '#fff', fontSize: 13 }}>Distance from shoreline</label>
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
      <select id="yearSelect" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} style={{ padding: '6px 8px', background: '#fff', color: '#111', borderRadius: 6 }}>
        <option value={2025}>2025</option>
        <option value={2020}>2020</option>
      </select>
    </div>

    <div className="insight-card" style={{ padding: 12 }}>
      <h4 style={{ margin: 0, color: '#fff' }}>Estimated Population</h4>
      <div style={{ marginTop: 8 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="lv-progress" role="progressbar" aria-busy="true" aria-label="Estimating population">
              <div className="lv-progress-bar" />
            </div>
            <span style={{ fontSize: 12, color: '#ddd' }}>Estimating…</span>
          </div>
        ) : (
          <p style={{ margin: 0, color: '#fff' }}>
            ~ <strong>{estimatedPop.toLocaleString()}</strong> people within {distance} km of the shoreline
          </p>
        )}
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleToggleHeat}
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: heatOn ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            width: 160,
            backdropFilter: 'blur(6px)'
          }}
          aria-pressed={heatOn}
        >
          {heatOn ? 'Hide Heatmap' : 'Show Heatmap'}
        </button>
      </div>
    </div>
  </div>
  );
}

export default HeatmapTab;
