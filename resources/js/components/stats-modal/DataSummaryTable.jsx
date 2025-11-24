import React, { useEffect, useMemo, useState, useRef } from 'react';
import Swal from 'sweetalert2';
import Modal from '../Modal';
import useStationsCache from './hooks/useStationsCache';
import useSampleEvents from './hooks/useSampleEvents';
import LoadingSpinner from '../LoadingSpinner';
import api, { getToken } from '../../lib/api';
import { cachedGet } from '../../lib/httpCache';
import LakeSelect from './ui/LakeSelect';
import OrgSelect from './ui/OrgSelect';
import { confirm as confirmAlert } from '../../lib/alerts';

function getThresholdClass(value, threshold) {
  const num = Number(value);
  const hasNoThreshold = !threshold || (threshold.min_value == null && threshold.max_value == null);
  if (hasNoThreshold || !Number.isFinite(num)) return '';
  const min = threshold.min_value != null ? Number(threshold.min_value) : null;
  const max = threshold.max_value != null ? Number(threshold.max_value) : null;
  const fails = (min != null && num < min) || (max != null && num > max);
  return fails ? 'ds-cell-exceed' : 'ds-cell-ok';
}

function ValueCell({ value, unit, threshold }) {
  const num = Number(value);
  const cls = getThresholdClass(value, threshold);
  return (
    <td className={cls}>{Number.isFinite(num) ? num.toFixed(2) : (value ?? '')}</td>
  );
}

export default function DataSummaryTable({ open, onClose, initialLake = '', initialOrg = '', initialStation = '' }) {
  const modalStyle = {
    background: "rgba(30, 60, 120, 0.65)",
    color: "#fff",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.25)",
  };
  const [lakeId, setLakeId] = useState(initialLake);
  const [orgId, setOrgId] = useState(initialOrg);
  const [lakeOptions, setLakeOptions] = useState([]);
  const { orgOptions, stationsByOrg, allStations, loading: stationsLoading } = useStationsCache(lakeId);
  const stationsList = useMemo(() => (!orgId ? (allStations || []) : (stationsByOrg?.[String(orgId)] || [])), [orgId, allStations, stationsByOrg]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const tableRef = useRef(null);
  

  const shouldLoadEvents = Boolean(lakeId && orgId);
  const effectiveLake = shouldLoadEvents ? lakeId : '';
  const effectiveOrg = shouldLoadEvents ? orgId : '';
  const { events, loading } = useSampleEvents(effectiveLake, effectiveOrg, 'all');

  useEffect(() => {
    setLakeId(initialLake);
  }, [initialLake]);

  useEffect(() => {
    setOrgId(initialOrg);
  }, [initialOrg]);

  const stationOptions = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) {
      return stationsList.map(s => ({ id: s, name: s }));
    }
    const map = new Map();
    for (const ev of events) {
      const st = ev.station || null;
      if (st && st.id != null) {
        if (!map.has(String(st.id))) map.set(String(st.id), st.name || st.label || String(st.id));
      } else {
        const name = ev.station_name || (st && (st.name || st.label)) || null;
        if (name && !map.has(name)) map.set(name, name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [events, stationsList]);

  const yearOptions = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) return [];
    const set = new Set();
    for (const ev of events) {
      if (!ev.sampled_at) continue;
      const y = new Date(ev.sampled_at).getFullYear();
      if (!Number.isNaN(y)) set.add(y);
    }
    return Array.from(set).sort((a,b) => b - a).map(String);
  }, [events]);

  useEffect(() => {
    if (!(open && initialStation)) {
      setSelectedStation('');
      setSelectedYear('');
    }
  }, [lakeId, orgId, open, initialStation]);

  useEffect(() => {
    if (open && initialStation) {
      setSelectedStation(initialStation);
    }
  }, [open, initialStation]);

  useEffect(() => {
    if (open && initialStation && Array.isArray(events) && events.length > 0) {
      let maxYear = null;
      for (const ev of events) {
        const stationName = ev.station?.name || ev.station_name || '';
        const stationId = ev.station?.id != null ? String(ev.station.id) : null;
        if (stationId === initialStation || stationName === initialStation) {
          if (ev.sampled_at) {
            const y = new Date(ev.sampled_at).getFullYear();
            if (!Number.isNaN(y) && (maxYear === null || y > maxYear)) {
              maxYear = y;
            }
          }
        }
      }
      if (maxYear !== null) {
        setSelectedYear(String(maxYear));
      }
    }
  }, [open, initialStation, events]);

  async function isSignedIn() {
    try {
      const tok = typeof getToken === 'function' ? getToken() : null;
      if (tok) return true;
    } catch {}
    if (window?.currentUser) return true;
    try {
      const res = await api('/user');
      return !!(res && (res.id || res.data?.id));
    } catch (e) {
      return false;
    }
  }

  function toFiniteNumbers(arr) {
    const out = [];
    for (const v of arr) {
      const n = Number(v);
      if (Number.isFinite(n)) out.push(n);
    }
    return out;
  }

  function arithmeticMean(values) {
    const nums = toFiniteNumbers(values);
    if (nums.length === 0) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return sum / nums.length;
  }

  function geometricMean(values) {
    const nums = toFiniteNumbers(values);
    if (nums.length === 0) return null;
    if (!nums.every(n => n > 0)) return null;
    const logSum = nums.reduce((a, b) => a + Math.log(b), 0);
    return Math.exp(logSum / nums.length);
  }

  function median(values) {
    const nums = toFiniteNumbers(values).sort((a, b) => a - b);
    const n = nums.length;
    if (n === 0) return null;
    const mid = Math.floor(n / 2);
    if (n % 2 === 0) return (nums[mid - 1] + nums[mid]) / 2;
    return nums[mid];
  }

  function hasOutliers(values) {
    const nums = toFiniteNumbers(values).sort((a, b) => a - b);
    const n = nums.length;
    if (n < 4) return false;
    const q1 = quantile(nums, 0.25);
    const q3 = quantile(nums, 0.75);
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    return nums.some(v => v < lo || v > hi);
  }

  function quantile(sortedNums, p) {
    if (!sortedNums.length) return NaN;
    const pos = (sortedNums.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedNums[base + 1] !== undefined) {
      return sortedNums[base] + rest * (sortedNums[base + 1] - sortedNums[base]);
    } else {
      return sortedNums[base];
    }
  }

  function meetsThreshold(value, threshold) {
    const num = Number(value);
    if (!Number.isFinite(num) || !threshold) return false;
    const min = threshold.min_value != null ? Number(threshold.min_value) : null;
    const max = threshold.max_value != null ? Number(threshold.max_value) : null;
    if (min == null && max == null) return false;
    if (min != null && num < min) return false;
    if (max != null && num > max) return false;
    return true;
  }

  function formatPct(n) {
    if (n == null || !Number.isFinite(n)) return '—';
    return `${n.toFixed(0)}%`;
  }

  function getComplianceClass(pct) {
    if (!Number.isFinite(pct)) return '';
    if (pct >= 90) return 'ds-comp-high';
    if (pct >= 50) return 'ds-comp-mid';
    return 'ds-comp-low';
  }

  function getComplianceLabel(pct) {
    if (!Number.isFinite(pct)) return '';
    if (pct >= 90) return 'High Compliance';
    if (pct >= 50) return 'Marginal Compliance';
    return 'Low Compliance / Non-Attainment';
  }

  function exportPdfHtml(html, meta = {}) {
    const w = window.open('', '_blank');
    if (!w) { alert('Unable to open print window'); return; }
    const css = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #111; margin: 18pt; }
      .pv-header { margin-bottom: 12px; }
      .pv-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
      .pv-meta { font-size: 12px; color: #374151; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; }
      th, td { padding: 6px 8px; border: 1px solid #ddd; }
      thead th { background: #f3f4f6; font-weight: 700; }
      .ds-cell-exceed { background: rgba(239,68,68,0.12) !important; color: #ef4444 !important; }
      .ds-cell-ok { background: rgba(16,185,129,0.12) !important; color: #10b981 !important; }
      .ds-summary { max-width: 100%; }
      .ds-comp-high { background: rgba(16,185,129,0.12) !important; color: #10b981 !important; }
      .ds-comp-mid { background: rgba(234,179,8,0.12) !important; color: #ca8a04 !important; }
      .ds-comp-low { background: rgba(239,68,68,0.12) !important; color: #ef4444 !important; }
      @media print { 
        body { margin: 6mm; }
        .no-print { display: none !important; }
      }
    `;

    const lakeLabel = meta.lakeName ? `<div class="pv-title">${meta.lakeName}</div>` : '';
    const metaParts = [];
    if (meta.datasetName) metaParts.push(`Dataset: ${meta.datasetName}`);
    if (meta.year) metaParts.push(`Year: ${meta.year}`);
    if (meta.stationName) metaParts.push(`Station: ${meta.stationName}`);
    const metaLine = metaParts.length ? `<div class="pv-meta">${metaParts.join(' — ')}</div>` : '';

    const header = `<div class="pv-header">${lakeLabel}${metaLine}</div>`;

    w.document.write(`<!doctype html><html><head><title>Data Summary</title><meta charset="utf-8"><style>${css}</style></head><body>${header}${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 250);
  }

  async function handleExportPdfViaSweetAlert() {
    const signed = await isSignedIn();
    if (!signed) {
      if (Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'warning', title: 'Sign in required', text: 'Please sign in to export data.' });
      } else {
        window.alert('Please sign in to export data.');
      }
      return;
    }
    const wrapper = tableRef.current || document.querySelector('.modal');
    if (!wrapper) {
      if (Swal && typeof Swal.fire === 'function') Swal.fire({ icon: 'info', title: 'No table', text: 'No table to export' }); else window.alert('No table to export');
      return;
    }
    const confirm = await confirmAlert({
      title: 'Export PDF',
      text: 'Do you want to download this summary as a PDF?',
      confirmButtonText: 'Download PDF',
      cancelButtonText: 'Cancel',
      icon: 'info',
    });
    if (!confirm) return;
    const tbl = wrapper.querySelector ? (wrapper.querySelector('table') || wrapper) : wrapper;
    const htmlToPrint = tbl.outerHTML || tbl.innerHTML || '';
    const lakeName = (lakeOptions.find(l => String(l.id) === String(lakeId)) || {}).name || '';
    const datasetName = (orgOptions || []).find(o => String(o.id) === String(orgId))?.name || '';
    const stationName = (stationOptions || []).find(s => String(s.id) === String(selectedStation))?.name || (stationsList.find(s => String(s) === String(selectedStation)) || '') || '';
    const meta = { lakeName, datasetName, year: selectedYear, stationName };
    try {
      exportPdfHtml(htmlToPrint, meta);
    } catch (e) {
      if (Swal && typeof Swal.fire === 'function') Swal.fire({ icon: 'error', title: 'Export failed', text: 'Unable to open print window' }); else window.alert('Unable to open print window');
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { fetchLakeOptions } = await import('../../lib/layers');
        const lakes = await fetchLakeOptions();
        if (!mounted) return;
        const base = Array.isArray(lakes) ? lakes : [];
        setLakeOptions(base);
        return;
      } catch (e) {
      }
      try {
        const res = await cachedGet('/lakes', { ttlMs: 10 * 60 * 1000, auth: false });
        if (!mounted) return;
        const list = Array.isArray(res) ? res : (res?.data || []);
        setLakeOptions(list);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const rows = useMemo(() => {
    if (!Array.isArray(events)) return [];
    const out = [];
    for (const ev of events) {
      if (selectedYear) {
        const evYear = ev.sampled_at ? new Date(ev.sampled_at).getFullYear() : null;
        if (evYear == null || String(evYear) !== String(selectedYear)) continue;
      }
      const sampled = ev.sampled_at ? new Date(ev.sampled_at).toISOString().slice(0,10) : '';
      const stationName = ev.station?.name || ev.station_name || '';
      const stationId = ev.station?.id != null ? String(ev.station.id) : null;
      if (selectedStation && selectedStation !== '') {
        if (!(stationId === selectedStation || stationName === selectedStation)) continue;
      }
      const org = ev.organization_name || '';
      const results = Array.isArray(ev.results) ? ev.results : [];
      for (const r of results) {
        const p = r.parameter || {};
        out.push({
          id: `${ev.id}-${r.parameter_id}`,
          station: stationName,
          date: sampled,
          parameter: p.name || p.code || String(r.parameter_id || ''),
          value: r.value,
          unit: p.unit || r.unit || '',
          threshold: r.threshold || null,
          org,
        });
      }
    }
    return out;
  }, [events, selectedStation, selectedYear]);

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pivot = useMemo(() => {
    if (!selectedStation) return null;
    if (!Array.isArray(events)) return { months: [], params: [] };
    const stationEvents = events.filter(ev => {
      const name = ev.station?.name || ev.station_name || '';
      const id = ev.station?.id != null ? String(ev.station.id) : null;
      return id === selectedStation || name === selectedStation;
    });
    const filteredEvents = selectedYear ? stationEvents.filter(ev => {
      if (!ev.sampled_at) return false;
      const y = new Date(ev.sampled_at).getFullYear();
      return String(y) === String(selectedYear);
    }) : stationEvents;
  const monthSet = new Set();
  const paramMap = new Map();
  for (const ev of filteredEvents) {
      if (!ev.sampled_at) continue;
      const sampled = new Date(ev.sampled_at);
      if (Number.isNaN(sampled.getTime())) continue;
      const m = sampled.getMonth();
      monthSet.add(m);
      const results = Array.isArray(ev.results) ? ev.results : [];
      for (const r of results) {
        const pName = r.parameter?.name || r.parameter?.code || String(r.parameter_id || '');
        const hasDepthExplicit = Object.prototype.hasOwnProperty.call(r, 'depth_m');
        const depthValue = hasDepthExplicit ? (r.depth_m == null ? 0 : r.depth_m) : undefined;
        const key = hasDepthExplicit ? `${pName}::depth:${depthValue}` : pName;
        if (!paramMap.has(key)) {
          paramMap.set(key, { meta: { hasDepthExplicit, depthValue, depthWasNull: hasDepthExplicit && r.depth_m == null, threshold: null, unit: r.parameter?.unit || r.unit || '' }, cells: {} });
        }
        const entry = paramMap.get(key);
        const cellMap = entry.cells;
        const prev = cellMap[m];
        const threshold = r.threshold || null;
        if (!prev || sampled > prev.date) {
          cellMap[m] = {
            date: sampled,
            value: r.value,
            unit: r.parameter?.unit || r.unit || '',
            threshold,
            hasDepthExplicit: entry.meta.hasDepthExplicit,
            depthValue: entry.meta.depthValue,
          };
        }
        if (threshold && !entry.meta.threshold) entry.meta.threshold = threshold;
        if (!entry.meta.unit && (r.parameter?.unit || r.unit)) entry.meta.unit = r.parameter?.unit || r.unit || '';
      }
    }
  const months = Array.from(monthSet).sort((a,b)=>a-b);

    const depthGroups = new Map();
    for (const [key, obj] of paramMap.entries()) {
      const base = key.includes('::depth:') ? key.split('::depth:')[0] : key;
      if (!depthGroups.has(base)) depthGroups.set(base, []);
      if (obj.meta.hasDepthExplicit) depthGroups.get(base).push(key);
    }

    for (const [key, obj] of paramMap.entries()) {
      const base = key.includes('::depth:') ? key.split('::depth:')[0] : key;
      if (obj.meta.hasDepthExplicit) {
        const group = depthGroups.get(base) || [];
        const onlyNullDepth = obj.meta.depthWasNull && group.length === 1;
        obj.meta.showDepth = !onlyNullDepth;
      } else {
        obj.meta.showDepth = false;
      }
      obj.meta.displayName = base;
    }

    const params = Array.from(paramMap.entries()).map(([key, obj]) => {
      const map = obj.cells;
      const name = obj.meta.displayName;
      const cells = months.map(mi => map[mi] ?? null);
      return { name, cells, meta: obj.meta };
    });
    return { months, params };
  }, [events, selectedStation, selectedYear]);

  const selectedLake = useMemo(() => {
    if (!lakeId) return null;
    return (lakeOptions || []).find(l => String(l.id) === String(lakeId)) || null;
  }, [lakeId, lakeOptions]);

  function getThresholdStdLabel(th) {
    if (!th) return '';
    const coerce = (v) => {
      if (v == null) return '';
      if (typeof v === 'string' || typeof v === 'number') return String(v);
      if (typeof v === 'object') {
        const keys = ['code', 'short_code', 'standard_code', 'dao_code', 'id', 'name', 'title', 'label'];
        for (const k of keys) {
          if (v[k] != null && v[k] !== '') return String(v[k]);
        }
      }
      return '';
    };
    const candidates = [
      th.standard,
      th.standard_name,
      th.source,
      th.reference,
      th.name,
      th.code,
      th.standard_code,
      th.dao_code,
    ];
    for (const c of candidates) {
      const s = coerce(c);
      if (s) return s;
    }
    return '';
  }

  function hasThresholdBounds(th) {
    return !!(th && (th.min_value != null || th.max_value != null));
  }

  return (
  <Modal
    open={open}
    onClose={onClose}
    title={<span style={{ color: '#fff' }}>Data Summary</span>}
    ariaLabel="Data Summary Table"
    /* Use a responsive width that caps at 1600px but will shrink to viewport width on small screens */
    width={"min(1600px, 95vw)"}
    style={modalStyle}
    footerStyle={{
      background: 'transparent',
      borderTop: '1px solid rgba(255,255,255,0.18)',
      color: '#fff',
    }}
    footer={
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        <button className="pill-btn" onClick={() => { setLakeId(''); setOrgId(''); setSelectedYear(''); setSelectedStation(''); }}>Clear</button>
        <button className="pill-btn" onClick={handleExportPdfViaSweetAlert}>Export PDF</button>
      </div>
    }
  >
    <div className="ds-summary">
      <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
        <div className="ds-controls-row">
          <div className="ds-field lake">
            <div className="ds-label">Lake</div>
            <LakeSelect lakes={lakeOptions} value={lakeId} onChange={(e) => { setLakeId(e.target.value); setOrgId(''); }} />
          </div>

          <div className="ds-field org">
            <div className="ds-label">Dataset Source</div>
            <OrgSelect options={orgOptions || []} value={orgId} onChange={(e) => setOrgId(e.target.value)} disabled={!lakeId} required={false} placeholder="Select a dataset" loading={stationsLoading} />
          </div>

          <div className="ds-field station">
            <div className="ds-label">Station</div>
            <div style={{ position: 'relative' }}>
              <select className="pill-btn" value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)} disabled={!lakeId || !orgId || loading} style={{ paddingRight: loading ? 44 : 12 }}>
                <option value="">Select a station</option>
                {stationOptions.length > 0 ? stationOptions.map(opt => (<option key={opt.id} value={opt.id}>{opt.name}</option>)) : stationsList.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
              {loading ? (
                <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                  <LoadingSpinner inline size={16} label="" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="ds-field year">
            <div className="ds-label">Year</div>
            <div style={{ position: 'relative' }}>
              <select className="pill-btn" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} disabled={!lakeId || !orgId || loading} style={{ paddingRight: loading ? 44 : 12 }}>
                <option value="">Select a year</option>
                {yearOptions.map(y => (<option key={y} value={y}>{y}</option>))}
              </select>
              {loading ? (
                <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                  <LoadingSpinner inline size={16} label="" />
                </div>
              ) : null}
            </div>
          </div>
        </div>

  <div className="ds-table-wrap modern-scrollbar" ref={tableRef} style={{ width: '100%', maxWidth: 'none' }}>
          {(loading && lakeId && orgId && selectedYear && selectedStation) ? (
            <div className="ds-center-loading"><LoadingSpinner label="Loading table…" size={28} /></div>
          ) : (!lakeId || !orgId || !selectedYear || !selectedStation) ? (
            <div className="ds-empty">Please select a Lake, Dataset Source, Station and Year to view this table.</div>
          ) : pivot ? (
            <table className="ds-table lv-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  {pivot.months.length === 0 ? (
                    <th>No months</th>
                  ) : pivot.months.map(m => (
                    <th key={m}>{MONTH_NAMES[m]}</th>
                  ))}
                  <th>Year Average</th>
                  <th>Median</th>
                  <th>% Compliance</th>
                </tr>
              </thead>
              <tbody>
                {pivot.params.length === 0 ? (
                  <tr><td style={{ padding: 10 }} colSpan={pivot.months.length + 4}>No data for this station.</td></tr>
                ) : pivot.params.map(p => (
                  <tr key={p.name}>
                    <td className="ds-param-col">
                      <div className="ds-param-meta">
                        <div className="ds-param-main">
                          <div className="ds-param-name">{p.name}</div>
                          {p.meta?.unit ? (<div className="ds-param-unit">{p.meta.unit}</div>) : null}
                        </div>
                        {p.meta ? (
                          <div className="ds-threshold">
                            <div className="ds-threshold-chip">
                              {(() => {
                                const t = p.meta.threshold;
                                if (!t || (t.min_value == null && t.max_value == null)) return 'No threshold data available';
                                const parts = [];
                                if (t.min_value != null) parts.push(`≥ ${t.min_value}`);
                                if (t.max_value != null) parts.push(`≤ ${t.max_value}`);
                                const std = getThresholdStdLabel(t);
                                const lakeClass = (selectedLake?.class_code || selectedLake?.classification || '').toString();
                                const classDisplay = lakeClass ? (lakeClass.startsWith('Class') ? lakeClass : `Class ${lakeClass}`) : '';
                                const suffix = (std || classDisplay) ? ` (${[std, classDisplay].filter(Boolean).join(' - ')})` : '';
                                return `Threshold: ${parts.join(' — ')}${suffix}`;
                              })()}
                            </div>
                          </div>
                        ) : null}
                        {p.meta?.showDepth && p.meta.depthValue != null ? (
                          <div className="ds-depth-line">{`Depth: ${p.meta.depthValue} m`}</div>
                        ) : null}
                      </div>
                    </td>
                    {p.cells.map((c, i) => {
                      const empty = !c;
                      if (empty) return (<td key={i}>—</td>);
                      const num = Number(c.value);
                      const t = hasThresholdBounds(c?.threshold) ? c.threshold : (hasThresholdBounds(p.meta?.threshold) ? p.meta.threshold : null);
                      const cls = getThresholdClass(c.value, t);
                      return (
                        <td key={i} className={cls}>
                          {Number.isFinite(num) ? (num.toFixed(2)) : (c.value ?? '')}
                        </td>
                      );
                    })}
                    {(() => {
                      const values = p.cells.map(c => (c ? Number(c.value) : null)).filter(v => Number.isFinite(Number(v))).map(Number);
                      const outlierFlag = hasOutliers(values);
                      let avg = null;
                      if (outlierFlag) {
                        const g = geometricMean(values);
                        avg = g != null ? g : arithmeticMean(values);
                      } else {
                        avg = arithmeticMean(values);
                      }
                      const med = median(values);
                      const paramT = p.meta?.threshold || null;
                      let meet = 0, total = 0;
                      for (const c of p.cells) {
                        if (!c || !Number.isFinite(Number(c.value))) continue;
                        const effT = hasThresholdBounds(c?.threshold) ? c.threshold : (hasThresholdBounds(paramT) ? paramT : null);
                        if (!effT) continue;
                        total += 1;
                        if (meetsThreshold(c.value, effT)) meet += 1;
                      }
                      const pct = total > 0 ? (meet / total) * 100 : null;
                      // Remove color-coding for % Compliance cells
                      const avgCls = hasThresholdBounds(paramT) ? getThresholdClass(avg, paramT) : '';
                      const medCls = hasThresholdBounds(paramT) ? getThresholdClass(med, paramT) : '';
                      return (
                        <>
                          <td className={avgCls}>{avg == null ? '—' : avg.toFixed(2)}</td>
                          <td className={medCls}>{med == null ? '—' : med.toFixed(2)}</td>
                          <td>{pct == null ? '—' : `${formatPct(pct)}`}</td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="ds-table lv-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Date</th>
                  <th>Parameter</th>
                  <th>Value</th>
                  <th>Threshold</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td style={{ padding: 10 }} colSpan={6}>No data for this selection.</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id}>
                    <td>{r.station}</td>
                    <td>{r.date}</td>
                    <td>
                      <div className="ds-param-meta">
                        <div className="ds-param-name">{r.parameter}{r.unit ? ` ${r.unit}` : ''}</div>
                      </div>
                    </td>
                    <ValueCell value={r.value} unit={null} threshold={r.threshold} />
                    <td>{r.threshold ? `${r.threshold.min_value != null ? `Min: ${r.threshold.min_value}` : ''}${r.threshold.min_value != null && r.threshold.max_value != null ? ' — ' : ''}${r.threshold.max_value != null ? `Max: ${r.threshold.max_value}` : ''}` : '—'}</td>
                    <td>{r.org}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    </Modal>
  );
}
