import React, { useEffect, useMemo, useState, useRef } from "react";
import TimeBucketRange from "../controls/TimeBucketRange";
import StatsSidebar from "./StatsSidebar";
import { Line, Scatter, Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, BarElement } from "chart.js";
import InfoModal from "../common/InfoModal";
import { buildGraphExplanation } from "../utils/graphExplain";
import { eventStationName } from "./utils/dataUtils";
import { lakeName, lakeClass, baseLineChartOptions, normalizeDepthDatasets } from "./utils/shared";
import useSampleEvents from "./hooks/useSampleEvents";
import useStationsCache from "./hooks/useStationsCache";
// useSummaryStats removed
import useTimeSeriesData from "./hooks/useTimeSeriesData";
import useDepthProfileData from "./hooks/useDepthProfileData";
import useCorrelationData from "./hooks/useCorrelationData";
import useSingleBarData from "./hooks/useSingleBarData";
import GraphInfoButton from "./ui/GraphInfoButton";
import StationPicker from "./ui/StationPicker";
import { SeriesModeToggle } from "./ui/Toggles";
import LakeSelect from './ui/LakeSelect';
import OrgSelect from './ui/OrgSelect';
import ParamSelect from './ui/ParamSelect';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, BarElement);

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
  // 'time' | 'depth' | 'correlation' | 'bar'
  const [chartType, setChartType] = useState('time');
  const [seriesMode, setSeriesMode] = useState('avg'); // 'avg' | 'per-station'
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', sections: [] });
  const [selectedYears, setSelectedYears] = useState([]);
  const [depthSelection, setDepthSelection] = useState('0');
  // Correlation options
  const [paramX, setParamX] = useState('');
  const [paramY, setParamY] = useState('');
  const { events, loading } = useSampleEvents(selectedLake, selectedOrg, timeRange, dateFrom, dateTo);
  // Also fetch unfiltered events (all time) to derive available years without being affected
  // by the currently selected timeRange/dateFrom/dateTo. This prevents the year list from
  // narrowing to the chosen year when the user picks a year filter.
  const { events: eventsAll } = useSampleEvents(selectedLake, selectedOrg, 'all', '', '');
  const hasStationIds = true;
  const { orgOptions: orgOptionsLocal, stationsByOrg, allStations } = useStationsCache(selectedLake);
  const stationsList = useMemo(() => (!selectedOrg ? (allStations || []) : (stationsByOrg?.[String(selectedOrg)] || [])), [selectedOrg, allStations, stationsByOrg]);
  useEffect(() => {
    setApplied(false);
  }, [selectedLake, selectedOrg, selectedParam, JSON.stringify(selectedStations), timeRange, dateFrom, dateTo, bucket, chartType, paramX, paramY]);

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
  const chartData = useTimeSeriesData({ events, selectedParam, selectedStations, bucket, timeRange, dateFrom, dateTo, seriesMode, classForSelectedLake });
  const depthProfile = useDepthProfileData({ events, selectedParam, selectedStations, bucket });
  const correlation = useCorrelationData({ events, station: (selectedStations && selectedStations.length === 1) ? selectedStations[0] : '', paramX, paramY, depthMode: 'surface', paramOptions });
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

  const barData = useSingleBarData({ events, bucket, selectedYears, depth: depthSelection, selectedParam, lake: selectedLake, lakeOptions, seriesMode, selectedStations });

  const canShowInfo = useMemo(() => {
    if (!applied) return false;
    try {
      if (chartType === 'time') return Boolean(chartData?.datasets?.length);
      if (chartType === 'depth') return Boolean(depthProfile?.datasets?.length);
      if (chartType === 'correlation') return Boolean(correlation?.datasets?.length);
      if (chartType === 'bar') return Boolean(barData?.datasets?.length);
      return false;
    } catch { return false; }
  }, [applied, chartType, chartData, depthProfile, correlation]);

  const canChooseParam = useMemo(() => {
    if (!selectedLake || !selectedOrg) return false;
    return Array.isArray(selectedStations) && selectedStations.length > 0;
  }, [selectedLake, selectedOrg, selectedStations]);

  const computeMissingFields = () => {
    const missing = [];
    if (!selectedLake) { missing.push('Select a lake'); return missing; }
    if (!selectedOrg) missing.push('choose a dataset source');
  if (!selectedStations || selectedStations.length === 0) missing.push('choose at least one location');
    if (chartType === 'correlation') {
      if (selectedStations && selectedStations.length !== 1) missing.push('choose exactly one location for correlation');
      if (!paramX) missing.push('select parameter X');
      if (!paramY) missing.push('select parameter Y');
      if (paramX && paramY && String(paramX) === String(paramY)) missing.push('choose different parameters for X and Y');
    } else {
      if (!selectedParam) missing.push('select a parameter');
    }
    return missing;
  };

  const handleApply = async () => {
    const missing = computeMissingFields();
    if (missing.length) {
      const sentence = `Please ${missing.join(', ')}.`;
      try {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'warning',
          title: 'Missing fields',
          html: `<div style="text-align:left; white-space:normal; word-break:break-word; font-size:13px">${sentence}</div>`,
          width: 560,
          showCloseButton: true,
        });
      } catch (e) {
        window.alert(sentence);
      }
      return;
    }
    setApplied(true);
  };

  const toggleSidebar = () => {
    setSidebarOpen((v) => !v);
  };

  const singleChartOptions = useMemo(() => baseLineChartOptions(), []);

  const isComplete = useMemo(() => {
    if (!selectedLake) return false;
    if (chartType === 'correlation') return selectedStations && selectedStations.length === 1 && paramX && paramY && String(paramX) !== String(paramY);
    return Boolean(selectedStations && selectedStations.length > 0 && selectedParam);
  }, [selectedLake, JSON.stringify(selectedStations), chartType, paramX, paramY, selectedParam]);

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
            // Prefer standards metadata produced by barData/chartData hooks when present
            const standards = (() => {
              const meta = (chartType === 'bar' ? (barData?.meta || {}) : (chartData?.meta || {}));
              if (Array.isArray(meta.standards) && meta.standards.length) return meta.standards.map(s => ({ code: s.code, min: s.min, max: s.max }));
              // fallback: parse labels heuristically
              const ds = (chartType === 'bar' ? (barData?.datasets || []) : (chartData?.datasets || []));
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
              return { code: opt?.code || sel, name: opt?.label || opt?.name || opt?.code || sel, unit: opt?.unit || '' };
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
            <LakeSelect lakes={lakeOptions} value={selectedLake} onChange={(e) => { onLakeChange(e.target.value); setApplied(false); setSelectedYears([]); setDepthSelection('0'); }} />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Dataset source</div>
            <OrgSelect options={orgOptions} value={selectedOrg} onChange={(e) => { onOrgChange(e.target.value); onStationsChange([]); setApplied(false); }} disabled={!selectedLake} required={false} placeholder="Select a dataset source" style={{ width: '100%' }} />
          </div>

          {true ? (
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Locations</div>
              <div style={{ position: 'relative' }}>
                <button ref={stationBtnRef} type="button" className="pill-btn" disabled={!selectedLake || !selectedOrg || !stationsList?.length} title={!selectedOrg ? 'Choose a dataset source first' : (!stationsList?.length ? 'No stations available' : undefined)} onClick={() => setStationsOpen((v) => !v)} style={{ width: '100%' }}>
                  {selectedStations.length ? `${selectedStations.length} selected` : 'Select locations'}
                </button>
                <StationPicker
                  anchorRef={stationBtnRef}
                  open={stationsOpen}
                  onClose={() => setStationsOpen(false)}
                  stations={stationsList}
                  value={selectedStations}
                  onChange={(next) => { onStationsChange(next); onParamChange(""); setApplied(false); }}
                />
              </div>
            </div>
          ) : null}

          {/* Chart Type */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Chart Type</div>
            <select className="pill-btn" value={chartType} onChange={(e) => {
              const next = e.target.value;
              setChartType(next);
              // clear year/range selections when leaving depth to avoid leftover selectors
              if (next !== 'depth') {
                try {
                  setSelectedYears([]);
                  setDateFrom('');
                  setDateTo('');
                  setTimeRange('all');
                } catch (err) { /* ignore if setters not in scope */ }
              }
              if (next === 'correlation') {
                if (!paramX && selectedParam) setParamX(selectedParam);
                if (!paramY) {
                  const alt = (paramOptions || []).find(p => String(p.key || p.id || p.code) !== String(paramX || selectedParam));
                  if (alt) setParamY(alt.key || alt.id || alt.code);
                }
              }
              setApplied(false);
            }} style={{ width: '100%' }}>
              <option value="time">Time series</option>
              <option value="depth">Depth profile</option>
              <option value="bar">Bar (Stations)</option>
              <option value="correlation">Correlation</option>
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

          {/* Bucket & Years controls for Bar chart */}
          {chartType === 'bar' && (
            <TimeBucketRange
              bucket={bucket}
              setBucket={setBucket}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              allowedBuckets={['year','quarter','month']}
              rangeMode={'year-multi'}
              availableYears={availableYears}
              selectedYears={selectedYears}
              setSelectedYears={setSelectedYears}
            />
          )}

          {(chartType === 'time' || chartType === 'bar') && (
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Series Mode</div>
              <SeriesModeToggle mode={seriesMode} onChange={(next) => { setSeriesMode(next); setApplied(false); }} />
            </div>
          )}
          {/* spatial controls removed */}
          {chartType === 'correlation' && (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Station requirement: select exactly one location.
            </div>
          )}

          {/* Parameters */}
          {chartType !== 'correlation' ? (
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Parameter</div>
              <ParamSelect options={paramOptions} value={selectedParam} onChange={(e) => { onParamChange(e.target.value); setApplied(false); setDepthSelection('0'); }} disabled={!canChooseParam} placeholder="Select parameter" style={{ width: '100%' }} />
              {chartType === 'bar' && depthOptions && depthOptions.length >= 1 && (
                <div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, marginBottom: 4 }}>Depth</div>
                  <select className="pill-btn" value={depthSelection} onChange={(e) => setDepthSelection(e.target.value)} disabled={!selectedParam} style={{ width: '100%' }}>
                    {depthOptions.map((d) => {
                      const label = d === '0' ? 'Surface (0 m)' : `${d} m`;
                      return (<option key={String(d)} value={String(d)}>{label}</option>);
                    })}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Parameter X</div>
                <ParamSelect options={paramOptions} value={paramX} onChange={(e) => { setParamX(e.target.value); setApplied(false); }} disabled={!canChooseParam} placeholder="Select parameter X" style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Parameter Y</div>
                <ParamSelect options={paramOptions} value={paramY} onChange={(e) => { setParamY(e.target.value); setApplied(false); }} disabled={!canChooseParam} placeholder="Select parameter Y" style={{ width: '100%' }} />
              </div>
            </>
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
                let tMin = null; let tMax = null; let stdLabel = null;
                try {
                  for (const ev of events || []) {
                    const sName = eventStationName(ev) || '';
                    if (!selectedStations.includes(sName)) continue;
                    const results = Array.isArray(ev?.results) ? ev.results : [];
                    for (const r of results) {
                      const p = r?.parameter; if (!p) continue;
                      const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
                      if (!match) continue;
                      const sk = r?.threshold?.standard?.code || r?.threshold?.standard?.name || null;
                      if (!stdLabel && sk) stdLabel = sk;
                      if (r?.threshold?.min_value != null && tMin == null) tMin = Number(r.threshold.min_value);
                      if (r?.threshold?.max_value != null && tMax == null) tMax = Number(r.threshold.max_value);
                      if (tMin != null && tMax != null) break;
                    }
                    if (tMin != null && tMax != null) break;
                  }
                } catch (e) { /* ignore */ }
                const clsLbl = classForSelectedLake ? ` (Class ${classForSelectedLake})` : '';
                if (Number.isFinite(tMin)) {
                  depthDatasets.push({ label: `${stdLabel || 'Standard'}${clsLbl} – Min`, data: [{ x: tMin, y: 0 }, { x: tMin, y: Math.max(1, maxDepth) }], borderColor: 'rgba(16,185,129,1)', backgroundColor: 'transparent', pointRadius: 0, borderDash: [4,4], tension: 0, spanGaps: true, showLine: true, parsing: false });
                }
                if (Number.isFinite(tMax)) {
                  depthDatasets.push({ label: `${stdLabel || 'Standard'}${clsLbl} – Max`, data: [{ x: tMax, y: 0 }, { x: tMax, y: Math.max(1, maxDepth) }], borderColor: 'rgba(239,68,68,1)', backgroundColor: 'transparent', pointRadius: 0, borderDash: [4,4], tension: 0, spanGaps: true, showLine: true, parsing: false });
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
                        x: { type: 'linear', title: { display: true, text: `Value${depthProfile.unit ? ` (${depthProfile.unit})` : ''}`, color: '#fff' }, ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
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
            chartData && chartData.datasets && chartData.datasets.length ? (
              <Line key={`time-${selectedParam}-${selectedLake}-${seriesMode}`} ref={chartRef} data={chartData} options={singleChartOptions} />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ opacity: 0.9 }}>No time-series data available for this selection.</span>
              </div>
            )
          ) : chartType === 'bar' ? (
            barData && Array.isArray(barData.datasets) && barData.datasets.length ? (
              (() => {
                const bd = { ...barData, datasets: barData.datasets };
                const options = {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}` } } },
                  indexAxis: 'x',
                  datasets: { bar: { categoryPercentage: 0.75, barPercentage: 0.9 } },
                  scales: { x: { ticks: { color: '#fff' }, grid: { display: false } }, y: { ticks: { color: '#fff' }, title: { display: true, text: 'Value', color: '#fff' }, grid: { color: 'rgba(255,255,255,0.08)' } } },
                };
                return <Bar key={`bar-${selectedParam}-${selectedLake}-${seriesMode}`} ref={chartRef} data={bd} options={options} />;
              })()
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ opacity: 0.9 }}>No bar data available for this selection.</span>
              </div>
            )
          ) : chartType === 'correlation' ? (
            correlation && correlation.datasets && correlation.datasets.length ? (
              <Scatter
                key={`corr-${paramX}-${paramY}-${selectedLake}-${selectedStations?.[0] || ''}`}
                ref={chartRef}
                data={{ datasets: correlation.datasets }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } } },
                  scales: {
                    x: { type: 'linear', title: { display: true, text: `X${correlation.unitX ? ` (${correlation.unitX})` : ''}`, color: '#fff' }, ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
                    y: { type: 'linear', title: { display: true, text: `Y${correlation.unitY ? ` (${correlation.unitY})` : ''}`, color: '#fff' }, ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
                  },
                }}
              />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ opacity: 0.9 }}>No correlation data available. Ensure exactly one station is selected and both parameters have overlapping samples.</span>
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
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title={infoContent.title} sections={infoContent.sections} />
    </div>
  );
}
