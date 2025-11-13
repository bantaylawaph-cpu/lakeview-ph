import React, { useEffect, useMemo, useState, useRef, useImperativeHandle } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, BarElement } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, BarElement);
// year label plugin will be registered below after importing from shared
import TimeBucketRange from "../controls/TimeBucketRange";
import StatsSidebar from "./StatsSidebar";
import { fetchParameters } from "./data/fetchers";
import InfoModal from "../common/InfoModal";
import { buildGraphExplanation } from "../utils/graphExplain";
import { eventStationName } from "./utils/dataUtils";
import { lakeName, lakeClass, yearLabelPlugin } from "./utils/shared";
// register plugin for bar charts (draws year labels under grouped bars)
ChartJS.register(yearLabelPlugin);
import useStationsCache from "./hooks/useStationsCache";
import GraphInfoButton from "./ui/GraphInfoButton";
import useSampleEvents from "./hooks/useSampleEvents";
import useCompareBarData from "./hooks/useCompareBarData";
import LakeSelect from './ui/LakeSelect';
import OrgSelect from './ui/OrgSelect';
import ParamSelect from './ui/ParamSelect';
import useCurrentStandard from './hooks/useCurrentStandard';
import { fetchParamThresholds } from './hooks/useParamThresholds';

function CompareLake({
  lakeOptions = [],
  params = [],
  bucket = "month",
  setBucket = () => {},
  chartRef,
  timeRange = "all",
  dateFrom = "",
  dateTo = "",
  setTimeRange = () => {},
  setDateFrom = () => {},
  setDateTo = () => {},
  onParamChange = () => {},
  isModalOpen = true,
}, ref) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = 340;
  const toggleSidebar = () => {
    setSidebarOpen((v) => !v);
  };
  const [lakeA, setLakeA] = useState("");
  const [lakeB, setLakeB] = useState("");
  const [selectedOrgA, setSelectedOrgA] = useState("");
  const [selectedOrgB, setSelectedOrgB] = useState("");
  const [selectedParam, setSelectedParam] = useState("");
  const { events: eventsA, loading: loadingA } = useSampleEvents(lakeA, selectedOrgA, timeRange, dateFrom, dateTo);
  const { events: eventsB, loading: loadingB } = useSampleEvents(lakeB, selectedOrgB, timeRange, dateFrom, dateTo);
  // Unfiltered events to drive bar charts and year lists independent of the current time range
  const { events: eventsAAll } = useSampleEvents(lakeA, selectedOrgA, 'all', '', '');
  const { events: eventsBAll } = useSampleEvents(lakeB, selectedOrgB, 'all', '', '');
  const loading = loadingA || loadingB;
  // Station identifiers are required for all datasets
  const hasStationIdsA = true;
  const hasStationIdsB = true;
  const [localParams, setLocalParams] = useState([]);
  const [applied, setApplied] = useState(false);
  // useSummaryStats removed
  const summaryA = null;
  const summaryB = null;
  const [selectedYears, setSelectedYears] = useState([]);
  const [depthSelection, setDepthSelection] = useState('0');
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', sections: [] });

  const nameForLake = (lk) => lakeName(lakeOptions, lk);
  const classForLake = (lk) => lakeClass(lakeOptions, lk);

  // Color palettes for Lake A and Lake B to ensure they are visually distinct
  const paletteA = ['#0369a1', '#0284c7', '#60a5fa', '#7dd3fc']; // blues
  const paletteB = ['#b91c1c', '#ef4444', '#f97316', '#fb923c']; // reds/oranges

  const colorizeDatasets = (datasets) => {
    if (!Array.isArray(datasets)) return datasets;
    const lakeNameA = nameForLake(lakeA) || String(lakeA || '');
    const lakeNameB = nameForLake(lakeB) || String(lakeB || '');
    const counters = { a: 0, b: 0, other: 0 };
    return datasets.map((d) => {
      const label = String(d?.label || '');
      let set = 'other';
      if (lakeNameA && label.includes(lakeNameA)) set = 'a';
      else if (lakeNameB && label.includes(lakeNameB)) set = 'b';
      const idx = counters[set]++;
      const color = set === 'a' ? paletteA[idx % paletteA.length] : set === 'b' ? paletteB[idx % paletteB.length] : (d.borderColor || '#9ca3af');
      const bg = d.backgroundColor || (color + '33');
      return { ...d, borderColor: color, backgroundColor: bg };
    });
  };

  useEffect(() => {
    let aborted = false;
    (async () => {
      if (params && params.length) { setLocalParams(params); return; }
      try { const list = await fetchParameters(); if (!aborted) setLocalParams(list); }
      catch { if (!aborted) setLocalParams([]); }
    })();
    return () => { aborted = true; };
  }, [params]);
  const paramList = useMemo(() => (params && params.length ? params : localParams), [params, localParams]);

  const { current: currentStd } = useCurrentStandard();

  // Prefetch thresholds for all parameters alongside parameters
  useEffect(() => {
    if (!paramList?.length || !currentStd?.id) return;
    paramList.forEach(p => {
      fetchParamThresholds({ paramCode: p.code || p.key, appliedStandardId: currentStd.id, classCode: undefined });
    });
  }, [paramList, currentStd?.id]);

  const { orgOptions: orgOptionsA, stationsByOrg: stationsByOrgA, allStations: allStationsA, loading: loadingStationsA } = useStationsCache(lakeA);
  const { orgOptions: orgOptionsB, stationsByOrg: stationsByOrgB, allStations: allStationsB, loading: loadingStationsB } = useStationsCache(lakeB);
  const stationsA = useMemo(() => (!selectedOrgA ? (allStationsA || []) : (stationsByOrgA?.[String(selectedOrgA)] || [])), [selectedOrgA, allStationsA, stationsByOrgA]);
  const stationsB = useMemo(() => (!selectedOrgB ? (allStationsB || []) : (stationsByOrgB?.[String(selectedOrgB)] || [])), [selectedOrgB, allStationsB, stationsByOrgB]);

  // Fallback: if useStationsCache hasn't returned orgOptions yet, derive org options from the fetched events
  const derivedOrgOptionsA = useMemo(() => {
    if (Array.isArray(orgOptionsA) && orgOptionsA.length) return orgOptionsA;
    const map = new Map();
    (Array.isArray(eventsA) ? eventsA : []).forEach((ev) => {
      const oid = ev.organization_id ?? ev.organization?.id ?? null;
      const oname = ev.organization_name ?? ev.organization?.name ?? null;
      if (oid && oname && !map.has(String(oid))) map.set(String(oid), { id: oid, name: oname });
    });
    return Array.from(map.values());
  }, [orgOptionsA, eventsA]);

  const derivedOrgOptionsB = useMemo(() => {
    if (Array.isArray(orgOptionsB) && orgOptionsB.length) return orgOptionsB;
    const map = new Map();
    (Array.isArray(eventsB) ? eventsB : []).forEach((ev) => {
      const oid = ev.organization_id ?? ev.organization?.id ?? null;
      const oname = ev.organization_name ?? ev.organization?.name ?? null;
      if (oid && oname && !map.has(String(oid))) map.set(String(oid), { id: oid, name: oname });
    });
    return Array.from(map.values());
  }, [orgOptionsB, eventsB]);

  // Prevent same-lake vs same-lake by filtering the opposite dropdown
  const lakeOptionsForA = useMemo(() => lakeOptions.filter(l => String(l.id) !== String(lakeB)), [lakeOptions, lakeB]);
  const lakeOptionsForB = useMemo(() => lakeOptions.filter(l => String(l.id) !== String(lakeA)), [lakeOptions, lakeA]);
  // Defensive: if both end up equal somehow, clear Lake B
  useEffect(() => {
    if (lakeA && lakeB && String(lakeA) === String(lakeB)) {
      setLakeB('');
    }
  }, [lakeA, lakeB]);

  // If lake changes and the previously selected org is no longer valid, clear it (A)
  useEffect(() => {
    try {
      if (!lakeA) return;
      const opts = Array.isArray(derivedOrgOptionsA) ? derivedOrgOptionsA : [];
      if (selectedOrgA && !opts.some(o => String(o.value) === String(selectedOrgA))) {
        setSelectedOrgA('');
      }
    } catch {}
  }, [lakeA, derivedOrgOptionsA]);

  // If lake changes and the previously selected org is no longer valid, clear it (B)
  useEffect(() => {
    try {
      if (!lakeB) return;
      const opts = Array.isArray(derivedOrgOptionsB) ? derivedOrgOptionsB : [];
      if (selectedOrgB && !opts.some(o => String(o.value) === String(selectedOrgB))) {
        setSelectedOrgB('');
      }
    } catch {}
  }, [lakeB, derivedOrgOptionsB]);

  const isComplete = useMemo(() => {
    const hasLake = Boolean(lakeA || lakeB);
    const hasParam = Boolean(selectedParam);
    const hasOrgs = (!lakeA || selectedOrgA) && (!lakeB || selectedOrgB);
    return hasLake && hasParam && hasOrgs;
  }, [lakeA, lakeB, selectedParam, selectedOrgA, selectedOrgB]);

  const canChooseParam = useMemo(() => {
    const lakes = [ { lake: lakeA, org: selectedOrgA }, { lake: lakeB, org: selectedOrgB } ];
    if (!lakes.some(l => l.lake)) return false;
    for (const l of lakes) {
      if (!l.lake) continue; // lake not selected -> skip
      if (!l.org) return false; // dataset source required
    }
    return true;
  }, [lakeA, lakeB, selectedOrgA, selectedOrgB]);

  const computeMissingFields = () => {
    const missing = [];
    if (!lakeA && !lakeB) { missing.push('Select at least one lake (Lake A or Lake B)'); return missing; }
    const check = (label, lake, org) => {
      if (!lake) return;
      if (!org) missing.push(`${label}: Dataset source`);
    };
    check('Lake A', lakeA, selectedOrgA);
    check('Lake B', lakeB, selectedOrgB);
    if (!selectedParam) missing.push('Parameter');
    return missing;
  };

  const handleApply = async () => {
    const missing = computeMissingFields();
    if (missing.length) {
      if (missing.length === 1 && /^Select at least one lake/i.test(missing[0])) {
        const sentence = `Please select at least one lake (Lake A or Lake B).`;
        try {
          const Swal = (await import('sweetalert2')).default;
          Swal.fire({ icon: 'warning', title: 'Missing fields', html: `<div style="text-align:left; white-space:normal; word-break:break-word; font-size:13px">${sentence}</div>`, width: 560, showCloseButton: true });
        } catch (e) { window.alert(sentence); }
        return;
      }

      const lakeMissing = { A: [], B: [] };
      let paramMissing = false;
      missing.forEach((m) => {
        if (/^Lake A:/i.test(m)) lakeMissing.A.push(m.replace(/^Lake A:\s*/i, ''));
        else if (/^Lake B:/i.test(m)) lakeMissing.B.push(m.replace(/^Lake B:\s*/i, ''));
        else if (/^Parameter$/i.test(m)) paramMissing = true;
      });

      const mapToken = (tok) => {
        if (/dataset source/i.test(tok)) return 'a dataset source';
        return tok.toLowerCase();
      };

      const clauses = [];
      if (lakeMissing.A.length) clauses.push(`choose ${lakeMissing.A.map(mapToken).join(' and ')} for Lake A`);
      if (lakeMissing.B.length) clauses.push(`choose ${lakeMissing.B.map(mapToken).join(' and ')} for Lake B`);
      if (paramMissing) clauses.push('select a parameter');

      const sentence = `Please ${clauses.join('; ')}.`;
      try {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({ icon: 'warning', title: 'Missing fields', html: `<div style="text-align:left; white-space:normal; word-break:break-word; font-size:13px">${sentence}</div>`, width: 560, showCloseButton: true });
      } catch (e) { window.alert(sentence); }
      return;
    }
    setApplied(true);
  };

  useEffect(() => { setApplied(false); }, [lakeA, lakeB, selectedOrgA, selectedOrgB, selectedParam, timeRange, dateFrom, dateTo, bucket]);

  // Reset bar depth selection to surface when the parameter changes
  useEffect(() => {
    setDepthSelection('0');
  }, [selectedParam]);


  // removed: time-series filtered events (Compare view is bar-only)

  // Available years: show only overlapping years when both lakes are selected; otherwise show years for the selected lake
  const availableYears = useMemo(() => {
    const toYearSet = (arr) => {
      const s = new Set();
      (Array.isArray(arr) ? arr : []).forEach((ev) => {
        const iso = ev?.sampled_at;
        if (!iso) return;
        try {
          const y = new Date(iso).getFullYear();
          if (Number.isFinite(y)) s.add(y);
        } catch {}
      });
      return s;
    };
    const setA = toYearSet(eventsAAll);
    const setB = toYearSet(eventsBAll);
    const listA = Array.from(setA).sort((a,b)=>b-a);
    const listB = Array.from(setB).sort((a,b)=>b-a);
    const both = Boolean(lakeA && selectedOrgA && lakeB && selectedOrgB);
    if (both) {
      return listA.filter((y) => setB.has(y));
    }
    if (lakeA && selectedOrgA) return listA;
    if (lakeB && selectedOrgB) return listB;
    return [];
  }, [eventsAAll, eventsBAll, lakeA, lakeB, selectedOrgA, selectedOrgB]);

  // Keep selectedYears within available overlap; silently prune invalid years
  useEffect(() => {
    setSelectedYears((prev) => prev.filter((y) => availableYears.includes(y)));
  }, [availableYears.join(',')]);

  // derive depth options for selectedParam from events (union of both lakes)
  const depthOptions = useMemo(() => {
    const depths = new Set();

    const matchParam = (r) => {
      if (!r) return false;
      const sel = String(selectedParam || '');
      // check nested parameter object
      if (r.parameter) {
        if (typeof r.parameter === 'string') {
          if (sel === String(r.parameter)) return true;
        } else if (typeof r.parameter === 'object') {
          if (r.parameter.code && sel === String(r.parameter.code)) return true;
          if (r.parameter.key && sel === String(r.parameter.key)) return true;
          if (r.parameter.id && sel === String(r.parameter.id)) return true;
        }
      }
      // check flat parameter fields
      if (r.parameter_code && sel === String(r.parameter_code)) return true;
      if (r.parameter_key && sel === String(r.parameter_key)) return true;
      if (r.parameter_id && sel === String(r.parameter_id)) return true;
      return false;
    };

    const pushDepths = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((ev) => {
        (ev.results || []).forEach((r) => {
          if (!selectedParam) return;
          if (!matchParam(r)) return;
          const d = r.depth_m == null ? '0' : String(r.depth_m);
          depths.add(d);
        });
      });
    };

    pushDepths(eventsAAll);
    pushDepths(eventsBAll);
    const arr = Array.from(depths).sort((a,b)=>Number(a)-Number(b));
    // ensure surface (0) is present
    if (!arr.includes('0')) arr.unshift('0');
    return arr;
  }, [eventsAAll, eventsBAll, selectedParam]);

  // removed: time-series chart data (Compare is bar-only)

  useImperativeHandle(ref, () => ({
    clearAll: () => {
      setLakeA('');
      setLakeB('');
      setSelectedOrgA('');
      setSelectedOrgB('');
      setSelectedParam('');
      setApplied(false);
      // also clear compare-specific selections
      setSelectedYears([]);
      setDepthSelection('0');
    }
  }));

  // removed: time-series chart options (Compare is bar-only)

  const { barData, loadingThresholds: compareThrLoading } = useCompareBarData({ eventsA: eventsAAll, eventsB: eventsBAll, bucket, selectedYears, depth: depthSelection, selectedParam, lakeA, lakeB, lakeOptions });

  // Compare is bar-only; no time-series range state to correct

  const canShowInfo = useMemo(() => {
    if (!applied) return false;
    try { return Boolean(barData && Array.isArray(barData.datasets) && barData.datasets.length); } catch { return false; }
  }, [applied, barData]);

  return (
    <div className="insight-card" style={{ backgroundColor: '#0f172a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h4 style={{ margin: 0 }}>Compare Lakes</h4>
        </div>
        <GraphInfoButton
          disabled={!canShowInfo}
          onClick={() => {
            // Prefer standards from barData.meta when available (Compare is bar-only)
            const meta = (barData?.meta || {});
            let standards = [];
            if (Array.isArray(meta.standards) && meta.standards.length) {
              standards = meta.standards.map(s => ({ code: s.code, min: s.min, max: s.max }));
            } else {
              const ds = (barData?.datasets || []);
              const stdMap = new Map();
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
                  const rec = stdMap.get(std) || { code: std, min: null, max: null };
                  if (kind === 'min') rec.min = 1;
                  if (kind === 'max') rec.max = 1;
                  stdMap.set(std, rec);
                }
              });
              standards = Array.from(stdMap.values());
            }
            const hasMin = standards.some(s => s.min != null);
            const hasMax = standards.some(s => s.max != null);
            const inferred = hasMin && hasMax ? 'range' : hasMin ? 'min' : hasMax ? 'max' : null;
            const pMeta = (() => {
              const sel = String(selectedParam || '');
              const opt = (paramList || []).find(p => String(p.key || p.id || p.code) === sel);
              return { code: opt?.code || sel, name: opt?.label || opt?.name || opt?.code || sel, unit: opt?.unit || '', desc: opt?.desc || '' };
            })();
            const nameForLake = (lk) => lakeOptions.find((x)=>String(x.id)===String(lk))?.name || String(lk || '') || '';
            const ctx = {
              chartType: 'bar',
              param: pMeta,
              seriesMode: 'avg',
              bucket,
              standards,
              compareMode: true,
              lakeLabels: { a: nameForLake(lakeA) || 'Lake A', b: nameForLake(lakeB) || 'Lake B' },
              summary: null,
              inferredType: inferred,
            };
            const content = buildGraphExplanation(ctx);
            const fmt = (v) => (Number.isFinite(v) ? v.toFixed(2) : 'N/A');
            // per-lake summaries removed (useSummaryStats hook deleted). If you want per-lake stats here, reintroduce a summary collector.
            setInfoContent(content);
            setInfoOpen(true);
          }}
        />
      </div>
  <div style={{ display: 'flex', gap: 16 }}>
        {/* Sidebar (extracted) */}
  <StatsSidebar isOpen={sidebarOpen && isModalOpen} width={sidebarWidth} usePortal top={72} side="left" zIndex={10000} onToggle={toggleSidebar}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Lake A</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <LakeSelect lakes={lakeOptionsForA} value={lakeA} onChange={(e) => { setLakeA(e.target.value); /* keep org if still valid; effect below will clear if invalid */ setApplied(false); setSelectedYears([]); }} />
            <OrgSelect options={derivedOrgOptionsA} value={selectedOrgA} onChange={(e) => { setSelectedOrgA(e.target.value); /* keep param */ }} required={false} placeholder="Select a dataset source" style={{ width:'100%' }} loading={!!lakeA && loadingStationsA} disabled={!lakeA} />
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

          <div style={{ fontSize: 12, opacity: 0.85 }}>Lake B</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <LakeSelect lakes={lakeOptionsForB} value={lakeB} onChange={(e) => { setLakeB(e.target.value); /* keep org if still valid; effect below will clear if invalid */ setApplied(false); setSelectedYears([]); }} />
            <OrgSelect options={derivedOrgOptionsB} value={selectedOrgB} onChange={(e) => { setSelectedOrgB(e.target.value); /* keep param */ }} required={false} placeholder="Select a dataset source" style={{ width:'100%' }} loading={!!lakeB && loadingStationsB} disabled={!lakeB} />
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

          <div>
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
              includeCustom={false}
            />
            {(lakeA && selectedOrgA && lakeB && selectedOrgB && availableYears.length === 0) ? (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                No overlapping years between the selected datasets.
              </div>
            ) : null}
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Parameter</div>
            <ParamSelect options={paramList} value={selectedParam} onChange={(e) => { setSelectedParam(e.target.value); onParamChange?.(e.target.value); }} placeholder="Select parameter" style={{ width:'100%' }} loading={!Array.isArray(paramList) || paramList.length === 0} />
          </div>

          {/* removed: time-series depth selector */}

          {(
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Depth</div>
              <select
                className="pill-btn"
                value={depthSelection}
                onChange={(e) => setDepthSelection(e.target.value)}
                disabled={!selectedParam || !(depthOptions && depthOptions.length)}
                style={{ width: '100%' }}
              >
                {(depthOptions && depthOptions.length ? depthOptions : ['0']).map((d) => {
                  const label = d === '0' ? 'Surface (0 m)' : `${d} m`;
                  return (<option key={String(d)} value={String(d)}>{label}</option>);
                })}
              </select>
            </div>
          )}

          <div>
            <button type="button" className="pill-btn liquid" onClick={handleApply} style={{ width: '100%' }}>Apply</button>
          </div>
  </StatsSidebar>
        {/* Main panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Summary panels removed per design: Samples / Mean / Median are not shown in CompareLake */}

  <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', padding: 8 }}>
  {applied && (lakeA && selectedOrgA && lakeB && selectedOrgB) && availableYears.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ opacity: 0.9 }}>No overlapping years between the selected datasets.</span>
          </div>
        ) : applied && !compareThrLoading && barData && Array.isArray(barData.datasets) && barData.datasets.length ? (
          (() => {
            // If datasets are present but contain no actual bar values, show an explicit message
            const raw = Array.isArray(barData.datasets) ? barData.datasets : [];
            const hasPrimaryData = (() => {
              try {
                for (const d of raw) {
                  if (d && d.type === 'line') continue; // ignore threshold lines
                  const arr = Array.isArray(d.data) ? d.data : [];
                  for (const v of arr) {
                    const val = typeof v === 'number' ? v : (v && typeof v === 'object' ? (Number.isFinite(v.y) ? v.y : (Number.isFinite(v.x) ? v.x : null)) : null);
                    if (Number.isFinite(val)) return true;
                  }
                }
                return false;
              } catch { return false; }
            })();

            if (!hasPrimaryData) {
              return (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ opacity: 0.9 }}>No data for the current filters.</span>
                </div>
              );
            }

            const bd = { ...barData, datasets: colorizeDatasets(barData.datasets) };
            const paramMeta = (paramList || []).find(p => String(p.key || p.id || p.code) === String(selectedParam));
            const unit = paramMeta?.unit || '';
            const title = paramMeta ? `${paramMeta.label || paramMeta.name || paramMeta.code}` : 'Value';
            const hasThresholdLines = Array.isArray(bd?.datasets) && bd.datasets.some((d) => d && d.type === 'line');
            const options = {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                // Show legend only for threshold lines (Min/Max)
                legend: {
                  display: !!hasThresholdLines,
                  labels: {
                    color: '#fff',
                    filter: (legendItem, chartData) => {
                      try {
                        const ds = chartData?.datasets?.[legendItem.datasetIndex];
                        return !!(ds && ds.type === 'line');
                      } catch { return false; }
                    },
                  },
                },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}${unit ? ` ${unit}` : ''}` } },
                // Draw per-group year labels inside the chart area to avoid axis label overlap
                yearLabelPlugin: { meta: bd?.meta || {}, color: '#fff', fontSize: 11, paddingInside: 14 },
              },
              indexAxis: 'x',
              datasets: { bar: { categoryPercentage: 0.75, barPercentage: 0.9 } },
              scales: {
                x: { stacked: false, ticks: { color: '#fff' }, grid: { display: false } },
                y: { stacked: false, ticks: { color: '#fff' }, title: { display: true, text: `${title}${unit ? ` (${unit})` : ''}`, color: '#fff' }, grid: { color: 'rgba(255,255,255,0.08)' } },
              },
            };
            return <Bar key={`bar-${selectedParam}-${lakeA}-${lakeB}`} ref={chartRef} data={bd} options={options} />;
          })()
        ) : compareThrLoading && applied ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner inline label="Loading thresholds…" color="#fff" />
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ opacity: 0.9 }}>{loading ? 'Loading…' : (applied ? 'No data for the current filters.' : 'Fill all fields and click Apply to generate the chart.')}</span>
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
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title={infoContent.title} sections={infoContent.sections} />
    </div>
  );
}

export default React.forwardRef(CompareLake);
