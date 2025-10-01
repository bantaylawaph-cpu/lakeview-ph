import React, { useEffect, useMemo, useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import { apiPublic, buildQuery } from "../../lib/api";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { FiActivity, FiBarChart2 } from "react-icons/fi";
import Popover from "../common/Popover";

// Ensure chart types/scales are registered for time-series and depth (linear) axes
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function SingleLake({
  lakeOptions,
  selectedLake,
  onLakeChange,
  orgOptions,
  selectedOrg,
  onOrgChange,
  stations,
  selectedStations,
  onStationsChange,
  paramOptions,
  selectedParam,
  onParamChange,
  thresholds,
  currentRecords,
  selectedClass,
  bucket,
  chartOptions,
  chartRef,
  timeRange = 'all',
  dateFrom = '',
  dateTo = '',
}) {
  const [stationsOpen, setStationsOpen] = useState(false);
  const stationBtnRef = useRef(null);
  const [applied, setApplied] = useState(false);
  const [viewMode, setViewMode] = useState('time'); // 'time' | 'depth'
  const [seriesMode, setSeriesMode] = useState('avg'); // 'avg' | 'per-station'

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Build station display name similar to WaterQualityTab
    const eventStationName = (ev) => ev?.station?.name || ev?.station_name || ((ev?.latitude != null && ev?.longitude != null) ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : null);

    // (latestTestDate removed - unused)

  // Fetch raw sample-events using WaterQualityTab logic
    useEffect(() => {
      let mounted = true;
      (async () => {
        if (!selectedLake) { if (mounted) setEvents([]); return; }
        setLoading(true);
        try {
          const fmtIso = (d) => {
            if (!d) return '';
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
          };
          // Fetch generously; anchor relative ranges to latest event client-side
          const lim = 5000;
          const fromEff = (timeRange === 'custom') ? (dateFrom || undefined) : undefined;
          const toEff = (timeRange === 'custom') ? (dateTo || undefined) : undefined;
          const qs = buildQuery({ lake_id: selectedLake, organization_id: selectedOrg || undefined, sampled_from: fromEff, sampled_to: toEff, limit: lim });
          const res = await apiPublic(`/public/sample-events${qs}`);
          const rows = Array.isArray(res?.data) ? res.data : [];
          if (mounted) setEvents(rows);
        } catch {
          if (mounted) setEvents([]);
        } finally { if (mounted) setLoading(false); }
      })();
      return () => { mounted = false; };
    }, [selectedLake, selectedOrg, timeRange, dateFrom, dateTo]);
  useEffect(() => {
    // If upstream filters/data changed, require Apply again
    setApplied(false);
  }, [selectedLake, selectedOrg, selectedParam, JSON.stringify(selectedStations), timeRange, dateFrom, dateTo, bucket]);
  const chartData = useMemo(() => {
      if (!selectedParam || !selectedStations || !selectedStations.length) return null;
      // Helpers mirroring WaterQualityTab
      const parseDate = (iso) => { try { return new Date(iso); } catch { return null; } };
      const bucketKey = (d, mode) => {
        if (!d) return null;
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const q = Math.floor((m - 1) / 3) + 1;
        if (mode === 'year') return `${y}`;
        if (mode === 'quarter') return `${y}-Q${q}`;
        return `${y}-${String(m).padStart(2,'0')}`;
      };
      const bucketSortKey = (k) => {
        if (!k) return 0;
        const m = /^([0-9]{4})(?:-(?:Q([1-4])|([0-9]{2})))?$/.exec(k);
        if (!m) return 0;
        const y = Number(m[1]);
        const q = m[2] ? (Number(m[2]) * 3) : 0;
        const mo = m[3] ? Number(m[3]) : 0;
        return y * 12 + (q || mo);
      };
      // Anchor to latest event for relative ranges; filter events accordingly
      let evs = Array.isArray(events) ? events : [];
      if (timeRange !== 'all') {
        const allDates = evs.map((e) => parseDate(e?.sampled_at)).filter((d) => d && !isNaN(d));
        const latest = allDates.length ? new Date(Math.max(...allDates)) : null;
        if (timeRange === 'custom') {
          const f = dateFrom ? new Date(dateFrom) : null;
          const t = dateTo ? new Date(dateTo) : null;
          evs = evs.filter((e) => { const d = parseDate(e?.sampled_at); if (!d) return false; if (f && d < f) return false; if (t && d > t) return false; return true; });
        } else if (latest) {
          const from = new Date(latest);
          if (timeRange === '5y') from.setFullYear(from.getFullYear() - 5);
          else if (timeRange === '3y') from.setFullYear(from.getFullYear() - 3);
          else if (timeRange === '1y') from.setFullYear(from.getFullYear() - 1);
          else if (timeRange === '6mo') from.setMonth(from.getMonth() - 6);
          evs = evs.filter((e) => { const d = parseDate(e?.sampled_at); return d && d >= from && d <= latest; });
        }
      }

  // Build aggregates: overall + per-station + depth bands similar to WaterQualityTab
  const overall = new Map(); // bucket -> {sum,cnt}
  const stationMaps = new Map(); // stationName -> Map(bucket -> {sum,cnt})
      const depthBands = new Map(); // depthKey -> Map(bucket -> {sum,cnt})
      const depthBandKey = (raw) => { const n = Number(raw); if (!Number.isFinite(n)) return 'NA'; return String(Math.round(n)); };
      let thMin = null, thMax = null;
      for (const ev of evs) {
        const sName = eventStationName(ev) || '';
        if (!selectedStations.includes(sName)) continue;
        const d = parseDate(ev.sampled_at);
        const bk = bucketKey(d, bucket);
        if (!bk) continue;
        const results = Array.isArray(ev?.results) ? ev.results : [];
        for (const r of results) {
          const p = r?.parameter;
          if (!p) continue;
          const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
          if (!match) continue;
          const v = Number(r.value);
          if (!Number.isFinite(v)) continue;
          const aggO = overall.get(bk) || { sum: 0, cnt: 0 };
          aggO.sum += v; aggO.cnt += 1; overall.set(bk, aggO);
          // per-station aggregate
          const st = stationMaps.get(sName) || new Map();
          const aggS = st.get(bk) || { sum: 0, cnt: 0 };
          aggS.sum += v; aggS.cnt += 1; st.set(bk, aggS); stationMaps.set(sName, st);
          if (r?.depth_m != null) {
            const dk = depthBandKey(r.depth_m);
            const band = depthBands.get(dk) || new Map();
            const agg = band.get(bk) || { sum: 0, cnt: 0 };
            agg.sum += v; agg.cnt += 1; band.set(bk, agg); depthBands.set(dk, band);
          }
          if (r?.threshold?.min_value != null && thMin == null) thMin = Number(r.threshold.min_value);
          if (r?.threshold?.max_value != null && thMax == null) thMax = Number(r.threshold.max_value);
        }
      }
      const allLabels = new Set();
      for (const k of overall.keys()) allLabels.add(k);
      for (const m of depthBands.values()) for (const k of m.keys()) allLabels.add(k);
      const labels = Array.from(allLabels).sort((a,b) => bucketSortKey(a) - bucketSortKey(b));
      const datasets = [];
      const depthKeys = Array.from(depthBands.keys()).filter((k)=>k!=='NA').sort((a,b)=>Number(a)-Number(b));
  if (depthKeys.length && seriesMode === 'avg') {
        const depthColors = ['#0ea5e9','#22c55e','#f97316','#ef4444','#a78bfa','#14b8a6','#f59e0b','#94a3b8','#e879f9','#10b981','#eab308','#60a5fa'];
        depthKeys.forEach((dk, idx) => {
          const m = depthBands.get(dk) || new Map();
          const data = labels.map((lb) => { const agg=m.get(lb); return agg && agg.cnt ? (agg.sum/agg.cnt) : null; });
          datasets.push({ label: `${dk} m`, data, borderColor: depthColors[idx % depthColors.length], backgroundColor: 'transparent', pointRadius: 3, pointHoverRadius: 4, tension: 0.2, spanGaps: true });
        });
      } else {
        if (seriesMode === 'per-station') {
          // build one dataset per selected station
          const colorFor = (i) => `hsl(${(i*40)%360} 80% 60%)`;
          let i = 0;
          for (const s of selectedStations) {
            const map = stationMaps.get(s) || new Map();
            const data = labels.map((lb) => { const agg = map.get(lb); return agg && agg.cnt ? (agg.sum/agg.cnt) : null; });
            datasets.push({ label: s, data, borderColor: colorFor(i++), backgroundColor: 'transparent', pointRadius: 2, pointHoverRadius: 4, tension: 0.15, spanGaps: true });
          }
        } else {
          const data = labels.map((lb) => { const agg=overall.get(lb); return agg && agg.cnt ? (agg.sum/agg.cnt) : null; });
          datasets.push({ label: 'Avg', data, borderColor: 'rgba(59,130,246,1)', backgroundColor: 'rgba(59,130,246,0.2)', pointRadius: 3, pointHoverRadius: 4, tension: 0.2, spanGaps: true });
        }
      }

      if (thMin != null) datasets.push({ label: 'Min Threshold', data: labels.map(() => thMin), borderColor: 'rgba(16,185,129,1)', backgroundColor: 'rgba(16,185,129,0.15)', borderDash: [4,4], pointRadius: 0, tension: 0 });
      if (thMax != null) datasets.push({ label: 'Max Threshold', data: labels.map(() => thMax), borderColor: 'rgba(239,68,68,1)', backgroundColor: 'rgba(239,68,68,0.15)', borderDash: [4,4], pointRadius: 0, tension: 0 });

      return { labels, datasets };
  }, [events, selectedParam, JSON.stringify(selectedStations), bucket, timeRange, dateFrom, dateTo, seriesMode]);

  // Build depth profile datasets for the selected param across selected stations
  const depthProfile = useMemo(() => {
    if (!selectedParam || !selectedStations || !selectedStations.length) return { datasets: [], unit: '', maxDepth: 0 };
    const parseDate = (iso) => { try { return new Date(iso); } catch { return null; } };
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const groupLabel = (d) => {
      if (!d) return null;
      if (bucket === 'year') return String(d.getFullYear());
      if (bucket === 'quarter') return `Q${Math.floor(d.getMonth() / 3) + 1}`;
      return monthNames[d.getMonth()];
    };
    const depthKey = (raw) => { const n = Number(raw); if (!Number.isFinite(n)) return null; return (Math.round(n * 2) / 2).toFixed(1); };

    const unitRef = { current: '' };
    const groups = new Map(); // label -> Map(depthKey -> {sum,cnt})
    for (const ev of events) {
      const sName = eventStationName(ev) || '';
      if (!selectedStations.includes(sName)) continue;
      const d = parseDate(ev.sampled_at); const gLabel = groupLabel(d); if (!gLabel) continue;
      const results = Array.isArray(ev?.results) ? ev.results : [];
      for (const r of results) {
        const p = r?.parameter; if (!p) continue;
        const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
        if (!match || r?.value == null || r?.depth_m == null) continue;
        if (!unitRef.current) unitRef.current = p.unit || '';
        if (!groups.has(gLabel)) groups.set(gLabel, new Map());
        const depths = groups.get(gLabel);
        const dKey = depthKey(r.depth_m); if (!dKey) continue;
        const v = Number(r.value); if (!Number.isFinite(v)) continue;
        const agg = depths.get(dKey) || { sum: 0, cnt: 0 };
        agg.sum += v; agg.cnt += 1; depths.set(dKey, agg);
      }
    }

    // Convert to chart datasets
    const datasets = [];
    const colorFor = (idx) => `hsl(${(idx * 60) % 360} 80% 55%)`;
    let maxDepth = 0; let i = 0;
    const orderedLabels = bucket === 'month'
      ? monthNames.filter((m) => groups.has(m))
      : bucket === 'quarter'
        ? ['Q1','Q2','Q3','Q4'].filter((q) => groups.has(q))
        : Array.from(groups.keys()).sort((a,b) => Number(a) - Number(b));
    orderedLabels.forEach((gLabel) => {
      const depths = groups.get(gLabel);
      const points = Array.from(depths.entries()).map(([dk, agg]) => ({ y: Number(dk), x: agg.sum / agg.cnt })).sort((a,b) => a.y - b.y);
      if (!points.length) return;
      maxDepth = Math.max(maxDepth, points[points.length - 1].y || 0);
      datasets.push({ label: gLabel, data: points, parsing: false, showLine: true, borderColor: colorFor(i++), backgroundColor: 'transparent', pointRadius: 3, pointHoverRadius: 4, tension: 0.1 });
    });
    return { datasets, unit: unitRef.current || '', maxDepth };
  }, [events, selectedParam, JSON.stringify(selectedStations), bucket]);

  const singleChartOptions = useMemo(() => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}` } },
      },
      scales: {
        x: { ticks: { color: '#fff', maxRotation: 0, autoSkip: true, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
        y: { ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
      },
    }), []);

  const isComplete = Boolean(selectedLake && selectedStations && selectedStations.length && selectedParam);

  return (
    <div className="insight-card">
      <h4>Single Lake</h4>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch', minWidth: 0 }}>
          <select className="pill-btn" value={selectedLake} onChange={(e) => { onLakeChange(e.target.value); setApplied(false); }} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">Select lake</option>
            {lakeOptions.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select className="pill-btn" value={selectedOrg} onChange={(e) => { onOrgChange(e.target.value); setApplied(false); }} disabled={!selectedLake} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">All orgs</option>
            {orgOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button ref={stationBtnRef} type="button" className="pill-btn" disabled={!selectedLake || !stations?.length} title={!stations?.length ? 'No stations available' : undefined} onClick={() => {
              if (!stationsOpen) {
                // we used to capture button position here but the state was removed; keep this lookup if needed later
                try { stationBtnRef.current?.getBoundingClientRect(); } catch {};
              }
              setStationsOpen((v) => !v);
            }} style={{ minWidth: 140 }}>
              {selectedStations.length ? `${selectedStations.length} selected` : 'Select locations'}
            </button>
            <Popover anchorRef={stationBtnRef} open={stationsOpen} onClose={() => setStationsOpen(false)} minWidth={220}>
              {stations.length ? stations.map((s) => {
                const checked = selectedStations.includes(s);
                return (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checked} onChange={() => {
                      const next = checked ? selectedStations.filter((x) => x !== s) : [...selectedStations, s];
                      onStationsChange(next);
                      onParamChange("");
                      setApplied(false);
                    }} />
                    <span>{s}</span>
                  </label>
                );
              }) : (
                <div style={{ opacity: 0.8 }}>No locations…</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <button type="button" className="pill-btn" onClick={() => { onStationsChange(stations.slice()); setApplied(false); }}>Select All</button>
                <button type="button" className="pill-btn" onClick={() => { onStationsChange([]); setApplied(false); }}>Clear</button>
                <button type="button" className="pill-btn liquid" onClick={() => setStationsOpen(false)}>Done</button>
              </div>
            </Popover>
          </div>
          <select className="pill-btn" value={selectedParam} onChange={(e) => { onParamChange(e.target.value); setApplied(false); }} disabled={!(selectedStations && selectedStations.length)} style={{ minWidth: 160, flex: '0 0 auto' }}>
            <option value="">Select parameter</option>
            {paramOptions.map((p) => (
              <option key={p.key || p.id || p.code} value={p.key || p.id || p.code}>{p.label || p.name || p.code}</option>
            ))}
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
      <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", padding: 8 }}>
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
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ opacity: 0.9 }}>No depth data available for this selection.</span>
              </div>
            )
          ) : (
            chartData && chartData.datasets && chartData.datasets.length ? (
              <Line ref={chartRef} data={chartData} options={singleChartOptions} />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ opacity: 0.9 }}>No time-series data available for this selection.</span>
              </div>
            )
          )
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ opacity: 0.9 }}>{isComplete ? 'Click Apply to generate the chart.' : 'Fill all fields to enable Apply.'}</span>
          </div>
        )}
      </div>
      {/* Toggle only when depth data can be shown */}
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
