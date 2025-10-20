import React, { useEffect, useMemo, useState, useRef, useImperativeHandle } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { FiActivity, FiBarChart2 } from "react-icons/fi";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
import { fetchParameters } from "./data/fetchers";
import InfoModal from "../common/InfoModal";
import { buildGraphExplanation } from "../utils/graphExplain";
import { eventStationName } from "./utils/dataUtils";
import { lakeName, lakeClass, baseLineChartOptions, normalizeDepthDatasets } from "./utils/shared";
import useAnchoredTimeRange from "./hooks/useAnchoredTimeRange";
import useStationsCache from "./hooks/useStationsCache";
import StationPicker from "./ui/StationPicker";
import { SeriesModeToggle, SummaryPanel } from "./ui/Toggles";
import GraphInfoButton from "./ui/GraphInfoButton";
import useSummaryStats from "./hooks/useSummaryStats";
import useSampleEvents from "./hooks/useSampleEvents";
import useCompareTimeSeriesData from "./hooks/useCompareTimeSeriesData";
import useCompareDepthProfileData from "./hooks/useCompareDepthProfileData";

function CompareLake({
  lakeOptions = [],
  params = [],
  thresholds = {},
  chartOptions = {},
  bucket = "month",
  chartRef,
  timeRange = "all",
  dateFrom = "",
  dateTo = "",
  onParamChange = () => {},
}, ref) {
  const [lakeA, setLakeA] = useState("");
  const [lakeB, setLakeB] = useState("");
  const [selectedOrgA, setSelectedOrgA] = useState("");
  const [selectedOrgB, setSelectedOrgB] = useState("");
  const [selectedStationsA, setSelectedStationsA] = useState([]);
  const [selectedStationsB, setSelectedStationsB] = useState([]);
  const [selectedParam, setSelectedParam] = useState("");
  const [stationsOpenA, setStationsOpenA] = useState(false);
  const [stationsOpenB, setStationsOpenB] = useState(false);
  const stationBtnARef = useRef(null);
  const stationBtnBRef = useRef(null);
  const { events: eventsA, loading: loadingA } = useSampleEvents(lakeA, selectedOrgA, timeRange, dateFrom, dateTo);
  const { events: eventsB, loading: loadingB } = useSampleEvents(lakeB, selectedOrgB, timeRange, dateFrom, dateTo);
  const loading = loadingA || loadingB;
  const [localParams, setLocalParams] = useState([]);
  const [applied, setApplied] = useState(false);
  const summaryA = useSummaryStats({ applied, events: eventsA, selectedStations: selectedStationsA, selectedParam });
  const summaryB = useSummaryStats({ applied, events: eventsB, selectedStations: selectedStationsB, selectedParam });
  const [viewMode, setViewMode] = useState('time'); // 'time' | 'depth'
  const [seriesMode, setSeriesMode] = useState('avg'); // 'avg' | 'per-station'
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', sections: [] });

  const nameForLake = (lk) => lakeName(lakeOptions, lk);
  const classForLake = (lk) => lakeClass(lakeOptions, lk);

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

  const { orgOptions: orgOptionsA, stationsByOrg: stationsByOrgA, allStations: allStationsA } = useStationsCache(lakeA);
  const { orgOptions: orgOptionsB, stationsByOrg: stationsByOrgB, allStations: allStationsB } = useStationsCache(lakeB);
  const stationsA = useMemo(() => (!selectedOrgA ? (allStationsA || []) : (stationsByOrgA?.[String(selectedOrgA)] || [])), [selectedOrgA, allStationsA, stationsByOrgA]);
  const stationsB = useMemo(() => (!selectedOrgB ? (allStationsB || []) : (stationsByOrgB?.[String(selectedOrgB)] || [])), [selectedOrgB, allStationsB, stationsByOrgB]);

  // Prevent same-lake vs same-lake by filtering the opposite dropdown
  const lakeOptionsForA = useMemo(() => lakeOptions.filter(l => String(l.id) !== String(lakeB)), [lakeOptions, lakeB]);
  const lakeOptionsForB = useMemo(() => lakeOptions.filter(l => String(l.id) !== String(lakeA)), [lakeOptions, lakeA]);
  // Defensive: if both end up equal somehow, clear Lake B
  useEffect(() => {
    if (lakeA && lakeB && String(lakeA) === String(lakeB)) {
      setLakeB('');
    }
  }, [lakeA, lakeB]);

  const isComplete = useMemo(() => {
    const hasLake = Boolean(lakeA || lakeB);
    const hasParam = Boolean(selectedParam);
    const hasStations = (!lakeA || (selectedStationsA && selectedStationsA.length)) && (!lakeB || (selectedStationsB && selectedStationsB.length));
    return hasLake && hasParam && hasStations;
  }, [lakeA, lakeB, selectedParam, selectedStationsA, selectedStationsB]);

  const canChooseParam = useMemo(() => {
    const lakes = [ { lake: lakeA, org: selectedOrgA, stations: selectedStationsA }, { lake: lakeB, org: selectedOrgB, stations: selectedStationsB } ];
    if (!lakes.some(l => l.lake)) return false;
    for (const l of lakes) {
      if (!l.lake) continue; // lake not selected -> skip
      if (!l.org) return false; // dataset source required
      if (!Array.isArray(l.stations) || l.stations.length === 0) return false; // at least one location required
    }
    return true;
  }, [lakeA, lakeB, selectedOrgA, selectedOrgB, selectedStationsA, selectedStationsB]);

  const computeMissingFields = () => {
    const missing = [];
    if (!lakeA && !lakeB) { missing.push('Select at least one lake (Lake A or Lake B)'); return missing; }
    const check = (label, lake, org, stations) => {
      if (!lake) return;
      if (!org) missing.push(`${label}: Dataset source`);
      if (!stations || stations.length === 0) missing.push(`${label}: Locations`);
    };
    check('Lake A', lakeA, selectedOrgA, selectedStationsA);
    check('Lake B', lakeB, selectedOrgB, selectedStationsB);
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
        if (/locations?/i.test(tok)) return 'at least one location';
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

  useEffect(() => { setApplied(false); }, [lakeA, lakeB, selectedOrgA, selectedOrgB, selectedStationsA, selectedStationsB, selectedParam, timeRange, dateFrom, dateTo, bucket]);


  const eventsAFiltered = useAnchoredTimeRange(eventsA, timeRange, dateFrom, dateTo);
  const eventsBFiltered = useAnchoredTimeRange(eventsB, timeRange, dateFrom, dateTo);

  const chartData = useCompareTimeSeriesData({
    eventsA: eventsAFiltered,
    eventsB: eventsBFiltered,
    lakeA,
    lakeB,
    selectedParam,
    selectedStationsA,
    selectedStationsB,
    selectedOrgA,
    selectedOrgB,
    bucket,
    lakeOptions,
    seriesMode,
  });

  useImperativeHandle(ref, () => ({
    clearAll: () => {
      setLakeA('');
      setLakeB('');
      setSelectedOrgA('');
      setSelectedOrgB('');
      setSelectedStationsA([]);
      setSelectedStationsB([]);
      setSelectedParam('');
      setApplied(false);
    }
  }));

  const compareChartOptions = useMemo(() => baseLineChartOptions(), []);

  const depthProfile = useCompareDepthProfileData({
    eventsA: eventsAFiltered,
    eventsB: eventsBFiltered,
    lakeA,
    lakeB,
    selectedParam,
    selectedStationsA,
    selectedStationsB,
    selectedOrgA,
    selectedOrgB,
    bucket,
    lakeOptions,
  });

  const canShowInfo = useMemo(() => {
    if (!applied) return false;
    if (viewMode === 'time') {
      try { return Boolean(chartData && Array.isArray(chartData.datasets) && chartData.datasets.length); } catch { return false; }
    }
    try { return Boolean(depthProfile && Array.isArray(depthProfile.datasets) && depthProfile.datasets.length); } catch { return false; }
  }, [applied, viewMode, chartData, depthProfile]);

  return (
    <div className="insight-card" style={{ backgroundColor: '#0f172a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h4 style={{ margin: 0 }}>Compare Lakes</h4>
        <GraphInfoButton
          disabled={!canShowInfo}
          onClick={() => {
            const ds = chartData?.datasets || [];
            const stdMap = new Map();
            ds.forEach((d) => {
              const label = d?.label || '';
              const parts = String(label).split(' – ');
              if (parts.length === 3) {
                const std = parts[1];
                const kind = parts[2];
                if (/^Min$/i.test(kind) || /^Max$/i.test(kind)) {
                  const rec = stdMap.get(std) || { code: std, min: null, max: null };
                  if (/^Min$/i.test(kind)) rec.min = 1;
                  if (/^Max$/i.test(kind)) rec.max = 1;
                  stdMap.set(std, rec);
                }
              }
            });
            const standards = Array.from(stdMap.values());
            const hasMin = standards.some(s => s.min != null);
            const hasMax = standards.some(s => s.max != null);
            const inferred = hasMin && hasMax ? 'range' : hasMin ? 'min' : hasMax ? 'max' : null;
            const pMeta = (() => {
              const sel = String(selectedParam || '');
              const opt = (paramList || []).find(p => String(p.key || p.id || p.code) === sel);
              return { code: opt?.code || sel, name: opt?.label || opt?.name || opt?.code || sel, unit: opt?.unit || '' };
            })();
            const nameForLake = (lk) => lakeOptions.find((x)=>String(x.id)===String(lk))?.name || String(lk || '') || '';
            const ctx = {
              chartType: viewMode === 'depth' ? 'depth' : 'time',
              param: pMeta,
              seriesMode,
              bucket,
              standards,
              compareMode: true,
              lakeLabels: { a: nameForLake(lakeA) || 'Lake A', b: nameForLake(lakeB) || 'Lake B' },
              summary: { n: (summaryA.n || 0) + (summaryB.n || 0), mean: NaN, median: NaN },
              inferredType: inferred,
            };
            const content = buildGraphExplanation(ctx);
            const fmt = (v) => (Number.isFinite(v) ? v.toFixed(2) : 'N/A');
            const bullets = [];
            if (lakeA) bullets.push(`${(nameForLake(lakeA) || 'Lake A')}: Samples ${summaryA.n || 0} · Mean ${fmt(summaryA.mean)} · Median ${fmt(summaryA.median)}`);
            if (lakeB) bullets.push(`${(nameForLake(lakeB) || 'Lake B')}: Samples ${summaryB.n || 0} · Mean ${fmt(summaryB.mean)} · Median ${fmt(summaryB.median)}`);
            if (bullets.length) content.sections.push({ heading: 'Per-lake summary', bullets });
            setInfoContent(content);
            setInfoOpen(true);
          }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch', minWidth: 0 }}>
          <select className="pill-btn" value={lakeA} onChange={(e) => { setLakeA(e.target.value); setSelectedOrgA(""); setSelectedStationsA([]); setSelectedParam(""); }} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">Lake A</option>
            {lakeOptionsForA.map((l) => (<option key={l.id} value={String(l.id)}>{l.name}</option>))}
          </select>
          <select className="pill-btn" value={selectedOrgA} onChange={(e) => { setSelectedOrgA(e.target.value); setSelectedStationsA([]); setSelectedParam("" ); }} disabled={!lakeA} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">All dataset sources</option>
            {orgOptionsA.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
          </select>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button ref={stationBtnARef} type="button" className="pill-btn" disabled={!lakeA || !selectedOrgA} onClick={() => setStationsOpenA((v) => !v)} aria-label="Select locations for Lake A" title="Select locations" style={{ minWidth: 140 }}>
              {selectedStationsA.length ? `${selectedStationsA.length} selected` : 'Select locations'}
            </button>
            <StationPicker anchorRef={stationBtnARef} open={stationsOpenA} onClose={() => setStationsOpenA(false)} stations={stationsA} value={selectedStationsA} onChange={(next) => { setSelectedStationsA(next); setSelectedParam(""); }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch', minWidth: 0, marginTop: 6 }}>
          <select className="pill-btn" value={lakeB} onChange={(e) => { setLakeB(e.target.value); setSelectedOrgB(""); setSelectedStationsB([]); setSelectedParam(""); }} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">Lake B</option>
            {lakeOptionsForB.map((l) => (<option key={l.id} value={String(l.id)}>{l.name}</option>))}
          </select>
          <select className="pill-btn" value={selectedOrgB} onChange={(e) => { setSelectedOrgB(e.target.value); setSelectedStationsB([]); setSelectedParam(""); }} disabled={!lakeB} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">All dataset sources</option>
            {orgOptionsB.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
          </select>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button ref={stationBtnBRef} type="button" className="pill-btn" disabled={!lakeB || !selectedOrgB} onClick={() => setStationsOpenB((v) => !v)} aria-label="Select locations for Lake B" title="Select locations" style={{ minWidth: 140 }}>
              {selectedStationsB.length ? `${selectedStationsB.length} selected` : 'Select locations'}
            </button>
            <StationPicker anchorRef={stationBtnBRef} open={stationsOpenB} onClose={() => setStationsOpenB(false)} stations={stationsB} value={selectedStationsB} onChange={(next) => { setSelectedStationsB(next); setSelectedParam(""); }} />
          </div>

          <select className="pill-btn" value={selectedParam} onChange={(e) => { setSelectedParam(e.target.value); onParamChange?.(e.target.value); }} disabled={!paramList?.length || !canChooseParam} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">Select parameter</option>
            {paramList.map((p) => (<option key={p.key || p.id || p.code} value={p.key || p.id || p.code}>{p.label || p.name || p.code}</option>))}
          </select>
          <div style={{ marginLeft: 'auto', flex: '0 0 auto' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <SeriesModeToggle mode={seriesMode} onChange={setSeriesMode} />
              <button type="button" className="pill-btn liquid" onClick={handleApply} style={{ minWidth: 96 }}>Apply</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
        <SummaryPanel title={lakeOptions.find((x)=>String(x.id)===String(lakeA))?.name || (lakeA ? String(lakeA) : 'Lake A')} n={summaryA.n} mean={summaryA.mean} median={summaryA.median} />
        <SummaryPanel title={lakeOptions.find((x)=>String(x.id)===String(lakeB))?.name || (lakeB ? String(lakeB) : 'Lake B')} n={summaryB.n} mean={summaryB.mean} median={summaryB.median} />
      </div>

  <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', padding: 8 }}>
        {applied ? (
          viewMode === 'depth' ? (
            depthProfile && depthProfile.hasDepthA && depthProfile.hasDepthB && depthProfile.datasets && depthProfile.datasets.length ? (
              (() => {
                const depthDatasets = (depthProfile.datasets || []).slice();
                const maxDepth = depthProfile.maxDepth || 0;
                const thByLakeAndStandard = new Map(); 
                const ensureStdEntry = (lkKey, stdKey, stdLabel) => {
                  if (!thByLakeAndStandard.has(lkKey)) thByLakeAndStandard.set(lkKey, new Map());
                  const inner = thByLakeAndStandard.get(lkKey);
                  if (!inner.has(stdKey)) inner.set(stdKey, { stdLabel: stdLabel || `Standard ${stdKey}`, min: null, max: null });
                  return inner.get(stdKey);
                };
                try {
                  for (const ev of eventsA || []) {
                    const oidEv = ev.organization_id ?? ev.organization?.id ?? null;
                    if (selectedOrgA && oidEv && String(oidEv) !== String(selectedOrgA)) continue;
                    const sName = eventStationName(ev) || '';
                    if (selectedStationsA && selectedStationsA.length && !selectedStationsA.includes(sName)) continue;
                    const results = Array.isArray(ev?.results) ? ev.results : [];
                    for (const r of results) {
                      const p = r?.parameter; if (!p) continue;
                      const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
                      if (!match) continue;
                      const stdId = r?.threshold?.standard_id ?? ev?.applied_standard_id ?? null;
                      const stdKey = r?.threshold?.standard?.code || r?.threshold?.standard?.name || (stdId != null ? String(stdId) : null);
                      const stdLabel = stdKey;
                      if (stdKey != null && (r?.threshold?.min_value != null || r?.threshold?.max_value != null)) {
                        const entry = ensureStdEntry(String(lakeA), String(stdKey), stdLabel);
                        if (r?.threshold?.min_value != null) entry.min = Number(r.threshold.min_value);
                        if (r?.threshold?.max_value != null) entry.max = Number(r.threshold.max_value);
                      }
                    }
                  }
                  for (const ev of eventsB || []) {
                    const oidEv = ev.organization_id ?? ev.organization?.id ?? null;
                    if (selectedOrgB && oidEv && String(oidEv) !== String(selectedOrgB)) continue;
                    const sName = eventStationName(ev) || '';
                    if (selectedStationsB && selectedStationsB.length && !selectedStationsB.includes(sName)) continue;
                    const results = Array.isArray(ev?.results) ? ev.results : [];
                    for (const r of results) {
                      const p = r?.parameter; if (!p) continue;
                      const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
                      if (!match) continue;
                      const stdId = r?.threshold?.standard_id ?? ev?.applied_standard_id ?? null;
                      const stdKey = r?.threshold?.standard?.code || r?.threshold?.standard?.name || (stdId != null ? String(stdId) : null);
                      const stdLabel = stdKey;
                      if (stdKey != null && (r?.threshold?.min_value != null || r?.threshold?.max_value != null)) {
                        const entry = ensureStdEntry(String(lakeB), String(stdKey), stdLabel);
                        if (r?.threshold?.min_value != null) entry.min = Number(r.threshold.min_value);
                        if (r?.threshold?.max_value != null) entry.max = Number(r.threshold.max_value);
                      }
                    }
                  }
                } catch (e) { /* ignore */ }

                const combinedStandards = new Map(); 
                [lakeA, lakeB].filter(Boolean).forEach((lk) => {
                  const lkKey = String(lk);
                  const inner = thByLakeAndStandard.get(lkKey);
                  if (!inner) return;
                  inner.forEach((entry, stdKey) => {
                    const minVal = entry.min != null ? Number(entry.min) : null;
                    const maxVal = entry.max != null ? Number(entry.max) : null;
                    const uniqueKey = `${stdKey}::${minVal ?? 'null'}::${maxVal ?? 'null'}`;
                    if (!combinedStandards.has(uniqueKey)) combinedStandards.set(uniqueKey, { stdLabel: entry.stdLabel, min: minVal, max: maxVal, lakes: new Set([lkKey]) });
                    else combinedStandards.get(uniqueKey).lakes.add(lkKey);
                  });
                });

                const minColorUnified = '#16a34a';
                const maxColorUnified = '#ef4444';
                const lakeMinColors = ['#16a34a', '#f59e0b'];
                const lakeMaxColors = ['#ef4444', '#f97316'];

                combinedStandards.forEach((entry) => {
                  if (entry.lakes.size > 1) {
                    const lakesMeta = Array.from(entry.lakes).map((lkKey) => {
                      const nm = nameForLake(lkKey);
                      const cls = classForLake(lkKey);
                      return `${nm}${cls ? `: Class ${cls}` : ''}`;
                    }).join(', ');
                    if (entry.min != null) {
                      depthDatasets.push({ label: `${entry.stdLabel} – Min (${lakesMeta})`, data: [{ x: entry.min, y: 0 }, { x: entry.min, y: Math.max(1, maxDepth) }], borderColor: minColorUnified, backgroundColor: `${minColorUnified}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true, showLine: true, parsing: false });
                    }
                    if (entry.max != null) {
                      depthDatasets.push({ label: `${entry.stdLabel} – Max (${lakesMeta})`, data: [{ x: entry.max, y: 0 }, { x: entry.max, y: Math.max(1, maxDepth) }], borderColor: maxColorUnified, backgroundColor: `${maxColorUnified}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true, showLine: true, parsing: false });
                    }
                  } else {
                    const onlyLakeKey = Array.from(entry.lakes)[0];
                    const li = [lakeA, lakeB].findIndex((lk) => String(lk) === onlyLakeKey);
                    const minColor = lakeMinColors[li % lakeMinColors.length];
                    const maxColor = lakeMaxColors[li % lakeMaxColors.length];
                    const lakeLabel = lakeOptions.find((x)=>String(x.id)===onlyLakeKey)?.name || onlyLakeKey;
                    const cls = classForLake(onlyLakeKey);
                    if (entry.min != null) {
                      depthDatasets.push({ label: `${lakeLabel}${cls ? ` – Class ${cls}` : ''} – ${entry.stdLabel} – Min`, data: [{ x: entry.min, y: 0 }, { x: entry.min, y: Math.max(1, maxDepth) }], borderColor: minColor, backgroundColor: `${minColor}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true, showLine: true, parsing: false });
                    }
                    if (entry.max != null) {
                      depthDatasets.push({ label: `${lakeLabel}${cls ? ` – Class ${cls}` : ''} – ${entry.stdLabel} – Max`, data: [{ x: entry.max, y: 0 }, { x: entry.max, y: Math.max(1, maxDepth) }], borderColor: maxColor, backgroundColor: `${maxColor}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true, showLine: true, parsing: false });
                    }
                  }
                });

                const depthData = { datasets: normalizeDepthDatasets(depthDatasets) };
                return (
                  <Line
                    key={`depth-${selectedParam}-${lakeA}-${lakeB}-${seriesMode}`}
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
                const labelA = nameForLake(lakeA) || 'Lake A';
                const labelB = nameForLake(lakeB) || 'Lake B';
                const hasA = depthProfile?.hasDepthA; const hasB = depthProfile?.hasDepthB;
                let msg = 'Depth profile requires multiple depths; only surface (0 m) measurements were found for this selection.';
                if (hasA === false && hasB === false) {
                  msg = `Only surface (0 m) measurements are available for ${labelA} and ${labelB} for this parameter. A depth profile requires multiple depths.`;
                } else if (hasA === false) {
                  msg = `${labelA} only has surface (0 m) measurements for this parameter. A depth profile requires multiple depths.`;
                } else if (hasB === false) {
                  msg = `${labelB} only has surface (0 m) measurements for this parameter. A depth profile requires multiple depths.`;
                }
                return (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ opacity: 0.9 }}>{msg}</span>
                  </div>
                );
              })()
            )
          ) : (
            chartData && chartData.datasets && chartData.datasets.length ? (
              <Line key={`time-${selectedParam}-${lakeA}-${lakeB}-${seriesMode}`} ref={chartRef} data={chartData} options={compareChartOptions} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ opacity: 0.9 }}>{loading ? 'Loading…' : 'Fill all fields and click Apply to generate the chart.'}</span>
              </div>
            )
          )
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ opacity: 0.9 }}>{loading ? 'Loading…' : 'Fill all fields and click Apply to generate the chart.'}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <button
          type="button"
          className="pill-btn"
          disabled={!applied}
          onClick={() => setViewMode((m) => (m === 'time' ? 'depth' : 'time'))}
          title={viewMode === 'time' ? 'Show depth profile' : 'Show time series'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {viewMode === 'time' ? <FiActivity size={14} /> : <FiBarChart2 size={14} />}
          {viewMode === 'time' ? 'Depth profile' : 'Time series'}
        </button>
      </div>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title={infoContent.title} sections={infoContent.sections} />
    </div>
  );
}

export default React.forwardRef(CompareLake);
