import React, { useState, useEffect } from "react";
import { api, apiPublic, buildQuery } from "../../lib/api";
import { alertSuccess, alertError, alertInfo } from '../../utils/alerts';

export default function AdvancedStat({ lakes = [], params = [], staticThresholds = {} }) {
  const [mode, setMode] = useState('compliance');
  const [test, setTest] = useState('one-sample');
  const [lakeId, setLakeId] = useState(''); // one-sample
  const [lake1, setLake1] = useState('');   // two-sample
  const [lake2, setLake2] = useState('');
  const [stations, setStations] = useState([]); // [{id,name,isCoord?,lat?,lng?}]
  const [selectedStationIds, setSelectedStationIds] = useState([]);
  const [classes, setClasses] = useState([]); // [{code,name}]
  const [paramOptions, setParamOptions] = useState([]); // available parameter list
  const [paramCode, setParamCode] = useState('');

  // Adopt parent-provided params first; otherwise fetch (auth then public) similar to CompareLake.jsx
  useEffect(() => {
    let aborted = false;
    const normalize = (rows) => rows.map(pr => ({
      id: pr.id,
      key: pr.code || pr.key || String(pr.id),
      code: pr.code || pr.key || String(pr.id),
      label: pr.name || pr.code || String(pr.id),
      unit: pr.unit || pr.parameter?.unit || ''
    }));
    const load = async () => {
      if (params && params.length) {
        setParamOptions(normalize(params));
        return;
      }
      try {
        let res;
        try { res = await api('/options/parameters'); }
        catch (_) { res = await apiPublic('/options/parameters'); }
        const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        if (!aborted) setParamOptions(normalize(rows));
      } catch (e) {
        if (!aborted) setParamOptions([]);
      }
    };
    load();
    return () => { aborted = true; };
  }, [params]);

  // Ensure a selected parameter exists whenever paramOptions changes
  useEffect(() => {
    if (!paramOptions.length) {
      if (!paramCode) setParamCode('DO'); // fallback default
      return;
    }
    if (!paramCode || !paramOptions.some(p => p.code === paramCode)) {
      setParamCode(paramOptions[0].code);
    }
  }, [paramOptions]);
  const [classCode, setClassCode] = useState('C');
  const [manualMu0, setManualMu0] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cl, setCl] = useState('0.95');
  const [aggregation, setAggregation] = useState('month');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [needsManual, setNeedsManual] = useState(false);
  const manualRef = React.useRef(null);
  const [samplePreview, setSamplePreview] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const disabled = loading || (test==='one-sample' ? !lakeId : !(lake1 && lake2));

  // Fetch water quality classes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiPublic('/options/water-quality-classes');
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (!mounted) return;
        const list = rows.map(r => ({ code: r.code || r.id || '', name: r.name || r.code || '' })).filter(r=>r.code);
        if (list.length) setClasses(list);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  // Auto-detect lake class on change (one-sample)
  useEffect(() => {
    if (test === 'one-sample' && lakeId) {
      const lk = lakes.find(l => String(l.id) === String(lakeId));
      const lkClass = lk?.class_code || lk?.classCode || lk?.class || null;
      if (lkClass && lkClass !== classCode) setClassCode(lkClass);
    }
  }, [lakeId, test, lakes]);

  // Fetch stations for currently relevant lake (only one-sample for now)
  useEffect(() => {
    let mounted = true;
    const targetLake = test === 'one-sample' ? lakeId : (lake1 || '');
    if (!targetLake) { setStations([]); setSelectedStationIds([]); return; }
    (async () => {
      try {
        const res = await api(`/admin/stations?lake_id=${encodeURIComponent(targetLake)}`);
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (!mounted) return;
        if (rows.length) {
          const mapped = rows.map(r => ({ id: r.id, name: r.name || `Station ${r.id}` }));
          setStations(mapped);
          // auto-select all by default
          setSelectedStationIds(mapped.map(r => r.id));
          return;
        }
      } catch (e) {
        // fallback public sample-events
      }
      try {
        const qs = buildQuery({ lake_id: targetLake, limit: 1000 });
        const res2 = await apiPublic(`/public/sample-events${qs}`);
        const rows2 = Array.isArray(res2) ? res2 : Array.isArray(res2?.data) ? res2.data : [];
        if (!mounted) return;
        const uniq = new Map();
        rows2.forEach(ev => {
          const sid = ev.station_id || ev.station?.id;
          if (!sid) {
            const lat = ev.latitude ?? ev.station?.latitude;
            const lng = ev.longitude ?? ev.station?.longitude;
            if (lat != null && lng != null) {
              const key = `coord:${lat}:${lng}`;
              if (!uniq.has(key)) uniq.set(key, { id: key, name: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`, isCoord: true, lat, lng });
            }
            return;
          }
          const nm = ev.station?.name || ev.station_name || `Station ${sid}`;
          if (!uniq.has(sid)) uniq.set(sid, { id: sid, name: nm });
        });
        const arr = Array.from(uniq.values());
        setStations(arr);
        setSelectedStationIds(arr.filter(r=>!r.isCoord).map(r => r.id));
      } catch (e) {
        if (mounted) { setStations([]); setSelectedStationIds([]); }
      }
    })();
    return () => { mounted = false; };
  }, [lakeId, lake1, test]);

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const stationsArr = (test==='one-sample' && selectedStationIds.length) ? selectedStationIds.filter(v=>Number.isFinite(v)) : undefined;
      const body = {
        mode,
        test,
        parameter_code: paramCode,
        confidence_level: Number(cl),
        date_from: from || undefined,
        date_to: to || undefined,
        aggregation,
        station_ids: stationsArr
      };
      if (test === 'one-sample') {
        body.lake_id = Number(lakeId);
        body.class_code = classCode;
        if (manualMu0.trim() !== '' && !isNaN(Number(manualMu0))) {
          body.manual_mu0 = Number(manualMu0);
        }
      } else {
        body.lake_ids = [Number(lake1), Number(lake2)];
      }
  // stats endpoint is public; use apiPublic so lack of token doesn't reject
      const res = await apiPublic('/stats/t-test', { method: 'POST', body });
      setResult(res);
      // if server returned raw/sample values, populate preview for quick inspection
      if (res && (res.sample_values || res.samples || res.values || res.sample1_values || res.sample2_values)) {
        const pick = res.sample_values || res.samples || res.values || res.sample1_values || res.sample2_values || [];
        if (Array.isArray(pick)) setSamplePreview(pick.slice(0, 200));
      }
      setNeedsManual(false);
      // Friendly notification
      if (res && (res.sample_n || res.sample1_n || res.type === 'tost')) {
        let msg = 'Test completed successfully.';
        if (res.warn_low_n) msg = 'Test completed but sample size is low — interpret with caution.';
        alertSuccess('Test Result', msg);
        console.log('[Stats] Result debug:', res);
      } else {
        alertSuccess('Test Result', 'Test completed.');
      }
    } catch (e) {
      const msg = e?.message || 'Failed';
      setError(msg);
      const body = e?.body || null;
      console.error('[Stats] Run error:', e, body || 'no-body');
      if (body && body.error === 'threshold_missing') {
        const dbg = body.debug || body;
        // If server provided a sample threshold row, try to auto-fill
        const sample = dbg?.threshold_row_sample || dbg?.threshold_debug || null;
        if (sample && test === 'one-sample' && manualMu0.trim() === '') {
          const candidate = (sample.min_value != null && (sample.max_value == null || evalType==='min')) ? sample.min_value : (sample.max_value != null ? sample.max_value : null);
          if (candidate != null) setManualMu0(String(candidate));
        }
        setNeedsManual(true);
        alertError('Missing Threshold', 'No threshold found for this parameter/class — please supply a Manual Threshold (μ0) then rerun.');
        setTimeout(()=> manualRef.current?.focus(), 30);
      } else if (body && body.error === 'insufficient_data') {
        // Friendly message: show counts vs required
        const minReq = body.min_required || body.min_required || 3;
        if (body.n != null) {
          alertError('Not enough data', `Not enough samples to run the test: found ${body.n}, need at least ${minReq}.`);
        } else if (body.n1 != null || body.n2 != null) {
          const n1 = body.n1 ?? 0; const n2 = body.n2 ?? 0; const mr = body.min_required ?? minReq;
          alertError('Not enough data', `Not enough samples: group 1 has ${n1}, group 2 has ${n2}; need at least ${mr} each.`);
        } else {
          alertError('Not enough data', `Insufficient data to run the test (need at least ${minReq} observations).`);
        }
        // keep technical details in console
        console.debug('[Stats] insufficient_data payload:', body);
      }
      else {
        // Generic error notification
        alertError('Test Error', msg);
      }
    } finally { setLoading(false); }
  };

  const fetchPreview = async () => {
    setPreviewLoading(true);
    setSamplePreview([]);
    try {
      const fmtPreviewDate = (d) => {
        if (!d) return '';
        try {
          const dt = new Date(d);
          if (isNaN(dt)) return String(d);
          return dt.toLocaleString();
        } catch (e) { return String(d); }
      };
      const unit = (paramOptions.find(p => p.code === paramCode) || {}).unit || '';
      const mapped = [];
      // For two-sample, public endpoint expects a single lake_id; fetch each lake separately and tag rows with lake name
      if (test === 'two-sample') {
        const lakeIds = [lake1, lake2].filter(Boolean);
        for (const lid of lakeIds) {
          try {
            const qs = buildQuery({ parameter_code: paramCode, lake_id: lid, sampled_from: from || undefined, sampled_to: to || undefined, limit: 1000 });
            const res = await apiPublic(`/public/sample-events${qs}`);
            const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            const lakeName = (lakes.find(l => String(l.id) === String(lid)) || {}).name || `Lake ${lid}`;
            for (const ev of rows) {
              let v = null;
              if (ev.value != null) v = ev.value;
              if (v == null && ev.sample_results && Array.isArray(ev.sample_results)) {
                for (const r of ev.sample_results) {
                  if ((r.parameter_code === paramCode || r.parameter?.code === paramCode || r.parameter_id === paramCode) && r.value != null) { v = r.value; break; }
                }
              }
              if (v == null && ev.results && Array.isArray(ev.results)) {
                for (const r of ev.results) {
                  if ((r.parameter_code === paramCode || r.parameter?.code === paramCode) && r.value != null) { v = r.value; break; }
                }
              }
              if (v == null && ev.parameter && (ev.parameter.code === paramCode) && ev.parameter_value != null) v = ev.parameter_value;
              if (v == null) continue;
              const rawDate = ev.sample_date || ev.sampled_at || ev.date || ev.event_date || ev.created_at || ev.datetime || '';
              const date = fmtPreviewDate(rawDate);
              // fallback to coordinates when station name missing
              const station = ev.station?.name || ev.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : (ev.station_id ? `Station ${ev.station_id}` : ''));
              mapped.push({ date, rawDate, station, lake: lakeName, value: v, unit });
              if (mapped.length >= 200) break;
            }
          } catch (e) {
            console.error('[Stats] Preview fetch error for lake', lid, e);
          }
          if (mapped.length >= 200) break;
        }
      } else {
        const qs = buildQuery({
          parameter_code: paramCode,
          lake_id: test === 'one-sample' ? lakeId || undefined : undefined,
          station_ids: (test==='one-sample' && selectedStationIds && selectedStationIds.length) ? selectedStationIds : undefined,
          sampled_from: from || undefined,
          sampled_to: to || undefined,
          limit: 1000
        });
        const res = await apiPublic(`/public/sample-events${qs}`);
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        for (const ev of rows) {
          let v = null;
          if (ev.value != null) v = ev.value;
          if (v == null && ev.sample_results && Array.isArray(ev.sample_results)) {
            for (const r of ev.sample_results) {
              if ((r.parameter_code === paramCode || r.parameter?.code === paramCode || r.parameter_id === paramCode) && r.value != null) { v = r.value; break; }
            }
          }
          if (v == null && ev.results && Array.isArray(ev.results)) {
            for (const r of ev.results) {
              if ((r.parameter_code === paramCode || r.parameter?.code === paramCode) && r.value != null) { v = r.value; break; }
            }
          }
          if (v == null && ev.parameter && (ev.parameter.code === paramCode) && ev.parameter_value != null) v = ev.parameter_value;
          if (v == null) continue; // skip events without matching value
          const rawDate = ev.sample_date || ev.sampled_at || ev.date || ev.event_date || ev.created_at || ev.datetime || '';
          const date = fmtPreviewDate(rawDate);
          const station = ev.station?.name || ev.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : (ev.station_id ? `Station ${ev.station_id}` : ''));
          mapped.push({ date, rawDate, station, value: v, unit });
          if (mapped.length >= 200) break;
        }
      }
      setSamplePreview(mapped);
    } catch (e) {
      console.error('[Stats] Preview fetch error', e);
      setSamplePreview([]);
    } finally { setPreviewLoading(false); }
  };

  const renderResult = () => {
    if (!result) return null;

    const friendlyInterpretation = (r) => {
      // Prefer server-provided interpretation_detail when available
      if (r.interpretation_detail) return r.interpretation_detail;
      // TOST: convey equivalence in plain language
      if (r.type === 'tost') {
        const ok = r.significant || (typeof r.interpretation === 'string' && r.interpretation.toLowerCase().includes('equiv'));
        return ok ? 'Samples are statistically equivalent within the specified range (no meaningful difference).' : 'Samples are not equivalent within the specified range.';
      }
      // One- or two-sample: translate significance
      if (r.significant) {
        if (r.type === 'two-sample') return 'The two lakes show a statistically significant difference in their means (unlikely due to random variation).';
        return 'The observed mean is statistically different from the comparison value (unlikely due to random variation).';
      }
      return 'No statistically significant difference detected; observed differences could reasonably be due to chance.';
    };

    // Create a simple 2-column grid of key/value pairs for readability
    const gridItems = [];
    const push = (k, v) => gridItems.push({ k, v });
    push('Test Type', result.type?.toUpperCase() || '');
    push('Alpha (CL)', result.alpha != null ? String(result.alpha) : String(result.ci_level || ''));
    if ('n' in result) push('N', result.n);
    if ('n1' in result) push('N1', result.n1);
    if ('n2' in result) push('N2', result.n2);
    if ('mean' in result) push('Mean', fmt(result.mean));
    if ('sd' in result) push('SD', fmt(result.sd));
    if ('mean1' in result) push('Mean (Group 1)', fmt(result.mean1));
    if ('sd1' in result) push('SD (Group 1)', fmt(result.sd1));
    if ('mean2' in result) push('Mean (Group 2)', fmt(result.mean2));
    if ('sd2' in result) push('SD (Group 2)', fmt(result.sd2));
    if ('t' in result) push('t statistic', fmt(result.t));
    if ('df' in result) push('Degrees Freedom', fmt(result.df));
    if ('p_value' in result) push('p-value', sci(result.p_value));
    if ('t_lower' in result) push('TOST Lower t', fmt(result.t_lower));
    if ('t_upper' in result) push('TOST Upper t', fmt(result.t_upper));
    if (result.threshold_min != null) push('Threshold Min', result.threshold_min);
    if (result.threshold_max != null) push('Threshold Max', result.threshold_max);
    if (result.evaluation_type) push('Evaluation', result.evaluation_type);
    if (result.warn_low_n) push('Warning', 'Low sample size — interpret cautiously');

    return (
      <div className="stat-box">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
          {gridItems.map((it, i) => (
            <React.Fragment key={i}>
              <div style={{ fontSize:12, opacity:0.85, padding:6, borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{it.k}</div>
              <div style={{ fontSize:13, padding:6, borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{String(it.v)}</div>
            </React.Fragment>
          ))}
        </div>
        {ciLine(result)}
        <div style={{ marginTop:8, padding:8, background:'rgba(255,255,255,0.02)', borderRadius:6 }}>
          <strong>Interpretation:</strong>
          <div style={{ marginTop:6 }}>{friendlyInterpretation(result)}</div>
          {result.interpretation && <div style={{ marginTop:6, fontSize:12, opacity:0.8 }}>Server note: {result.interpretation}</div>}
        </div>
      </div>
    );
  };

  const fmt = (v) => (v == null ? '' : Number(v).toFixed(2));
  const sci = (v) => (v == null ? '' : (v < 0.001 ? Number(v).toExponential(2) : v.toFixed(4)));
  const ciLine = (r) => (r.ci_lower != null && r.ci_upper != null ? <div>CI ({Math.round((r.ci_level||0)*100)}%): [{fmt(r.ci_lower)}, {fmt(r.ci_upper)}]</div> : null);

  return (
  <div className="insight-card" style={{ minWidth: 720, maxWidth: '100%', maxHeight: '70vh', overflowY: 'auto', padding: 8 }}>
      <h4>Advanced Statistics</h4>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <select className="pill-btn" value={test} onChange={e=>{setTest(e.target.value); setResult(null);}}>
            <option value="one-sample">One Sample / Threshold</option>
            <option value="two-sample">Two Sample Welch</option>
          </select>
          <select className="pill-btn" value={mode} onChange={e=>{setMode(e.target.value); setResult(null);}}>
            <option value="compliance">Compliance</option>
            <option value="improvement">Improvement</option>
          </select>
          <select className="pill-btn" value={paramCode} onChange={e=>{setParamCode(e.target.value); setResult(null);}}>
            {paramOptions.length ? (
              paramOptions.map(p => <option key={p.code} value={p.code}>{p.label || p.code}</option>)
            ) : (
              // Fallback static list if fetch not yet available
              [ 'DO','BOD','TSS','TP','NH3','pH' ].map(c => <option key={c} value={c}>{c}</option>)
            )}
          </select>
          <select className="pill-btn" value={cl} onChange={e=>{setCl(e.target.value); setResult(null);}}>
            <option value="0.9">90% CL</option>
            <option value="0.95">95% CL</option>
            <option value="0.99">99% CL</option>
          </select>
        </div>
        {test === 'one-sample' && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <select className="pill-btn" value={lakeId} onChange={e=>{setLakeId(e.target.value); setResult(null);}}>
                <option value="">Select Lake</option>
                {lakes.map(l => <option key={l.id} value={l.id}>{l.name || `Lake ${l.id}`}</option>)}
              </select>
              {classes.length ? (
                <select className="pill-btn" value={classCode} onChange={e=>{setClassCode(e.target.value); setNeedsManual(false);}} style={{ minWidth:72 }}>
                  {classes.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              ) : (
                <input className="pill-btn" placeholder="Class" value={classCode} onChange={e=>setClassCode(e.target.value)} style={{ width:70 }} />
              )}
              <input ref={manualRef} className="pill-btn" placeholder="Manual Threshold" value={manualMu0} onChange={e=>{setManualMu0(e.target.value);}} style={{ width:120, outline: needsManual ? '2px solid #ef4444' : undefined }} />
            </div>
            {stations.length > 0 && (
              <div style={{ maxHeight:120, overflowY:'auto', border:'1px solid rgba(255,255,255,0.2)', padding:6, borderRadius:4 }}>
                <div style={{ fontSize:12, opacity:0.85, marginBottom:4 }}>Stations (select subset or leave all):</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {stations.map(s => {
                    const checked = selectedStationIds.includes(s.id);
                    return (
                      <label key={s.id} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, background:'rgba(255,255,255,0.08)', padding:'2px 6px', borderRadius:4 }}>
                        <input type="checkbox" checked={checked} onChange={() => {
                          setSelectedStationIds(prev => checked ? prev.filter(id=>id!==s.id) : [...prev, s.id]);
                        }} />
                        {s.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {test === 'two-sample' && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <select className="pill-btn" value={lake1} onChange={e=>{setLake1(e.target.value); setResult(null);}}>
              <option value="">Lake 1</option>
              {lakes.map(l => <option key={l.id} value={l.id}>{l.name || `Lake ${l.id}`}</option>)}
            </select>
            <select className="pill-btn" value={lake2} onChange={e=>{setLake2(e.target.value); setResult(null);}}>
              <option value="">Lake 2</option>
              {lakes.map(l => <option key={l.id} value={l.id}>{l.name || `Lake ${l.id}`}</option>)}
            </select>
          </div>
        )}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <input className="pill-btn" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          <input className="pill-btn" type="date" value={to} onChange={e=>setTo(e.target.value)} />
          <select className="pill-btn" value={aggregation} onChange={e=>setAggregation(e.target.value)}>
            <option value="month">Monthly</option>
            <option value="daily">Daily</option>
            <option value="raw">Raw</option>
          </select>
          <button className="pill-btn liquid" disabled={disabled} onClick={run}>{loading ? 'Running...' : 'Run Test'}</button>
          <button className="pill-btn" disabled={!paramCode || (test==='one-sample' && !lakeId) || (test==='two-sample' && (!lake1 || !lake2)) || previewLoading} onClick={fetchPreview}>{previewLoading ? 'Loading...' : 'Preview Values'}</button>
        </div>
        {stations.length === 0 && lakeId && test==='one-sample' && (
          <div style={{ fontSize:12, opacity:0.7 }}>No station records found; using all available measurements (coordinate points may appear once data exist).</div>
        )}
        {stations.length > 0 && stations.some(s=>s.isCoord) && (
          <div style={{ fontSize:12, opacity:0.7 }}>Coordinate-only sampling points included (not selectable individually).</div>
        )}
        {error && <div style={{ color:'#ff8080', fontSize:12 }}>{error}{needsManual && ' — Please supply a Manual Threshold (μ0) then rerun.'}</div>}
        {error && (error.includes('threshold_missing') || error.includes('threshold')) && (
          <div style={{ fontSize:11, marginTop:6, color:'#ffd9d9' }}>
            Server debug: <pre style={{ whiteSpace:'pre-wrap', fontSize:11 }}>{JSON.stringify((error && (typeof error === 'string') ? null : null) || '' )}</pre>
          </div>
        )}
        {needsManual && (
          <div style={{ color:'#fbbf24', fontSize:11 }}>
            Tip: This value is the regulatory minimum or maximum used as the comparison mean (μ0).
          </div>
        )}
        {/* Preview table for fetched values */}
        {samplePreview && samplePreview.length > 0 && (() => {
          // sort by rawDate desc if available
          const rows = [...samplePreview].sort((a,b) => {
            const ad = a.rawDate ? new Date(a.rawDate).getTime() : 0;
            const bd = b.rawDate ? new Date(b.rawDate).getTime() : 0;
            return bd - ad;
          });
          return (
            <div style={{ marginTop:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize:12, opacity:0.85 }}>Preview of values being fetched (showing up to 200 rows)</div>
                <div style={{ fontSize:12, opacity:0.7 }}>{rows.length} rows • times shown in your local timezone</div>
              </div>
              <div style={{ maxHeight:320, overflow:'auto', border:'1px solid rgba(255,255,255,0.06)', borderRadius:6 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding:6, width:220 }}>Date (local)</th>
                      <th style={{ padding:6 }}>Station / Coordinates</th>
                      { (test === 'two-sample' || samplePreview.some(r => r.lake)) && <th style={{ padding:6, width:160 }}>Lake</th> }
                      <th style={{ padding:6, width:120 }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom:'1px dashed rgba(255,255,255,0.02)' }}>
                        <td style={{ padding:6 }}>{r.date}</td>
                        <td style={{ padding:6 }}>{r.station}</td>
                        { (test === 'two-sample' || samplePreview.some(x => x.lake)) && <td style={{ padding:6 }}>{r.lake || '-'}</td> }
                        <td style={{ padding:6 }}>{r.value}{r.unit ? ` ${r.unit}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
        {renderResult()}
      </div>
    </div>
  );
}

function suggestThreshold(paramCode, classCode, staticThresholds) {
  if (!paramCode || !classCode) return null;
  const entry = staticThresholds[paramCode];
  if (!entry) return null;
  if (entry.type === 'range') return null; // need both bounds; skip auto-fill
  const val = entry[classCode];
  if (val == null) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

