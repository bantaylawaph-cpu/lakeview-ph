// resources/js/components/modals/StatsModal.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { apiPublic, buildQuery, getToken } from "../../lib/api";
import { alertError } from "../../lib/alerts";
import { fetchParameters, fetchSampleEvents, fetchStationsForLake, deriveOrgOptions, deriveParamOptions } from "./data/fetchers";
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
  const [compareSelectedParam, setCompareSelectedParam] = useState("");
  const advancedRef = useRef(null);
  const compareRef = useRef(null);
  const [authed, setAuthed] = useState(!!getToken());
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
    if (activeTab === 'compare' && compareRef.current && typeof compareRef.current.clearAll === 'function') {
      compareRef.current.clearAll();
    }
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
      const label = activeTab === "single"
        ? `${lakeName}-${selectedParam || "param"}`
        : `compare-${compareSelectedParam || "param"}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `stats-${label}-${ts}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {}
  };

  const ensureAuthOrPrompt = useCallback(async () => {
    const token = getToken();
    if (token) { setAuthed(true); return true; }
    await alertError('Sign in required', 'You must be a registered user to export results.');
    return false;
  }, []);

  // Fetch lakes + parameter options when modal opens (centralized fetching)
  useEffect(() => {
    let mounted = true;
    if (!open) return;

    (async () => {
      try {
        const { fetchLakeOptions } = await import("../../lib/layers");
        const lakes = await fetchLakeOptions();
        if (!mounted) return;
  const base = Array.isArray(lakes) ? lakes : [];
  setLakeOptions(base);
        const map = new Map();
  (base || []).forEach((r) => map.set(String(r.id), r.class_code || ""));
        setLakeClassMap(map);
      } catch (e) {
        if (mounted) setLakeOptions([]);
      }
      try { const list = await fetchParameters(); if (mounted) setParamOptions(list); }
      catch { if (mounted) setParamOptions([]); }
    })();

    return () => { mounted = false; };
  }, [open]);

  // Stations list for Single tab (lake-based) via centralized fetcher
  useEffect(() => {
    let mounted = true;
    if (!selectedLake) { setStations([]); return; }

    (async () => {
      try {
        const lim = (timeRange === "all" || timeRange === "custom") ? 5000 : 1000;
        let fromEff, toEff;
        if (timeRange === 'all') { fromEff = undefined; toEff = undefined; }
        else if (!dateFrom && !dateTo) { const d = new Date(); d.setFullYear(d.getFullYear() - 5); fromEff = fmtIso(d); toEff = fmtIso(new Date()); }
        else { fromEff = dateFrom || undefined; toEff = dateTo || undefined; }
        const list = await fetchStationsForLake({ lakeId: selectedLake, from: fromEff, to: toEff, limit: lim });
        if (mounted) setStations(list);
      } catch { if (mounted) setStations([]); }
    })();

    return () => { mounted = false; };
  }, [selectedLake, dateFrom, dateTo, timeRange]);

  // Records for Single tab via centralized fetcher
  useEffect(() => {
    let mounted = true;
    if (!selectedLake) { setEffectiveAllRecords([]); return; }

    (async () => {
      try {
        const lim = (timeRange === "all" || timeRange === "custom") ? 5000 : 1000;
        let fromEff, toEff;
        if (timeRange === 'all') { fromEff = undefined; toEff = undefined; }
        else if (!dateFrom && !dateTo) { const d = new Date(); d.setFullYear(d.getFullYear() - 5); fromEff = fmtIso(d); toEff = fmtIso(new Date()); }
        else { fromEff = dateFrom || undefined; toEff = dateTo || undefined; }
        const recs = await fetchSampleEvents({ lakeId: selectedLake, from: fromEff, to: toEff, limit: lim, organizationId: selectedOrg || undefined });
        if (!mounted) return;
        setEffectiveAllRecords(recs);
        setOrgOptions(deriveOrgOptions(recs));
        // merge derived params if new ones appear
        const derived = deriveParamOptions(recs);
        if (derived.length) {
          setParamOptions(prev => {
            const seen = new Set(prev.map(p => p.key || p.code));
            const add = derived.filter(d => !seen.has(d.key || d.code));
            return add.length ? [...prev, ...add] : prev;
          });
        }
      } catch (e) { if (mounted) setEffectiveAllRecords([]); }
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

  // Removed auto-selection: user must manually choose parameter

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span style={{ color: '#fff' }}>{title}</span>}
      ariaLabel="Lake statistics modal"
      width={1100}
      style={modalStyle}
      footerStyle={{
        background: 'transparent',
        borderTop: '1px solid rgba(255,255,255,0.18)',
        color: '#fff',
      }}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', gap: 8 }}>
          <div>
            <button className="pill-btn" onClick={async () => {
              if (activeTab === 'advanced' && advancedRef.current && typeof advancedRef.current.clearAll === 'function') {
                advancedRef.current.clearAll();
              } else {
                handleClear();
              }
            }}>Clear</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pill-btn" onClick={async () => {
              if (!(await ensureAuthOrPrompt())) return;
              if (activeTab === 'advanced' && advancedRef.current && typeof advancedRef.current.exportPdf === 'function') {
                advancedRef.current.exportPdf();
              } else {
                handleExport();
              }
            }} title={authed ? undefined : 'Sign in to export'}>Export</button>
          </div>
        </div>
      }
    >
      {/* Header controls: Bucket & Range + Tabs */}
      <div style={{ display: "flex", gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Bucket</span>
          <select
            className="pill-btn"
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            disabled={activeTab === 'advanced'}
            aria-disabled={activeTab === 'advanced'}
            title={activeTab === 'advanced' ? 'Disabled while Advanced tab is active' : undefined}
            style={activeTab === 'advanced' ? { opacity: 0.55, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
          >
            <option value="year">Year</option>
            <option value="quarter">Quarter</option>
            <option value="month">Month</option>
          </select>

          <span style={{ fontSize: 12, opacity: 0.9, marginLeft: 8 }}>Range</span>
          <select
            className="pill-btn"
            value={timeRange}
            onChange={(e) => applyRange(e.target.value)}
            disabled={activeTab === 'advanced'}
            aria-disabled={activeTab === 'advanced'}
            title={activeTab === 'advanced' ? 'Disabled while Advanced tab is active' : undefined}
            style={activeTab === 'advanced' ? { opacity: 0.55, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
          >
            <option value="all">All Time</option>
            <option value="5y">5 Yr</option>
            <option value="3y">3 Yr</option>
            <option value="1y">1 Yr</option>
            <option value="6mo">6 Mo</option>
            <option value="custom">Custom</option>
          </select>

          {timeRange === 'custom' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', opacity: activeTab === 'advanced' ? 0.65 : 1 }}>
              <input
                type="date"
                className="pill-btn"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setTimeRange('custom'); }}
                disabled={activeTab === 'advanced'}
                aria-disabled={activeTab === 'advanced'}
                title={activeTab === 'advanced' ? 'Disabled while Advanced tab is active' : undefined}
                style={activeTab === 'advanced' ? { cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
              />
              <span>to</span>
              <input
                type="date"
                className="pill-btn"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setTimeRange('custom'); }}
                disabled={activeTab === 'advanced'}
                aria-disabled={activeTab === 'advanced'}
                title={activeTab === 'advanced' ? 'Disabled while Advanced tab is active' : undefined}
                style={activeTab === 'advanced' ? { cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
              />
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
            timeRange={timeRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
        />
      )}

      {activeTab === 'compare' && (
        <CompareLake
          ref={compareRef}
          lakeOptions={lakeOptions}
          params={paramOptions}
          thresholds={thresholds}
          chartOptions={chartOptions}
          bucket={bucket}
          chartRef={compareChartRef}
          timeRange={timeRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onParamChange={setCompareSelectedParam}
        />
      )}

  {activeTab === 'advanced' && <AdvancedStat ref={advancedRef} lakes={lakeOptions} params={paramOptions} staticThresholds={thresholds} />}

    </Modal>
  );
}
