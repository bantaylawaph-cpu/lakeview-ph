import React, { useEffect, useMemo, useState, useRef } from 'react';
import Popover from '../common/Popover';
import Swal from 'sweetalert2';
import Modal from '../Modal';
import useStationsCache from './hooks/useStationsCache';
import useSampleEvents from './hooks/useSampleEvents';
import LoadingSpinner from '../LoadingSpinner';
import api, { getToken } from '../../lib/api';
import LakeSelect from './ui/LakeSelect';
import OrgSelect from './ui/OrgSelect';

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
  const { orgOptions, stationsByOrg, allStations } = useStationsCache(lakeId);
  const stationsList = useMemo(() => (!orgId ? (allStations || []) : (stationsByOrg?.[String(orgId)] || [])), [orgId, allStations, stationsByOrg]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const exportBtnRef = useRef(null);
  const [exportOpen, setExportOpen] = useState(false);
  const tableRef = useRef(null);
  

  // load events when lake and org are selected (we need years per dataset source)
  const shouldLoadEvents = Boolean(lakeId && orgId);
  const effectiveLake = shouldLoadEvents ? lakeId : '';
  const effectiveOrg = shouldLoadEvents ? orgId : '';
  const { events, loading } = useSampleEvents(effectiveLake, effectiveOrg, 'all');

  // Sync state with initial props
  useEffect(() => {
    setLakeId(initialLake);
  }, [initialLake]);

  useEffect(() => {
    setOrgId(initialOrg);
  }, [initialOrg]);

  // derive station options from events so we can prefer station id matching
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

  // derive available years from events (descending)
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
    // Clear selected station when lake or org changes to avoid stale selection
    // But not when opening with initialStation
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
      // Find the most recent year for this station
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
    // quick check for global, fallback to API
    // prefer token presence (same gating pattern as StatsModal)
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

  function rowsToCsv(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(esc).join(',')];
    for (const r of rows) lines.push(headers.map(h => esc(r[h])).join(','));
    return lines.join('\n');
  }

  function pivotToRowsForCsv(pivot) {
    if (!pivot || !Array.isArray(pivot.params)) return [];
    const out = [];
    for (const p of pivot.params) {
      for (let i = 0; i < pivot.months.length; i++) {
        const cell = p.cells[i];
        out.push({ parameter: p.name, month: MONTH_NAMES[pivot.months[i]] ?? pivot.months[i], value: cell ? cell.value : '' });
      }
    }
    return out;
  }

  function downloadCsv(text, filename = 'data-summary.csv') {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportPdfHtml(html, meta = {}) {
    const w = window.open('', '_blank');
    if (!w) { alert('Unable to open print window'); return; }
    // Inject a small print stylesheet so the table renders with outlines and
    // preserves background colors for threshold highlights when printed to PDF.
    const css = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #111; margin: 18pt; }
      .pv-header { margin-bottom: 12px; }
      .pv-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
      .pv-meta { font-size: 12px; color: #374151; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; }
      th, td { padding: 6px 8px; border: 1px solid #ddd; }
      thead th { background: #f3f4f6; font-weight: 700; }
      /* threshold backgrounds */
      .ds-cell-exceed { background: rgba(239,68,68,0.12) !important; color: #ef4444 !important; }
      .ds-cell-ok { background: rgba(16,185,129,0.12) !important; color: #10b981 !important; }
      /* ensure small modal-like header spacing */
      .ds-summary { max-width: 100%; }
      @media print { 
        body { margin: 6mm; }
        .no-print { display: none !important; }
      }
    `;

    // Build a concise header using meta fields (lake, dataset, year, station)
    const lakeLabel = meta.lakeName ? `<div class="pv-title">${meta.lakeName}</div>` : '';
    const metaParts = [];
    if (meta.datasetName) metaParts.push(`Dataset: ${meta.datasetName}`);
    if (meta.year) metaParts.push(`Year: ${meta.year}`);
    if (meta.stationName) metaParts.push(`Station: ${meta.stationName}`);
    const metaLine = metaParts.length ? `<div class="pv-meta">${metaParts.join(' — ')}</div>` : '';

    const header = `<div class="pv-header">${lakeLabel}${metaLine}</div>`;

    // Only include the table/content part passed in; avoid copying modal footer or links.
    w.document.write(`<!doctype html><html><head><title>Data Summary</title><meta charset="utf-8"><style>${css}</style></head><body>${header}${html}</body></html>`);
    w.document.close();
    w.focus();
    // allow rendering
    setTimeout(() => { w.print(); }, 250);
  }

  async function handleExport(type) {
    setExportOpen(false);
    const signed = await isSignedIn();
    if (!signed) {
      if (Swal && typeof Swal.fire === 'function') {
        Swal.fire({ icon: 'warning', title: 'Sign in required', text: 'Please sign in to export data.' });
      } else {
        window.alert('Please sign in to export data.');
      }
      return;
    }
    if (type === 'csv') {
      const csvRows = pivot ? pivotToRowsForCsv(pivot) : rows;
      const csv = rowsToCsv(csvRows);
      if (!csv) {
        if (Swal && typeof Swal.fire === 'function') Swal.fire({ icon: 'info', title: 'No data', text: 'No data to export' }); else window.alert('No data to export');
        return;
      }
      downloadCsv(csv);
    } else if (type === 'pdf') {
      // print only the table HTML (avoid copying modal footer/links). Collect meta for header.
      const wrapper = tableRef.current || document.querySelector('.modal');
      if (!wrapper) {
        if (Swal && typeof Swal.fire === 'function') Swal.fire({ icon: 'info', title: 'No table', text: 'No table to export' }); else window.alert('No table to export');
        return;
      }
      // prefer the inner table element if available
      const tbl = wrapper.querySelector ? (wrapper.querySelector('table') || wrapper) : wrapper;
      const htmlToPrint = tbl.outerHTML || tbl.innerHTML || '';
      // build metadata
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
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Prefer unified lake options helper (includes class_code)
        const { fetchLakeOptions } = await import('../../lib/layers');
        const lakes = await fetchLakeOptions();
        if (!mounted) return;
        const base = Array.isArray(lakes) ? lakes : [];
        setLakeOptions(base);
        return; // done
      } catch (e) {
        // fallback to generic API
      }
      try {
        const res = await api('/lakes');
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
      // filter by year when selected
      if (selectedYear) {
        const evYear = ev.sampled_at ? new Date(ev.sampled_at).getFullYear() : null;
        if (evYear == null || String(evYear) !== String(selectedYear)) continue;
      }
      const sampled = ev.sampled_at ? new Date(ev.sampled_at).toISOString().slice(0,10) : '';
      const stationName = ev.station?.name || ev.station_name || '';
      const stationId = ev.station?.id != null ? String(ev.station.id) : null;
      if (selectedStation && selectedStation !== '') {
        // match by station id or name label
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

  // Pivot table for single-station monthly summary
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pivot = useMemo(() => {
    if (!selectedStation) return null;
    if (!Array.isArray(events)) return { months: [], params: [] };
    const stationEvents = events.filter(ev => {
      const name = ev.station?.name || ev.station_name || '';
      const id = ev.station?.id != null ? String(ev.station.id) : null;
      return id === selectedStation || name === selectedStation;
    });
    // if a year is selected, only include events from that year
    const filteredEvents = selectedYear ? stationEvents.filter(ev => {
      if (!ev.sampled_at) return false;
      const y = new Date(ev.sampled_at).getFullYear();
      return String(y) === String(selectedYear);
    }) : stationEvents;
  const monthSet = new Set();
  // paramMap will map a key (param or param+depth) -> { meta: { displayName, hasDepthExplicit, depthValue }, cells: { [monthIndex]: cell } }
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
        // detect depth presence: explicit depth field is depth_m
        const hasDepthExplicit = Object.prototype.hasOwnProperty.call(r, 'depth_m');
        const depthValue = hasDepthExplicit ? (r.depth_m == null ? 0 : r.depth_m) : undefined;
        const key = hasDepthExplicit ? `${pName}::depth:${depthValue}` : pName;
        if (!paramMap.has(key)) {
          paramMap.set(key, { meta: { hasDepthExplicit, depthValue, depthWasNull: hasDepthExplicit && r.depth_m == null, threshold: null, unit: r.parameter?.unit || r.unit || '' }, cells: {} });
        }
        const entry = paramMap.get(key);
        const cellMap = entry.cells;
        const prev = cellMap[m];
        // include threshold object if present
        const threshold = r.threshold || null;
        // store the most recent sample for the month
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
        // capture a representative threshold for the parameter if available
        if (threshold && !entry.meta.threshold) entry.meta.threshold = threshold;
        // capture representative unit if missing
        if (!entry.meta.unit && (r.parameter?.unit || r.unit)) entry.meta.unit = r.parameter?.unit || r.unit || '';
      }
    }
  const months = Array.from(monthSet).sort((a,b)=>a-b);

    // Decide whether to show depth in the parameter column.
    // If a parameter only has a single depth row and that depth was null (recorded as depthWasNull), hide the depth.
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
      // Always keep base name without depth in the parameter column.
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

  return (
  <Modal
    open={open}
    onClose={onClose}
    title={<span style={{ color: '#fff' }}>Data Summary</span>}
    ariaLabel="Data Summary Table"
    width={1200}
    style={modalStyle}
    footerStyle={{
      background: 'transparent',
      borderTop: '1px solid rgba(255,255,255,0.18)',
      color: '#fff',
    }}
    footer={
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        <button className="pill-btn" onClick={() => { setLakeId(''); setOrgId(''); setSelectedYear(''); setSelectedStation(''); }}>Clear</button>
        <div>
          <button
            ref={exportBtnRef}
            className="pill-btn"
            onClick={async () => {
              const signed = await isSignedIn();
              if (!signed) {
                if (Swal && typeof Swal.fire === 'function') {
                  Swal.fire({ icon: 'warning', title: 'Sign in required', text: 'Please sign in to export data.' });
                } else {
                  window.alert('Please sign in to export data.');
                }
                return;
              }
              setExportOpen(v => !v);
            }}
          >Export</button>
          <Popover anchorRef={exportBtnRef} open={exportOpen} onClose={() => setExportOpen(false)} minWidth={160}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="pill-btn" onClick={() => handleExport('csv')}>Export CSV</button>
              <button className="pill-btn" onClick={() => handleExport('pdf')}>Export PDF</button>
            </div>
          </Popover>
        </div>
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
            <div className="ds-label">Dataset source</div>
            <OrgSelect options={orgOptions || []} value={orgId} onChange={(e) => setOrgId(e.target.value)} disabled={!lakeId} required={false} placeholder="All dataset sources" />
          </div>

              <div className="ds-field year">
                <div className="ds-label">Year</div>
                <select className="pill-btn" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} disabled={!lakeId || !orgId}>
                  <option value="">All years</option>
                  {yearOptions.map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>

            <div className="ds-field station">
              <div className="ds-label">Station</div>
              <select className="pill-btn" value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)} disabled={!lakeId || !orgId || !selectedYear}>
                <option value="">All stations</option>
                {stationOptions.length > 0 ? stationOptions.map(opt => (<option key={opt.id} value={opt.id}>{opt.name}</option>)) : stationsList.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
        </div>

  <div className="ds-table-wrap modern-scrollbar" ref={tableRef}>
          {(loading && lakeId && orgId && selectedYear && selectedStation) ? (
            <div className="ds-center-loading"><LoadingSpinner label="Loading table…" size={28} /></div>
          ) : (!lakeId || !orgId || !selectedYear || !selectedStation) ? (
            <div className="ds-empty">Please select a Lake, Dataset source, Year and Station to view this table.</div>
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
                </tr>
              </thead>
              <tbody>
                {pivot.params.length === 0 ? (
                  <tr><td style={{ padding: 10 }} colSpan={pivot.months.length + 1}>No data for this station.</td></tr>
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
                                return `Threshold: ${parts.join(' — ')}`;
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
                      // threshold detection
                      const num = Number(c.value);
                      const t = c.threshold ?? p.meta?.threshold ?? null;
                      const cls = getThresholdClass(c.value, t);
                      return (
                        <td key={i} className={cls}>
                          {Number.isFinite(num) ? (num.toFixed(2)) : (c.value ?? '')}
                        </td>
                      );
                    })}
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
