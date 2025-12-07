import React, { useEffect, useMemo, useState, useImperativeHandle } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, BarElement } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, BarElement);
import TimeBucketRange from "../controls/TimeBucketRange";
import StatsSidebar from "./StatsSidebar";
import { fetchParameters } from "./data/fetchers";
import InfoModal from "../common/InfoModal";
import { buildGraphExplanation } from "../utils/graphExplain";
import { lakeName, yearLabelPlugin } from "./utils/shared";
ChartJS.register(yearLabelPlugin);
import LoadingSpinner from '../LoadingSpinner';
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
  bucket = "year",
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
  const { events: eventsAAll } = useSampleEvents(lakeA, selectedOrgA, 'all', '', '');
  const { events: eventsBAll } = useSampleEvents(lakeB, selectedOrgB, 'all', '', '');
  const loading = loadingA || loadingB;
  const [localParams, setLocalParams] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [depthSelection, setDepthSelection] = useState('0');
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', sections: [] });

  const nameForLake = (lk) => lakeName(lakeOptions, lk);

  const paletteA = ['#0369a1', '#0284c7', '#60a5fa', '#7dd3fc'];
  const paletteB = ['#b91c1c', '#ef4444', '#f97316', '#fb923c'];

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

  const lakeOptionsForA = useMemo(() => lakeOptions.filter(l => String(l.id) !== String(lakeB)), [lakeOptions, lakeB]);
  const lakeOptionsForB = useMemo(() => lakeOptions.filter(l => String(l.id) !== String(lakeA)), [lakeOptions, lakeA]);
  useEffect(() => {
    if (lakeA && lakeB && String(lakeA) === String(lakeB)) {
      setLakeB('');
    }
  }, [lakeA, lakeB]);

  useEffect(() => {
    try {
      if (!lakeA) return;
      const opts = Array.isArray(derivedOrgOptionsA) ? derivedOrgOptionsA : [];
      if (selectedOrgA && !opts.some(o => String(o.value) === String(selectedOrgA))) {
        setSelectedOrgA('');
      }
    } catch {}
  }, [lakeA, derivedOrgOptionsA]);

  useEffect(() => {
    try {
      if (!lakeB) return;
      const opts = Array.isArray(derivedOrgOptionsB) ? derivedOrgOptionsB : [];
      if (selectedOrgB && !opts.some(o => String(o.value) === String(selectedOrgB))) {
        setSelectedOrgB('');
      }
    } catch {}
  }, [lakeB, derivedOrgOptionsB]);


  const isSelectionIncomplete = useMemo(() => {
    if (!lakeA && !lakeB) return true;
    if (lakeA && !selectedOrgA) return true;
    if (lakeB && !selectedOrgB) return true;
    if (!selectedParam) return true;
    if (!selectedYears || selectedYears.length === 0) return true;
    return false;
  }, [lakeA, lakeB, selectedOrgA, selectedOrgB, selectedParam, selectedYears]);

  useEffect(() => {
    setDepthSelection('0');
  }, [selectedParam]);


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

  useEffect(() => {
    setSelectedYears((prev) => prev.filter((y) => availableYears.includes(y)));
  }, [availableYears.join(',')]);

  const depthOptions = useMemo(() => {
    const depths = new Set();

    const matchParam = (r) => {
      if (!r) return false;
      const sel = String(selectedParam || '');
      if (r.parameter) {
        if (typeof r.parameter === 'string') {
          if (sel === String(r.parameter)) return true;
        } else if (typeof r.parameter === 'object') {
          if (r.parameter.code && sel === String(r.parameter.code)) return true;
          if (r.parameter.key && sel === String(r.parameter.key)) return true;
          if (r.parameter.id && sel === String(r.parameter.id)) return true;
        }
      }
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
    if (!arr.includes('0')) arr.unshift('0');
    return arr;
  }, [eventsAAll, eventsBAll, selectedParam]);


  useImperativeHandle(ref, () => ({
    clearAll: () => {
      setLakeA('');
      setLakeB('');
      setSelectedOrgA('');
      setSelectedOrgB('');
      setSelectedParam('');
      setSelectedYears([]);
      setDepthSelection('0');
      try { setBucket('year'); } catch {}
    }
  }));


  const { barData, loadingThresholds: compareThrLoading } = useCompareBarData({ eventsA: eventsAAll, eventsB: eventsBAll, bucket, selectedYears, depth: depthSelection, selectedParam, lakeA, lakeB, lakeOptions });

  // Ensure default bucket is 'year' whenever modal opens or on initial mount
  useEffect(() => {
    try {
      const allowed = new Set(['year','quarter','month']);
      if (!allowed.has(String(bucket))) {
        setBucket('year');
        return;
      }
      if (String(bucket) === 'month') {
        setBucket('year');
      }
    } catch {}
    // run on open and first render
  }, [isModalOpen]);


  const canShowInfo = useMemo(() => {
    if (isSelectionIncomplete) return false;
    try { return Boolean(barData && Array.isArray(barData.datasets) && barData.datasets.length); } catch { return false; }
  }, [isSelectionIncomplete, barData]);

  return (
    <div className="insight-card" style={{ backgroundColor: '#0f172a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h4 style={{ margin: 0 }}>Compare Lakes</h4>
        </div>
        <GraphInfoButton
          disabled={!canShowInfo}
          onClick={() => {
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
            setInfoContent(content);
            setInfoOpen(true);
          }}
        />
      </div>
  <div style={{ display: 'flex', gap: 16 }}>
  <StatsSidebar isOpen={sidebarOpen && isModalOpen} width={sidebarWidth} usePortal top={72} side="left" zIndex={10000} onToggle={toggleSidebar}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Lake A</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <LakeSelect lakes={lakeOptionsForA} value={lakeA} onChange={(e) => { setLakeA(e.target.value); setSelectedYears([]); }} />
            <OrgSelect options={derivedOrgOptionsA} value={selectedOrgA} onChange={(e) => { setSelectedOrgA(e.target.value); /* keep param */ }} required={false} placeholder="Select a dataset source" style={{ width:'100%' }} loading={!!lakeA && loadingStationsA} disabled={!lakeA} />
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

          <div style={{ fontSize: 12, opacity: 0.85 }}>Lake B</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <LakeSelect lakes={lakeOptionsForB} value={lakeB} onChange={(e) => { setLakeB(e.target.value); setSelectedYears([]); }} />
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

  </StatsSidebar>
        
        <div style={{ flex: 1, minWidth: 0 }}>

  <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', padding: 8 }}>
  {(lakeA && selectedOrgA && lakeB && selectedOrgB) && availableYears.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ opacity: 0.9 }}>No overlapping years between the selected datasets.</span>
          </div>
        ) : isSelectionIncomplete ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ opacity: 0.9 }}>Select lakes, dataset sources, parameter, and years to view chart.</span>
          </div>
        ) : !compareThrLoading && barData && Array.isArray(barData.datasets) && barData.datasets.length ? (
          (() => {
            const raw = Array.isArray(barData.datasets) ? barData.datasets : [];
            const hasPrimaryData = (() => {
              try {
                for (const d of raw) {
                  if (d && d.type === 'line') continue;
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
            // Enforce legend label format for threshold lines: Min/Max (<Standard Code>: <value> <unit>)
            try {
              const stdCode = bd?.meta?.standards?.[0]?.code || '';
              bd.datasets = (Array.isArray(bd.datasets) ? bd.datasets : []).map((ds) => {
                if (ds && ds.type === 'line') {
                  const isMax = String(ds.label || '').toLowerCase().includes('max');
                  const base = isMax ? 'Max' : 'Min';
                  let val = NaN;
                  try { val = Number(ds?.data?.[0]?.y); } catch {}
                  const valStr = Number.isFinite(val) ? `${val}${unit ? ` ${unit}` : ''}` : `N/A${unit ? ` ${unit}` : ''}`;
                  return { ...ds, label: `${base} (${stdCode}: ${valStr})` };
                }
                return ds;
              });
            } catch {}
            const options = {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  labels: { color: '#fff' },
                },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}${unit ? ` ${unit}` : ''}` } },
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
        ) : compareThrLoading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner inline label="Loading thresholds…" color="#fff" />
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ opacity: 0.9 }}>{loading ? 'Loading…' : 'No data for the current filters.'}</span>
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
