import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import cache from "../../lib/storageCache";
import LoadingSpinner from "../LoadingSpinner";
import InfoModal from "../common/InfoModal";
import { FiInfo } from 'react-icons/fi';
import useDebounce from "../../hooks/useDebounce";

/**
 * Props
 * - lake
 * - onToggleHeatmap?: (enabled:boolean, km:number) => void
 */
function HeatmapTab({ lake, onToggleHeatmap, onClearHeatmap, currentLayerId = null, hasHeatLayer = false, heatEnabled = false, heatLoading = false }) {
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState({ notes: null, link: null });
  const [helpOpen, setHelpOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const initialLoadedRef = useRef(false);
  const [estimateError, setEstimateError] = useState(null);
  const didInitRef = useRef(false);
  const [heatOn, setHeatOn] = useState(false);
  const estimateAbortRef = useRef(null);
  const [loadingAction, setLoadingAction] = useState(null); // 'show' | 'refresh' | null

  // Compact formatter: use suffixes (k, M) and remove unnecessary trailing zeros.
  // Rounds to sensible precision:
  // - >= 1,000,000 -> show in millions with one decimal if needed (e.g., 1.7M)
  // - >= 100,000  -> show in thousands with no decimals (e.g., 120k)
  // - >= 1,000    -> show in thousands, allow one decimal for numbers like 1.2k
  // - < 1,000     -> show as integer
  const formatRoundedHeadline = (n) => {
    const num = Number(n || 0);
    if (num <= 0) return '0';
    if (num >= 1000000) {
      const v = Math.round((num / 1000000) * 10) / 10; // one decimal
      return (v % 1 === 0 ? String(v.toFixed(0)) : String(v)).replace(/\.0$/, '') + 'M';
    }
    if (num >= 100000) {
      const v = Math.round(num / 1000); // nearest thousand
      return v.toLocaleString() + 'k';
    }
    if (num >= 1000) {
      const v = Math.round((num / 1000) * 10) / 10; // one decimal allowed
      return (v % 1 === 0 ? String(v.toFixed(0)) : String(v)).replace(/\.0$/, '') + 'k';
    }
    return Math.round(num).toLocaleString();
  };

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
        const TTL = 6 * 60 * 60 * 1000; // 6h
        const key = 'population:dataset-years';
        const cached = cache.get(key, { maxAgeMs: TTL });
        if (cached && active) {
          const yrsCached = Array.isArray(cached?.years) ? cached.years.slice().sort((a,b) => Number(b) - Number(a)) : [];
          setAvailableYears(yrsCached);
          if (yrsCached.length > 0) {
            setYear(prev => (prev && yrsCached.includes(prev) ? prev : yrsCached[0]));
          } else {
            setYear(null);
          }
        }
        // Revalidate from network
        const resp = await axios.get('/api/population/dataset-years');
        const data = resp?.data || null;
        if (!active) return;
        if (data) cache.set(key, data, { ttlMs: TTL });
        const yrs = Array.isArray(data?.years) ? data.years.slice().sort((a,b) => Number(b) - Number(a)) : [];
        setAvailableYears(yrs);
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
        if (!initialLoadedRef.current) {
          initialLoadedRef.current = true;
          setInitialLoading(false);
        }
      }
    };
    fetchYears();
    return () => { active = false; };
  }, []);

  const fetchDatasetInfo = async (y) => {
    if (!y) return;
    try {
      const TTL = 6 * 60 * 60 * 1000; // 6h
      const key = `population:dataset-info:${y}`;
      const cached = cache.get(key, { maxAgeMs: TTL });
      if (cached) setDatasetInfo({ notes: cached?.notes || null, link: cached?.link || null });
      const resp = await axios.get('/api/population/dataset-info', { params: { year: y } });
      const data = resp?.data || null;
      if (data) cache.set(key, data, { ttlMs: TTL });
      setDatasetInfo({ notes: data?.notes || null, link: data?.link || null });
    } catch (e) {
      setDatasetInfo({ notes: 'Failed to load dataset info', link: null });
    }
  };

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

  const handleShow = () => {
    // Always attempt to show/fetch using current params
    if (debouncedDistance > 0 && year) {
      setHeatOn(true);
      setLoadingAction('show');
      onToggleHeatmap?.(true, { km: debouncedDistance, year, layerId: currentLayerId, loading: true });
    }
  };

  const handleClear = () => {
    // Clear the current heat layer and cancel inflight; do not change heatOn state
    if (typeof onClearHeatmap === 'function') onClearHeatmap();
    // If clearing during an active load, reset local loading action so no spinner remains
    setLoadingAction(null);
  };

  const handleRefresh = () => {
    // Force a refetch using current params; assumes the feature is conceptually on
    if (debouncedDistance > 0 && year) {
      setHeatOn(true);
      setLoadingAction('refresh');
      onToggleHeatmap?.(true, { km: debouncedDistance, year, layerId: currentLayerId, loading: true });
    }
  };

  // When loading completes, clear the button-specific loading indicator
  useEffect(() => {
    if (!heatLoading) setLoadingAction(null);
  }, [heatLoading]);

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner label={"Loading population datasets…"} color="#fff" />
      </div>
    );
  }

  return (
  <div style={{ display: 'grid', gap: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>Population Density Heatmap</h3>
        <div style={{ fontSize: 13, color: '#ddd' }}>Heatmap of population living around <strong style={{ color: '#fff' }}>{lake?.name}</strong>.</div>
      </div>
      <button
        type="button"
        aria-label="How the heatmap works"
        title="How the heatmap works"
        onClick={() => setHelpOpen(true)}
        style={{ padding: 6, borderRadius: 6, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <FiInfo size={16} />
      </button>
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
      <button
        type="button"
        aria-label="Dataset details"
        title="Dataset details"
        onClick={async () => { setInfoOpen(true); await fetchDatasetInfo(year); }}
        style={{ padding: '6px 8px', borderRadius: 6, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <FiInfo size={16} />
      </button>
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
          <div style={{ color: '#fff' }}>
            {/* Headline number with rounding rules */}
            <div style={{ fontSize: 18, marginBottom: 6 }}>
              <strong>
                ≈ {formatRoundedHeadline(estimatedPop)} people
              </strong>
            </div>

            {/* Context chips */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: 16, fontSize: 12 }}>[Estimate]</div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: 16, fontSize: 12 }}>{distance} km ring</div>
            </div>

            {/* Single-line subtext */}
            <div style={{ fontSize: 11, color: '#ccc' }}>
              Model-based gridded estimate within the selected buffer from the shoreline.
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleClear}
          disabled={!heatEnabled || !hasHeatLayer}
          title={!hasHeatLayer ? 'No heatmap to clear' : 'Clear the current heatmap layer (no refetch)'}
          style={{
            padding: '8px 10px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            color: '#fff',
            cursor: (!heatEnabled || !hasHeatLayer) ? 'not-allowed' : 'pointer',
            width: 110,
            backdropFilter: 'blur(6px)'
          }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleShow}
          disabled={!(distance > 0 && year) || hasHeatLayer}
          title={hasHeatLayer ? 'Heatmap already shown (clear to show again)' : (!(distance > 0 && year) ? (distance <= 0 ? 'Set buffer distance first' : 'Select dataset year first') : '')}
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            color: '#fff',
            fontWeight: 600,
            cursor: (!(distance > 0 && year) || hasHeatLayer) ? 'not-allowed' : 'pointer',
            width: 160,
            backdropFilter: 'blur(6px)'
          }}
          aria-pressed={heatOn}
        >
          {heatLoading && loadingAction === 'show' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LoadingSpinner label="Showing…" size={16} color="#fff" inline={true} />
            </span>
          ) : 'Show Heatmap'}
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={!(distance > 0 && year) || (!heatEnabled && !hasHeatLayer)}
          title={!(distance > 0 && year) ? (distance <= 0 ? 'Set buffer distance first' : 'Select dataset year first') : ((!heatEnabled && !hasHeatLayer) ? 'Show heatmap first' : 'Refresh heatmap')}
          style={{
            padding: '8px 10px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            color: '#fff',
            cursor: (!(distance > 0 && year) || (!heatEnabled && !hasHeatLayer)) ? 'not-allowed' : 'pointer',
            width: 110,
            backdropFilter: 'blur(6px)'
          }}
        >
          {heatLoading && loadingAction === 'refresh' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LoadingSpinner label="Refreshing…" size={16} color="#fff" inline={true} />
            </span>
          ) : 'Refresh'}
        </button>
      </div>
    </div>
  <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title={`Dataset ${year} information`} notes={datasetInfo.notes} link={datasetInfo.link} width={640} />
  <InfoModal
    open={helpOpen}
    onClose={() => setHelpOpen(false)}
    width={720}
    title="Population Heatmap — How it works"
    sections={[
      {
        heading: 'What you are seeing',
        bullets: [
          'Brighter areas show more people around the lake; dimmer areas show fewer.',
          'This is a relative view for comparing places around the lake — not exact values for each pixel.'
        ]
      },
      {
        heading: 'Choose a buffer distance',
        bullets: [
          'Set how far from the shoreline to include (e.g., 1–3 km).',
          'The heatmap and estimates include people within this distance.'
        ]
      },
      {
        heading: 'Pick a dataset year',
        bullets: [
          'Choose which population dataset year to use (e.g., 2025).',
          'See dataset notes and source via the (i) button beside the year.'
        ]
      },
      {
        heading: 'Estimated population',
        bullets: [
          'The number is an approximate count within the chosen distance.',
          'It comes from gridded population data and should be treated as approximate.'
        ]
      },
      {
        heading: 'Disclaimer: Estimates',
        bullets: [
          'Reference: model-based gridded population estimates used for comparative analysis.',
          'When sharing results, cite the dataset year, dataset source, and buffer distance used as the reference.'
        ]
      },
      {
        heading: 'Tips',
        bullets: [
          'If nothing appears, set the buffer above 0 km and choose a year.',
          'Click “Refresh” after changing options to redraw when needed.'
        ]
      }
    ]}
  />
  </div>
  );
}

export default HeatmapTab;
