import React, { useEffect, useMemo, useState, useRef } from "react";
import { apiPublic, buildQuery } from "../../lib/api";
import { alertError } from "../../lib/alerts";
import { fetchStationsForLake } from "../stats-modal/data/fetchers";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { FiActivity, FiBarChart2 } from "react-icons/fi";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

import LoadingSpinner from "../LoadingSpinner";

/**
 * Props
 * - lake: { id, name, class_code? }
 */
function WaterQualityTab({ lake }) {
  const lakeId = lake?.id ?? null;
  const [orgs, setOrgs] = useState([]); // {id,name}
  const [orgId, setOrgId] = useState("");
  const [stations, setStations] = useState([]); // [name]
  const [station, setStation] = useState(""); // station name; empty = All
  const [tests, setTests] = useState([]); // last 10 published tests for lake (optionally filtered by org)
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const initialLoadedRef = useRef(false);
  const [bucket, setBucket] = useState("month"); // 'year' | 'quarter' | 'month'
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeRange, setTimeRange] = useState("all");

  // Load org options for this lake based on tests seen (client-side pass 1)
  const fetchTests = async (org = "") => {
    if (!lakeId) return;
    setLoading(true);
    try {
      // Determine effective date range and sensible limits similar to StatsModal
      const fmtIso = (d) => {
        if (!d) return "";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
      };
      // Use the most recent test date as the reference 'today' when available, otherwise use actual today
      const today = latestTestDate || new Date();
      const lim = (timeRange === "all" || timeRange === "custom") ? 5000 : 1000;
      let fromEff, toEff;
      if (timeRange === 'all') { fromEff = undefined; toEff = undefined; }
    else if (!dateFrom && !dateTo) { const d = new Date(today); d.setFullYear(d.getFullYear() - 5); fromEff = fmtIso(d); toEff = fmtIso(today); }
    else { fromEff = dateFrom || undefined; toEff = dateTo || undefined; }

      const qs = buildQuery({
        lake_id: lakeId,
        organization_id: org || undefined,
        sampled_from: fromEff,
        sampled_to: toEff,
        limit: lim,
      });
      const res = await apiPublic(`/public/sample-events${qs}`);
      const rows = Array.isArray(res?.data) ? res.data : [];
      setTests(rows);
      // Derive orgs list from payload
      const uniq = new Map();
      rows.forEach((r) => {
        const oid = r.organization_id ?? r.organization?.id;
        const name = r.organization_name ?? r.organization?.name;
        if (oid && name && !uniq.has(String(oid))) uniq.set(String(oid), { id: oid, name });
      });
      setOrgs(Array.from(uniq.values()));
    } catch (e) {
      console.error("[WaterQualityTab] Failed to load tests", e);
      await alertError("Failed", e?.message || "Could not load water quality tests");
      setTests([]);
    } finally {
      setLoading(false);
      if (!initialLoadedRef.current) {
        initialLoadedRef.current = true;
        setInitialLoading(false);
      }
    }
  };

  // Compute latest test date (sampled_at) from fetched tests. Used as the reference for range selectors.
  const latestTestDate = useMemo(() => {
    if (!tests || tests.length === 0) return null;
    let max = null;
    for (const t of tests) {
      if (!t) continue;
      const d = new Date(t.sampled_at);
      if (isNaN(d.getTime())) continue;
      if (!max || d > max) max = d;
    }
    return max;
  }, [tests]);

  // Apply range helper same as StatsModal
  const fmtIso = (d) => {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const applyRange = (key) => {
    const today = latestTestDate || new Date();
    let from = "";
    let to = fmtIso(today);
    if (key === "all") { from = ""; to = ""; }
    else if (key === "custom") { from = dateFrom || ""; to = dateTo || ""; }
    else if (key === "5y") { const d = new Date(today); d.setFullYear(d.getFullYear() - 5); from = fmtIso(d); }
    else if (key === "3y") { const d = new Date(today); d.setFullYear(d.getFullYear() - 3); from = fmtIso(d); }
    else if (key === "1y") { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); from = fmtIso(d); }
    else if (key === "6mo") { const d = new Date(today); d.setMonth(d.getMonth() - 6); from = fmtIso(d); }
    setDateFrom(from);
    setDateTo(to === "" ? "" : to);
    setTimeRange(key);
  };

  // Reset on lake change and fetch
  useEffect(() => {
    setOrgId("");
    setStation("");
    setTests([]);
    setOrgs([]);
    setStations([]);
    // prepare initial-loading for this lake
    initialLoadedRef.current = false;
    if (!lakeId) {
      setInitialLoading(false);
      return;
    }
    setInitialLoading(true);
    fetchTests("");
  }, [lakeId]);
  // Refetch when org or time range changes
  useEffect(() => { if (lakeId != null) fetchTests(orgId); }, [orgId, dateFrom, dateTo, timeRange]);

  // Load station options for this lake and time window
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!lakeId) { if (mounted) setStations([]); return; }
      try {
        const today = latestTestDate || new Date();
        const lim = (timeRange === "all" || timeRange === "custom") ? 5000 : 1000;
        let fromEff, toEff;
        if (timeRange === 'all') { fromEff = undefined; toEff = undefined; }
        else if (!dateFrom && !dateTo) { const d = new Date(today); d.setFullYear(d.getFullYear() - 5); fromEff = fmtIso(d); toEff = fmtIso(today); }
        else { fromEff = dateFrom || undefined; toEff = dateTo || undefined; }
        const list = await fetchStationsForLake({ lakeId, from: fromEff, to: toEff, limit: lim });
        if (mounted) setStations(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setStations([]);
      }
    })();
    return () => { mounted = false; };
  }, [lakeId, dateFrom, dateTo, timeRange]);

  // Determine whether there are any named stations (not coordinate-only entries).
  // Coordinate-only station labels are formatted like: "12.345678, 98.765432".
  const hasNamedStations = useMemo(() => {
    if (!stations || stations.length === 0) return false;
    const coordRe = /^\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*$/;
    return stations.some((s) => typeof s === 'string' && s.trim() !== '' && !coordRe.test(s));
  }, [stations]);

  // If there are no named stations, clear any selected station so filtering doesn't apply.
  useEffect(() => { if (!hasNamedStations) setStation(""); }, [hasNamedStations]);

  // Resolve station name for an event (consistent with fetchers)
  const eventStationName = (ev) => ev?.station?.name || ev?.station_name || ((ev?.latitude != null && ev?.longitude != null) ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : null);
  const visibleTests = useMemo(() => {
    if (!tests?.length) return [];
    if (!station) return tests.slice();
    return tests.filter((ev) => eventStationName(ev) === station);
  }, [tests, station]);
  const hasAny = visibleTests && visibleTests.length > 0;

  // Dispatch markers for MapPage based on visible tests
  useEffect(() => {
    try {
      const markers = (visibleTests || [])
        .filter((r) => r && r.latitude != null && r.longitude != null)
        .map((r) => ({ lat: Number(r.latitude), lon: Number(r.longitude), label: (r.station?.name || null) }));
      window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } }));
    } catch {}
  }, [visibleTests]);

  // Informational hint for users
  // This is UI-only text shown at the top of the tab content area if desired.

  // Helpers for time bucketing
  const parseDate = (iso) => { try { return new Date(iso); } catch { return null; } };
  const bucketKey = (d, mode) => {
    if (!d) return null;
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1..12
    const q = Math.floor((m - 1) / 3) + 1;
    if (mode === 'year') return `${y}`;
    if (mode === 'quarter') return `${y}-Q${q}`;
    return `${y}-${String(m).padStart(2,'0')}`; // month
  };
  const bucketSortKey = (k) => {
    // keys like YYYY, YYYY-Qn, YYYY-MM
    if (!k) return 0;
    const m = /^([0-9]{4})(?:-(?:Q([1-4])|([0-9]{2})))?$/.exec(k);
    if (!m) return 0;
    const y = Number(m[1]);
    const q = m[2] ? (Number(m[2]) * 3) : 0;
    const mo = m[3] ? Number(m[3]) : 0;
    return y * 12 + (q || mo);
  };

  // Build per-parameter time series for primary group
  const seriesByParameter = useMemo(() => {
    if (!visibleTests || visibleTests.length === 0) return [];
    const byParam = new Map(); // paramId -> { code,name,unit, threshold:{min,max}, hasDepth:boolean, buckets: Map(timeKey -> { sum, cnt, min, max }), depthBands: Map(depthKey -> Map(timeKey -> { sum,cnt,min,max })) }

    const depthBandKey = (raw) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) return 'NA';
      // Use 1 m bands for clarity in time-series
      return String(Math.round(n));
    };

    for (const ev of visibleTests) {
      const d = parseDate(ev.sampled_at);
      const key = bucketKey(d, bucket);
      const results = Array.isArray(ev?.results) ? ev.results : [];
      for (const r of results) {
        const p = r?.parameter;
        if (!p) continue;
        const group = String(p.group || p.param_group || '').toLowerCase();
        if (group !== 'primary') continue;
        if (r.value == null) continue;
        const pid = r.parameter_id || p.id;
        if (!byParam.has(pid)) {
          byParam.set(pid, {
            id: pid,
            code: p.code || String(pid),
            name: p.name || p.code || String(pid),
            unit: p.unit || '',
            threshold: { min: r?.threshold?.min_value ?? null, max: r?.threshold?.max_value ?? null },
            hasDepth: false,
            buckets: new Map(),
            depthBands: new Map(),
          });
        }
        const entry = byParam.get(pid);
        if (entry && entry.threshold) {
          // Prefer a non-null threshold if earlier was null
          if (entry.threshold.min == null && r?.threshold?.min_value != null) entry.threshold.min = r.threshold.min_value;
          if (entry.threshold.max == null && r?.threshold?.max_value != null) entry.threshold.max = r.threshold.max_value;
        }
  // mark depth availability
  if (r?.depth_m != null) entry.hasDepth = true;
  if (!key) continue;
        const v = Number(r.value);
        if (!Number.isFinite(v)) continue;
        const b = entry.buckets.get(key) || { sum: 0, cnt: 0, min: v, max: v };
        b.sum += v; b.cnt += 1; b.min = Math.min(b.min, v); b.max = Math.max(b.max, v);
        entry.buckets.set(key, b);

        // also aggregate by depth band when available
        if (r?.depth_m != null) {
          const dKey = depthBandKey(r.depth_m);
          const band = entry.depthBands.get(dKey) || new Map();
          const agg = band.get(key) || { sum: 0, cnt: 0, min: v, max: v };
          agg.sum += v; agg.cnt += 1; agg.min = Math.min(agg.min, v); agg.max = Math.max(agg.max, v);
          band.set(key, agg);
          entry.depthBands.set(dKey, band);
        }
      }
    }

    // Convert to array and sort buckets chronologically
    const out = [];
    for (const entry of byParam.values()) {
      const labels = Array.from(entry.buckets.keys()).sort((a,b) => bucketSortKey(a) - bucketSortKey(b));
      const stats = labels.map((k) => entry.buckets.get(k));
      const avg = stats.map((s) => (s && s.cnt ? s.sum / s.cnt : null));

      // Build depth series per time label (if any depth present)
      const depthKeys = Array.from(entry.depthBands.keys())
        .filter((k) => k !== 'NA')
        .sort((a,b) => Number(a) - Number(b));
      const depthSeries = depthKeys.map((dk) => ({
        depth: dk,
        values: labels.map((lb) => {
          const agg = entry.depthBands.get(dk)?.get(lb);
          return agg && agg.cnt ? (agg.sum / agg.cnt) : null;
        }),
      }));

      out.push({
        ...entry,
        labels,
        avg,
        stats, // for tooltip: {sum,cnt,min,max}
        depthSeries,
      });
    }
    // Sort parameters by name (fallback to code)
    out.sort((a,b) => String(a.name || a.code).localeCompare(String(b.name || b.code)));
    return out;
  }, [visibleTests, bucket]);

  // Build depth profiles per-parameter (points grouped by month -> {x:value, y:depth}), used when toggled
  const depthProfilesByParameter = useMemo(() => {
    if (!visibleTests || visibleTests.length === 0) return new Map();
    const map = new Map(); // pid -> { unit, groups: Map(groupLabel -> Map(depthKey -> {sum,cnt})) }

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const groupLabel = (d) => {
      if (bucket === 'year') return String(d.getFullYear());
      if (bucket === 'quarter') return `Q${Math.floor(d.getMonth() / 3) + 1}`;
      return monthNames[d.getMonth()]; // month
    };
    const depthKey = (raw) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) return null;
      // bucket to 0.5m to reduce noise
      return (Math.round(n * 2) / 2).toFixed(1);
    };

    for (const ev of visibleTests) {
      const d = parseDate(ev.sampled_at);
      if (!d) continue;
      const gLabel = groupLabel(d);
      const results = Array.isArray(ev?.results) ? ev.results : [];
      for (const r of results) {
        const p = r?.parameter;
        if (!p) continue;
        const group = String(p.group || p.param_group || '').toLowerCase();
        if (group !== 'primary') continue;
        if (r?.value == null || r?.depth_m == null) continue;
        const pid = r.parameter_id || p.id;
        if (!map.has(pid)) map.set(pid, { unit: p.unit || '', groups: new Map() });
        const entry = map.get(pid);
        if (!entry.groups.has(gLabel)) entry.groups.set(gLabel, new Map());
        const depths = entry.groups.get(gLabel);
        const dKey = depthKey(r.depth_m);
        if (!dKey) continue;
        const val = Number(r.value);
        if (!Number.isFinite(val)) continue;
        const agg = depths.get(dKey) || { sum: 0, cnt: 0 };
        agg.sum += val; agg.cnt += 1;
        depths.set(dKey, agg);
      }
    }

    // Convert to datasets consumable by Chart.js
    const out = new Map();
    for (const [pid, info] of map.entries()) {
      const datasets = [];
      // color palette per group
      const monthColors = { Jan: '#9CA3AF', Feb: '#A78BFA', Mar: '#93C5FD', Apr: '#10B981', May: '#F59E0B', Jun: '#D1D5DB', Jul: '#111827', Aug: '#F472B6', Sep: '#6B7280', Oct: '#34D399', Nov: '#EF4444', Dec: '#60A5FA' };
      const quarterColors = { Q1: '#60A5FA', Q2: '#10B981', Q3: '#F59E0B', Q4: '#EF4444' };
      const colorFor = (label, idx) => {
        if (bucket === 'month') return monthColors[label] || '#60A5FA';
        if (bucket === 'quarter') return quarterColors[label] || '#60A5FA';
        // year: generate color by index for stability
        const hues = [200, 160, 40, 0, 280, 100, 20, 340, 220, 180, 140, 60];
        const h = hues[idx % hues.length];
        return `hsl(${h} 80% 55%)`;
      };
      let maxDepth = 0;
      // prepare ordered labels for groups
      let orderedGroupLabels = [];
      if (bucket === 'month') orderedGroupLabels = monthNames.filter((m) => info.groups.has(m));
      else if (bucket === 'quarter') orderedGroupLabels = ['Q1', 'Q2', 'Q3', 'Q4'].filter((q) => info.groups.has(q));
      else {
        orderedGroupLabels = Array.from(info.groups.keys()).sort((a,b) => Number(a) - Number(b));
      }

      orderedGroupLabels.forEach((gLabel, idx) => {
        const depths = info.groups.get(gLabel);
        const points = Array.from(depths.entries())
          .map(([dk, agg]) => ({ y: Number(dk), x: agg.sum / agg.cnt }))
          .sort((a, b) => a.y - b.y);
        if (!points.length) return;
        maxDepth = Math.max(maxDepth, points[points.length - 1].y || 0);
        datasets.push({
          label: gLabel,
          data: points,
          parsing: false,
          showLine: true,
          borderColor: colorFor(gLabel, idx),
          backgroundColor: 'transparent',
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.1,
        });
      });
      out.set(pid, { datasets, unit: info.unit, maxDepth });
    }
    return out;
  }, [visibleTests, bucket]);

  // Per-parameter view toggle: 'time' | 'depth'
  const [viewByParam, setViewByParam] = useState({});
  const getView = (pid) => (viewByParam?.[pid] || 'time');
  const toggleView = (pid) => setViewByParam((s) => ({ ...s, [pid]: getView(pid) === 'time' ? 'depth' : 'time' }));

  const buildChart = (ev) => {
    const results = Array.isArray(ev?.results) ? ev.results : [];
    const filtered = results.filter((r) => r && r.parameter && String(r.parameter.group || r.parameter.param_group || "").toLowerCase() === "primary" && r.value != null);
    if (!filtered.length) return null;
    const labels = filtered.map((r) => r.parameter?.code || r.parameter?.name || String(r.parameter_id));
    const units = filtered.map((r) => r.parameter?.unit || "");

    const values = filtered.map((r) => (r.value == null ? null : Number(r.value)));
    const mins = filtered.map((r) => (r?.threshold?.min_value != null ? Number(r.threshold.min_value) : null));
    const maxs = filtered.map((r) => (r?.threshold?.max_value != null ? Number(r.threshold.max_value) : null));

    const data = {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Measured",
          data: values,
          backgroundColor: "rgba(59,130,246,0.6)",
          borderColor: "rgba(59,130,246,1)",
          borderWidth: 1,
          barThickness: 18,
        },
        {
          type: "line",
          label: "Threshold Min",
          data: mins,
          spanGaps: true,
          borderColor: "rgba(16,185,129,1)",
          backgroundColor: "rgba(16,185,129,0.2)",
          pointRadius: 2,
          pointHoverRadius: 3,
          borderDash: [4, 4],
          tension: 0,
        },
        {
          type: "line",
          label: "Threshold Max",
          data: maxs,
          spanGaps: true,
          borderColor: "rgba(239,68,68,1)",
          backgroundColor: "rgba(239,68,68,0.2)",
          pointRadius: 2,
          pointHoverRadius: 3,
          borderDash: [4, 4],
          tension: 0,
        },
      ],
    };

    const fmtTooltip = (ctx) => {
      const unit = units?.[ctx.dataIndex] || "";
      return `${ctx.dataset.label}: ${ctx.formattedValue}${unit ? ` ${unit}` : ""}`;
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: "#fff", boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: fmtTooltip,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#fff", maxRotation: 0, autoSkip: true },
          grid: { color: "rgba(255,255,255,0.2)" },
        },
        y: {
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.2)" },
        },
      },
    };
    return { data, options };
  };

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner label={"Loading water quality…"} color="#fff" />
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: 12, color: '#ddd', marginBottom: 6 }}>Markers are shown on the map while this tab is open.</div>
  <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr 1fr auto', alignItems: 'end', gap: 6, marginBottom: 6, overflow: 'hidden' }}>
        {/* Range */}
        <div className="form-group" style={{ minWidth: 120 }}>
          <label style={{ marginBottom: 2, fontSize: 11, color: '#fff' }}>Range</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={timeRange} onChange={(e) => applyRange(e.target.value)} style={{ padding: '6px 8px' }}>
              <option value="all">All Time</option>
              <option value="5y">5 Yr</option>
              <option value="3y">3 Yr</option>
              <option value="1y">1 Yr</option>
              <option value="6mo">6 Mo</option>
              <option value="custom">Custom</option>
            </select>
            {timeRange === 'custom' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setTimeRange('custom'); }} className="pill-btn" />
                <span>to</span>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setTimeRange('custom'); }} className="pill-btn" />
              </div>
            )}
          </div>
        </div>
        {/* Bucket */}
        <div className="form-group" style={{ minWidth: 90 }}>
          <label style={{ marginBottom: 2, fontSize: 11, color: '#fff' }}>Bucket</label>
          <select value={bucket} onChange={(e) => setBucket(e.target.value)} style={{ padding: '6px 8px' }}>
            <option value="year">Year</option>
            <option value="quarter">Quarter</option>
            <option value="month">Month</option>
          </select>
        </div>
        {/* Organization */}
        <div className="form-group" style={{ minWidth: 0 }}>
          <label style={{ marginBottom: 2, fontSize: 11, color: '#fff' }}>Organization</label>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ padding: '6px 8px' }}>
            <option value="">All</option>
            {orgs.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
        </div>
        {/* Station: show normal select when named stations exist; otherwise show a disabled select with explanation */}
        {hasNamedStations ? (
            <div className="form-group" style={{ minWidth: 0 }}>
            <label style={{ marginBottom: 2, fontSize: 11, color: '#fff' }}>Station</label>
            <select value={station} onChange={(e) => setStation(e.target.value)} style={{ padding: '6px 8px' }}>
              <option value="">All</option>
              {stations.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
        ) : (
          <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
            <label style={{ fontSize: 11, marginBottom: 2, color: '#fff' }}>Station</label>
            <select disabled aria-disabled="true" title="Samples are coordinate-only — no fixed stations" style={{ padding: '6px 8px', color: '#bbb', backgroundColor: 'transparent' }}>
              <option>Samples are coordinate-only — no fixed stations</option>
            </select>
          </div>
        )}
      </div>
  <div style={{ fontSize: 11, color: '#bbb', marginBottom: 6 }}>(Dates shown in local time)</div>
      {loading && (
        <div style={{ margin: '2px 0 8px 0' }}>
          <LoadingSpinner label="Loading data..." color="#fff" />
        </div>
      )}

      {!loading && !hasAny && (
        <div className="insight-card">
          <p style={{ margin: 0 }}><em>No published tests yet for this lake.</em></p>
        </div>
      )}

  <div style={{ display: "grid", gap: 6, overflowX: 'hidden' }}>
          {seriesByParameter.map((p) => {
            const title = `${p.name || p.code}${p.unit ? ` (${p.unit})` : ''}`;
            // Build chart config for this parameter
            const depthColors = ['#0ea5e9','#22c55e','#f97316','#ef4444','#a78bfa','#14b8a6','#f59e0b','#94a3b8','#e879f9','#10b981','#eab308','#60a5fa'];
            const hasDepthLines = p.depthSeries && p.depthSeries.length > 0;
            const depthDatasets = hasDepthLines ? p.depthSeries.map((ds, idx) => ({
              label: `${ds.depth} m`,
              data: ds.values,
              borderColor: depthColors[idx % depthColors.length],
              backgroundColor: 'transparent',
              pointRadius: 3,
              pointHoverRadius: 4,
              tension: 0.2,
            })) : [];

            const timeData = {
              labels: p.labels,
              datasets: [
                ...depthDatasets,
                ...(!hasDepthLines ? [{
                  label: 'Avg',
                  data: p.avg,
                  borderColor: 'rgba(59,130,246,1)',
                  backgroundColor: 'rgba(59,130,246,0.2)',
                  pointRadius: 3,
                  pointHoverRadius: 4,
                  tension: 0.2,
                }] : []),
                p.threshold.min != null ? {
                  label: 'Min Threshold',
                  data: p.labels.map(() => Number(p.threshold.min)),
                  borderColor: 'rgba(16,185,129,1)',
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  pointRadius: 0,
                  borderDash: [4,4],
                } : null,
                p.threshold.max != null ? {
                  label: 'Max Threshold',
                  data: p.labels.map(() => Number(p.threshold.max)),
                  borderColor: 'rgba(239,68,68,1)',
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  pointRadius: 0,
                  borderDash: [4,4],
                } : null,
              ].filter(Boolean),
            };
            const timeOptions = {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const isAvg = ctx.dataset.label === 'Avg';
                      if (!isAvg) return `${ctx.dataset.label}: ${ctx.formattedValue}${p.unit ? ` ${p.unit}` : ''}`;
                      const s = p.stats?.[ctx.dataIndex];
                      const v = ctx.formattedValue;
                      if (s && s.cnt) return `Avg: ${v}${p.unit ? ` ${p.unit}` : ''} (n=${s.cnt}, min=${s.min}, max=${s.max})`;
                      return `Avg: ${v}${p.unit ? ` ${p.unit}` : ''}`;
                    },
                  },
                },
              },
              scales: {
                x: { ticks: { color: '#fff', maxRotation: 0, autoSkip: true, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
                y: { ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
              },
            };

            // Depth profile chart config if applicable and toggled
            const view = getView(p.id);
            const profile = depthProfilesByParameter.get(p.id);
            const hasProfile = p.hasDepth && profile && profile.datasets && profile.datasets.length > 0;
            const depthData = hasProfile ? { datasets: profile.datasets } : null;
            const depthOptions = hasProfile ? {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const v = ctx.parsed?.x ?? ctx.raw?.x;
                      const d = ctx.parsed?.y ?? ctx.raw?.y;
                      return `${ctx.dataset.label}: ${Number(v).toFixed(2)}${p.unit ? ` ${p.unit}` : ''} at ${d} m`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  type: 'linear',
                  title: { display: true, text: `${p.name || p.code}${p.unit ? ` (${p.unit})` : ''}`, color: '#fff' },
                  ticks: { color: '#fff', font: { size: 10 } },
                  grid: { color: 'rgba(255,255,255,0.15)' },
                },
                y: {
                  type: 'linear',
                  reverse: true, // depth increases downward
                  title: { display: true, text: 'Depth (m)', color: '#fff' },
                  min: 0,
                  suggestedMax: Math.max(5, profile.maxDepth || 0),
                  ticks: { color: '#fff', font: { size: 10 } },
                  grid: { color: 'rgba(255,255,255,0.15)' },
                },
              },
            } : null;
            return (
              <div className="insight-card" style={{ backgroundColor: '#0f172a' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <h4 style={{ margin: 0 }}>{title}</h4>
                  {hasProfile && (
                    <button
                      type="button"
                      className="pill-btn liquid"
                      onClick={() => toggleView(p.id)}
                      title={view === 'time' ? 'Show depth profile' : 'Show time series'}
                      style={{ padding: '4px 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {view === 'time' ? <FiActivity size={14} /> : <FiBarChart2 size={14} />}
                    </button>
                  )}
                </div>
                <div className="wq-chart" style={{ height: 160 }}>
                  {view === 'depth' && hasProfile ? (
                    <Line data={depthData} options={depthOptions} />
                  ) : (
                    <Line data={timeData} options={timeOptions} />
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}

export default WaterQualityTab;
