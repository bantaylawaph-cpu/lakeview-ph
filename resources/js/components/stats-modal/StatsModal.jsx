// resources/js/components/modals/StatsModal.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { apiPublic, buildQuery, getToken } from "../../lib/api";
import Swal from "sweetalert2";
import { alertError, alertInfo } from "../../lib/alerts";
import { fetchParameters, fetchSampleEvents, fetchStationsForLake, deriveOrgOptions, deriveParamOptions } from "./data/fetchers";
import Modal from "../Modal";
import SingleLake from "./SingleLake";
import CompareLake from "./CompareLake";
import AdvancedStat from "./AdvancedStat";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, BarElement } from "chart.js";
import { yearLabelPlugin } from "./utils/shared";
import { exportAndDownload, exportCsvFromChart } from "./utils/exportChart";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, BarElement);
// Ensure custom plugins used by charts are registered in this module too
try { ChartJS.register(yearLabelPlugin); } catch {}

export default function StatsModal({ open, onClose, title = "Lake Statistics" }) {
  const modalStyle = {
    background: "rgba(30, 60, 120, 0.65)",
    color: "#fff",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.25)",
  };

  const [isModalOpen, setIsModalOpen] = useState(open);
  useEffect(() => setIsModalOpen(open), [open]);

  const handleClose = () => {
    setIsModalOpen(false);
    setTimeout(() => onClose(), 300); // Allow fade out
  };

  const [activeTab, setActiveTab] = useState("single");
  const [bucket, setBucket] = useState("month");

  // Single tab selections
  const [selectedLake, setSelectedLake] = useState("");
  const [selectedStations, setSelectedStations] = useState([]);
  const [selectedParams, setSelectedParams] = useState([]);
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
    setSelectedParams([]);
    setEffectiveAllRecords([]);
  // CompareLake manages its own records; nothing to clear here
    if (activeTab === 'compare' && compareRef.current && typeof compareRef.current.clearAll === 'function') {
      compareRef.current.clearAll();
    }
    setDateFrom("");
    setDateTo("");
    setTimeRange("all");
    // Reset bucket, class and compare param selections
    setBucket('month');
    setSelectedClass('C');
    setCompareSelectedParam('');
  };

  const handleExport = () => {
    try {
      const ref = activeTab === "single" ? singleChartRef : compareChartRef;
      const inst = ref?.current;
      const hasData = (() => {
        try {
          const data = inst?.data || inst?.config?.data;
          const ds = Array.isArray(data?.datasets) ? data.datasets : [];
          return inst && ds.length > 0 && ds.some(d => Array.isArray(d?.data) ? d.data.length > 0 : !!d?.data);
        } catch { return false; }
      })();
      if (!inst || !hasData) {
        alertInfo('Generate a chart first');
        return;
      }

      Swal.fire({
        title: 'Export Options',
        text: 'Choose a format to export your chart.',
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'PNG',
        denyButtonText: 'Excel (CSV)',
        cancelButtonText: 'Cancel',
        focusConfirm: true,
      }).then((res) => {
        const lakeName = lakeOptions.find((l) => String(l.id) === String(selectedLake))?.name || "lake";
        const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
            const baseLabel = activeTab === "single"
              ? `${lakeName}-${(Array.isArray(selectedParams) ? (selectedParams.length === 1 ? selectedParams[0] : 'multi-params') : 'param')}`
          : `compare-${compareSelectedParam || "param"}`;

        if (res.isConfirmed) {
          exportAndDownload(inst, `stats-${baseLabel}-${ts}.png`);
        } else if (res.isDenied) {
          exportCsvFromChart(inst, `stats-${baseLabel}-${ts}.csv`);
        } else {
          // canceled
        }
      });
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
        const lakes = await fetchLakeOptions("", { hasData: true });
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
      open={isModalOpen}
      onClose={handleClose}
      title={<span style={{ color: '#fff' }}>{title}</span>}
      ariaLabel="Lake statistics modal"
      width={1100}
      // ensure the page-level sidebar (StatsSidebar) can render above the modal overlay
      overlayZIndex={9990}
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
              if (activeTab === 'advanced') {
                try {
                  if (advancedRef.current && typeof advancedRef.current.exportPdf === 'function') {
                    await advancedRef.current.exportPdf();
                  } else {
                    alertInfo('Generate a chart first');
                  }
                } catch { /* silent */ }
              } else {
                handleExport();
              }
            }} title={authed ? undefined : 'Sign in to export'}>Export</button>
          </div>
        </div>
      }
    >

      {/* Tabs on top */}
      <div style={{ display: 'flex', justifyContent: 'left', gap: 6, marginBottom: 12 }}>
        {tabBtn('single', 'Single')}
        {tabBtn('compare', 'Compare')}
        {tabBtn('advanced', 'Advanced')}
      </div>

      <div>
        {activeTab === 'single' && (
          <SingleLake
            lakeOptions={lakeOptions}
            selectedLake={selectedLake}
            onLakeChange={(v) => {
              setSelectedLake(v);
              setSelectedOrg("");
              setSelectedStations([]);
              setSelectedParams([]);
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
              setSelectedParams([]);
              setEffectiveAllRecords([]);
            }}
            stations={stations}
            selectedStations={selectedStations}
            onStationsChange={setSelectedStations}
            paramOptions={paramOptions}
            selectedParams={selectedParams}
            onParamsChange={setSelectedParams}
            currentRecords={currentRecords}
            selectedClass={selectedClass}
            bucket={bucket}
            setBucket={setBucket}
            chartOptions={chartOptions}
            chartRef={singleChartRef}
            timeRange={timeRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setTimeRange={setTimeRange}
            setDateFrom={setDateFrom}
            setDateTo={setDateTo}
            isModalOpen={isModalOpen}
          />
        )}

        {activeTab === 'compare' && (
          <CompareLake
            ref={compareRef}
            lakeOptions={lakeOptions}
            params={paramOptions}
            chartOptions={chartOptions}
            bucket={bucket}
            setBucket={setBucket}
            chartRef={compareChartRef}
            timeRange={timeRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setTimeRange={setTimeRange}
            setDateFrom={setDateFrom}
            setDateTo={setDateTo}
            onParamChange={setCompareSelectedParam}
            isModalOpen={isModalOpen}
          />
        )}

        {activeTab === 'advanced' && <AdvancedStat ref={advancedRef} lakes={lakeOptions} params={paramOptions} />}
      </div>

    </Modal>
  );
}
