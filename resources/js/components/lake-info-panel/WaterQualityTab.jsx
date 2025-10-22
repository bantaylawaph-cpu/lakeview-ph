import React, { useEffect, useMemo, useState, useRef } from "react";
import { apiPublic, buildQuery } from "../../lib/api";
import { alertError } from "../../lib/alerts";
import { fetchStationsForLake } from "../stats-modal/data/fetchers";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { FiInfo } from "react-icons/fi";
import InfoModal from "../common/InfoModal";
import { buildGraphExplanation } from "../utils/graphExplain";
import useMultiParamTimeSeriesData from "../stats-modal/hooks/useMultiParamTimeSeriesData";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

import LoadingSpinner from "../LoadingSpinner";

/**
 * Props
 * - lake: { id, name, class_code? }
 */
function WaterQualityTab({ lake }) {
  const lakeId = lake?.id ?? null;
  const [orgs, setOrgs] = useState([]); // {id,name}
  const [orgId, setOrgId] = useState(null);
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', sections: [] });

  // Apply range helper same as StatsModal
  const fmtIso = (d) => {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  // Load org options for this lake based on tests seen (client-side pass 1)
  const fetchTests = async (org = "") => {
    if (!lakeId) return;
    setLoading(true);
    try {
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
      // Derive orgs list from payload only when not fetching for a specific org
      if (!org) {
        const uniq = new Map();
        rows.forEach((r) => {
          const oid = r.organization_id ?? r.organization?.id;
          const name = r.organization_name ?? r.organization?.name;
          if (oid && name && !uniq.has(String(oid))) uniq.set(String(oid), { id: oid, name });
        });
        setOrgs(Array.from(uniq.values()));
        // Set default to first org if not set
        if (Array.from(uniq.values()).length > 0 && orgId === null) {
          setOrgId(String(Array.from(uniq.values())[0].id));
        }
      }
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
    setOrgId(null);
    setStation("");
    setTests([]);
    setOrgs([]);
    setStations([]);
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
        const list = await fetchStationsForLake({ lakeId, from: fromEff, to: toEff, limit: lim, organizationId: orgId });
        if (mounted) setStations(Array.isArray(list) ? list : []);
        // If the currently selected station is no longer in the list, clear it
        if (mounted) {
          const has = Array.isArray(list) ? list.includes(station) : false;
          if (!has) setStation("");
        }
      } catch {
        if (mounted) setStations([]);
      }
    })();
    return () => { mounted = false; };
  }, [lakeId, dateFrom, dateTo, timeRange, orgId, station]);

  // Resolve station name for an event (consistent with fetchers)
  const eventStationName = (ev) => ev?.station?.name || ev?.station_name || null;
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
        .map((r) => {
          if (!r) return null;
          const lat = r.station?.latitude ?? r.station?.lat ?? r.latitude ?? r.lat ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[1] : null) : null);
          const lon = r.station?.longitude ?? r.station?.lon ?? r.longitude ?? r.lon ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[0] : null) : null);
          if (lat == null || lon == null) return null;
          return { lat: Number(lat), lon: Number(lon), label: (r.station?.name || null) };
        })
        .filter(Boolean);
      window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } }));
    } catch {}
  }, [visibleTests]);

  const seriesByParameter = useMultiParamTimeSeriesData({ events: visibleTests, bucket });

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
        {/* Dataset Source */}
        <div className="form-group" style={{ minWidth: 0 }}>
          <label style={{ marginBottom: 2, fontSize: 11, color: '#fff' }}>Dataset Source</label>
          <select value={orgId || (orgs.length > 0 ? String(orgs[0].id) : "")} onChange={(e) => setOrgId(e.target.value)} style={{ padding: '6px 8px' }}>
            {orgs.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
        </div>
        {/* Station selector */}
        <div className="form-group" style={{ minWidth: 0 }}>
          <label style={{ marginBottom: 2, fontSize: 11, color: '#fff' }}>Station</label>
          <select value={station} onChange={(e) => setStation(e.target.value)} style={{ padding: '6px 8px' }}>
            <option value="">All</option>
            {stations.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
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


            return (
              <div className="insight-card" style={{ backgroundColor: '#0f172a' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <h4 style={{ margin: 0 }}>{title}</h4>
                  <div style={{ display: 'flex', gap: 6 }}>

                    <button
                      type="button"
                      className="pill-btn liquid"
                      title="Explain this graph"
                      onClick={() => {
                        const standards = [];
                        if (p?.threshold) standards.push({ code: 'Active standard', min: p.threshold.min, max: p.threshold.max });
                        const ctx = {
                          chartType: 'time',
                          param: { code: p.code, name: p.name, unit: p.unit },
                          seriesMode: 'avg',
                          bucket,
                          standards,
                          compareMode: false,
                          summary: null,
                          inferredType: (p?.threshold?.min != null && p?.threshold?.max != null) ? 'range' : (p?.threshold?.min != null ? 'min' : (p?.threshold?.max != null ? 'max' : null)),
                        };
                        const content = buildGraphExplanation(ctx);
                        setInfoContent(content);
                        setInfoOpen(true);
                      }}
                      style={{ padding: '4px 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FiInfo size={14} />
                    </button>
                  </div>
                </div>
                <div className="wq-chart" style={{ height: 160 }}>
                  <Line data={p.chartData} options={timeOptions} />
                </div>
              </div>
            );
          })}
      </div>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title={infoContent.title} sections={infoContent.sections} />
    </>
  );
}

export default WaterQualityTab;
