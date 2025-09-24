import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";

// Ensure Chart.js components are registered for this module regardless of import order
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
import { api, apiPublic, buildQuery } from "../../lib/api";

export default function CompareLake({
  // options
  lakeOptions = [],
  params = [],
  thresholds = {},
  chartOptions = {},
  bucket = "month",
  chartRef,
  // date range from parent
  timeRange = "all",
  dateFrom = "",
  dateTo = "",
}) {
  // Internal state
  const [lakeA, setLakeA] = useState("");
  const [lakeB, setLakeB] = useState("");
  const [selectedOrgA, setSelectedOrgA] = useState("");
  const [selectedOrgB, setSelectedOrgB] = useState("");
  const [selectedStationsA, setSelectedStationsA] = useState([]);
  const [selectedStationsB, setSelectedStationsB] = useState([]);
  const [selectedParam, setSelectedParam] = useState("");
  const [stationsOpenA, setStationsOpenA] = useState(false);
  const [stationsOpenB, setStationsOpenB] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orgCacheA, setOrgCacheA] = useState([]);
  const [orgCacheB, setOrgCacheB] = useState([]);
  const [stationCacheA, setStationCacheA] = useState({ all: [], byOrg: {} });
  const [stationCacheB, setStationCacheB] = useState({ all: [], byOrg: {} });
  const [localParams, setLocalParams] = useState([]);
  const [applied, setApplied] = useState(false);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Do not auto-select lakes; user must choose manually

  // Ensure parameters are available: use props or fetch as fallback (try auth, then public)
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      if (params && params.length) { setLocalParams(params); return; }
      try {
        let res;
        try {
          res = await api('/options/parameters');
        } catch (_) {
          res = await apiPublic('/options/parameters');
        }
        const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        if (!aborted) setLocalParams(rows);
      } catch (_) {
        if (!aborted) setLocalParams([]);
      }
    };
    run();
    return () => { aborted = true; };
  }, [params]);

  const paramList = useMemo(() => (params && params.length ? params : localParams), [params, localParams]);

  // Fetch records only for the two selected lakes
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      if (!lakeA && !lakeB) { setRecords([]); return; }
      setLoading(true);
      try {
        // compute effective dates
        let fromEff = undefined, toEff = undefined;
        if (timeRange === 'all') {
          fromEff = undefined; toEff = undefined;
        } else if (!dateFrom && !dateTo) {
          const d = new Date(); d.setFullYear(d.getFullYear() - 5); fromEff = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; toEff = new Date();
          const td = toEff; toEff = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
        } else {
          fromEff = dateFrom || undefined; toEff = dateTo || undefined;
        }
        const limit = (timeRange === 'all' || timeRange === 'custom') ? 5000 : 1000;

        const lakes = [lakeA, lakeB].filter(Boolean).map(String);
        const combined = [];
        for (const lk of lakes) {
          const qs = buildQuery({ lake_id: lk, sampled_from: fromEff, sampled_to: toEff, limit });
          let res;
          try {
            res = await apiPublic(`/public/sample-events${qs}`);
          } catch (e) {
            if (e?.status === 429) {
              await sleep(600);
              res = await apiPublic(`/public/sample-events${qs}`);
            } else {
              throw e;
            }
          }
          const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          for (const ev of rows) {
            const sampled = ev.sampled_at ? new Date(ev.sampled_at) : null;
            if (!sampled) continue;
            const oid = ev.organization_id ?? ev.organization?.id ?? null;
            const oname = ev.organization_name ?? ev.organization?.name ?? null;
            const stationName = ev?.station?.name || ev?.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : "");
            const stationCode = ev?.station?.code || ev?.station_code || ev?.station_id || "";
            const results = Array.isArray(ev?.results) ? ev.results : [];
            const paramObj = {};
            for (const r of results) {
              if (!r || !r.parameter) continue;
              const pid = r.parameter_id || r.parameter?.id;
              const code = r.parameter?.code || r.parameter?.name || String(pid || "");
              const val = r.value == null ? null : (Number.isFinite(Number(r.value)) ? Number(r.value) : null);
              const thrMin = r?.threshold?.min_value != null ? Number(r.threshold.min_value) : null;
              const thrMax = r?.threshold?.max_value != null ? Number(r.threshold.max_value) : null;
              const key = code || String(pid || "");
              paramObj[key] = { value: val, unit: r.parameter?.unit || r.unit || "", threshold: { min: thrMin, max: thrMax } };
            }
            combined.push({
              lake: String(ev.lake_id ?? ev.lake?.id ?? lk),
              organization_id: oid,
              organization_name: oname,
              stationCode: String(stationCode || ""),
              area: stationName || "",
              date: sampled,
              ...paramObj,
            });
          }
        }
        if (!aborted) setRecords(combined);
      } catch (_) {
        if (!aborted) setRecords([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    run();
    return () => { aborted = true; };
  }, [lakeA, lakeB, timeRange, dateFrom, dateTo]);

  // Cache org options per lake (all-time), so the dropdown remains usable across range changes
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      if (!lakeA) { setOrgCacheA([]); setStationCacheA({ all: [], byOrg: {} }); return; }
      try {
        const qs = buildQuery({ lake_id: lakeA, limit: 2000 });
        let res;
        try {
          res = await apiPublic(`/public/sample-events${qs}`);
        } catch (e) {
          if (e?.status === 429) { await sleep(600); res = await apiPublic(`/public/sample-events${qs}`); }
          else throw e;
        }
        const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const orgMap = new Map();
        const allStations = new Set();
        const byOrg = new Map(); // orgId -> Set(stationLabel)
        for (const ev of rows) {
          const oid = ev.organization_id ?? ev.organization?.id ?? null;
          const oname = ev.organization_name ?? ev.organization?.name ?? null;
          if (oid && oname && !orgMap.has(String(oid))) orgMap.set(String(oid), { id: oid, name: oname });
          const stationName = ev?.station?.name || ev?.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : "");
          const stationCode = ev?.station?.code || ev?.station_code || ev?.station_id || "";
          const label = stationName || String(stationCode || "");
          if (label) {
            allStations.add(label);
            if (oid) {
              const k = String(oid);
              if (!byOrg.has(k)) byOrg.set(k, new Set());
              byOrg.get(k).add(label);
            }
          }
        }
        if (!aborted) {
          setOrgCacheA(Array.from(orgMap.values()));
          const byOrgObj = {};
          for (const [k, v] of byOrg.entries()) byOrgObj[k] = Array.from(v.values());
          setStationCacheA({ all: Array.from(allStations.values()), byOrg: byOrgObj });
        }
      } catch (_) {
        if (!aborted) { setOrgCacheA([]); setStationCacheA({ all: [], byOrg: {} }); }
      }
    };
    run();
    return () => { aborted = true; };
  }, [lakeA]);

  useEffect(() => {
    let aborted = false;
    const run = async () => {
      if (!lakeB) { setOrgCacheB([]); setStationCacheB({ all: [], byOrg: {} }); return; }
      try {
        const qs = buildQuery({ lake_id: lakeB, limit: 2000 });
        let res;
        try {
          res = await apiPublic(`/public/sample-events${qs}`);
        } catch (e) {
          if (e?.status === 429) { await sleep(600); res = await apiPublic(`/public/sample-events${qs}`); }
          else throw e;
        }
        const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const orgMap = new Map();
        const allStations = new Set();
        const byOrg = new Map();
        for (const ev of rows) {
          const oid = ev.organization_id ?? ev.organization?.id ?? null;
          const oname = ev.organization_name ?? ev.organization?.name ?? null;
          if (oid && oname && !orgMap.has(String(oid))) orgMap.set(String(oid), { id: oid, name: oname });
          const stationName = ev?.station?.name || ev?.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : "");
          const stationCode = ev?.station?.code || ev?.station_code || ev?.station_id || "";
          const label = stationName || String(stationCode || "");
          if (label) {
            allStations.add(label);
            if (oid) {
              const k = String(oid);
              if (!byOrg.has(k)) byOrg.set(k, new Set());
              byOrg.get(k).add(label);
            }
          }
        }
        if (!aborted) {
          setOrgCacheB(Array.from(orgMap.values()));
          const byOrgObj = {};
          for (const [k, v] of byOrg.entries()) byOrgObj[k] = Array.from(v.values());
          setStationCacheB({ all: Array.from(allStations.values()), byOrg: byOrgObj });
        }
      } catch (_) {
        if (!aborted) { setOrgCacheB([]); setStationCacheB({ all: [], byOrg: {} }); }
      }
    };
    run();
    return () => { aborted = true; };
  }, [lakeB]);

  // Do not auto-pick parameter; user must choose manually

  // Reset Apply gating when inputs change
  useEffect(() => {
    setApplied(false);
  }, [lakeA, lakeB, selectedOrgA, selectedOrgB, selectedStationsA, selectedStationsB, selectedParam, timeRange, dateFrom, dateTo, bucket]);

  const isComplete = useMemo(() => {
    return Boolean(lakeA && lakeB && selectedParam && selectedStationsA?.length && selectedStationsB?.length);
  }, [lakeA, lakeB, selectedParam, selectedStationsA, selectedStationsB]);

  // Derive org lists from records per lake
  const orgOptionsA = useMemo(() => {
    const map = new Map();
    for (const r of records || []) {
      if (!lakeA || String(r.lake) !== String(lakeA)) continue;
      const oid = r.organization_id ?? r.organization?.id ?? null;
      const oname = r.organization_name ?? r.organization?.name ?? null;
      if (oid && oname && !map.has(String(oid))) map.set(String(oid), { id: oid, name: oname });
    }
    const list = Array.from(map.values());
    return list.length ? list : orgCacheA;
  }, [records, lakeA, orgCacheA]);

  const orgOptionsB = useMemo(() => {
    const map = new Map();
    for (const r of records || []) {
      if (!lakeB || String(r.lake) !== String(lakeB)) continue;
      const oid = r.organization_id ?? r.organization?.id ?? null;
      const oname = r.organization_name ?? r.organization?.name ?? null;
      if (oid && oname && !map.has(String(oid))) map.set(String(oid), { id: oid, name: oname });
    }
    const list = Array.from(map.values());
    return list.length ? list : orgCacheB;
  }, [records, lakeB, orgCacheB]);

  // Derive station lists from records per lake (+ org)
  const stationsA = useMemo(() => {
    const set = new Set();
    for (const r of records || []) {
      if (!lakeA || String(r.lake) !== String(lakeA)) continue;
      const oid = r.organization_id ?? r.organization?.id ?? null;
      if (selectedOrgA && oid && String(oid) !== String(selectedOrgA)) continue;
      const name = r.area || r.stationCode || null;
      if (name) set.add(name);
    }
    const list = Array.from(set.values());
    if (list.length) return list;
    if (selectedOrgA) return stationCacheA.byOrg?.[String(selectedOrgA)] || [];
    return stationCacheA.all || [];
  }, [records, lakeA, selectedOrgA, stationCacheA]);

  const stationsB = useMemo(() => {
    const set = new Set();
    for (const r of records || []) {
      if (!lakeB || String(r.lake) !== String(lakeB)) continue;
      const oid = r.organization_id ?? r.organization?.id ?? null;
      if (selectedOrgB && oid && String(oid) !== String(selectedOrgB)) continue;
      const name = r.area || r.stationCode || null;
      if (name) set.add(name);
    }
    const list = Array.from(set.values());
    if (list.length) return list;
    if (selectedOrgB) return stationCacheB.byOrg?.[String(selectedOrgB)] || [];
    return stationCacheB.all || [];
  }, [records, lakeB, selectedOrgB, stationCacheB]);

  const bucketKey = (d, mode) => {
    if (!d) return null;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (mode === "year") return `${y}`;
    if (mode === "quarter") return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
    return `${y}-${String(m).padStart(2, "0")}`;
  };

  const bucketSortKey = (k) => {
    if (!k) return 0;
    const m = /^([0-9]{4})(?:-(?:Q([1-4])|([0-9]{2})))?$/.exec(k);
    if (!m) return 0;
    const y = Number(m[1]);
    const q = m[2] ? Number(m[2]) * 3 : 0;
    const mo = m[3] ? Number(m[3]) : 0;
    return y * 12 + (q || mo);
  };

  const findServerThresholdForLake = (lakeId) => {
    if (!lakeId || !selectedParam) return null;
    for (const r of records || []) {
      if (String(r.lake) !== String(lakeId)) continue;
      const t = r?.[selectedParam]?.threshold;
      if (!t) continue;
      const min = t.min != null ? Number(t.min) : null;
      const max = t.max != null ? Number(t.max) : null;
      if (selectedParam === "pH") {
        if (min != null && max != null) return { min, max };
      } else {
        const typ = thresholds?.[selectedParam]?.type || null;
        if (typ === "max" && max != null) return { value: max, kind: "max" };
        if (typ === "min" && min != null) return { value: min, kind: "min" };
        if (max != null) return { value: max, kind: "max" };
        if (min != null) return { value: min, kind: "min" };
      }
    }
    return null;
  };

  const chartData = useMemo(() => {
    const selected = selectedParam;
    const considerLakes = [lakeA, lakeB].filter(Boolean);
    if (!selected || considerLakes.length === 0) return null;

    const labelSet = new Set();
    const lakeMaps = new Map(); // lakeId -> Map(bucketKey -> number[])

    for (const r of records || []) {
      if (!r?.date) continue;
      if (!considerLakes.includes(String(r.lake))) continue;

      // Side-specific filters for A
      if (lakeA && String(r.lake) === String(lakeA)) {
        if (selectedOrgA) {
          const oid = r.organization_id ?? r.organization?.id ?? null;
          if (oid && String(oid) !== String(selectedOrgA)) continue;
        }
        if (selectedStationsA && selectedStationsA.length) {
          const nm = r.area || r.stationCode || "";
          if (!selectedStationsA.includes(nm)) continue;
        }
      }

      // Side-specific filters for B
      if (lakeB && String(r.lake) === String(lakeB)) {
        if (selectedOrgB) {
          const oid = r.organization_id ?? r.organization?.id ?? null;
          if (oid && String(oid) !== String(selectedOrgB)) continue;
        }
        if (selectedStationsB && selectedStationsB.length) {
          const nm = r.area || r.stationCode || "";
          if (!selectedStationsB.includes(nm)) continue;
        }
      }

      const bk = bucketKey(r.date, bucket);
      if (!bk) continue;
      labelSet.add(bk);
      const v = r?.[selected]?.value;
      if (v == null) continue;
      if (!lakeMaps.has(String(r.lake))) lakeMaps.set(String(r.lake), new Map());
      const m = lakeMaps.get(String(r.lake));
      if (!m.has(bk)) m.set(bk, []);
      m.get(bk).push(Number(v));
    }

    const labels = Array.from(labelSet).sort((a, b) => bucketSortKey(a) - bucketSortKey(b));

    const datasets = [];
    const lakesToRender = [lakeA, lakeB].filter(Boolean);

    // Precompute thresholds per lake (server -> static by class)
    const serverThA = findServerThresholdForLake(lakeA);
    const serverThB = findServerThresholdForLake(lakeB);

    lakesToRender.forEach((lk, i) => {
      const seriesMap = lakeMaps.get(String(lk)) || new Map();
      const data = [];
      const pointBackgroundColor = [];
      const pointRadius = [];
      const cls = lakeOptions.find((x) => String(x.id) === String(lk))?.class_code || null;
      const staticDef = thresholds[selected];
      const serverTh = String(lk) === String(lakeA) ? serverThA : serverThB;

      for (const L of labels) {
        const vals = seriesMap.get(L);
        if (!vals || !vals.length) {
          data.push(null);
          pointBackgroundColor.push(undefined);
          pointRadius.push(0);
          continue;
        }
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        data.push(avg);

        let isOut = false;
        if (selected === "pH") {
          const rng =
            serverTh && serverTh.min != null && serverTh.max != null
              ? [serverTh.min, serverTh.max]
              : thresholds.pH?.range?.[cls] || null;
          if (rng) isOut = avg < rng[0] || avg > rng[1];
        } else {
          const thObj =
            serverTh && serverTh.value != null
              ? serverTh
              : staticDef && cls != null && staticDef[cls] != null
              ? {
                  value: Number(staticDef[cls]),
                  kind: staticDef.type === "min" ? "min" : "max",
                }
              : null;
          if (thObj) isOut = thObj.kind === "max" ? avg > thObj.value : avg < thObj.value;
        }

        if (isOut) {
          pointBackgroundColor.push("rgba(239,68,68,1)");
          pointRadius.push(5);
        } else {
          pointBackgroundColor.push(i === 0 ? "rgba(59,130,246,1)" : `hsl(${(i * 70) % 360} 80% 60%)`);
          pointRadius.push(3);
        }
      }

      datasets.push({
        label: lakeOptions.find((x) => String(x.id) === String(lk))?.name || String(lk),
        data,
        borderColor: i === 0 ? "rgba(59,130,246,1)" : `hsl(${(i * 70) % 360} 80% 60%)`,
        backgroundColor: i === 0 ? "rgba(59,130,246,0.2)" : `hsl(${(i * 70) % 360} 80% 60% / 0.2)`,
        pointBackgroundColor,
        pointRadius,
        tension: 0.2,
      });
    });

    // Threshold overlays (only if both lakes share same class to avoid confusion)
    const classesSet = new Set(
      lakesToRender.map((lk) => lakeOptions.find((x) => String(x.id) === String(lk))?.class_code || null)
    );
    const commonClass = classesSet.size === 1 ? Array.from(classesSet)[0] : null;

    if (selected === "pH") {
      const rng = commonClass ? thresholds.pH?.range?.[commonClass] : null;
      if (rng) {
        datasets.push({
          label: "Min Threshold",
          data: labels.map(() => rng[0]),
          borderColor: "rgba(16,185,129,1)",
          backgroundColor: "rgba(16,185,129,0.15)",
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
        });
        datasets.push({
          label: "Max Threshold",
          data: labels.map(() => rng[1]),
          borderColor: "rgba(239,68,68,1)",
          backgroundColor: "rgba(239,68,68,0.15)",
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
        });
      }
    } else if (commonClass) {
      const staticDef = thresholds[selected];
      const val = staticDef && staticDef[commonClass] != null ? Number(staticDef[commonClass]) : null;
      if (val != null) {
        const isMin = staticDef.type === "min";
        const color = isMin ? "rgba(16,185,129,1)" : "rgba(239,68,68,1)";
        const bg = isMin ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)";
        const lbl = isMin ? "Min Threshold" : "Max Threshold";
        datasets.push({
          label: lbl,
          data: labels.map(() => val),
          borderColor: color,
          backgroundColor: bg,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0,
        });
      }
    }

    return { labels, datasets };
  }, [
    records,
    lakeOptions,
    thresholds,
    bucket,
    lakeA,
    lakeB,
    selectedOrgA,
    selectedOrgB,
    selectedStationsA,
    selectedStationsB,
    selectedParam,
  ]);

  const compareChartOptions = useMemo(() => {
    if (!chartData) return chartOptions;
    const ys = [];
    for (const ds of chartData.datasets || []) {
      for (const v of ds.data || []) if (v != null && Number.isFinite(Number(v))) ys.push(Number(v));
    }
    if (!ys.length) return chartOptions;
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const span = max - min;
    const pad = span > 0 ? span * 0.08 : Math.max(1, Math.abs(max) * 0.08 || 1);
    return {
      ...chartOptions,
      scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, suggestedMin: min - pad, suggestedMax: max + pad } },
    };
  }, [chartData, chartOptions]);

  return (
    <div className="insight-card">
      <h4>Compare Lakes</h4>

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        {/* Lake A */}
  <select className="pill-btn" value={lakeA} onChange={(e) => { setLakeA(e.target.value); setSelectedOrgA(""); setSelectedStationsA([]); setSelectedParam(""); }}>
          <option value="">Lake A</option>
          {lakeOptions.map((l) => (
            <option key={l.id} value={String(l.id)}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          className="pill-btn"
          value={selectedOrgA}
          onChange={(e) => { setSelectedOrgA(e.target.value); setSelectedStationsA([]); setSelectedParam(""); }}
          disabled={!lakeA}
        >
          <option value="">All orgs</option>
          {orgOptionsA.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="pill-btn"
            disabled={!lakeA}
            onClick={() => setStationsOpenA((v) => !v)}
          >
            {selectedStationsA.length ? `${selectedStationsA.length} selected` : "Select locations"}
          </button>
          {stationsOpenA && (
            <div
              style={{
                position: "absolute",
                top: "110%",
                left: 0,
                zIndex: 1000,
                minWidth: 220,
                maxHeight: 200,
                overflowY: "auto",
                background: "rgba(20,40,80,0.95)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8,
                padding: 8,
              }}
            >
              {stationsA.length ? (
                stationsA.map((s) => {
                  const checked = selectedStationsA.includes(s);
                  return (
                    <label
                      key={s}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? selectedStationsA.filter((x) => x !== s)
                            : [...selectedStationsA, s];
                          setSelectedStationsA(next);
                          setSelectedParam("");
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  );
                })
              ) : (
                <div style={{ opacity: 0.8 }}>No locations…</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                <button type="button" className="pill-btn" onClick={() => setSelectedStationsA(stationsA.slice())}>
                  Select All
                </button>
                <button type="button" className="pill-btn" onClick={() => setSelectedStationsA([])}>
                  Clear
                </button>
                <button type="button" className="pill-btn liquid" onClick={() => setStationsOpenA(false)}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lake B */}
  <select className="pill-btn" value={lakeB} onChange={(e) => { setLakeB(e.target.value); setSelectedOrgB(""); setSelectedStationsB([]); setSelectedParam(""); }}>
          <option value="">Lake B</option>
          {lakeOptions.map((l) => (
            <option key={l.id} value={String(l.id)}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          className="pill-btn"
          value={selectedOrgB}
          onChange={(e) => { setSelectedOrgB(e.target.value); setSelectedStationsB([]); setSelectedParam(""); }}
          disabled={!lakeB}
        >
          <option value="">All orgs</option>
          {orgOptionsB.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="pill-btn"
            disabled={!lakeB}
            onClick={() => setStationsOpenB((v) => !v)}
          >
            {selectedStationsB.length ? `${selectedStationsB.length} selected` : "Select locations"}
          </button>
          {stationsOpenB && (
            <div
              style={{
                position: "absolute",
                top: "110%",
                left: 0,
                zIndex: 1000,
                minWidth: 220,
                maxHeight: 200,
                overflowY: "auto",
                background: "rgba(20,40,80,0.95)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8,
                padding: 8,
              }}
            >
              {stationsB.length ? (
                stationsB.map((s) => {
                  const checked = selectedStationsB.includes(s);
                  return (
                    <label
                      key={s}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? selectedStationsB.filter((x) => x !== s)
                            : [...selectedStationsB, s];
                          setSelectedStationsB(next);
                          setSelectedParam("");
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  );
                })
              ) : (
                <div style={{ opacity: 0.8 }}>No locations…</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                <button type="button" className="pill-btn" onClick={() => setSelectedStationsB(stationsB.slice())}>
                  Select All
                </button>
                <button type="button" className="pill-btn" onClick={() => setSelectedStationsB([])}>
                  Clear
                </button>
                <button type="button" className="pill-btn liquid" onClick={() => setStationsOpenB(false)}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Parameter */}
        <select
          className="pill-btn"
          value={selectedParam}
          onChange={(e) => setSelectedParam(e.target.value)}
          disabled={!paramList?.length || (!lakeA && !lakeB)}
        >
          <option value="">Select parameter</option>
          {paramList.map((p) => (
            <option key={p.key || p.id || p.code} value={p.key || p.id || p.code}>
              {p.label || p.name || p.code}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="pill-btn liquid"
          disabled={!isComplete}
          onClick={() => setApplied(true)}
        >
          Apply
        </button>
      </div>

      <div
        className="wq-chart"
        style={{ height: 300, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", padding: 8 }}
      >
        {applied && chartData && chartData.datasets && chartData.datasets.length ? (
          <Line ref={chartRef} data={chartData} options={compareChartOptions} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ opacity: 0.9 }}>
              {loading ? 'Loading…' : 'Fill all fields and click Apply to generate the chart.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
