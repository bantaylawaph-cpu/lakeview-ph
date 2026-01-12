import React, { useEffect, useMemo, useState, useRef } from "react";
import TimeBucketRange from "../controls/TimeBucketRange";
import StatsSidebar from "./StatsSidebar";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import InfoModal from "../common/InfoModal";
import { buildGraphExplanation } from "../utils/graphExplain";
import { lakeName, lakeClass, baseLineChartOptions, normalizeDepthDatasets } from "./utils/shared";
import useSampleEvents from "./hooks/useSampleEvents";
import useStationsCache from "./hooks/useStationsCache";
import useTimeSeriesData from "./hooks/useTimeSeriesData";
import useAllParamsTimeSeriesData from "./hooks/useAllParamsTimeSeriesData";
import useDepthProfileData from "./hooks/useDepthProfileData";
import useDepthProfileChartData from "./hooks/useDepthProfileChartData";
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
import Popover from '../common/Popover';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const complianceShadingPlugin = {
  id: 'complianceShading',
  beforeDatasetsDraw(chart, args, pluginOptions) {
    try {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales) return;
      const axisKey = pluginOptions?.axis === 'x' ? 'x' : 'y';
      const scale = scales[axisKey];
      if (!scale) return;
      const { left, right, top, bottom } = chartArea;
      const min = pluginOptions?.min;
      const max = pluginOptions?.max;
      if (min == null && max == null) return;
      ctx.save();
      ctx.fillStyle = 'rgba(239,68,68,0.08)';
      if (axisKey === 'y') {
        // Shade area above max (non-compliant high)
        if (max != null) {
          const yMaxPx = scale.getPixelForValue(Number(max));
          const h = Math.max(0, yMaxPx - top);
          if (h > 0) ctx.fillRect(left, top, right - left, h);
        }
        // Shade area below min (non-compliant low)
        if (min != null) {
          const yMinPx = scale.getPixelForValue(Number(min));
          const h = Math.max(0, bottom - yMinPx);
          if (h > 0) ctx.fillRect(left, yMinPx, right - left, h);
        }
      } else {
        // axis === 'x' (depth profile: parameter along x)
        // Shade area right of max (non-compliant high)
        if (max != null) {
          const xMaxPx = scale.getPixelForValue(Number(max));
          const w = Math.max(0, right - xMaxPx);
          if (w > 0) ctx.fillRect(xMaxPx, top, w, bottom - top);
        }
        // Shade area left of min (non-compliant low)
        if (min != null) {
          const xMinPx = scale.getPixelForValue(Number(min));
          const w = Math.max(0, xMinPx - left);
          if (w > 0) ctx.fillRect(left, top, w, bottom - top);
        }
      }
      ctx.restore();
    } catch (_) {}
  },
};

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
  selectedParams,
  onParamsChange,
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
  const [paramsOpen, setParamsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = 320;
  const stationBtnRef = useRef(null);
  const paramsBtnRef = useRef(null);

  const [chartType, setChartType] = useState('time');
  const prevTypeRef = useRef('time');
  const prevTimeStateRef = useRef({ timeRange: 'all', dateFrom: '', dateTo: '' });
  const [seriesMode, setSeriesMode] = useState('avg'); // 'avg' | 'per-station'
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', sections: [] });
  const [selectedDepth, setSelectedDepth] = useState('all');
  // Trend analysis (SMK)
  const [trendEnabled, setTrendEnabled] = useState(false);
  const trendAlpha = 0.05;
  const [shadeOutOfCompliance, setShadeOutOfCompliance] = useState(false);
  const [toggleNonCompliantPoints, setToggleNonCompliantPoints] = useState(false);
  const { events, loading } = useSampleEvents(selectedLake, selectedOrg, timeRange, dateFrom, dateTo);
  const { events: eventsAll } = useSampleEvents(selectedLake, selectedOrg, 'all', '', '');
  const { stationsByOrg, allStations, loading: stationsLoading } = useStationsCache(selectedLake);
  const stationsList = useMemo(() => (!selectedOrg ? (allStations || []) : (stationsByOrg?.[String(selectedOrg)] || [])), [selectedOrg, allStations, stationsByOrg]);

  const selectedParamsArr = useMemo(() => {
    if (Array.isArray(selectedParams)) return selectedParams.map((p) => String(p || '')).filter(Boolean);
    const s = String(selectedParams || '');
    return s ? [s] : [];
  }, [selectedParams]);

  const isMultiParamTime = useMemo(() => (chartType === 'time' && selectedParamsArr.length > 1), [chartType, selectedParamsArr]);
  const singleSelectedParam = useMemo(() => (selectedParamsArr.length === 1 ? selectedParamsArr[0] : ''), [selectedParamsArr]);

  // Enforce: depth profile requires exactly one parameter
  useEffect(() => {
    if (chartType !== 'depth') return;
    if (selectedParamsArr.length <= 1) return;
    try { onParamsChange?.([selectedParamsArr[0]]); } catch {}
  }, [chartType, JSON.stringify(selectedParamsArr)]);

  // Disable compliance/trend toggles when multiple parameters are selected
  useEffect(() => {
    if (!isMultiParamTime) return;
    setTrendEnabled(false);
    setShadeOutOfCompliance(false);
    setToggleNonCompliantPoints(false);
    try { setSeriesMode('avg'); } catch {}
    try { setSelectedDepth('all'); } catch {}
  }, [isMultiParamTime]);
  useEffect(() => {}, [selectedLake, selectedOrg, JSON.stringify(selectedParamsArr), JSON.stringify(selectedStations), timeRange, dateFrom, dateTo, bucket, chartType, selectedDepth]);

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

  const nameForSelectedLake = useMemo(() => lakeName(lakeOptions, selectedLake) || String(selectedLake || '') || '', [lakeOptions, selectedLake]);
  const classForSelectedLake = useMemo(() => lakeClass(lakeOptions, selectedLake) || selectedClass || '', [lakeOptions, selectedLake, selectedClass]);
  const { current: currentStd } = useCurrentStandard();

  useEffect(() => {
    if (!paramOptions?.length || !currentStd?.id) return;
    paramOptions.forEach(p => {
      fetchParamThresholds({ paramCode: p.code || p.key, appliedStandardId: currentStd.id, classCode: classForSelectedLake || undefined });
    });
  }, [paramOptions, currentStd?.id, classForSelectedLake]);

  const { chartData: singleChartData, loadingThresholds: tsThresholdsLoading } = useTimeSeriesData({ events, selectedParam: singleSelectedParam, selectedStations, bucket, timeRange, dateFrom, dateTo, seriesMode, classForSelectedLake, depthSelection: selectedDepth, appliedStandardId: currentStd?.id });

  const { chartData: multiChartData } = useAllParamsTimeSeriesData({
    events,
    paramOptions,
    selectedParamCodes: selectedParamsArr,
    selectedStations,
    bucket,
    timeRange,
    dateFrom,
    dateTo,
    depthSelection: selectedDepth,
  });

  const chartData = useMemo(() => (isMultiParamTime ? multiChartData : singleChartData), [isMultiParamTime, multiChartData, singleChartData]);
  const timeThresholdsLoading = useMemo(() => (!isMultiParamTime ? tsThresholdsLoading : false), [isMultiParamTime, tsThresholdsLoading]);
  // Parameter metadata (moved earlier to ensure selectedParamCode available before depth profile chart hook)
  const selectedParamMeta = useMemo(() => {
    const sel = String(singleSelectedParam || '');
    return (paramOptions || []).find(p => String(p.key || p.id || p.code) === sel) || null;
  }, [paramOptions, singleSelectedParam]);
  const selectedParamLabel = useMemo(() => (selectedParamMeta?.label || selectedParamMeta?.name || selectedParamMeta?.code || 'Value'), [selectedParamMeta]);
  const selectedParamUnit = useMemo(() => (selectedParamMeta?.unit || ''), [selectedParamMeta]);
  const selectedParamCode = useMemo(() => (selectedParamMeta?.code || String(singleSelectedParam || '')), [selectedParamMeta, singleSelectedParam]);
  const depthProfile = useDepthProfileData({ events, selectedParam: singleSelectedParam, selectedStations, bucket });
  const { chartData: depthChartData, loadingThresholds: depthThrLoading, unit: depthUnit, maxDepth: depthMax, hasMultipleDepths: depthHasMultiple, onlySurface: depthOnlySurface } = useDepthProfileChartData({ depthProfile, paramCode: selectedParamCode, appliedStandardId: currentStd?.id, classCode: classForSelectedLake || undefined });
  const depthOptions = useMemo(() => {
    const depths = new Set();
    const selSet = new Set((selectedParamsArr || []).map((s) => String(s || '')).filter(Boolean));
    if (!selSet.size) return ['0'];
    (Array.isArray(events) ? events : []).forEach((ev) => {
      (ev.results || []).forEach((r) => {
        const pSel = selSet;
        const p = r?.parameter;
        let match = false;
        if (p) {
          if (typeof p === 'string' && pSel.has(String(p))) match = true;
          else if (typeof p === 'object') {
            if (p.code && pSel.has(String(p.code))) match = true;
            if (p.id && pSel.has(String(p.id))) match = true;
            if (p.key && pSel.has(String(p.key))) match = true;
          }
        }
        if (!match) {
          if (r.parameter_code && pSel.has(String(r.parameter_code))) match = true;
          if (r.parameter_id && pSel.has(String(r.parameter_id))) match = true;
          if (r.parameter_key && pSel.has(String(r.parameter_key))) match = true;
        }
        if (!match) return;
        const d = r.depth_m == null ? '0' : String(r.depth_m);
        depths.add(d);
      });
    });
    const arr = Array.from(depths).sort((a,b)=>Number(a)-Number(b));
    if (!arr.includes('0')) arr.unshift('0');
    return arr;
  }, [events, JSON.stringify(selectedParamsArr)]);

  useEffect(() => {
    try {
      if (seriesMode === 'per-station' && selectedDepth === 'all') {
        const def = (depthOptions && depthOptions.length) ? String(depthOptions[0]) : '0';
        setSelectedDepth(def);
      }
    } catch (e) { /* noop */ }
  }, [seriesMode, depthOptions, selectedDepth]);

  useEffect(() => {
    if (chartType === 'time' && timeRange === 'custom') {
      setTimeRange('all');
      setDateFrom('');
      setDateTo('');
    }
  }, [chartType, timeRange]);

  const depthThr = useParamThresholds({ paramCode: selectedParamCode, appliedStandardId: currentStd?.id, classCode: classForSelectedLake || undefined });

  const canShowInfo = useMemo(() => {
    try {
      if (chartType === 'time') return !isMultiParamTime && Boolean(chartData?.datasets?.length);
      if (chartType === 'depth') return Boolean(depthProfile?.datasets?.length);
      return false;
    } catch { return false; }
  }, [chartType, isMultiParamTime, chartData, depthProfile]);

  const canChooseParam = useMemo(() => {
    if (!selectedLake || !selectedOrg) return false;
    return Array.isArray(selectedStations) && selectedStations.length > 0;
  }, [selectedLake, selectedOrg, selectedStations]);

  const paramLabelWithUnit = (p) => {
    const label = String(p?.label || p?.name || p?.code || p?.key || p?.id || '').trim();
    const unit = String(p?.unit || '').trim();
    return unit ? `${label} (${unit})` : label;
  };

  const sortedParamOptions = useMemo(() => {
    const list = Array.isArray(paramOptions) ? paramOptions.slice() : [];
    list.sort((a, b) => paramLabelWithUnit(a).localeCompare(paramLabelWithUnit(b)));
    return list;
  }, [paramOptions]);

  const allParamCodes = useMemo(() => {
    const set = new Set();
    (Array.isArray(paramOptions) ? paramOptions : []).forEach((p) => {
      const code = String(p?.code || p?.key || p?.id || '').trim();
      if (code) set.add(code);
    });
    return Array.from(set);
  }, [paramOptions]);

  const chartLabels = chartData?.labels || [];
  const { result: smk, loading: smkLoading } = useSeasonalMK({
    events,
    selectedParam: singleSelectedParam,
    selectedStations,
    bucket,
    timeRange,
    dateFrom,
    dateTo,
    labels: chartLabels,
    alpha: trendAlpha,
    enabled: trendEnabled && chartType === 'time' && !isMultiParamTime && !!singleSelectedParam,
    depthSelection: selectedDepth,
  });
  

  const isSelectionIncomplete = useMemo(() => {
    if (!selectedLake) return true;
    if (!selectedOrg) return true;
    if (!selectedStations || selectedStations.length === 0) return true;
    if (!selectedParamsArr || selectedParamsArr.length === 0) return true;
    if (chartType === 'depth' && (!dateFrom || !dateTo)) return true;
    return false;
  }, [selectedLake, selectedOrg, selectedStations, JSON.stringify(selectedParamsArr), chartType, dateFrom, dateTo]);

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
            const standards = (() => {
              const meta = (chartType === 'depth' ? (depthProfile?.meta || {}) : (chartData?.meta || {}));
              if (Array.isArray(meta.standards) && meta.standards.length) return meta.standards.map(s => ({ code: s.code, min: s.min, max: s.max }));
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
              const sel = String(singleSelectedParam || '');
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
            <LakeSelect lakes={lakeOptions} value={selectedLake} onChange={(e) => { onLakeChange(e.target.value); }} />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Dataset source</div>
            <OrgSelect options={orgOptions} value={selectedOrg} onChange={(e) => {
              const nextOrg = e.target.value;
              try {
                const list = !nextOrg ? (allStations || []) : (stationsByOrg?.[String(nextOrg)] || []);
                const names = new Set((list || []).map((s) => String(s?.name || s?.station_name || s?.code || '')));
                const pruned = (selectedStations || []).filter((n) => names.has(String(n)));
                onStationsChange(pruned);
              } catch {}
              onOrgChange(nextOrg);
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
                  maxSelected={(chartType === 'time' || chartType === 'depth') ? (stationsList?.length || 9999) : 3}
                  showLimitLabel={!(chartType === 'time' || chartType === 'depth')}
                  onChange={(next) => { onStationsChange(next); }}
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
              if (prev === 'depth' && next !== 'depth') {
                try {
                  const prevSaved = prevTimeStateRef.current || { timeRange: 'all', dateFrom: '', dateTo: '' };
                  setTimeRange(prevSaved.timeRange || 'all');
                  setDateFrom(prevSaved.dateFrom || '');
                  setDateTo(prevSaved.dateTo || '');
                } catch {}
              } else if (next === 'depth' && prev !== 'depth') {
                prevTimeStateRef.current = { timeRange, dateFrom, dateTo };
              }
              prevTypeRef.current = next;
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

          {(chartType === 'time' && !isMultiParamTime) && (
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Series Mode</div>
              <SeriesModeToggle mode={seriesMode} onChange={(next) => { setSeriesMode(next); }} />
            </div>
          )}

          {/* Parameters */}
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Parameter</div>
            {chartType === 'time' ? (
              <div style={{ position: 'relative' }}>
                <button
                  ref={paramsBtnRef}
                  type="button"
                  className="pill-btn"
                  disabled={!canChooseParam || !sortedParamOptions?.length}
                  title={!canChooseParam ? 'Choose lake, source, and locations first' : (!sortedParamOptions?.length ? 'No parameters available' : undefined)}
                  onClick={() => setParamsOpen((v) => !v)}
                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                >
                  <span>
                    {selectedParamsArr.length
                      ? `${selectedParamsArr.length} selected`
                      : 'Select parameters'}
                  </span>
                  {(!Array.isArray(paramOptions) || paramOptions.length === 0) ? (
                    <span style={{ marginLeft: 8 }}><LoadingSpinner inline size={16} label="" /></span>
                  ) : null}
                </button>

                <Popover
                  anchorRef={paramsBtnRef}
                  open={paramsOpen}
                  onClose={() => setParamsOpen(false)}
                  minWidth={280}
                  maxHeight={360}
                  zIndex={31050}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sortedParamOptions.map((p) => {
                      const code = String(p?.code || p?.key || p?.id || '').trim();
                      if (!code) return null;
                      const checked = selectedParamsArr.includes(code);
                      return (
                        <label
                          key={`param-${code}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', userSelect: 'none', color: '#fff' }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextChecked = e.target.checked;
                              const next = nextChecked
                                ? Array.from(new Set([...selectedParamsArr, code]))
                                : selectedParamsArr.filter((c) => c !== code);
                              onParamsChange(next);
                            }}
                          />
                          <span style={{ lineHeight: 1.2, color: '#fff' }}>{paramLabelWithUnit(p)}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 8,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: '1px solid rgba(255,255,255,0.12)',
                      position: 'sticky',
                      bottom: 0,
                      background: 'rgba(20,40,80,0.98)',
                      paddingBottom: 2,
                    }}
                  >
                    <button
                      type="button"
                      className="pill-btn ghost"
                      onClick={() => { onParamsChange(allParamCodes); }}
                      disabled={!allParamCodes.length}
                      style={{ padding: '6px 10px', height: 32 }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="pill-btn ghost"
                      onClick={() => { onParamsChange([]); }}
                      disabled={!selectedParamsArr.length}
                      style={{ padding: '6px 10px', height: 32 }}
                    >
                      Clear
                    </button>
                  </div>
                </Popover>
              </div>
            ) : (
              <ParamSelect
                options={paramOptions}
                value={singleSelectedParam}
                onChange={(e) => { onParamsChange([e.target.value]); }}
                disabled={!canChooseParam}
                loading={!Array.isArray(paramOptions) || paramOptions.length === 0}
                placeholder="Select parameter"
                style={{ width: '100%' }}
              />
            )}
            {chartType === 'time' && depthOptions && depthOptions.length >= 1 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Depth</div>
                <select className="pill-btn" value={selectedDepth} onChange={(e) => { setSelectedDepth(e.target.value); }} disabled={isMultiParamTime || !selectedParamsArr.length} style={{ width: '100%' }}>
                  {seriesMode !== 'per-station' ? <option value="all">All depths (separate lines)</option> : null}
                  {depthOptions.map((d) => {
                    const label = d === '0' ? 'Surface (0 m)' : `${d} m`;
                    return (<option key={`d-${String(d)}`} value={String(d)}>{label}</option>);
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Apply button removed; charts update automatically */}
  </StatsSidebar>

  {/* Main panel */}
  <div style={{ flex: 1, minWidth: 0, transition: 'all 260ms ease' }}>
          <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', padding: 8 }}>
        {!isSelectionIncomplete ? (
          chartType === 'depth' ? (
            depthChartData && depthHasMultiple ? (
              (() => {
                const thr = depthThr;
                const isOut = (val) => {
                  if (val == null || !Number.isFinite(val)) return false;
                  if (thr && thr.min != null && val < Number(thr.min)) return true;
                  if (thr && thr.max != null && val > Number(thr.max)) return true;
                  return false;
                };
                let ds = depthChartData.datasets || [];
                if (toggleNonCompliantPoints) {
                  ds = ds.map(d => {
                    const label = String(d?.label || '').toLowerCase();
                    if (label === 'min' || label === 'max') return d; // skip threshold lines
                    const newD = { ...d };
                    if (Array.isArray(d.data)) {
                      newD.pointBackgroundColor = d.data.map(p => {
                        const v = (p && typeof p === 'object') ? (Number.isFinite(p.x) ? p.x : null) : (Number.isFinite(p) ? p : null);
                        return isOut(v) ? 'rgba(239,68,68,1)' : (d.borderColor || '#fff');
                      });
                      newD.pointBorderColor = newD.pointBackgroundColor;
                    }
                    return newD;
                  });
                }
                const chartOptions = {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } },
                    tooltip: { callbacks: { label: (ctx) => {
                      const v = ctx.parsed?.x ?? ctx.raw?.x; const d = ctx.parsed?.y ?? ctx.raw?.y;
                      return `${ctx.dataset.label}: ${Number(v).toFixed(2)}${depthUnit ? ` ${depthUnit}` : ''} at ${d} m`;
                    } } },
                  },
                  scales: {
                    x: { type: 'linear', title: { display: true, text: `${selectedParamLabel}${(depthUnit || selectedParamUnit) ? ` (${depthUnit || selectedParamUnit})` : ''}`, color: '#fff' }, ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
                    y: { type: 'linear', reverse: true, title: { display: true, text: 'Depth (m)', color: '#fff' }, min: 0, suggestedMax: Math.max(5, depthMax || 0), ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
                  },
                };
                let plugins = undefined;
                if (shadeOutOfCompliance) {
                  chartOptions.plugins.complianceShading = { min: thr?.min ?? null, max: thr?.max ?? null, axis: 'x' };
                  plugins = [complianceShadingPlugin];
                }
                // Relabel threshold lines: Min/Max (<Standard Code>: <value> <unit>) for depth profile
                try {
                  const stdCode = depthChartData?.meta?.standards?.[0]?.code || currentStd?.code || '';
                  ds = (Array.isArray(ds) ? ds : []).map((dsi) => {
                    const lbl = String(dsi?.label || '').toLowerCase();
                    const isThreshold = lbl.includes('min') || lbl.includes('max');
                    if (isThreshold) {
                      const base = lbl.includes('max') ? 'Max' : 'Min';
                      let val = NaN;
                      try {
                        const p0 = dsi?.data?.[0];
                        val = typeof p0 === 'number' ? Number(p0) : Number(p0?.x);
                      } catch {}
                      const unitStr = (depthUnit || selectedParamUnit) ? ` ${depthUnit || selectedParamUnit}` : '';
                      const valStr = Number.isFinite(val) ? `${val}${unitStr}` : `N/A${unitStr}`;
                      return { ...dsi, label: `${base} (${stdCode}: ${valStr})` };
                    }
                    return dsi;
                  });
                } catch {}
                const data = { datasets: ds };
                return (
                  <Line
                    key={`depth-${singleSelectedParam}-${selectedLake}-${seriesMode}-${shadeOutOfCompliance}-${toggleNonCompliantPoints}`}
                    ref={chartRef}
                    data={data}
                    options={chartOptions}
                    plugins={plugins}
                  />
                );
              })()
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ opacity: 0.9 }}>
                  {depthOnlySurface ? `Only surface (0 m) measurements are available for ${nameForSelectedLake || 'this lake'} for this parameter. A depth profile requires multiple depths.` : 'Depth profile requires multiple depths; only surface (0 m) measurements were found for this selection.'}
                </span>
              </div>
            )
          ) : chartType === 'time' ? (
            timeThresholdsLoading ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LoadingSpinner inline label="Loading thresholds…" color="#fff" />
              </div>
            ) : chartData && chartData.datasets && chartData.datasets.length ? (
              (() => {
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
                      label: `Trend Line (Sen's slope)`,
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
                // Apply compliance visualization
                let modifiedDatasets = datasets.slice();
                let chartOptions = { ...singleChartOptions };
                if (isMultiParamTime) {
                  try {
                    chartOptions = { ...chartOptions };
                    chartOptions.scales = chartOptions.scales || {};
                    chartOptions.scales.y = { ...(chartOptions.scales?.y || {}), title: { display: true, text: 'Value (mixed units)', color: '#fff' } };
                  } catch {}
                }
                let chartPlugins = undefined;
                if (!isMultiParamTime && (toggleNonCompliantPoints || shadeOutOfCompliance)) {
                  const thr = depthThr;
                  const isOutOfCompliance = (v) => {
                    if (v == null || !Number.isFinite(v)) return false;
                    if (thr && thr.min != null && v < Number(thr.min)) return true;
                    if (thr && thr.max != null && v > Number(thr.max)) return true;
                    return false;
                  };
                  modifiedDatasets = modifiedDatasets.map(ds => {
                    const newDs = { ...ds };
                    if (toggleNonCompliantPoints && !ds.label?.includes('Min') && !ds.label?.includes('Max') && !ds.label?.includes("Sen’s slope")) {
                      newDs.pointBackgroundColor = ds.data.map(v => isOutOfCompliance(v) ? 'rgba(239,68,68,1)' : (ds.borderColor || '#fff'));
                      newDs.pointBorderColor = ds.data.map(v => isOutOfCompliance(v) ? 'rgba(239,68,68,1)' : (ds.borderColor || '#fff'));
                    }
                    return newDs;
                  });
                  if (shadeOutOfCompliance) {
                    chartOptions.plugins = chartOptions.plugins || {};
                    chartOptions.plugins.complianceShading = { min: thr?.min ?? null, max: thr?.max ?? null };
                    chartPlugins = [complianceShadingPlugin];
                  }
                }
                // Relabel threshold lines: Min/Max (<Standard Code>: <value> <unit>) for time series
                try {
                  if (isMultiParamTime) throw new Error('skip');
                  const stdCode = chartData?.meta?.standards?.[0]?.code || currentStd?.code || '';
                  modifiedDatasets = (Array.isArray(modifiedDatasets) ? modifiedDatasets : []).map((ds) => {
                    const lbl = String(ds?.label || '').toLowerCase();
                    const isThreshold = lbl.includes('min') || lbl.includes('max');
                    if (isThreshold) {
                      const base = lbl.includes('max') ? 'Max' : 'Min';
                      let val = NaN;
                      try {
                        const p0 = ds?.data?.[0];
                        val = typeof p0 === 'number' ? Number(p0) : Number(p0?.y);
                      } catch {}
                      const unitStr = selectedParamUnit ? ` ${selectedParamUnit}` : '';
                      const valStr = Number.isFinite(val) ? `${val}${unitStr}` : `N/A${unitStr}`;
                      return { ...ds, label: `${base} (${stdCode}: ${valStr})` };
                    }
                    return ds;
                  });
                } catch {}
                const data = { labels: chartData.labels, datasets: modifiedDatasets };
                const keySuffix = (selectedParamsArr && selectedParamsArr.length) ? selectedParamsArr.join('|') : 'none';
                return <Line key={`time-${keySuffix}-${selectedLake}-${seriesMode}-${trendEnabled}-${shadeOutOfCompliance}-${toggleNonCompliantPoints}`} ref={chartRef} data={data} options={chartOptions} plugins={chartPlugins} />;
              })()
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ opacity: 0.9 }}>No time-series data available for this selection.</span>
              </div>
            )
          ) : null
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ opacity: 0.9 }}>Select lake, source, locations, and parameter to view chart.</span>
          </div>
        )}
      </div>
      </div>
      </div>
      {currentStd && (currentStd.name || currentStd.code) && (!isMultiParamTime) ? (
        <div style={{ marginTop: 6, fontSize: 12, color: '#ddd', opacity: 0.9 }}>
          Parameter thresholds are based on {currentStd.name || currentStd.code} guidelines.
        </div>
      ) : null}
      {/* Trend analysis and compliance toggles */}
      {(chartType === 'time' || chartType === 'depth') && (
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {!(chartType === 'time' && isMultiParamTime) ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {chartType === 'time' && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={trendEnabled} onChange={(e)=>{ setTrendEnabled(e.target.checked); }} />
                  <span style={{ fontSize: 11, opacity: 0.9 }}>Enable Trend Analysis</span>
                </label>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={shadeOutOfCompliance} onChange={(e)=>{ setShadeOutOfCompliance(e.target.checked); }} />
                <span style={{ fontSize: 11, opacity: 0.9 }}>Shade out-of-compliance region</span>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={toggleNonCompliantPoints} onChange={(e)=>{ setToggleNonCompliantPoints(e.target.checked); }} />
                <span style={{ fontSize: 11, opacity: 0.9 }}>Toggle non-compliant points</span>
              </label>
            </div>
          ) : (
            <div />
          )}

          {chartType === 'time' && !isMultiParamTime && trendEnabled && !isSelectionIncomplete && smk && (
            <div style={{ fontSize: 11, opacity: 0.95 }}>
              {(() => {
                const lakeLabel = nameForSelectedLake || 'this lake';
                const paramLabel = selectedParamLabel || 'Value';
                const unit = selectedParamUnit ? ` ${selectedParamUnit}` : '';
                const slope = Number(smk?.sen?.slope);
                const hasSlope = Number.isFinite(slope);
                const slopeAbs = hasSlope ? fmtNum(Math.abs(slope)) : null;
                let sentence = '';
                if (smk.status === 'Increasing' && hasSlope) {
                  sentence = `${paramLabel} in ${lakeLabel} is increasing by about ${slopeAbs}${unit} per year.`;
                } else if (smk.status === 'Decreasing' && hasSlope) {
                  sentence = `${paramLabel} in ${lakeLabel} is decreasing by about ${slopeAbs}${unit} per year.`;
                } else if (smk.status === 'Increasing' || smk.status === 'Decreasing') {
                  sentence = `${paramLabel} in ${lakeLabel} is ${smk.status.toLowerCase()}.`;
                } else {
                  sentence = `${paramLabel} in ${lakeLabel} shows no significant trend.`;
                }
                return sentence;
              })()}
            </div>
          )}
        </div>
      )}
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title={infoContent.title} sections={infoContent.sections} />
    </div>
  );
}
