// resources/js/components/modals/StatsModal.jsx
import React, { useMemo, useState, useEffect } from "react";
import { api, apiPublic, buildQuery } from "../../lib/api";
import Modal from "../Modal";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function StatsModal({ open, onClose, title = "Lake Statistics" }) {
  // Match Lake Info Panel styling (rgba(30,60,120,0.65), white text)
  const modalStyle = {
    background: "rgba(30, 60, 120, 0.65)",
    color: "#fff",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.25)",
  };
  const [activeTab, setActiveTab] = useState("single");
  const [bucket, setBucket] = useState("month"); // 'year' | 'quarter' | 'month'

  // Selections
  const [selectedLake, setSelectedLake] = useState("");
  const [selectedStation, setSelectedStation] = useState("");
  const [selectedParam, setSelectedParam] = useState("DO");
  const classes = ["AA", "A", "B", "C", "D", "SA", "SB", "SC", "SD"];
  const [selectedClass, setSelectedClass] = useState("C");

  // Data sources
  const [effectiveAllRecords, setEffectiveAllRecords] = useState([]);
  const [lakeOptions, setLakeOptions] = useState([]);
  const [stations, setStations] = useState([]);

  // map lake name/id -> class_code so we can derive class automatically
  const [lakeClassMap, setLakeClassMap] = useState(new Map());

  const params = [
    { key: "pH", label: "pH" },
    { key: "DO", label: "Dissolved Oxygen (mg/L)" },
    { key: "TSS", label: "TSS (mg/L)" },
    { key: "TDS", label: "TDS (mg/L)" },
    { key: "TP", label: "Total Phosphorus (mg/L)" },
    { key: "NH3", label: "Ammonia (mg/L)" },
    { key: "ChlA", label: "Chlorophyll-a (mg/m³)" },
    { key: "BOD", label: "BOD (mg/L)" },
  ];
  const [paramOptions, setParamOptions] = useState(params);
  const [orgOptions, setOrgOptions] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");

  // Fetch lakes and parameter options to populate selectors (when modal opens)
  useEffect(() => {
    let mounted = true;
    if (!open) return;
    (async () => {
      try {
        const { fetchLakeOptions } = await import("../../lib/layers");
        const lakes = await fetchLakeOptions();
        if (!mounted) return;
        // keep objects (id, name, class_code) so we can fetch stations by id
        setLakeOptions(Array.isArray(lakes) ? lakes : []);
        const map = new Map();
        (lakes || []).forEach((r) => map.set(String(r.id), r.class_code || ""));
        setLakeClassMap(map);
      } catch (e) {
        console.debug("[StatsModal] failed to fetch lakes", e);
        if (mounted) setLakeOptions([]);
      }

      try {
        const p = await api("/options/parameters");
        const rows = Array.isArray(p) ? p : Array.isArray(p?.data) ? p.data : [];
        if (!mounted) return;
        if (rows.length) {
          for (const pr of rows) {
            const k = pr.code || pr.key || String(pr.id);
            const found = params.find((pp) => pp.key === k);
            if (found && pr.name) found.label = pr.name;
          }
        }
      } catch (e) {
        console.debug("[StatsModal] failed to fetch parameters", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open]);

  // Fetch stations (locations) for selected lake. Try admin/stations first; if none, derive from recent sample-events
  useEffect(() => {
    let mounted = true;
    if (!selectedLake) {
      setStations([]);
      return;
    }
    (async () => {
      try {
        const res = await api(`/admin/stations?lake_id=${encodeURIComponent(selectedLake)}`);
        const list = Array.isArray(res?.data) ? res.data : [];
        const normalized = list.map((s) => {
          const latRaw = s.latitude ?? s.lat ?? null;
          const lngRaw = s.longitude ?? s.lng ?? null;
          const name = s.name || (latRaw != null && lngRaw != null ? `${Number(latRaw).toFixed(6)}, ${Number(lngRaw).toFixed(6)}` : `Station ${s.id || ''}`);
          return name;
        });
        if (mounted && normalized.length) {
          setStations(normalized);
          return;
        }
      } catch (e) {
        console.debug('[StatsModal] admin/stations failed', e);
      }

      // Fallback: derive station list from public sample-events for this lake
      try {
        const { apiPublic } = await import("../../lib/api");
        const qs = `?lake_id=${encodeURIComponent(selectedLake)}&limit=1000`;
  const res2 = await apiPublic(`/public/sample-events${qs}`);
  const rows = Array.isArray(res2) ? res2 : Array.isArray(res2?.data) ? res2.data : [];
        const uniq = new Map();
        rows.forEach((r) => {
          const name = r?.station?.name || r?.station_name || (r.latitude != null && r.longitude != null ? `${Number(r.latitude).toFixed(6)}, ${Number(r.longitude).toFixed(6)}` : null);
          if (name && !uniq.has(name)) uniq.set(name, name);
        });
        const derived = Array.from(uniq.values());
        if (mounted) setStations(derived);
      } catch (e) {
        console.debug('[StatsModal] fallback sample-events failed', e);
        if (mounted) setStations([]);
      }
    })();
    return () => { mounted = false; };
  }, [selectedLake]);

  // Fetch public sample-events for the selected lake and convert into records used by charts
  useEffect(() => {
    let mounted = true;
    if (!selectedLake) {
      setEffectiveAllRecords([]);
      return;
    }
    (async () => {
      try {
        const qs = buildQuery({ lake_id: selectedLake, organization_id: selectedOrg || undefined, limit: 1000 });
  const res = await apiPublic(`/public/sample-events${qs}`);
  const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

  // Derive org list and parameter catalog from returned tests
  const uniqOrgs = new Map();
  const uniqParams = new Map();
        // Transform tests into a flat record structure keyed by station + month
        const recs = [];
        for (const ev of rows) {
          // derive org
          const oid = ev.organization_id ?? ev.organization?.id;
          const oname = ev.organization_name ?? ev.organization?.name;
          if (oid && oname && !uniqOrgs.has(String(oid))) uniqOrgs.set(String(oid), { id: oid, name: oname });
          const sampled = ev.sampled_at ? new Date(ev.sampled_at) : null;
          // skip events without a valid sample date (consistent with other WQ code)
          if (!sampled) continue;
          const stationName = ev?.station?.name || ev?.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : "");
          const stationCode = ev?.station?.code || ev?.station_code || ev?.station_id || "";
          const area = ev?.lake_name || ev?.lake?.name || ev?.lake_name || "";
          const results = Array.isArray(ev?.results) ? ev.results : [];

          // Build a record object where each parameter key maps to { value, unit, threshold }
          const paramObj = {};
          for (const r of results) {
            if (!r || !r.parameter) continue;
            const pid = r.parameter_id || r.parameter?.id;
            const code = r.parameter?.code || r.parameter?.name || String(pid || "");
            const val = r.value == null ? null : (Number.isFinite(Number(r.value)) ? Number(r.value) : null);
            const thrMin = r?.threshold?.min_value != null ? Number(r.threshold.min_value) : null;
            const thrMax = r?.threshold?.max_value != null ? Number(r.threshold.max_value) : null;
            // use the parameter code (or id) as the key in the record so charting can look it up
            const key = code || String(pid || "");
            paramObj[key] = { value: val, unit: r.parameter?.unit || r.unit || "", threshold: { min: thrMin, max: thrMax } };
            if (!uniqParams.has(key)) uniqParams.set(key, { id: pid, key, code, label: r.parameter?.name || code, unit: r.parameter?.unit || "" });
          }

          recs.push({
            lake: String(ev.lake_id ?? ev.lake?.id ?? selectedLake),
            stationCode: String(stationCode || ""),
            area: stationName || area || "",
            date: sampled,
            ...paramObj,
          });
        }

        if (mounted) {
          setEffectiveAllRecords(recs);
          setOrgOptions(Array.from(uniqOrgs.values()));
          // if we found params, use them; otherwise keep defaults
          if (uniqParams.size) setParamOptions(Array.from(uniqParams.values()));
        }
      } catch (e) {
        console.debug('[StatsModal] failed to fetch sample-events for records', e);
        if (mounted) setEffectiveAllRecords([]);
      }
    })();
    return () => { mounted = false; };
  }, [selectedLake, selectedOrg]);

  // Thresholds by parameter and class
  const thresholds = {
    BOD: { AA: 1, A: 3, B: 5, C: 7, D: 15, SA: null, SB: null, SC: null, SD: null, type: "max" },
    DO: { AA: 5, A: 5, B: 5, C: 5, D: 2, SA: 6, SB: 6, SC: 5, SD: 2, type: "min" },
    TSS: { AA: 25, A: 50, B: 65, C: 80, D: 110, SA: 25, SB: 50, SC: 80, SD: 110, type: "max" },
    TP: { AA: 0.003, A: 0.5, B: 0.5, C: 0.5, D: 5, SA: 0.1, SB: 0.5, SC: 0.5, SD: 5, type: "max" },
    NH3: { AA: 0.05, A: 0.05, B: 0.05, C: 0.05, D: 0.75, SA: 0.04, SB: 0.05, SC: 0.05, SD: 0.75, type: "max" },
    pH: {
      range: {
        AA: [6.5, 8.5],
        A: [6.5, 8.5],
        B: [6.5, 8.5],
        C: [6.5, 9.0],
        D: [6.5, 9.0],
        SA: [7.0, 8.5],
        SB: [7.0, 8.5],
        SC: [6.5, 8.5],
        SD: [6.0, 9.0],
      },
      type: "range",
    },
  };

  const currentRecords = useMemo(
    () => effectiveAllRecords.filter((r) => r.lake === selectedLake),
    [effectiveAllRecords, selectedLake]
  );

  // No cutoff; we bucket by Month/Quarter/Year like WaterQualityTab

  // Base chart options used by both Single Lake and Compare charts (match WaterQualityTab styling)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed?.y;
            return `${ctx.dataset.label}: ${v}`;
          },
        },
      },
    },
    scales: {
      x: { type: 'category', ticks: { color: '#fff', maxRotation: 0, autoSkip: true, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
      y: { ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
    },
  };

  const chartData = useMemo(() => {
    if (!selectedParam) return null;
    const bucketKey = (d, mode) => {
      if (!d) return null;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (mode === 'year') return `${y}`;
      if (mode === 'quarter') return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
      return `${y}-${String(m).padStart(2,'0')}`;
    };
    const labelSet = new Set();
    const bucketSortKeyLocal = (k) => {
      if (!k) return 0;
      const m = /^([0-9]{4})(?:-(?:Q([1-4])|([0-9]{2})))?$/.exec(k);
      if (!m) return 0;
      const y = Number(m[1]);
      const q = m[2] ? (Number(m[2]) * 3) : 0;
      const mo = m[3] ? Number(m[3]) : 0;
      return y * 12 + (q || mo);
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
    const byStationMap = new Map(); // station -> Map(bucketKey -> number[])
    // First pass: collect all months for the selected station (or all stations) so thresholds can show even without data values
    for (const r of currentRecords) {
      const key = r.area || r.stationCode || "";
      if (selectedStation && key !== selectedStation) continue;
      if (!r.date) continue;
      const bk = bucketKey(r.date, bucket);
      if (!bk) continue;
      labelSet.add(bk);
    }
    // Second pass: collect parameter values by month per station
    for (const r of currentRecords) {
      const key = r.area || r.stationCode || "";
      if (selectedStation && key !== selectedStation) continue;
      const val = r?.[selectedParam]?.value ?? null;
      if (val == null || !r.date) continue;
      const bk = bucketKey(r.date, bucket);
      if (!bk) continue;
      if (!byStationMap.has(key)) byStationMap.set(key, new Map());
      const m = byStationMap.get(key);
      if (!m.has(bk)) m.set(bk, []);
      m.get(bk).push(val);
    }
  const labels = Array.from(labelSet).sort((a,b) => bucketSortKeyLocal(a) - bucketSortKeyLocal(b));
    const datasets = Array.from(byStationMap.entries()).map(([label, seriesMap], i) => ({
      label,
      data: labels.map((l) => {
        const arr = seriesMap.get(l);
        if (!arr || !arr.length) return null;
        const sum = arr.reduce((a,b) => a + b, 0);
        return sum / arr.length;
      }),
      borderColor: i === 0 ? 'rgba(59,130,246,1)' : `hsl(${(i * 70) % 360} 80% 60%)`,
      backgroundColor: i === 0 ? 'rgba(59,130,246,0.2)' : `hsl(${(i * 70) % 360} 80% 60% / 0.2)`,
      pointRadius: 3,
      tension: 0.2,
    }));

    // Threshold overlay — prefer server-provided per-result thresholds when available
    const staticDef = thresholds[selectedParam];
    // helper to find the first server threshold for this param in currentRecords
    const findServerThreshold = () => {
      for (const rec of currentRecords) {
        const t = rec?.[selectedParam]?.threshold;
        if (!t) continue;
        // pH: expect both min and max
        if (selectedParam === "pH") {
          if (t.min != null && t.max != null) return { min: Number(t.min), max: Number(t.max) };
        } else {
          // If staticDef indicates type, prefer matching server-side value
          const typ = staticDef?.type || (selectedParam === 'pH' ? 'range' : null);
          if (typ === 'max' && t.max != null) return { value: Number(t.max), kind: 'max' };
          if (typ === 'min' && t.min != null) return { value: Number(t.min), kind: 'min' };
          // fallback to any available threshold
          if (t.max != null) return { value: Number(t.max), kind: 'max' };
          if (t.min != null) return { value: Number(t.min), kind: 'min' };
        }
      }
      return null;
    };

    const serverTh = findServerThreshold();

    if (selectedParam === "pH") {
      if (serverTh && serverTh.min != null && serverTh.max != null) {
        datasets.push(
          { label: `Min Threshold`, data: labels.map(() => serverTh.min), borderColor: 'rgba(16,185,129,1)', backgroundColor: 'rgba(16,185,129,0.15)', borderDash: [4, 4], pointRadius: 0, tension: 0 },
          { label: `Max Threshold`, data: labels.map(() => serverTh.max), borderColor: 'rgba(239,68,68,1)', backgroundColor: 'rgba(239,68,68,0.15)', borderDash: [4, 4], pointRadius: 0, tension: 0 }
        );
      } else {
        const rng = thresholds.pH.range[selectedClass];
        if (rng) {
          datasets.push(
            { label: `Min Threshold`, data: labels.map(() => rng[0]), borderColor: 'rgba(16,185,129,1)', backgroundColor: 'rgba(16,185,129,0.15)', borderDash: [4, 4], pointRadius: 0, tension: 0 },
            { label: `Max Threshold`, data: labels.map(() => rng[1]), borderColor: 'rgba(239,68,68,1)', backgroundColor: 'rgba(239,68,68,0.15)', borderDash: [4, 4], pointRadius: 0, tension: 0 }
          );
        }
      }
    } else {
      // Non-pH: plot a single threshold line. Prefer server threshold; fallback to static if available.
      const thStatic = staticDef ? (staticDef[selectedClass] ?? null) : null;
      const thObj = (serverTh && typeof serverTh === 'object' && 'value' in serverTh)
        ? serverTh
        : (thStatic != null ? { value: Number(thStatic), kind: (staticDef?.type === 'min' ? 'min' : 'max') } : null);
      if (thObj && thObj.value != null) {
        const isMin = thObj.kind === 'min';
        const color = isMin ? 'rgba(16,185,129,1)' : 'rgba(239,68,68,1)';
        const bg = isMin ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
        const lbl = isMin ? 'Min Threshold' : 'Max Threshold';
        datasets.push({ label: lbl, data: labels.map(() => thObj.value), borderColor: color, backgroundColor: bg, borderDash: [4, 4], pointRadius: 0, tension: 0 });
      }
    }

    return { labels, datasets };
  }, [currentRecords, selectedParam, selectedStation, selectedClass, bucket]);

  // Build per-render options so thresholds are always inside the chart
  const singleChartOptions = useMemo(() => {
    if (!chartData) return chartOptions;
    // Collect all y values from datasets (including threshold overlays) to compute padding
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
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          suggestedMin: min - pad,
          suggestedMax: max + pad,
        },
      },
    };
  }, [chartData]);

  // Auto-select the first available parameter after station selection if none is chosen
  useEffect(() => {
    if (!selectedParam && selectedStation && Array.isArray(paramOptions) && paramOptions.length) {
      const first = paramOptions[0];
      const k = first?.key || first?.code || String(first?.id || "");
      if (k) setSelectedParam(k);
    }
  }, [selectedStation, paramOptions, selectedParam]);


  const tabBtn = (key, label) => (
    <button className={`pill-btn ${activeTab === key ? "liquid" : ""}`} onClick={() => setActiveTab(key)}>
      {label}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} ariaLabel="Lake statistics modal" width={860} style={modalStyle}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Bucket</span>
          <select className="pill-btn" value={bucket} onChange={(e) => setBucket(e.target.value)}>
            <option value="year">Year</option>
            <option value="quarter">Quarter</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div style={{ flex: 1 }} />
        {tabBtn("single", "Single Lake")}
        {tabBtn("compare", "Compare")}
      </div>

      {/* Content cards */}
      {/* Summary and By Parameter tabs removed — UI focuses on Single Lake and Compare */}

      {activeTab === "single" && (
        <div className="insight-card">
          <h4>Single Lake</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <select className="pill-btn" value={selectedLake} onChange={(e) => {
              const v = e.target.value;
              setSelectedLake(v);
              // clear downstream selections
              setSelectedOrg("");
              setSelectedStation("");
              setSelectedParam("");
              setStations([]);
              setEffectiveAllRecords([]);
              // derive class from map if available
              const cls = lakeClassMap.get(String(v));
              if (cls) setSelectedClass(cls);
            }}>
              <option value="">Select lake</option>
              {lakeOptions.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <select className="pill-btn" value={selectedOrg} onChange={(e) => {
              const v = e.target.value;
              setSelectedOrg(v);
              // clear downstream selections
              setSelectedStation("");
              setSelectedParam("");
              setEffectiveAllRecords([]);
            }} disabled={!selectedLake}>
              <option value="">All orgs</option>
              {orgOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <select className="pill-btn" value={selectedStation} onChange={(e) => {
              const v = e.target.value;
              setSelectedStation(v);
              // clear parameter selection when station changes
              setSelectedParam("");
            }} disabled={!selectedLake}>
              <option value="">Select location</option>
              {stations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select className="pill-btn" value={selectedParam} onChange={(e) => setSelectedParam(e.target.value)} disabled={!selectedStation}>
              <option value="">Select parameter</option>
              {paramOptions.map((p) => (
                <option key={p.key || p.id || p.code} value={p.key || p.id || p.code}>{p.label || p.name || p.code}</option>
              ))}
            </select>
            {/* Class selection removed; thresholds use the lake's class */}
            {/* CSV upload removed for UI-first work; data will be wired later */}
          </div>
          <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", padding: 8 }}>
            {chartData && chartData.datasets.length ? (
              <Line data={chartData} options={singleChartOptions} />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ opacity: 0.9 }}>No data for selection…</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "compare" && (
        <CompareTab
          allRecords={effectiveAllRecords}
          lakeOptions={lakeOptions}
          params={paramOptions}
          thresholds={thresholds}
          chartOptions={chartOptions}
          classes={classes}
          bucket={bucket}
        />
      )}

      {/* Footer actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <button className="pill-btn liquid" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function CompareTab({ allRecords, lakeOptions, params, thresholds, chartOptions, classes, bucket }) {
  const initial = (Array.isArray(lakeOptions) ? lakeOptions.slice(0, 2).map((l) => String(l.id)) : []);
  const [selectedLakes, setSelectedLakes] = useState(initial);
  const [selectedParam, setSelectedParam] = useState("DO");
  // derive a common class across selected lakes; if mixed, null
  const commonClass = useMemo(() => {
    const set = new Set();
    for (const l of lakeOptions || []) {
      if (selectedLakes.includes(String(l.id))) set.add(l.class_code || "");
    }
    if (set.size === 1) return Array.from(set)[0] || null;
    return null;
  }, [lakeOptions, selectedLakes]);

  const bucketKey = (d, mode) => {
    if (!d) return null;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (mode === 'year') return `${y}`;
    if (mode === 'quarter') return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
    return `${y}-${String(m).padStart(2,'0')}`;
  };

  const { labels, datasets } = useMemo(() => {
    const labelSet = new Set();
    const lakeMonthValues = new Map(); // lake -> Map(bucketKey -> number[])
    for (const r of allRecords) {
      if (!selectedLakes.includes(r.lake)) continue;
      if (!r.date) continue;
      const bk = bucketKey(r.date, bucket);
      if (!bk) continue;
      labelSet.add(bk);
      const val = r?.[selectedParam]?.value ?? null;
      if (val == null) continue;
      if (!lakeMonthValues.has(r.lake)) lakeMonthValues.set(r.lake, new Map());
      const m = lakeMonthValues.get(r.lake);
      if (!m.has(bk)) m.set(bk, []);
      m.get(bk).push(val);
    }
  const labels = Array.from(labelSet).sort((a,b) => bucketSortKey(a) - bucketSortKey(b));
    const datasets = Array.from(lakeMonthValues.entries()).map(([lake, seriesMap]) => ({
      label: lake,
      data: labels.map((l) => {
        const vals = seriesMap.get(l);
        if (!vals || !vals.length) return null;
        const sum = vals.reduce((a, b) => a + b, 0);
        return sum / vals.length;
      }),
      borderColor: `rgba(59,130,246,1)`,
      backgroundColor: `rgba(59,130,246,0.2)`,
      pointRadius: 3,
      tension: 0.2,
    }));

    if (selectedParam === "pH") {
      const rng = commonClass ? thresholds.pH.range[commonClass] : null;
      if (rng) {
        datasets.push(
          { label: `Min Threshold`, data: labels.map(() => rng[0]), borderColor: "rgba(16,185,129,1)", backgroundColor: "rgba(16,185,129,0.15)", borderDash: [4, 4], pointRadius: 0, tension: 0 },
          { label: `Max Threshold`, data: labels.map(() => rng[1]), borderColor: "rgba(239,68,68,1)", backgroundColor: "rgba(239,68,68,0.15)", borderDash: [4, 4], pointRadius: 0, tension: 0 }
        );
      }
    } else {
      const staticDef = thresholds[selectedParam];
      const val = staticDef && commonClass && staticDef[commonClass] != null ? Number(staticDef[commonClass]) : null;
      if (val != null) {
        const isMin = staticDef.type === 'min';
        const color = isMin ? 'rgba(16,185,129,1)' : 'rgba(239,68,68,1)';
        const bg = isMin ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
        const lbl = isMin ? 'Min Threshold' : 'Max Threshold';
        datasets.push({ label: lbl, data: labels.map(() => val), borderColor: color, backgroundColor: bg, borderDash: [4,4], pointRadius: 0, tension: 0 });
      }
    }

    return { labels, datasets };
  }, [allRecords, selectedLakes, selectedParam, bucket, thresholds, commonClass]);

  // Compute y-axis bounds so threshold lines are visible (match Single Lake behavior)
  const compareChartOptions = useMemo(() => {
    const ys = [];
    for (const ds of datasets || []) {
      for (const v of ds.data || []) if (v != null && Number.isFinite(Number(v))) ys.push(Number(v));
    }
    if (!ys.length) return chartOptions;
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const span = max - min;
    const pad = span > 0 ? span * 0.08 : Math.max(1, Math.abs(max) * 0.08 || 1);
    return {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: { ...chartOptions.scales.y, suggestedMin: min - pad, suggestedMax: max + pad },
      },
    };
  }, [datasets, chartOptions]);

  return (
    <div className="insight-card">
      <h4>Compare Lakes</h4>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <select
          className="pill-btn"
          multiple
          size={Math.max(3, Math.min(6, (lakeOptions?.length || 0) || 3))}
          value={selectedLakes}
          onChange={(e) => {
            const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
            setSelectedLakes(opts);
          }}
        >
          {lakeOptions.map((l) => (
            <option key={l.id} value={String(l.id)}>{l.name}</option>
          ))}
        </select>
        <select className="pill-btn" value={selectedParam} onChange={(e) => setSelectedParam(e.target.value)}>
          {params.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        {/* Class selection removed; thresholds follow common class across selected lakes if identical */}
      </div>
      <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", padding: 8 }}>
        {datasets && datasets.length ? (
          <Line data={{ labels, datasets }} options={compareChartOptions} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ opacity: 0.9 }}>Select at least one lake…</span>
          </div>
        )}
      </div>
    </div>
  );
}
