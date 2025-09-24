// resources/js/components/modals/StatsModal.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { api, apiPublic, buildQuery } from "../../lib/api";
import Modal from "../Modal";
import SingleLake from "./SingleLake";
import CompareLake from "./CompareLake";
import AdvancedStat from "./AdvancedStat";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function StatsModal({ open, onClose, title = "Lake Statistics" }) {
  const modalStyle = {
    background: "rgba(30, 60, 120, 0.65)",
    color: "#fff",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.25)",
  };

  const [activeTab, setActiveTab] = useState("single");
  const [bucket, setBucket] = useState("month");

  // Single tab selections
  const [selectedLake, setSelectedLake] = useState("");
  const [selectedStations, setSelectedStations] = useState([]);
  const [selectedParam, setSelectedParam] = useState("");
  const [selectedClass, setSelectedClass] = useState("C");
  const [selectedOrg, setSelectedOrg] = useState("");

  // Date range
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeRange, setTimeRange] = useState("all");

  // Data sources
  const [effectiveAllRecords, setEffectiveAllRecords] = useState([]);
  const [lakeOptions, setLakeOptions] = useState([]);
  const [stations, setStations] = useState([]);
  const [lakeClassMap, setLakeClassMap] = useState(new Map());
  const [paramOptions, setParamOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const singleChartRef = useRef(null);
  const compareChartRef = useRef(null);
  // Compare tab now fetches on-demand inside CompareLake to avoid rate limits

  const fmtIso = (d) => {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const applyRange = (key) => {
    const today = new Date();
    let from = "";
    let to = fmtIso(today);
    if (key === "all") {
      from = "";
      to = "";
    } else if (key === "custom") {
      from = dateFrom || "";
      to = dateTo || "";
    } else if (key === "5y") {
      const d = new Date(today); d.setFullYear(d.getFullYear() - 5); from = fmtIso(d);
    } else if (key === "3y") {
      const d = new Date(today); d.setFullYear(d.getFullYear() - 3); from = fmtIso(d);
    } else if (key === "1y") {
      const d = new Date(today); d.setFullYear(d.getFullYear() - 1); from = fmtIso(d);
    } else if (key === "6mo") {
      const d = new Date(today); d.setMonth(d.getMonth() - 6); from = fmtIso(d);
    }
    setDateFrom(from);
    setDateTo(to === "" ? "" : to);
    setTimeRange(key);
  };

  const handleClear = () => {
    setSelectedLake("");
    setSelectedOrg("");
    setStations([]);
    setSelectedStations([]);
    setSelectedParam("");
    setEffectiveAllRecords([]);
  // CompareLake manages its own records; nothing to clear here
    setDateFrom("");
    setDateTo("");
    setTimeRange("all");
  };

  const handleExport = () => {
    const ref = activeTab === "single" ? singleChartRef : compareChartRef;
    const inst = ref?.current;
    if (!inst) return;
    try {
      const url = inst.toBase64Image ? inst.toBase64Image() : inst.canvas?.toDataURL("image/png");
      if (!url) return;
      const lakeName = lakeOptions.find((l) => String(l.id) === String(selectedLake))?.name || "lake";
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const label =
        activeTab === "single"
          ? `${lakeName}-${selectedParam || "param"}`
          : `compare-${selectedParamCompare || "param"}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `stats-${label}-${ts}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {}
  };

  // Fetch lakes + parameter options when modal opens
  useEffect(() => {
    let mounted = true;
    if (!open) return;

    (async () => {
      try {
        const { fetchLakeOptions } = await import("../../lib/layers");
        const lakes = await fetchLakeOptions();
        if (!mounted) return;
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
          const normalized = rows.map((pr) => ({
            id: pr.id,
            key: pr.code || pr.key || String(pr.id),
            code: pr.code || pr.key || String(pr.id),
            label: pr.name || pr.code || String(pr.id),
            unit: pr.unit || pr.parameter?.unit || "",
          }));
          setParamOptions(normalized);
        } else {
          setParamOptions([]);
        }
      } catch (e) {
        console.debug("[StatsModal] failed to fetch parameters", e);
        setParamOptions([]);
      }
    })();

    return () => { mounted = false; };
  }, [open]);

  // Stations list for Single tab (lake-based)
  useEffect(() => {
    let mounted = true;
    if (!selectedLake) { setStations([]); return; }

    (async () => {
      try {
        const res = await api(`/admin/stations?lake_id=${encodeURIComponent(selectedLake)}`);
        const list = Array.isArray(res?.data) ? res.data : [];
        const normalized = list.map((s) => {
          const latRaw = s.latitude ?? s.lat ?? null;
          const lngRaw = s.longitude ?? s.lng ?? null;
          const name = s.name || (latRaw != null && lngRaw != null
            ? `${Number(latRaw).toFixed(6)}, ${Number(lngRaw).toFixed(6)}`
            : `Station ${s.id || ""}`);
          return name;
        });
        if (mounted && normalized.length) { setStations(normalized); return; }
      } catch (e) {
        console.debug("[StatsModal] admin/stations failed", e);
      }

      // Fallback via public sample-events
      try {
        const lim = (timeRange === "all" || timeRange === "custom") ? 5000 : 1000;
        // For 'all' we intentionally do not apply sampled_from/to to get full history
        let fromEff = undefined;
        let toEff = undefined;
        if (timeRange === 'all') {
          fromEff = undefined;
          toEff = undefined;
        } else if (!dateFrom && !dateTo) {
          const d = new Date(); d.setFullYear(d.getFullYear() - 5); fromEff = fmtIso(d); toEff = fmtIso(new Date());
        } else {
          fromEff = dateFrom || undefined;
          toEff = dateTo || undefined;
        }
        const qs = buildQuery({ lake_id: selectedLake, sampled_from: fromEff, sampled_to: toEff, limit: lim });
        const res2 = await apiPublic(`/public/sample-events${qs}`);
        const rows = Array.isArray(res2) ? res2 : Array.isArray(res2?.data) ? res2.data : [];
        const uniq = new Map();
        rows.forEach((r) => {
          const name = r?.station?.name || r?.station_name ||
            (r.latitude != null && r.longitude != null
              ? `${Number(r.latitude).toFixed(6)}, ${Number(r.longitude).toFixed(6)}`
              : null);
          if (name && !uniq.has(name)) uniq.set(name, name);
        });
        const derived = Array.from(uniq.values());
        if (mounted) setStations(derived);
      } catch (e) {
        console.debug("[StatsModal] fallback sample-events failed", e);
        if (mounted) setStations([]);
      }
    })();

    return () => { mounted = false; };
  }, [selectedLake, dateFrom, dateTo, timeRange]);

  // Records for Single tab
  useEffect(() => {
    let mounted = true;
    if (!selectedLake) { setEffectiveAllRecords([]); return; }

    (async () => {
      try {
        const lim = (timeRange === "all" || timeRange === "custom") ? 5000 : 1000;
        // All Time => no sampled_from/to; otherwise use explicit dates or 5y fallback
        let fromEff = undefined;
        let toEff = undefined;
        if (timeRange === 'all') {
          fromEff = undefined; toEff = undefined;
        } else if (!dateFrom && !dateTo) {
          const d = new Date(); d.setFullYear(d.getFullYear() - 5); fromEff = fmtIso(d); toEff = fmtIso(new Date());
        } else {
          fromEff = dateFrom || undefined; toEff = dateTo || undefined;
        }
        const qs = buildQuery({
          lake_id: selectedLake,
          organization_id: selectedOrg || undefined,
          sampled_from: fromEff,
          sampled_to: toEff,
          limit: lim
        });
        const res = await apiPublic(`/public/sample-events${qs}`);
        const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

        const uniqOrgs = new Map();
        const uniqParams = new Map();
        const recs = [];

        for (const ev of rows) {
          const oid = ev.organization_id ?? ev.organization?.id;
          const oname = ev.organization_name ?? ev.organization?.name;
          if (oid && oname && !uniqOrgs.has(String(oid))) uniqOrgs.set(String(oid), { id: oid, name: oname });

          const sampled = ev.sampled_at ? new Date(ev.sampled_at) : null;
          if (!sampled) continue;

          const stationName =
            ev?.station?.name ||
            ev?.station_name ||
            (ev.latitude != null && ev.longitude != null
              ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}`
              : "");
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
            if (!uniqParams.has(key)) uniqParams.set(key, { id: pid, key, code, label: r.parameter?.name || code, unit: r.parameter?.unit || "" });
          }

          recs.push({
            lake: String(ev.lake_id ?? ev.lake?.id ?? selectedLake),
            stationCode: String(stationCode || ""),
            area: stationName || "",
            date: sampled,
            ...paramObj,
          });
        }

        if (mounted) {
          setEffectiveAllRecords(recs);
          setOrgOptions(Array.from(uniqOrgs.values()));
          if (uniqParams.size) setParamOptions(Array.from(uniqParams.values()));
        }
      } catch (e) {
        console.debug("[StatsModal] failed to fetch sample-events for records", e);
        if (mounted) setEffectiveAllRecords([]);
      }
    })();

    return () => { mounted = false; };
  }, [selectedLake, selectedOrg, dateFrom, dateTo, timeRange]);

  // Compare: no prefetch across all lakes (avoids 429). CompareLake fetches on-demand.

  // Compare tab: CompareLake manages its own selectors. No extra helpers needed here.

  // Thresholds (static fallback by class)
  const thresholds = {
    BOD: { AA: 1, A: 3, B: 5, C: 7, D: 15, SA: null, SB: null, SC: null, SD: null, type: "max" },
    DO: { AA: 5, A: 5, B: 5, C: 5, D: 2, SA: 6, SB: 6, SC: 5, SD: 2, type: "min" },
    TSS: { AA: 25, A: 50, B: 65, C: 80, D: 110, SA: 25, SB: 50, SC: 80, SD: 110, type: "max" },
    TP:  { AA: 0.003, A: 0.5, B: 0.5, C: 0.5, D: 5, SA: 0.1, SB: 0.5, SC: 0.5, SD: 5, type: "max" },
    NH3: { AA: 0.05, A: 0.05, B: 0.05, C: 0.05, D: 0.75, SA: 0.04, SB: 0.05, SC: 0.05, SD: 0.75, type: "max" },
    pH: {
      range: {
        AA: [6.5, 8.5],
        A:  [6.5, 8.5],
        B:  [6.5, 8.5],
        C:  [6.5, 9.0],
        D:  [6.5, 9.0],
        SA: [7.0, 8.5],
        SB: [7.0, 8.5],
        SC: [6.5, 8.5],
        SD: [6.0, 9.0],
      },
      type: "range",
    },
  };

  // Single tab: filter records to current lake and date range
  const currentRecords = useMemo(
    () => {
      const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
      return effectiveAllRecords.filter((r) => {
        if (r.lake !== selectedLake) return false;
        if (from && (!r.date || r.date < from)) return false;
        if (to && (!r.date || r.date > to)) return false;
        return true;
      });
    },
    [effectiveAllRecords, selectedLake, dateFrom, dateTo]
  );

  // Base chart options
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

  const tabBtn = (key, label) => (
    <button className={`pill-btn ${activeTab === key ? "liquid" : ""}`} onClick={() => setActiveTab(key)}>
      {label}
    </button>
  );

  // Auto-select first param after stations in Single
  useEffect(() => {
    if (!selectedParam && Array.isArray(selectedStations) && selectedStations.length && Array.isArray(paramOptions) && paramOptions.length) {
      const first = paramOptions[0];
      const k = first?.key || first?.code || String(first?.id || "");
      if (k) setSelectedParam(k);
    }
  }, [selectedStations, paramOptions, selectedParam]);

  return (
    <Modal open={open} onClose={onClose} title={title} ariaLabel="Lake statistics modal" width={1100} style={modalStyle}>
      {/* Header controls: Bucket & Range + Tabs */}
      <div style={{ display: "flex", gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Bucket</span>
          <select className="pill-btn" value={bucket} onChange={(e) => setBucket(e.target.value)}>
            <option value="year">Year</option>
            <option value="quarter">Quarter</option>
            <option value="month">Month</option>
          </select>

          <span style={{ fontSize: 12, opacity: 0.9, marginLeft: 8 }}>Range</span>
          <select className="pill-btn" value={timeRange} onChange={(e) => applyRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="5y">5 Yr</option>
            <option value="3y">3 Yr</option>
            <option value="1y">1 Yr</option>
            <option value="6mo">6 Mo</option>
            <option value="custom">Custom</option>
          </select>

          {timeRange === 'custom' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="date" className="pill-btn" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setTimeRange('custom'); }} />
              <span>to</span>
              <input type="date" className="pill-btn" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setTimeRange('custom'); }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {tabBtn('single', 'Single')}
          {tabBtn('compare', 'Compare')}
          {tabBtn('advanced', 'Advanced')}
        </div>
      </div>

      {/* Body */}
      {activeTab === 'single' && (
        <SingleLake
          lakeOptions={lakeOptions}
          selectedLake={selectedLake}
          onLakeChange={(v) => {
            setSelectedLake(v);
            setSelectedOrg("");
            setSelectedStations([]);
            setSelectedParam("");
            setStations([]);
            setEffectiveAllRecords([]);
            const cls = lakeClassMap.get(String(v));
            if (cls) setSelectedClass(cls);
          }}
          orgOptions={orgOptions}
          selectedOrg={selectedOrg}
          onOrgChange={(v) => {
            setSelectedOrg(v);
            setSelectedStations([]);
            setSelectedParam("");
            setEffectiveAllRecords([]);
          }}
          stations={stations}
          selectedStations={selectedStations}
          onStationsChange={setSelectedStations}
          paramOptions={paramOptions}
          selectedParam={selectedParam}
          onParamChange={setSelectedParam}
          thresholds={thresholds}
          currentRecords={currentRecords}
          selectedClass={selectedClass}
          bucket={bucket}
          chartOptions={chartOptions}
          chartRef={singleChartRef}
        />
      )}

      {activeTab === 'compare' && (
        <CompareLake
          lakeOptions={lakeOptions}
          params={paramOptions}
          thresholds={thresholds}
          chartOptions={chartOptions}
          bucket={bucket}
          chartRef={compareChartRef}
          timeRange={timeRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}

  {activeTab === 'advanced' && <AdvancedStat lakes={lakeOptions} params={paramOptions} staticThresholds={thresholds} />}

      {/* Footer actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', gap: 8, marginTop: 12 }}>
        <div>
          <button className="pill-btn" onClick={handleClear}>Clear</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pill-btn" onClick={handleExport}>Export</button>
          <button className="pill-btn liquid" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
