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
import GraphInfoButton from "./ui/GraphInfoButton";
// Multi-lake comparison hook
import useCompareBarDataMulti from "./hooks/useCompareBarDataMulti";
import ParamSelect from './ui/ParamSelect';
import useCurrentStandard from './hooks/useCurrentStandard';
import { fetchParamThresholds } from './hooks/useParamThresholds';
import LakeSelectorCard from './ui/LakeSelectorCard';

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
  // Multi-lake selections (up to 5)
  const [selections, setSelections] = useState([
    { key: 'lk-1', lakeId: '', orgId: '', collapsed: false },
  ]);
  // Events per selection key
  const [eventsByKey, setEventsByKey] = useState({});
  // Stable color assignment per lakeId
  const [colorMap, setColorMap] = useState({}); // lakeId -> color string
  const palette = ['#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#a78bfa'];
  const assignColorIfNeeded = (lakeId) => {
    if (!lakeId) return;
    setColorMap((prev) => {
      if (prev[String(lakeId)]) return prev;
      const used = new Set(Object.values(prev));
      const color = palette.find((c) => !used.has(c)) || palette[0];
      return { ...prev, [String(lakeId)]: color };
    });
  };
  const [selectedParam, setSelectedParam] = useState("");
  // Combined loading state from cards
  const loading = useMemo(() => {
    try {
      return Object.values(eventsByKey).some((v) => v?.loadingFiltered);
    } catch { return false; }
  }, [eventsByKey]);
  const [localParams, setLocalParams] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [depthSelection, setDepthSelection] = useState('0');
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', sections: [] });
  const nameForLake = (lk) => lakeName(lakeOptions, lk);
  const colorizeDatasets = (datasets) => {
    if (!Array.isArray(datasets)) return datasets;
    // map dataset label (lake name) to color from colorMap
    const nameToColor = selections.reduce((acc, s) => {
      const nm = nameForLake(s.lakeId) || String(s.lakeId || '');
      if (nm) acc[nm] = colorMap[String(s.lakeId)] || '#9ca3af';
      return acc;
    }, {});
    return datasets.map((d) => {
      if (d && d.type === 'line') return d; // keep threshold lines as-is
      const label = String(d?.label || '');
      const color = nameToColor[label] || d.borderColor || '#9ca3af';
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

  // helpers for LakeSelectorCard events lifting
  const selectedLakeIds = useMemo(() => selections.map((s) => s.lakeId).filter(Boolean), [selections]);
  const handleCardChange = (key, partial) => {
    setSelections((prev) => prev.map((s) => (s.key === key ? { ...s, ...partial } : s)));
    if (partial.lakeId) assignColorIfNeeded(partial.lakeId);
  };
  const handleEventsUpdate = (key, lakeId, payload) => {
    setEventsByKey((prev) => ({ ...prev, [key]: { lakeId, ...payload } }));
  };
  const addCard = () => {
    setSelections((prev) => {
      if (prev.length >= 5) return prev;
      const nextKey = `lk-${prev.length + 1}-${Date.now()}`;
      return [...prev, { key: nextKey, lakeId: '', orgId: '', collapsed: false }];
    });
  };
  const removeCard = (key) => {
    setSelections((prev) => prev.filter((s) => s.key !== key));
    setEventsByKey((prev) => {
      const cp = { ...prev }; delete cp[key]; return cp;
    });
  };


  const isSelectionIncomplete = useMemo(() => {
    const active = selections.filter((s) => s.lakeId && s.orgId);
    if (active.length === 0) return true;
    if (!selectedParam) return true;
    if (!selectedYears || selectedYears.length === 0) return true;
    return false;
  }, [selections, selectedParam, selectedYears]);

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
    const sets = selections.map((s) => {
      const evAll = eventsByKey[s.key]?.eventsAll || [];
      return toYearSet(evAll);
    });
    const union = new Set();
    sets.forEach((set) => set?.forEach?.((y) => union.add(y)));
    return Array.from(union).sort((a,b)=>b-a);
  }, [selections, eventsByKey]);

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
    selections.forEach((s) => {
      pushDepths(eventsByKey[s.key]?.eventsAll || []);
    });
    const arr = Array.from(depths).sort((a,b)=>Number(a)-Number(b));
    if (!arr.includes('0')) arr.unshift('0');
    return arr;
  }, [selections, eventsByKey, selectedParam]);


  useImperativeHandle(ref, () => ({
    clearAll: () => {
      setSelections([{ key: 'lk-1', lakeId: '', orgId: '', collapsed: false }]);
      setEventsByKey({});
      setColorMap({});
      setSelectedParam('');
      setSelectedYears([]);
      setDepthSelection('0');
      try { setBucket('year'); } catch {}
    }
  }));

  // Build lakes list with events for comparison
  const lakesForCompare = useMemo(() => {
    return selections
      .filter((s) => s.lakeId && s.orgId)
      .map((s) => ({ id: s.lakeId, events: eventsByKey[s.key]?.eventsFiltered || [] }));
  }, [selections, eventsByKey, timeRange, dateFrom, dateTo]);

  const { barData, loadingThresholds: compareThrLoading, lakeHasDataMap } = useCompareBarDataMulti({ lakes: lakesForCompare, bucket, selectedYears, depth: depthSelection, selectedParam, lakeOptions });

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
              lakeLabels: selections.filter(s=>s.lakeId).map((s)=>nameForLake(s.lakeId)),
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
  <StatsSidebar isOpen={sidebarOpen && isModalOpen} width={sidebarWidth} usePortal top={72} side="left" zIndex={10000} onToggle={toggleSidebar}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Lakes selected: {selections.filter(s=>s.lakeId).length} / 5</div>
            <button className="pill-btn" aria-label="Add lake" onClick={addCard} disabled={selections.length >= 5}>
              Add Lake
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {selections.map((s, idx) => (
              <LakeSelectorCard
                key={s.key}
                idx={idx}
                selection={s}
                lakeOptions={lakeOptions}
                selectedLakeIds={selectedLakeIds}
                timeRange={timeRange}
                dateFrom={dateFrom}
                dateTo={dateTo}
                hasData={(() => {
                  const lid = s.lakeId;
                  if (!lid || !s.orgId) return null;
                  const map = barData?.meta?.lakeHasDataMap || lakeHasDataMap || {};
                  return map[String(lid)] ?? null;
                })()}
                onChange={(partial) => {
                  const next = { ...s, ...partial };
                  // if lake changed, clear years (to avoid stale filter)
                  if (partial.lakeId !== undefined) setSelectedYears([]);
                  // update selection
                  handleCardChange(s.key, partial);
                }}
                onRemove={() => removeCard(s.key)}
                onEventsUpdate={(lakeIdArg, orgIdArg, payload) => {
                  // persist lake/org selection (org may be set later than lake)
                  if (lakeIdArg && lakeIdArg !== s.lakeId) handleCardChange(s.key, { lakeId: lakeIdArg });
                  if (orgIdArg && orgIdArg !== s.orgId) handleCardChange(s.key, { orgId: orgIdArg });
                  handleEventsUpdate(s.key, lakeIdArg, payload);
                }}
              />
            ))}
          </div>

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
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Parameter</div>
            <ParamSelect options={paramList} value={selectedParam} onChange={(e) => { setSelectedParam(e.target.value); onParamChange?.(e.target.value); }} placeholder="Select parameter" style={{ width:'100%' }} loading={!Array.isArray(paramList) || paramList.length === 0} />
          </div>


          <div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Depth</div>
            <select
              aria-label="Select depth"
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

  </StatsSidebar>
        
        <div style={{ flex: 1, minWidth: 0 }}>

  <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', padding: 8 }}>
  {isSelectionIncomplete ? (
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
            const lakesKey = selections.map(s=>s.lakeId).filter(Boolean).join('-');
            return <Bar key={`bar-${selectedParam}-${selectedYears.join('-')}-${lakesKey}`} ref={chartRef} data={bd} options={options} />;
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
