import React, { useEffect, useMemo, useState, useRef, useImperativeHandle } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { FiActivity, FiBarChart2 } from "react-icons/fi";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
import { apiPublic, buildQuery } from "../../lib/api";
import { fetchParameters } from "./data/fetchers";
import Popover from "../common/Popover";

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
  const [loading, setLoading] = useState(false);
  const [eventsA, setEventsA] = useState([]);
  const [eventsB, setEventsB] = useState([]);
  const [orgCacheA, setOrgCacheA] = useState([]);
  const [orgCacheB, setOrgCacheB] = useState([]);
  const [stationCacheA, setStationCacheA] = useState({ all: [], byOrg: {} });
  const [stationCacheB, setStationCacheB] = useState({ all: [], byOrg: {} });
  const [localParams, setLocalParams] = useState([]);
  const [applied, setApplied] = useState(false);
  const [viewMode, setViewMode] = useState('time'); // 'time' | 'depth'
  const [seriesMode, setSeriesMode] = useState('avg'); // 'avg' | 'per-station'

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const eventStationName = (ev) => ev?.station?.name || ev?.station_name || ((ev?.latitude != null && ev?.longitude != null) ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : null);

  // Parameters
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

  // Fetch events for each lake (similar to WaterQualityTab)
  useEffect(() => {
    let aborted = false;
    const fmtIso = (d) => { if (!d) return ""; const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };
    const fetchFor = async (lk, orgId) => {
      if (!lk) return [];
      // Always fetch generously and perform relative-range anchoring client-side.
      const lim = 5000;
      let fromEff, toEff;
      if (timeRange === 'custom') { fromEff = dateFrom || undefined; toEff = dateTo || undefined; }
      else { fromEff = undefined; toEff = undefined; }
      const qs = buildQuery({ lake_id: lk, organization_id: orgId || undefined, sampled_from: fromEff, sampled_to: toEff, limit: lim });
      const res = await apiPublic(`/public/sample-events${qs}`);
      return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    };
    (async () => {
      try {
        setLoading(true);
        const [a,b] = await Promise.all([ fetchFor(lakeA, selectedOrgA), fetchFor(lakeB, selectedOrgB) ]);
        if (!aborted) { setEventsA(a); setEventsB(b); }
      } catch { if (!aborted) { setEventsA([]); setEventsB([]); } }
      finally { if (!aborted) setLoading(false); }
    })();
    return () => { aborted = true; };
  }, [lakeA, lakeB, selectedOrgA, selectedOrgB, timeRange, dateFrom, dateTo]);

  // Cache org + stations for A
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!lakeA) { setOrgCacheA([]); setStationCacheA({ all: [], byOrg: {} }); return; }
      try {
        const qs = buildQuery({ lake_id: lakeA, limit: 2000 });
        let res;
        try { res = await apiPublic(`/public/sample-events${qs}`); }
        catch (e) { if (e?.status === 429) { await sleep(600); res = await apiPublic(`/public/sample-events${qs}`); } else throw e; }
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const orgMap = new Map(); const allStations = new Set(); const byOrg = new Map();
        rows.forEach((ev) => {
          const oid = ev.organization_id ?? ev.organization?.id ?? null;
          const oname = ev.organization_name ?? ev.organization?.name ?? null;
          if (oid && oname && !orgMap.has(String(oid))) orgMap.set(String(oid), { id: oid, name: oname });
          const stationName = ev?.station?.name || ev?.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : "");
          const label = stationName || "";
          if (label) {
            allStations.add(label);
            if (oid) { const k = String(oid); if (!byOrg.has(k)) byOrg.set(k, new Set()); byOrg.get(k).add(label); }
          }
        });
        if (!aborted) {
          setOrgCacheA(Array.from(orgMap.values()));
          const byOrgObj = {}; for (const [k,v] of byOrg.entries()) byOrgObj[k] = Array.from(v.values());
          setStationCacheA({ all: Array.from(allStations.values()), byOrg: byOrgObj });
        }
      } catch { if (!aborted) { setOrgCacheA([]); setStationCacheA({ all: [], byOrg: {} }); } }
    })();
    return () => { aborted = true; };
  }, [lakeA]);

  // Cache org + stations for B
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!lakeB) { setOrgCacheB([]); setStationCacheB({ all: [], byOrg: {} }); return; }
      try {
        const qs = buildQuery({ lake_id: lakeB, limit: 2000 });
        let res;
        try { res = await apiPublic(`/public/sample-events${qs}`); }
        catch (e) { if (e?.status === 429) { await sleep(600); res = await apiPublic(`/public/sample-events${qs}`); } else throw e; }
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const orgMap = new Map(); const allStations = new Set(); const byOrg = new Map();
        rows.forEach((ev) => {
          const oid = ev.organization_id ?? ev.organization?.id ?? null;
          const oname = ev.organization_name ?? ev.organization?.name ?? null;
          if (oid && oname && !orgMap.has(String(oid))) orgMap.set(String(oid), { id: oid, name: oname });
          const stationName = ev?.station?.name || ev?.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : "");
          const label = stationName || "";
          if (label) {
            allStations.add(label);
            if (oid) { const k = String(oid); if (!byOrg.has(k)) byOrg.set(k, new Set()); byOrg.get(k).add(label); }
          }
        });
        if (!aborted) {
          setOrgCacheB(Array.from(orgMap.values()));
          const byOrgObj = {}; for (const [k,v] of byOrg.entries()) byOrgObj[k] = Array.from(v.values());
          setStationCacheB({ all: Array.from(allStations.values()), byOrg: byOrgObj });
        }
      } catch { if (!aborted) { setOrgCacheB([]); setStationCacheB({ all: [], byOrg: {} }); } }
    })();
    return () => { aborted = true; };
  }, [lakeB]);

  const orgOptionsA = useMemo(() => orgCacheA, [orgCacheA]);
  const orgOptionsB = useMemo(() => orgCacheB, [orgCacheB]);
  const stationsA = useMemo(() => (!selectedOrgA ? (stationCacheA.all || []) : (stationCacheA.byOrg?.[String(selectedOrgA)] || [])), [selectedOrgA, stationCacheA]);
  const stationsB = useMemo(() => (!selectedOrgB ? (stationCacheB.all || []) : (stationCacheB.byOrg?.[String(selectedOrgB)] || [])), [selectedOrgB, stationCacheB]);

  const isComplete = useMemo(() => {
    const hasLake = Boolean(lakeA || lakeB);
    const hasParam = Boolean(selectedParam);
    const hasStations = (!lakeA || (selectedStationsA && selectedStationsA.length)) && (!lakeB || (selectedStationsB && selectedStationsB.length));
    return hasLake && hasParam && hasStations;
  }, [lakeA, lakeB, selectedParam, selectedStationsA, selectedStationsB]);

  useEffect(() => { setApplied(false); }, [lakeA, lakeB, selectedOrgA, selectedOrgB, selectedStationsA, selectedStationsB, selectedParam, timeRange, dateFrom, dateTo, bucket]);

  const chartData = useMemo(() => {
    const selected = selectedParam;
    const lakesToRender = [lakeA, lakeB].filter(Boolean);
    if (!selected || lakesToRender.length === 0) return null;
    const parseDate = (iso) => { try { return new Date(iso); } catch { return null; } };
    const bucketKey = (d, mode) => {
      if (!d) return null; const y = d.getFullYear(); const m = d.getMonth()+1; const q=Math.floor((m-1)/3)+1;
      if (mode==='year') return `${y}`; if (mode==='quarter') return `${y}-Q${q}`; return `${y}-${String(m).padStart(2,'0')}`;
    };
    const bucketSortKey = (k) => { if (!k) return 0; const m=/^([0-9]{4})(?:-(?:Q([1-4])|([0-9]{2})))?$/.exec(k); if(!m) return 0; const y=Number(m[1]); const q=m[2]?(Number(m[2])*3):0; const mo=m[3]?Number(m[3]):0; return y*12+(q||mo); };
  const lakeMaps = new Map(); const perStationMaps = {}; let thMin=null, thMax=null;
    const process = (lakeId, arr, stationsSel, orgSel) => {
      for (const ev of arr||[]) {
        const oidEv = ev.organization_id ?? ev.organization?.id ?? null;
        if (orgSel && oidEv && String(oidEv) !== String(orgSel)) continue;
        if (stationsSel && stationsSel.length) { const nm = eventStationName(ev) || ''; if (!stationsSel.includes(nm)) continue; }
        const d = parseDate(ev.sampled_at); const bk=bucketKey(d,bucket); if(!bk) continue;
        const results = Array.isArray(ev?.results)?ev.results:[];
        for (const r of results) {
          const p=r?.parameter; if(!p) continue;
          const match=(String(p.code)===String(selected))||(String(p.id)===String(selected))||(String(r.parameter_id)===String(selected));
          if(!match) continue;
          const v=Number(r.value); if(!Number.isFinite(v)) continue;
          const key=String(lakeId); if(!lakeMaps.has(key)) lakeMaps.set(key,new Map());
          const m=lakeMaps.get(key); const agg=m.get(bk)||{sum:0,cnt:0}; agg.sum+=v; agg.cnt+=1; m.set(bk,agg);
          // per-station maps
          try {
            const nm = eventStationName(ev) || '';
            if (!perStationMaps[key]) perStationMaps[key] = new Map();
            const lakeMap = perStationMaps[key];
            const stMap = lakeMap.get(nm) || new Map();
            const aggS = stMap.get(bk) || { sum:0, cnt:0 };
            aggS.sum += v; aggS.cnt += 1; stMap.set(bk, aggS); lakeMap.set(nm, stMap);
          } catch (e) { /* noop */ }
          if (r?.threshold?.min_value != null && thMin == null) thMin = Number(r.threshold.min_value);
          if (r?.threshold?.max_value != null && thMax == null) thMax = Number(r.threshold.max_value);
        }
      }
    };
    // For relative time ranges (e.g., 1y, 5y, 6mo), anchor them to the latest sample date per-lake
    const anchoredFilter = (arr) => {
      if (!arr || !arr.length) return [];
      if (timeRange === 'custom' || timeRange === 'all') return arr;
      // find latest sampled_at in array
      const parseDate = (iso) => { try { return new Date(iso); } catch { return null; } };
      const allDates = arr.map((e) => parseDate(e?.sampled_at)).filter((d) => d && !isNaN(d));
      if (!allDates.length) return [];
      const latest = new Date(Math.max(...allDates));
      const from = new Date(latest);
      if (timeRange === '5y') from.setFullYear(from.getFullYear() - 5);
      else if (timeRange === '3y') from.setFullYear(from.getFullYear() - 3);
      else if (timeRange === '1y') from.setFullYear(from.getFullYear() - 1);
      else if (timeRange === '6mo') from.setMonth(from.getMonth() - 6);
      return arr.filter((e) => {
        const d = parseDate(e?.sampled_at);
        return d && d >= from && d <= latest;
      });
    };

    const eventsAFiltered = anchoredFilter(eventsA);
    const eventsBFiltered = anchoredFilter(eventsB);

    process(lakeA, eventsAFiltered, selectedStationsA, selectedOrgA);
    process(lakeB, eventsBFiltered, selectedStationsB, selectedOrgB);
    const labelSet=new Set(); for(const m of lakeMaps.values()) for(const k of m.keys()) labelSet.add(k);
    const labels=Array.from(labelSet).sort((a,b)=>bucketSortKey(a)-bucketSortKey(b));
    const datasets=[]; lakesToRender.forEach((lk,i)=>{
      if (seriesMode === 'per-station') {
        const lakeKey = String(lk);
        const lakeStationMap = perStationMaps[lakeKey] || new Map();
        let si = 0;
        for (const [stationName, map] of lakeStationMap.entries()) {
          const data = labels.map((lb)=>{ const agg=map.get(lb); return agg&&agg.cnt?(agg.sum/agg.cnt):null; });
          datasets.push({ label: `${lakeOptions.find((x)=>String(x.id)===String(lk))?.name || String(lk)} — ${stationName}`, data, borderColor: `hsl(${(si*50)%360} 80% 60%)`, backgroundColor: 'transparent', pointRadius:2, pointHoverRadius:4, tension:0.15, spanGaps: true });
          si++;
        }
      } else {
        const seriesMap = lakeMaps.get(String(lk)) || new Map();
        const data = labels.map((lb)=>{ const agg=seriesMap.get(lb); return agg&&agg.cnt?(agg.sum/agg.cnt):null; });
        datasets.push({ label: lakeOptions.find((x)=>String(x.id)===String(lk))?.name || String(lk), data, borderColor: i===0?'rgba(59,130,246,1)':`hsl(${(i*70)%360} 80% 60%)`, backgroundColor: i===0?'rgba(59,130,246,0.2)':`hsl(${(i*70)%360} 80% 60% / 0.2)`, pointRadius:3, pointHoverRadius:4, tension:0.2, spanGaps: true });
      }
    });
    if (thMin != null) datasets.push({ label:'Min Threshold', data: labels.map(()=>thMin), borderColor:'rgba(16,185,129,1)', backgroundColor:'rgba(16,185,129,0.15)', borderDash:[4,4], pointRadius:0, tension:0 });
    if (thMax != null) datasets.push({ label:'Max Threshold', data: labels.map(()=>thMax), borderColor:'rgba(239,68,68,1)', backgroundColor:'rgba(239,68,68,0.15)', borderDash:[4,4], pointRadius:0, tension:0 });
    return { labels, datasets };
  }, [eventsA, eventsB, lakeA, lakeB, selectedStationsA, selectedStationsB, selectedOrgA, selectedOrgB, selectedParam, bucket, lakeOptions, seriesMode]);

  // Expose imperative clearAll to parent
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
      setEventsA([]);
      setEventsB([]);
    }
  }));

  const compareChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}` } } },
    scales: { x: { ticks: { color: '#fff', maxRotation: 0, autoSkip: true, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } }, y: { ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } } },
  }), []);

  // Build depth profile datasets for the selected param per lake
  const depthProfile = useMemo(() => {
    if (!selectedParam) return { datasets: [], maxDepth: 0, unit: '' };
    const parseDate = (iso) => { try { return new Date(iso); } catch { return null; } };
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const groupLabel = (d) => {
      if (!d) return null;
      if (bucket === 'year') return String(d.getFullYear());
      if (bucket === 'quarter') return `Q${Math.floor(d.getMonth() / 3) + 1}`;
      return monthNames[d.getMonth()];
    };
    const depthKey = (raw) => { const n = Number(raw); if (!Number.isFinite(n)) return null; return (Math.round(n * 2) / 2).toFixed(1); };
    const colorFor = (idx) => `hsl(${(idx * 60) % 360} 80% 55%)`;

    const unitRef = { current: '' };
    // Build groups for lake A and B and tag labels accordingly
    const buildGroups = (arr, stationsSel) => {
      const groups = new Map(); // label -> Map(depthKey -> {sum,cnt})
      for (const ev of arr || []) {
        const sName = eventStationName(ev) || '';
        if (stationsSel && stationsSel.length && !stationsSel.includes(sName)) continue;
        const d = parseDate(ev.sampled_at); const gl = groupLabel(d); if (!gl) continue;
        const results = Array.isArray(ev?.results) ? ev.results : [];
        for (const r of results) {
          const p = r?.parameter; if (!p) continue;
          const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
          if (!match || r?.value == null || r?.depth_m == null) continue;
          if (!unitRef.current) unitRef.current = p.unit || '';
          if (!groups.has(gl)) groups.set(gl, new Map());
          const depths = groups.get(gl);
          const dk = depthKey(r.depth_m); if (!dk) continue;
          const v = Number(r.value); if (!Number.isFinite(v)) continue;
          const agg = depths.get(dk) || { sum: 0, cnt: 0 };
          agg.sum += v; agg.cnt += 1; depths.set(dk, agg);
        }
      }
      return groups;
    };
    const groupsA = buildGroups(eventsA, selectedStationsA);
    const groupsB = buildGroups(eventsB, selectedStationsB);

    const datasets = [];
    let maxDepth = 0; let i = 0;
    const monthNamesOrder = monthNames;
    const orderFor = (groups) => (
      bucket === 'month' ? monthNamesOrder.filter((m) => groups.has(m))
      : bucket === 'quarter' ? ['Q1','Q2','Q3','Q4'].filter((q) => groups.has(q))
      : Array.from(groups.keys()).sort((a,b) => Number(a) - Number(b))
    );
    const pushDatasets = (groups, lakeLabel) => {
      const ordered = orderFor(groups);
      ordered.forEach((gl) => {
        const depths = groups.get(gl);
        const points = Array.from(depths.entries()).map(([dk, agg]) => ({ y: Number(dk), x: agg.sum / agg.cnt })).sort((a,b) => a.y - b.y);
        if (!points.length) return;
        maxDepth = Math.max(maxDepth, points[points.length - 1].y || 0);
        datasets.push({ label: `${lakeLabel} – ${gl}`, data: points, parsing: false, showLine: true, borderColor: colorFor(i++), backgroundColor: 'transparent', pointRadius: 3, pointHoverRadius: 4, tension: 0.1 });
      });
    };
    const nameForLake = (lk) => lakeOptions.find((x)=>String(x.id)===String(lk))?.name || String(lk || '') || '';
    if (lakeA) pushDatasets(groupsA, nameForLake(lakeA));
    if (lakeB) pushDatasets(groupsB, nameForLake(lakeB));

    return { datasets, maxDepth, unit: unitRef.current || '' };
  }, [eventsA, eventsB, selectedParam, JSON.stringify(selectedStationsA), JSON.stringify(selectedStationsB), bucket, lakeOptions, lakeA, lakeB]);

  return (
    <div className="insight-card">
      <h4>Compare Lakes</h4>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch', minWidth: 0 }}>
          <select className="pill-btn" value={lakeA} onChange={(e) => { setLakeA(e.target.value); setSelectedOrgA(""); setSelectedStationsA([]); setSelectedParam(""); }} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">Lake A</option>
            {lakeOptions.map((l) => (<option key={l.id} value={String(l.id)}>{l.name}</option>))}
          </select>
          <select className="pill-btn" value={selectedOrgA} onChange={(e) => { setSelectedOrgA(e.target.value); setSelectedStationsA([]); setSelectedParam(""); }} disabled={!lakeA} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">All orgs</option>
            {orgOptionsA.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
          </select>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button ref={stationBtnARef} type="button" className="pill-btn" disabled={!lakeA} onClick={() => {
              if (!stationsOpenA) {
                const r = stationBtnARef.current?.getBoundingClientRect();
                /* position not used; kept for future */
              }
              setStationsOpenA((v) => !v);
            }} aria-label="Select locations for Lake A" title="Select locations" style={{ minWidth: 140 }}>
              {selectedStationsA.length ? `${selectedStationsA.length} selected` : 'Select locations'}
            </button>
            <Popover anchorRef={stationBtnARef} open={stationsOpenA} onClose={() => setStationsOpenA(false)} minWidth={220}>
              {stationsA.length ? (
                stationsA.map((s) => {
                  const checked = selectedStationsA.includes(s);
                  return (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = checked ? selectedStationsA.filter((x)=>x!==s) : [...selectedStationsA, s];
                        setSelectedStationsA(next); setSelectedParam("");
                      }} />
                      <span>{s}</span>
                    </label>
                  );
                })
              ) : (<div style={{ opacity: 0.8 }}>No locations…</div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <button type="button" className="pill-btn" onClick={() => setSelectedStationsA(stationsA.slice())}>Select All</button>
                <button type="button" className="pill-btn" onClick={() => setSelectedStationsA([])}>Clear</button>
                <button type="button" className="pill-btn liquid" onClick={() => setStationsOpenA(false)}>Done</button>
              </div>
            </Popover>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch', minWidth: 0, marginTop: 6 }}>
          <select className="pill-btn" value={lakeB} onChange={(e) => { setLakeB(e.target.value); setSelectedOrgB(""); setSelectedStationsB([]); setSelectedParam(""); }} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">Lake B</option>
            {lakeOptions.map((l) => (<option key={l.id} value={String(l.id)}>{l.name}</option>))}
          </select>
          <select className="pill-btn" value={selectedOrgB} onChange={(e) => { setSelectedOrgB(e.target.value); setSelectedStationsB([]); setSelectedParam(""); }} disabled={!lakeB} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">All orgs</option>
            {orgOptionsB.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
          </select>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button ref={stationBtnBRef} type="button" className="pill-btn" disabled={!lakeB} onClick={() => {
              if (!stationsOpenB) {
                const r = stationBtnBRef.current?.getBoundingClientRect();
                /* position not used; kept for future */
              }
              setStationsOpenB((v) => !v);
            }} aria-label="Select locations for Lake B" title="Select locations" style={{ minWidth: 140 }}>
              {selectedStationsB.length ? `${selectedStationsB.length} selected` : 'Select locations'}
            </button>
            <Popover anchorRef={stationBtnBRef} open={stationsOpenB} onClose={() => setStationsOpenB(false)} minWidth={220}>
              {stationsB.length ? (
                stationsB.map((s) => {
                  const checked = selectedStationsB.includes(s);
                  return (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked} onChange={() => { const next = checked ? selectedStationsB.filter((x)=>x!==s) : [...selectedStationsB, s]; setSelectedStationsB(next); setSelectedParam(""); }} />
                      <span>{s}</span>
                    </label>
                  );
                })
              ) : (<div style={{ opacity: 0.8 }}>No locations…</div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <button type="button" className="pill-btn" onClick={() => setSelectedStationsB(stationsB.slice())}>Select All</button>
                <button type="button" className="pill-btn" onClick={() => setSelectedStationsB([])}>Clear</button>
                <button type="button" className="pill-btn liquid" onClick={() => setStationsOpenB(false)}>Done</button>
              </div>
            </Popover>
          </div>

          <select className="pill-btn" value={selectedParam} onChange={(e) => { setSelectedParam(e.target.value); onParamChange?.(e.target.value); }} disabled={!paramList?.length || (!lakeA && !lakeB)} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">Select parameter</option>
            {paramList.map((p) => (<option key={p.key || p.id || p.code} value={p.key || p.id || p.code}>{p.label || p.name || p.code}</option>))}
          </select>
          <div style={{ marginLeft: 'auto', flex: '0 0 auto' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ display:'inline-flex', gap:6 }} role="tablist" aria-label="Series mode">
                <button type="button" aria-pressed={seriesMode==='avg'} title="Show aggregated average series" className={`pill-btn ${seriesMode==='avg' ? 'active liquid' : ''}`} onClick={() => setSeriesMode('avg')} style={{ padding:'6px 8px' }}>Average</button>
                <button type="button" aria-pressed={seriesMode==='per-station'} title="Show one line per selected station" className={`pill-btn ${seriesMode==='per-station' ? 'active liquid' : ''}`} onClick={() => setSeriesMode('per-station')} style={{ padding:'6px 8px' }}>Per-station</button>
              </div>
              <button type="button" className="pill-btn liquid" disabled={!isComplete} onClick={() => setApplied(true)} style={{ minWidth: 96 }}>Apply</button>
            </div>
          </div>
        </div>
      </div>

      <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', padding: 8 }}>
        {applied ? (
          viewMode === 'depth' ? (
            depthProfile && depthProfile.datasets && depthProfile.datasets.length ? (
              <Line
                ref={chartRef}
                data={{ datasets: depthProfile.datasets }}
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
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ opacity: 0.9 }}>No depth data available for this selection.</span>
              </div>
            )
          ) : (
            chartData && chartData.datasets && chartData.datasets.length ? (
              <Line ref={chartRef} data={chartData} options={compareChartOptions} />
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
    </div>
  );
}

export default React.forwardRef(CompareLake);
