import React, { useEffect, useMemo, useState, useRef } from "react";
import { apiPublic, buildQuery } from "../../lib/api";
import cache from "../../lib/storageCache";
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
import OrgSelect from '../stats-modal/ui/OrgSelect';
import StationSelect from '../stats-modal/ui/StationSelect';
import useCurrentStandard from "../stats-modal/hooks/useCurrentStandard";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

import LoadingSpinner from "../LoadingSpinner";

/**
 * Props
 * - lake: { id, name, class_code? }
 */
function WaterQualityTab({ lake }) {
  const lakeId = lake?.id ?? null;
  const { current: currentStd } = useCurrentStandard();
  const [orgs, setOrgs] = useState([]); // {id,name}
  const [orgId, setOrgId] = useState("");
  const [stations, setStations] = useState([]); // [name]
  const [station, setStation] = useState(""); // station name; empty = All
  const [tests, setTests] = useState([]); // last 10 published tests for lake (optionally filtered by org)
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const initialLoadedRef = useRef(false);
  const [bucket, setBucket] = useState("month"); // 'year' | 'quarter' | 'month'
  // Year range UI replacing the old Range selector
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [yearOptions, setYearOptions] = useState([]); // full set of years for selected dataset
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', sections: [] });

  // ISO helpers
  const startOfYearIso = (y) => (y ? `${y}-01-01` : "");
  const endOfYearIso = (y) => (y ? `${y}-12-31` : "");

  // Load org options for this lake based on tests seen (client-side pass 1)
  const fetchTests = async (org = "") => {
    if (!lakeId) return;
    setLoading(true);
    try {
      // Use the most recent test date as the reference 'today' when available, otherwise use actual today
      // When year range is selected, query that inclusive span; otherwise fetch all (bounded by limit)
      const lim = 5000;
      const fromEff = (yearFrom && yearTo) ? startOfYearIso(yearFrom) : undefined;
      const toEff = (yearFrom && yearTo) ? endOfYearIso(yearTo) : undefined;

      const qs = buildQuery({
        lake_id: lakeId,
        organization_id: org || undefined,
        sampled_from: fromEff,
        sampled_to: toEff,
        limit: lim,
      });
      const key = `public:sample-events:lake:${lakeId}:org:${org||''}:from:${fromEff||''}:to:${toEff||''}:lim:${lim}`;
      const TTL = 5 * 60 * 1000; // 5 minutes
      const cached = cache.get(key, { maxAgeMs: TTL });
      // Stale-while-revalidate: if we have cache, render it immediately and clear initial overlay
      if (cached) {
        const rowsCached = Array.isArray(cached) ? cached : [];
        setTests(rowsCached);
        if (!org) {
          const uniq = new Map();
          rowsCached.forEach((r) => {
            const oid = r.organization_id ?? r.organization?.id;
            const name = r.organization_name ?? r.organization?.name;
            if (oid && name && !uniq.has(String(oid))) uniq.set(String(oid), { id: oid, name });
          });
          const list = Array.from(uniq.values());
          setOrgs(list);
          if ((!orgId || !list.some(o => String(o.id) === String(orgId))) && list.length > 0) {
            setOrgId(String(list[0].id));
          }
        }
        if (!initialLoadedRef.current) {
          initialLoadedRef.current = true;
          setInitialLoading(false);
        }
      }
      const res = await apiPublic(`/public/sample-events${qs}`);
      const rows = Array.isArray(res?.data) ? res.data : [];
      cache.set(key, rows, { ttlMs: TTL });
      setTests(rows);
      // Derive orgs list from payload only when not fetching for a specific org
      if (!org) {
        const uniq = new Map();
        rows.forEach((r) => {
          const oid = r.organization_id ?? r.organization?.id;
          const name = r.organization_name ?? r.organization?.name;
          if (oid && name && !uniq.has(String(oid))) uniq.set(String(oid), { id: oid, name });
        });
        const list = Array.from(uniq.values());
        setOrgs(list);
        // Default to first organization when none selected
        if ((!orgId || !list.some(o => String(o.id) === String(orgId))) && list.length > 0) {
          setOrgId(String(list[0].id));
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

  // previously used to anchor ranges by latest date; not needed with explicit year span

  // Fetch full year options (ignoring current year filter) whenever lake or dataset changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!lakeId) { if (mounted) { setYearOptions([]); setYearFrom(''); setYearTo(''); } return; }
      try {
        const lim = 5000; // generous upper bound
        const qs = buildQuery({ lake_id: lakeId, organization_id: orgId || undefined, limit: lim });
        const key = `public:sample-years:lake:${lakeId}:org:${orgId||''}:lim:${lim}`;
        const TTL = 5 * 60 * 1000;
        const cached = cache.get(key, { maxAgeMs: TTL });
        let rows = Array.isArray(cached) ? cached : null;
        if (!rows) {
          const res = await apiPublic(`/public/sample-events${qs}`);
          rows = Array.isArray(res?.data) ? res.data : [];
          cache.set(key, rows, { ttlMs: TTL });
        }
        if (!mounted) return;
        const set = new Set();
        for (const t of rows) {
          if (!t?.sampled_at) continue;
          const y = new Date(t.sampled_at).getFullYear();
          if (!Number.isNaN(y)) set.add(String(y));
        }
        const years = Array.from(set).sort((a,b) => Number(a) - Number(b));
        setYearOptions(years);
        // Initialize or sanitize yearFrom/yearTo based on available years
        if (years.length === 0) { setYearFrom(''); setYearTo(''); return; }
        const minY = years[0];
        const maxY = years[years.length - 1];
        setYearFrom(prev => (prev && years.includes(prev)) ? prev : minY);
        setYearTo(prev => (prev && years.includes(prev)) ? prev : maxY);
        // keep ordering valid
        const yf = (years.includes(yearFrom) ? yearFrom : minY);
        const yt = (years.includes(yearTo) ? yearTo : maxY);
        if (Number(yf) > Number(yt)) {
          setYearTo(yf);
        }
      } catch {
        if (mounted) { setYearOptions([]); setYearFrom(''); setYearTo(''); }
      }
    })();
    return () => { mounted = false; };
  }, [lakeId, orgId]);

  // Reset on lake change and fetch
  useEffect(() => {
    setOrgId("");
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
  // Refetch when org or year span changes
  useEffect(() => { if (lakeId != null) fetchTests(orgId); }, [orgId, yearFrom, yearTo]);

  // Load station options for this lake and time window
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!lakeId) { if (mounted) setStations([]); return; }
      try {
        const lim = 5000;
        const fromEff = (yearFrom && yearTo) ? startOfYearIso(yearFrom) : undefined;
        const toEff = (yearFrom && yearTo) ? endOfYearIso(yearTo) : undefined;
        const list = await fetchStationsForLake({ lakeId, from: fromEff, to: toEff, limit: lim, organizationId: orgId });
        if (mounted) setStations(Array.isArray(list) ? list.map(s => ({id: s, name: s})) : []);
        // If the currently selected station is no longer in the list, clear it
        if (mounted) {
          const has = stations.some(s => s.id === station);
          if (!has) setStation("");
        }
      } catch {
        if (mounted) setStations([]);
      }
    })();
    return () => { mounted = false; };
  }, [lakeId, yearFrom, yearTo, orgId, station]);

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
          return { lat: Number(lat), lon: Number(lon), label: (r.station?.name || null), stationId: r.station?.id, orgId: orgId, lakeId: lakeId };
        })
        .filter(Boolean);
      window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } }));
    } catch {}
  }, [visibleTests]);

  // Pass the lake's class code so thresholds resolve for the correct class under the current standard
  const { seriesByParameter, loadingThresholds } = useMultiParamTimeSeriesData({ events: visibleTests, bucket, classCode: lake?.class_code || undefined });

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner label={"Loading water quality…"} color="#fff" />
      </div>
    );
  }

  return (
    <>
  <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr 1fr auto', alignItems: 'end', gap: 6, marginBottom: 6, overflow: 'hidden' }}>
        {/* Year Range */}
        <div className="form-group" style={{ minWidth: 180 }}>
          <label style={{ marginBottom: 2, fontSize: 11, color: '#fff' }}>Year</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={yearFrom} onChange={(e) => {
              const v = e.target.value;
              setYearFrom(v);
              if (!yearTo || Number(v) > Number(yearTo)) setYearTo(v);
            }} style={{ padding: '6px 8px' }} disabled={!yearOptions.length}>
              {yearOptions.length === 0 ? (<option value="">No years</option>) : null}
              {yearOptions.map((y) => (<option key={`yf-${y}`} value={y}>{y}</option>))}
            </select>
            <span style={{ color: '#fff' }}>to</span>
            <select value={yearTo} onChange={(e) => {
              const v = e.target.value;
              setYearTo(v);
              if (!yearFrom || Number(v) < Number(yearFrom)) setYearFrom(v);
            }} style={{ padding: '6px 8px' }} disabled={!yearOptions.length}>
              {yearOptions.length === 0 ? (<option value="">No years</option>) : null}
              {yearOptions.map((y) => (<option key={`yt-${y}`} value={y}>{y}</option>))}
            </select>
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
          <OrgSelect options={orgs} value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ padding: '6px 8px', height: 'auto' }} />
        </div>
        {/* Station selector */}
        <div className="form-group" style={{ minWidth: 0 }}>
          <label style={{ marginBottom: 2, fontSize: 11, color: '#fff' }}>Station</label>
          <StationSelect options={stations} value={station} onChange={(e) => setStation(e.target.value)} includeAllOption={true} allValue="" allLabel="All Stations" showPlaceholder={false} style={{ padding: '6px 8px', height: 'auto' }} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#ddd', marginBottom: 6 }}>Click on the Station markers to see their data</div>
      {currentStd && (currentStd.name || currentStd.code) ? (
        <div style={{ fontSize: 12, color: '#ddd', marginBottom: 6 }}>
          Parameter thresholds are based on {currentStd.name || currentStd.code} guidelines.
        </div>
      ) : null}
      {(loading || loadingThresholds) && (
        <div style={{ margin: '2px 0 8px 0' }}>
          <LoadingSpinner label="Loading data..." color="#fff" />
        </div>
      )}

      {!(loading || loadingThresholds) && !hasAny && (
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
                      const v = ctx.formattedValue;
                      const unit = p.unit ? ` ${p.unit}` : '';
                      // Prefer per-dataset stats when available (depth lines)
                      const s = Array.isArray(ctx.dataset?.metaStats)
                        ? ctx.dataset.metaStats[ctx.dataIndex]
                        : (ctx.dataset.label === 'Avg' ? (p.stats?.[ctx.dataIndex] || null) : null);
                      let base = `${ctx.dataset.label}: ${v}${unit}`;
                      if (s && s.cnt) base += ` (n=${s.cnt}, min=${s.min}, max=${s.max})`;
                      return base;
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
              <div key={p.id ?? p.code ?? title} className="insight-card" style={{ backgroundColor: '#0f172a' }}>
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
                          param: { code: p.code, name: p.name, unit: p.unit, desc: p.desc || '' },
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
