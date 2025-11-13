import React, { useEffect, useMemo, useState, useRef } from "react";
import TimeBucketRange from "../controls/TimeBucketRange";
import StatsSidebar from "./StatsSidebar";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import InfoModal from "../common/InfoModal";
import { buildGraphExplanation } from "../utils/graphExplain";
import { eventStationName } from "./utils/dataUtils";
import { lakeName, lakeClass, baseLineChartOptions, normalizeDepthDatasets } from "./utils/shared";
import useSampleEvents from "./hooks/useSampleEvents";
import useStationsCache from "./hooks/useStationsCache";
import useTimeSeriesData from "./hooks/useTimeSeriesData";
import useDepthProfileData from "./hooks/useDepthProfileData";
import useSeasonalMK from "./hooks/useSeasonalMK";
import useCurrentStandard from "./hooks/useCurrentStandard";
import useParamThresholds, { fetchParamThresholds } from "./hooks/useParamThresholds";
import GraphInfoButton from "./ui/GraphInfoButton";
import StationPicker from "./ui/StationPicker";
import { SeriesModeToggle } from "./ui/Toggles";
import LakeSelect from './ui/LakeSelect';
import OrgSelect from './ui/OrgSelect';
import ParamSelect from './ui/ParamSelect';
import LoadingSpinner from '../LoadingSpinner';
import { fmt as fmtNum } from './formatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function SingleLake({
  lakeOptions,
  selectedLake,
  onLakeChange,
  orgOptions,
  selectedOrg,
  onOrgChange,
  selectedStations,
  onStationsChange,
  paramOptions,
  selectedParam,
  onParamChange,
  selectedClass,
  bucket,
  chartRef,
  timeRange = 'all',
  dateFrom = '',
  dateTo = '',
  setTimeRange = () => {},
  setDateFrom = () => {},
  setDateTo = () => {},
  setBucket = () => {},
  isModalOpen = true,
}) {
  const [stationsOpen, setStationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = 320;
  const stationBtnRef = useRef(null);
  const [applied, setApplied] = useState(false);
  // 'time' | 'depth' | 'bar'
  const [chartType, setChartType] = useState('time');
  const prevTypeRef = useRef('time');
  const prevTimeStateRef = useRef({ timeRange: 'all', dateFrom: '', dateTo: '' });
  const [seriesMode, setSeriesMode] = useState('avg'); // 'avg' | 'per-station'
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', sections: [] });
  // removed: bar-chart years state
  // removed: bar chart depth selection state
  // Time-series depth selector: 'all' shows each depth as separate series, otherwise filters to a single depth band
  const [selectedDepth, setSelectedDepth] = useState('all');
  // Trend analysis (SMK)
  const [trendEnabled, setTrendEnabled] = useState(false);
  const trendAlpha = 0.05;
  // Correlation removed
  const { events, loading } = useSampleEvents(selectedLake, selectedOrg, timeRange, dateFrom, dateTo);
  // Also fetch unfiltered events (all time) to derive available years without being affected
  // by the currently selected timeRange/dateFrom/dateTo. This prevents the year list from
  // narrowing to the chosen year when the user picks a year filter.
  const { events: eventsAll } = useSampleEvents(selectedLake, selectedOrg, 'all', '', '');
  const hasStationIds = true;
  const { orgOptions: orgOptionsLocal, stationsByOrg, allStations, loading: stationsLoading } = useStationsCache(selectedLake);
  const stationsList = useMemo(() => (!selectedOrg ? (allStations || []) : (stationsByOrg?.[String(selectedOrg)] || [])), [selectedOrg, allStations, stationsByOrg]);
  useEffect(() => {
    setApplied(false);
  }, [selectedLake, selectedOrg, selectedParam, JSON.stringify(selectedStations), timeRange, dateFrom, dateTo, bucket, chartType, selectedDepth]);

  // Available years for the selected lake/org based on events
  const availableYears = useMemo(() => {
    const years = new Set();
    (Array.isArray(eventsAll) ? eventsAll : []).forEach((ev) => {
      const iso = ev?.sampled_at;
      if (!iso) return;
      try {
        const y = new Date(iso).getFullYear();
        if (Number.isFinite(y)) years.add(y);
      } catch {}
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [eventsAll]);


  // summaryStats hook removed; summary will not be provided
  const summaryStats = null;
  const nameForSelectedLake = useMemo(() => lakeName(lakeOptions, selectedLake) || String(selectedLake || '') || '', [lakeOptions, selectedLake]);
  const classForSelectedLake = useMemo(() => lakeClass(lakeOptions, selectedLake) || selectedClass || '', [lakeOptions, selectedLake, selectedClass]);
  const { current: currentStd } = useCurrentStandard();

  // Prefetch thresholds for all parameters alongside parameters
  useEffect(() => {
    if (!paramOptions?.length || !currentStd?.id) return;
    paramOptions.forEach(p => {
      fetchParamThresholds({ paramCode: p.code || p.key, appliedStandardId: currentStd.id, classCode: classForSelectedLake || undefined });
    });
  }, [paramOptions, currentStd?.id, classForSelectedLake]);

  const { chartData, loadingThresholds: tsThresholdsLoading } = useTimeSeriesData({ events, selectedParam, selectedStations, bucket, timeRange, dateFrom, dateTo, seriesMode, classForSelectedLake, depthSelection: selectedDepth, appliedStandardId: currentStd?.id });
  const depthProfile = useDepthProfileData({ events, selectedParam, selectedStations, bucket });
  // Correlation removed
  // derive depth options for selectedParam from events
  const depthOptions = useMemo(() => {
    const depths = new Set();
    (Array.isArray(events) ? events : []).forEach((ev) => {
      (ev.results || []).forEach((r) => {
        if (!selectedParam) return;
        const sel = String(selectedParam || '');
        const p = r?.parameter;
        let match = false;
        if (p) {
          if (typeof p === 'string' && sel === String(p)) match = true;
          else if (typeof p === 'object') {
            if (p.code && sel === String(p.code)) match = true;
            if (p.id && sel === String(p.id)) match = true;
            if (p.key && sel === String(p.key)) match = true;
          }
        }
        if (!match) {
          if (r.parameter_code && sel === String(r.parameter_code)) match = true;
          if (r.parameter_id && sel === String(r.parameter_id)) match = true;
          if (r.parameter_key && sel === String(r.parameter_key)) match = true;
        }
        if (!match) return;
        const d = r.depth_m == null ? '0' : String(r.depth_m);
        depths.add(d);
      });
    });
    const arr = Array.from(depths).sort((a,b)=>Number(a)-Number(b));
    if (!arr.includes('0')) arr.unshift('0');
    return arr;
  }, [events, selectedParam]);

  // If user switches to per-station series mode, disallow 'all' depth selection.
  useEffect(() => {
    try {
      if (seriesMode === 'per-station' && selectedDepth === 'all') {
        // choose a sensible default depth (surface if available)
        const def = (depthOptions && depthOptions.length) ? String(depthOptions[0]) : '0';
        setSelectedDepth(def);
        setApplied(false);
      }
    } catch (e) { /* noop */ }
  }, [seriesMode, depthOptions]);

  // removed: single-lake bar data

  // Since custom range is removed from Time Series, force a safe preset if lingering
  useEffect(() => {
    if (chartType === 'time' && timeRange === 'custom') {
      setTimeRange('all');
      setDateFrom('');
      setDateTo('');
    }
  }, [chartType, timeRange]);

  // Resolve parameter metadata (label/name/unit) for labeling axes
  const selectedParamMeta = useMemo(() => {
    const sel = String(selectedParam || '');
    return (paramOptions || []).find(p => String(p.key || p.id || p.code) === sel) || null;
  }, [paramOptions, selectedParam]);
  const selectedParamLabel = useMemo(() => (selectedParamMeta?.label || selectedParamMeta?.name || selectedParamMeta?.code || 'Value'), [selectedParamMeta]);
  const selectedParamUnit = useMemo(() => (selectedParamMeta?.unit || ''), [selectedParamMeta]);
  const selectedParamCode = useMemo(() => (selectedParamMeta?.code || String(selectedParam || '')), [selectedParamMeta, selectedParam]);
  const depthThr = useParamThresholds({ paramCode: selectedParamCode, appliedStandardId: currentStd?.id, classCode: classForSelectedLake || undefined });

  const canShowInfo = useMemo(() => {
    if (!applied) return false;
    try {
      if (chartType === 'time') return Boolean(chartData?.datasets?.length);
      if (chartType === 'depth') return Boolean(depthProfile?.datasets?.length);
      return false;
    } catch { return false; }
  }, [applied, chartType, chartData, depthProfile]);

  const canChooseParam = useMemo(() => {
    if (!selectedLake || !selectedOrg) return false;
    return Array.isArray(selectedStations) && selectedStations.length > 0;
  }, [selectedLake, selectedOrg, selectedStations]);

  // Seasonal MK overlay (only for time-series)
  const chartLabels = chartData?.labels || [];
  const { result: smk, loading: smkLoading } = useSeasonalMK({
    events,
    selectedParam,
    selectedStations,
    bucket,
    timeRange,
    dateFrom,
    dateTo,
    labels: chartLabels,
    alpha: trendAlpha,
    enabled: trendEnabled && chartType === 'time' && applied && !!selectedParam,
    depthSelection: selectedDepth,
  });
  

  const computeMissingFields = () => {
    const missing = [];
    if (!selectedLake) { missing.push('Select a lake'); return missing; }
    if (!selectedOrg) missing.push('choose a dataset source');
    if (!selectedStations || selectedStations.length === 0) missing.push('choose at least one location');
    if (!selectedParam) missing.push('select a parameter');
    return missing;
  };

  const handleApply = async () => {
    const missing = computeMissingFields();
  if (missing.length) {
      // Special-case: single missing token 'Select a lake' -> short sentence
      if (missing.length === 1 && /^Select a lake/i.test(missing[0])) {
        const sentence = `Please select a lake.`;
        try {
          const Swal = (await import('sweetalert2')).default;
          Swal.fire({ icon: 'warning', title: 'Missing fields', html: `<div style="text-align:left; white-space:normal; word-break:break-word; font-size:13px">${sentence}</div>`, width: 560, showCloseButton: true });
        } catch (e) { window.alert(sentence); }
        return;
      }

      // Map tokens to user-friendly clauses
      const clauses = [];
      missing.forEach((m) => {
        const tok = String(m || '').toLowerCase();
        if (/dataset source/i.test(m) || /choose a dataset source/i.test(tok)) clauses.push('choose a dataset source');
        else if (/choose at least one location/i.test(tok) || /location/i.test(tok) && /at least/i.test(tok)) clauses.push('choose at least one location');
  // correlation-specific prompts removed
        else if (/select a parameter/i.test(tok) || /^parameter$/i.test(m)) clauses.push('select a parameter');
        else clauses.push(tok);
      });

      const sentence = `Please ${clauses.join('; ')}.`;
      try {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({ icon: 'warning', title: 'Missing fields', html: `<div style="text-align:left; white-space:normal; word-break:break-word; font-size:13px">${sentence}</div>`, width: 560, showCloseButton: true });
      } catch (e) { window.alert(sentence); }
      return;
    }
    // Bar chart requires at least one year selected
    if (false) {
      if (false) {
        const sentence = `Please select at least one year.`;
        try {
          const Swal = (await import('sweetalert2')).default;
          Swal.fire({ icon: 'warning', title: 'Missing fields', html: `<div style="text-align:left; white-space:normal; word-break:break-word; font-size:13px">${sentence}</div>`, width: 560, showCloseButton: true });
        } catch (e) { window.alert(sentence); }
        return;
      }
    }
    // Depth profile requires a single year to be selected (no 'All years')
    if (chartType === 'depth') {
      if (!dateFrom || !dateTo) {
        const sentence = `Please select a year.`;
        try {
          const Swal = (await import('sweetalert2')).default;
          Swal.fire({ icon: 'warning', title: 'Missing fields', html: `<div style="text-align:left; white-space:normal; word-break:break-word; font-size:13px">${sentence}</div>`, width: 560, showCloseButton: true });
        } catch (e) { window.alert(sentence); }
        return;
      }
    }
    setApplied(true);
  };

  const toggleSidebar = () => {
    setSidebarOpen((v) => !v);
  };

  const singleChartOptions = useMemo(() => {
    const base = baseLineChartOptions();
    const unit = selectedParamUnit || '';
    const text = `${selectedParamLabel}${unit ? ` (${unit})` : ''}`;
    base.scales = base.scales || {};
    base.scales.y = { ...(base.scales?.y || {}), title: { display: true, text, color: '#fff' } };
    return base;
  }, [selectedParamLabel, selectedParamUnit]);

  // removed: bar-specific station selection limit

  const isComplete = useMemo(() => {
    if (!selectedLake) return false;
    return Boolean(selectedStations && selectedStations.length > 0 && selectedParam);
  }, [selectedLake, JSON.stringify(selectedStations), selectedParam]);

  return (
    <div className="insight-card" style={{ backgroundColor: '#0f172a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h4 style={{ margin: 0 }}>Single Lake</h4>
        </div>
        <GraphInfoButton
          disabled={!canShowInfo}
          onClick={() => {
            if (!canShowInfo) return;
            // Extract standards from current datasets (threshold lines are labeled "<std> – Min/Max")
            // Prefer standards metadata produced by the active chart hook when present
            const standards = (() => {
              const meta = (chartType === 'depth' ? (depthProfile?.meta || {}) : (chartData?.meta || {}));
              if (Array.isArray(meta.standards) && meta.standards.length) return meta.standards.map(s => ({ code: s.code, min: s.min, max: s.max }));
              // fallback: parse labels heuristically
              const ds = (chartType === 'depth' ? (depthProfile?.datasets || []) : (chartData?.datasets || []));
              const map = new Map();
              ds.forEach((d) => {
                const label = String(d?.label || '');
                const parts = label.split(' – ').map(p => p.trim());
                let std = null;
                if (parts.length >= 3 && /\b(min|max)\b/i.test(parts[parts.length - 1]) && !/\b(min|max)\b/i.test(parts[1])) {
                  std = parts[1];
                } else if (parts.length >= 1) {
                  std = parts[0];
                }
                const kindMatch = /\b(min|max)\b/i.exec(label);
                if (std && kindMatch) {
                  const kind = kindMatch[1].toLowerCase();
                  const rec = map.get(std) || { code: std, min: null, max: null };
                  if (kind === 'min') rec.min = 1;
                  if (kind === 'max') rec.max = 1;
                  map.set(std, rec);
                }
              });
              return Array.from(map.values());
            })();
            const hasMin = standards.some(s => s.min != null);
            const hasMax = standards.some(s => s.max != null);
            const inferred = hasMin && hasMax ? 'range' : hasMin ? 'min' : hasMax ? 'max' : null;
            const pMeta = (() => {
              const sel = String(selectedParam || '');
              const opt = (paramOptions || []).find(p => String(p.key || p.id || p.code) === sel);
              return { code: opt?.code || sel, name: opt?.label || opt?.name || opt?.code || sel, unit: opt?.unit || '', desc: opt?.desc || '' };
            })();
            const ctx = {
              chartType,
              param: pMeta,
              seriesMode,
              bucket,
              standards,
              compareMode: false,
              summary: null,
              inferredType: inferred,
              // include trend context so the explanation can show the SMK description and result
              trendEnabled,
              trend: smk,
              alpha: trendAlpha,
            };
            const content = buildGraphExplanation(ctx);
            setInfoContent(content);
            setInfoOpen(true);
          }}
        />
      </div>
  <div style={{ display: 'flex', gap: 16 }}>
        {/* Sidebar (extracted) */}
  <StatsSidebar isOpen={sidebarOpen && isModalOpen} width={sidebarWidth} usePortal top={72} side="left" zIndex={10000} onToggle={toggleSidebar}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Lake</div>
            <LakeSelect lakes={lakeOptions} value={selectedLake} onChange={(e) => { onLakeChange(e.target.value); setApplied(false); }} />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Dataset source</div>
            <OrgSelect options={orgOptions} value={selectedOrg} onChange={(e) => {
              const nextOrg = e.target.value;
              // prune stations to those available in the new org instead of clearing all
              try {
                const list = !nextOrg ? (allStations || []) : (stationsByOrg?.[String(nextOrg)] || []);
                const names = new Set((list || []).map((s) => String(s?.name || s?.station_name || s?.code || '')));
                const pruned = (selectedStations || []).filter((n) => names.has(String(n)));
                onStationsChange(pruned);
              } catch {}
              onOrgChange(nextOrg);
              setApplied(false);
            }} disabled={!selectedLake} loading={!!selectedLake && stationsLoading} required={false} placeholder="Select a dataset source" style={{ width: '100%' }} />
          </div>

          {true ? (
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Locations</div>
              <div style={{ position: 'relative' }}>
                <button ref={stationBtnRef} type="button" className="pill-btn" disabled={!selectedLake || !selectedOrg || !stationsList?.length || stationsLoading} title={!selectedOrg ? 'Choose a dataset source first' : (!stationsList?.length ? 'No stations available' : undefined)} onClick={() => setStationsOpen((v) => !v)} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>{selectedStations.length ? `${selectedStations.length} selected` : 'Select locations'}</span>
                  {stationsLoading ? (<span style={{ marginLeft: 8 }}><LoadingSpinner inline size={16} label="" /></span>) : null}
                </button>
                <StationPicker
                  anchorRef={stationBtnRef}
                  open={stationsOpen}
                  onClose={() => setStationsOpen(false)}
                  stations={stationsList}
                  value={selectedStations}
                  // allow selecting all stations in time-series and depth-profile modes
                  maxSelected={(chartType === 'time' || chartType === 'depth') ? (stationsList?.length || 9999) : 3}
                  showLimitLabel={!(chartType === 'time' || chartType === 'depth')}
                  onChange={(next) => { onStationsChange(next); setApplied(false); }}
                />
              </div>
            </div>
          ) : null}

          {/* Chart Type */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Chart Type</div>
            <select className="pill-btn" value={chartType} onChange={(e) => {
              const next = e.target.value;
              const prev = prevTypeRef.current;
              setChartType(next);
              // If leaving Depth profile, clear year-based custom range to avoid leaking year dropdown
              if (prev === 'depth' && next !== 'depth') {
                try {
                  const prevSaved = prevTimeStateRef.current || { timeRange: 'all', dateFrom: '', dateTo: '' };
                  setTimeRange(prevSaved.timeRange || 'all');
                  setDateFrom(prevSaved.dateFrom || '');
                  setDateTo(prevSaved.dateTo || '');
                } catch {}
              } else if (next === 'depth' && prev !== 'depth') {
                // Save existing time selection before switching into depth mode
                prevTimeStateRef.current = { timeRange, dateFrom, dateTo };
              }
              prevTypeRef.current = next;
              setApplied(false);
            }} style={{ width: '100%' }}>
              <option value="time">Time series</option>
              <option value="depth">Depth profile</option>
              
            </select>
            
          </div>

          {/* Bucket & Range controls (only for Time Series), positioned below Chart Type */}
          {chartType === 'time' && (
            <TimeBucketRange
              bucket={bucket}
              setBucket={setBucket}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              availableYears={availableYears}
              includeCustom={false}
            />
          )}

          {/* Bucket & Year controls for Depth Profile */}
          {chartType === 'depth' && (
            <TimeBucketRange
              bucket={bucket}
              setBucket={setBucket}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              allowedBuckets={['month', 'quarter']}
              rangeMode="year-list"
              availableYears={availableYears}
            />
          )}

          {/* removed: Bar chart controls */}

          {(chartType === 'time') && (
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Series Mode</div>
              <SeriesModeToggle mode={seriesMode} onChange={(next) => { setSeriesMode(next); setApplied(false); }} />
            </div>
          )}
          {/* spatial controls removed */}
          {/* Correlation removed */}

          {/* Parameters */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Parameter</div>
            <ParamSelect options={paramOptions} value={selectedParam} onChange={(e) => { onParamChange(e.target.value); setApplied(false); }} disabled={!canChooseParam} loading={!Array.isArray(paramOptions) || paramOptions.length === 0} placeholder="Select parameter" style={{ width: '100%' }} />
            {/* Time-series depth selector: show either all depths (each as a series) or pick a specific depth band */}
            {chartType === 'time' && depthOptions && depthOptions.length >= 1 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Depth</div>
                <select className="pill-btn" value={selectedDepth} onChange={(e) => { setSelectedDepth(e.target.value); setApplied(false); }} disabled={!selectedParam} style={{ width: '100%' }}>
                  {seriesMode !== 'per-station' ? <option value="all">All depths (separate lines)</option> : null}
                  {depthOptions.map((d) => {
                    const label = d === '0' ? 'Surface (0 m)' : `${d} m`;
                    return (<option key={`d-${String(d)}`} value={String(d)}>{label}</option>);
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Trend analysis toggle and hidden controls */}
          {chartType === 'time' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Trend analysis (Seasonal MK)</div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={trendEnabled} onChange={(e)=>{ setTrendEnabled(e.target.checked); setApplied(false); }} />
                  <span style={{ fontSize: 12, opacity: 0.9 }}>Enable</span>
                </label>
              </div>
              {/* Season scheme selector removed — PAGASA Wet/Dry is the default and only scheme for now */}
            </div>
          )}

          <div>
            <button type="button" className="pill-btn liquid" onClick={handleApply} style={{ width: '100%' }}>Apply</button>
          </div>
  </StatsSidebar>

  {/* Main panel */}
  <div style={{ flex: 1, minWidth: 0, transition: 'all 260ms ease' }}>
          <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', padding: 8 }}>
        {applied ? (
          chartType === 'depth' ? (
            depthProfile && depthProfile.datasets && depthProfile.datasets.length && depthProfile.hasMultipleDepths ? (
              (() => {
                const depthDatasets = (depthProfile.datasets || []).slice();
                const maxDepth = depthProfile.maxDepth || 0;
                const tMin = Number.isFinite(depthThr?.min) ? Number(depthThr.min) : null;
                const tMax = Number.isFinite(depthThr?.max) ? Number(depthThr.max) : null;
                if (tMin != null) {
                  depthDatasets.push({ label: `Min`, data: [{ x: tMin, y: 0 }, { x: tMin, y: Math.max(1, maxDepth) }], borderColor: 'rgba(16,185,129,1)', backgroundColor: 'transparent', pointRadius: 0, borderDash: [4,4], tension: 0, spanGaps: true, showLine: true, parsing: false });
                }
                if (tMax != null) {
                  depthDatasets.push({ label: `Max`, data: [{ x: tMax, y: 0 }, { x: tMax, y: Math.max(1, maxDepth) }], borderColor: 'rgba(239,68,68,1)', backgroundColor: 'transparent', pointRadius: 0, borderDash: [4,4], tension: 0, spanGaps: true, showLine: true, parsing: false });
                }
                const depthData = { datasets: normalizeDepthDatasets(depthDatasets) };
                return (
                  <Line
                    key={`depth-${selectedParam}-${selectedLake}-${seriesMode}`}
                    ref={chartRef}
                    data={depthData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } },
                        tooltip: { callbacks: { label: (ctx) => {
                          const v = ctx.parsed?.x ?? ctx.raw?.x; const d = ctx.parsed?.y ?? ctx.raw?.y;
                          return `${ctx.dataset.label}: ${Number(v).toFixed(2)}${depthProfile.unit ? ` ${depthProfile.unit}` : ''} at ${d} m`;
                        } } },
                      },
                      scales: {
                        x: { type: 'linear', title: { display: true, text: `${selectedParamLabel}${(depthProfile?.unit || selectedParamUnit) ? ` (${depthProfile?.unit || selectedParamUnit})` : ''}`, color: '#fff' }, ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
                        y: { type: 'linear', reverse: true, title: { display: true, text: 'Depth (m)', color: '#fff' }, min: 0, suggestedMax: Math.max(5, depthProfile.maxDepth || 0), ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
                      },
                    }}
                  />
                );
              })()
            ) : (
              (() => {
                const lakeLabel = nameForSelectedLake || 'this lake';
                let msg = 'Depth profile requires multiple depths; only surface (0 m) measurements were found for this selection.';
                if (depthProfile && depthProfile.onlySurface) {
                  msg = `Only surface (0 m) measurements are available for ${lakeLabel} for this parameter. A depth profile requires multiple depths.`;
                }
                return (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ opacity: 0.9 }}>{msg}</span>
                  </div>
                );
              })()
            )
          ) : chartType === 'time' ? (
            tsThresholdsLoading ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LoadingSpinner inline label="Loading thresholds…" color="#fff" />
              </div>
            ) : chartData && chartData.datasets && chartData.datasets.length ? (
              (() => {
                // Determine if any primary dataset actually has data points (exclude thresholds and trend overlays)
                const baseDs = chartData.datasets || [];
                const hasPrimaryData = (() => {
                  try {
                    const isAux = (d) => {
                      const lbl = String(d?.label || '').toLowerCase();
                      return lbl.includes('min') || lbl.includes('max') || lbl.includes("sen’s slope") || lbl.includes("sen's slope");
                    };
                    for (const d of baseDs) {
                      if (isAux(d)) continue;
                      const arr = Array.isArray(d?.data) ? d.data : [];
                      for (const p of arr) {
                        const val = typeof p === 'number' ? p : (p && typeof p === 'object' ? (Number.isFinite(p.y) ? p.y : (Number.isFinite(p.x) ? p.x : null)) : null);
                        if (Number.isFinite(val)) return true;
                      }
                    }
                    return false;
                  } catch { return false; }
                })();

                if (!hasPrimaryData) {
                  return (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ opacity: 0.9 }}>No data for the current filters.</span>
                    </div>
                  );
                }

                // Merge overlay when available
                let datasets = baseDs.slice();
                if (smk && Array.isArray(smk.overlay)){
                  datasets = datasets.concat([
                    {
                      label: `Sen’s slope (SMK)`,
                      data: smk.overlay,
                      borderColor: '#f2c94c',
                      backgroundColor: 'transparent',
                      borderDash: [6,4],
                      pointRadius: 0,
                      tension: 0,
                      spanGaps: true,
                    }
                  ]);
                }
                const data = { labels: chartData.labels, datasets };
                return <Line key={`time-${selectedParam}-${selectedLake}-${seriesMode}-${trendEnabled? 'trend': 'plain'}`} ref={chartRef} data={data} options={singleChartOptions} />;
              })()
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ opacity: 0.9 }}>No time-series data available for this selection.</span>
              </div>
            )
          ) : null
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ opacity: 0.9 }}>{isComplete ? 'Click Apply to generate the chart.' : 'Fill all fields to enable Apply.'}</span>
          </div>
        )}
      </div>
      </div>
      </div>
      {currentStd && (currentStd.name || currentStd.code) ? (
        <div style={{ marginTop: 6, fontSize: 12, color: '#ddd', opacity: 0.9 }}>
          Parameter thresholds are based on {currentStd.name || currentStd.code} guidelines.
        </div>
      ) : null}
      {/* Trend result (concise statement) */}
      {chartType === 'time' && trendEnabled && applied && smk && (
        (() => {
          const lakeLabel = nameForSelectedLake || 'this lake';
          const paramLabel = selectedParamLabel || 'Value';
          const unit = selectedParamUnit ? ` ${selectedParamUnit}` : '';
          const slope = Number(smk?.sen?.slope);
          const hasSlope = Number.isFinite(slope);
          const slopeAbs = hasSlope ? fmtNum(Math.abs(slope)) : null;
          const sign = slope > 0 ? '+' : (slope < 0 ? '−' : '0');
          let sentence = '';
          if (smk.status === 'Increasing' && hasSlope) {
            sentence = `${paramLabel} in ${lakeLabel} is increasing by about ${slopeAbs}${unit} per year.`;
          } else if (smk.status === 'Decreasing' && hasSlope) {
            sentence = `${paramLabel} in ${lakeLabel} is decreasing by about ${slopeAbs}${unit} per year.`;
          } else if (smk.status === 'Increasing' || smk.status === 'Decreasing') {
            // Significant but slope missing for some reason
            sentence = `${paramLabel} in ${lakeLabel} is ${smk.status.toLowerCase()}.`;
          } else {
            // High p-value (no significant trend): do not report slope
            sentence = `${paramLabel} in ${lakeLabel} shows no significant trend.`;
          }
          return (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.95 }}>
              {sentence}
            </div>
          );
        })()
      )}
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title={infoContent.title} sections={infoContent.sections} />
    </div>
  );
}
