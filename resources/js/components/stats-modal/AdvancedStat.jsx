import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import { FiSettings, FiX } from 'react-icons/fi';
import Popover from "../common/Popover";
import { api, apiPublic } from "../../lib/api";
import { fetchParameters, fetchSampleEvents, deriveOrgOptions } from "./data/fetchers";
import { alertSuccess, alertError } from '../../utils/alerts';
import { tOneSampleAsync, tTwoSampleWelchAsync, tTwoSampleStudentAsync, mannWhitneyAsync, signTestAsync, tostEquivalenceAsync, wilcoxonSignedRankAsync, moodMedianAsync, shapiroWilkAsync } from '../../stats/statsUtils'; // legacy direct imports (some still used for threshold suggestion)
import { runOneSample, runTwoSample } from './statsAdapter';
import { fmt, sci } from './formatters';
import ResultPanel from './ResultPanel';

function AdvancedStat({ lakes = [], params = [], paramOptions: parentParamOptions = [], staticThresholds = {} }, ref) {
  // test mode is now inferred from the user's compare selection (class vs lake)
  // State (reintroduced after refactor extraction)
  const [paramCode, setParamCode] = useState('');
  // Derived flag: does current parameter have an authoritative range threshold?
  // (Previously state + effect; converted to pure derivation to avoid render loops)
  const [selectedTest, setSelectedTest] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExactP, setShowExactP] = useState(false);
  const [showAllValues, setShowAllValues] = useState(false);
  const [lakeId, setLakeId] = useState('');
  const [classCode, setClassCode] = useState('');
  const [compareValue, setCompareValue] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [secondaryOrganizationId, setSecondaryOrganizationId] = useState('');
  const [appliedStandardId, setAppliedStandardId] = useState('');
  const [cl, setCl] = useState('0.95');
  const [showGearPopover, setShowGearPopover] = useState(false);
  // Parameter options: accept either explicit paramOptions prop or fallback to legacy 'params'
  const paramOptions = (parentParamOptions && parentParamOptions.length ? parentParamOptions : (params || []));
  const [standards, setStandards] = useState([]); // placeholder until wired to backend
  const [classes, setClasses] = useState([]); // placeholder list of classes
  const [orgOptions, setOrgOptions] = useState([]);
  const [secondaryOrgOptions, setSecondaryOrgOptions] = useState([]);

  const containerRef = useRef(null);
  const gearBtnRef = useRef(null);

  // Fetch applied standards list (superadmin-only endpoint). Silently ignore on 403.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Public options endpoint returns standards for dropdowns
        const res = await apiPublic('/options/wq-standards');
        if (!mounted) return;
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setStandards((rows || []).map(r => ({ id: r.id, code: r.code, name: r.name || r.code })));
      } catch (e) {
        if (!mounted) return;
        console.debug('[AdvancedStat] failed to load standards', e);
        setStandards([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch water quality classes (public, lightweight)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiPublic('/options/water-quality-classes');
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!mounted) return;
        const mapped = (rows || []).map(r => ({ code: r.code || r.id, name: r.name || r.code || r.id }));
        setClasses(mapped);
      } catch (e) {
        if (!mounted) return;
        console.debug('[AdvancedStat] failed to load classes', e);
        setClasses([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Inferred test mode: if comparing to another lake -> two-sample; class or nothing -> one-sample
  const inferredTest = React.useMemo(() => {
    if (!compareValue) return 'one-sample';
    if (String(compareValue).startsWith('lake:')) return 'two-sample';
    if (String(compareValue).startsWith('class:')) return 'one-sample';
    return 'one-sample';
  }, [compareValue]);

  // Populate organization options for primary lake when lake or date range changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!lakeId) { if (mounted) setOrgOptions([]); return; }
      try {
        const lim = 500;
        const fromEff = yearFrom ? `${yearFrom}-01-01` : undefined;
        const toEff = yearTo ? `${yearTo}-12-31` : undefined;
        const recs = await fetchSampleEvents({ lakeId: Number(lakeId), from: fromEff, to: toEff, limit: lim });
        if (!mounted) return;
        const derived = deriveOrgOptions(recs || []);
        setOrgOptions(derived);
      } catch (e) {
        if (!mounted) return;
        console.debug('[AdvancedStat] failed to derive orgOptions', e);
        setOrgOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, [lakeId, yearFrom, yearTo]);

  // Populate secondary organization options when comparing to another lake
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!compareValue || !String(compareValue).startsWith('lake:')) { if (mounted) setSecondaryOrgOptions([]); return; }
      const otherLakeId = Number(String(compareValue).split(':')[1]);
      if (!otherLakeId) { if (mounted) setSecondaryOrgOptions([]); return; }
      try {
        const lim = 500;
        const fromEff = yearFrom ? `${yearFrom}-01-01` : undefined;
        const toEff = yearTo ? `${yearTo}-12-31` : undefined;
        const recs = await fetchSampleEvents({ lakeId: otherLakeId, from: fromEff, to: toEff, limit: lim });
        if (!mounted) return;
        const derived = deriveOrgOptions(recs || []);
        setSecondaryOrgOptions(derived);
      } catch (e) {
        if (!mounted) return;
        console.debug('[AdvancedStat] failed to derive secondaryOrgOptions', e);
        setSecondaryOrgOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, [compareValue, yearFrom, yearTo]);

  // Disable run based on required selections
  const runDisabled = React.useMemo(() => {
    if (loading) return true;
    if (!paramCode || !lakeId || !selectedTest) return true;
    if (inferredTest === 'two-sample') {
      if (!compareValue || !String(compareValue).startsWith('lake:')) return true; // require a second lake for two-sample
    }
    return false;
  }, [loading, paramCode, lakeId, selectedTest, inferredTest, compareValue]);
  

  const paramHasRange = React.useMemo(() => {
    if (!paramCode) return false;
    const st = staticThresholds?.[paramCode];
    return !!(st && st.type === 'range');
  }, [paramCode, staticThresholds]);

  // Clear TOST selection if it becomes invalid (e.g., user changed to a non-range param or switched to two-sample)
  useEffect(() => {
    if (selectedTest === 'tost' && (!paramHasRange || inferredTest !== 'one-sample')) {
      setSelectedTest('');
      setResult(null);
    }
  }, [selectedTest, paramHasRange, inferredTest]);

  const run = async () => {
    setLoading(true); setError(null); setResult(null); setShowExactP(false);
    try {
      // 1. Build request body for series endpoint
      const body = {
        parameter_code: paramCode,
        date_from: yearFrom ? `${yearFrom}-01-01` : undefined,
        date_to: yearTo ? `${yearTo}-12-31` : undefined,
        applied_standard_id: appliedStandardId || undefined
      };
      if (organizationId) body.organization_id = organizationId;
      if (inferredTest === 'one-sample') {
        body.lake_id = Number(lakeId);
      } else {
        const otherLake = (compareValue && String(compareValue).startsWith('lake:')) ? Number(String(compareValue).split(':')[1]) : undefined;
        const lakeIds = [Number(lakeId), otherLake].filter(Boolean);
        body.lake_ids = lakeIds;
        const orgIds = [organizationId || null, secondaryOrganizationId || null];
        if (orgIds.some(v => v)) {
          body.organization_ids = lakeIds.map((_, idx) => orgIds[idx] ?? null);
        }
      }

      const series = await apiPublic('/stats/series', { method: 'POST', body });
      const evalType = series?.evaluation_type;
      const alpha = 1 - Number(cl || '0.95');

      if (!paramCode) throw new Error('Parameter not selected');

      let computed;
      if (inferredTest === 'one-sample') {
        const values = (series?.sample_values || []).map(Number).filter(Number.isFinite);
        if (values.length < 2) {
          alertError('Not enough data', `Not enough samples to run the test: found ${values.length}, need at least 2.`);
          setResult(null); setLoading(false); return;
        }
        if (evalType === 'range' || paramHasRange) {
          if (!(selectedTest === 'tost' || selectedTest === 'shapiro_wilk')) {
            alertError('Range threshold requires TOST', 'Select equivalence TOST (or Shapiro–Wilk) for range-evaluated parameter.');
            setLoading(false); return;
          }
        }

        let mu0 = null;
        const thrMin = series?.threshold_min ?? null;
        const thrMax = series?.threshold_max ?? null;
        if (evalType === 'range') {
          if (thrMin == null || thrMax == null) throw new Error('threshold_missing_range');
          // For range-evaluated parameters we do NOT auto-run TOST.
          // The UI should have restricted available tests to TOST and Shapiro–Wilk.
          if (selectedTest === 'tost') {
            computed = await runOneSample({ selectedTest, values, mu0, alpha, evalType, thrMin, thrMax });
          } else if (selectedTest === 'shapiro_wilk') {
            // Allow running normality check even when a range exists
            computed = await runOneSample({ selectedTest, values, mu0, alpha, evalType, thrMin, thrMax });
          } else {
            // Shouldn't happen because the UI disables other tests, but guard anyway
            alertError('Range threshold requires TOST', 'Select equivalence TOST (or Shapiro–Wilk) for range-evaluated parameter.');
            setLoading(false); return;
          }
        } else {
          if (thrMin != null || thrMax != null) {
            if (evalType === 'min') mu0 = thrMin != null ? thrMin : thrMax;
            else if (evalType === 'max') mu0 = thrMax != null ? thrMax : thrMin;
            else mu0 = thrMax != null ? thrMax : thrMin;
          } else {
            mu0 = suggestThreshold(paramCode, classCode, staticThresholds);
          }
          computed = await runOneSample({ selectedTest, values, mu0, alpha, evalType, thrMin, thrMax });
        }
      } else {
        const x = (series?.sample1_values || []).map(Number).filter(Number.isFinite);
        const y = (series?.sample2_values || []).map(Number).filter(Number.isFinite);
        if (x.length < 2 || y.length < 2) {
          alertError('Not enough data', `Not enough samples: group 1 has ${x.length}, group 2 has ${y.length}; need at least 2 each.`);
          setResult(null); setLoading(false); return;
        }
        computed = await runTwoSample({ selectedTest, sample1: x, sample2: y, alpha, evalType });
      }

      if (series?.events) {
        computed = { ...computed, events: series.events };
      }
      setResult(computed);
      alertSuccess('Test Result', 'Computed locally.');
    } catch (e) {
      console.error('[Stats] run error', e);
      const msg = e?.message || 'Failed';
      setError(msg);
      if (msg === 'threshold_missing_range') {
        alertError('Threshold missing', 'Range evaluation requires both lower and upper thresholds.');
      } else if (/not enough data/i.test(msg)) {
        // Already alerted above; no-op.
      } else {
        alertError('Test Error', msg);
      }
    } finally { setLoading(false); }
  };

  // Preview removal: no preview fetcher

  // Result rendering moved to ResultPanel component

  // Exposed actions: clear selections and export to PDF
  const clearAll = () => {
  console.debug('[AdvancedStat] clearAll invoked');
    setLakeId('');
    setClassCode('');
    setCompareValue('');
    setYearFrom('');
    setYearTo('');
    setOrganizationId('');
    setSecondaryOrganizationId('');
    setAppliedStandardId('');
    setParamCode('');
    setSelectedTest('');
    setResult(null);
    setError(null);
    setShowAllValues(false);
  setShowExactP(false);
    // no user-facing alert for clear (kept silent)
  };

  const exportPdf = async () => {
    try {
      console.debug('[AdvancedStat] exportPdf invoked', { paramCode, result });
      if (!result) {
        console.debug('[AdvancedStat] exportPdf aborted - no result to export');
        return;
      }
      const title = `Advanced statistics - ${paramCode || ''}`;
      const style = `body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 18px; } h1 { font-size: 18px; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 6px; }`;
      const summaryRows = [];
      if (result) {
        summaryRows.push(`<tr><th>Test</th><td>${result.test_used || result.type || ''}</td></tr>`);
        if (result.p_value != null) summaryRows.push(`<tr><th>p-value</th><td>${sci(result.p_value)}</td></tr>`);
        if (result.mean != null) summaryRows.push(`<tr><th>Mean</th><td>${fmt(result.mean)}</td></tr>`);
        if (result.n != null) summaryRows.push(`<tr><th>N</th><td>${fmt(result.n)}</td></tr>`);
        if (result.median != null) summaryRows.push(`<tr><th>Median</th><td>${fmt(result.median)}</td></tr>`);
        if (result.sd != null) summaryRows.push(`<tr><th>SD</th><td>${fmt(result.sd)}</td></tr>`);
        if (result.W != null) summaryRows.push(`<tr><th>W</th><td>${fmt(result.W)}</td></tr>`);
      }

      let valuesSection = '';
      if (Array.isArray(result?.events) && result.events.length) {
        const rowsHtml = result.events.slice(0, 1000).map(ev => `<tr><td>${ev.sampled_at || ''}</td><td>${ev.lake_id || ''}</td><td>${ev.station_id ?? ''}</td><td>${ev.value ?? ''}</td></tr>`).join('');
        valuesSection = `<h3>Events (first ${Math.min(result.events.length, 1000)})</h3><table><thead><tr><th>Sampled at</th><th>Lake</th><th>Station</th><th>Value</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
      } else if (Array.isArray(result?.sample_values) && result.sample_values.length) {
        valuesSection = `<h3>Values</h3><div>${(result.sample_values || []).slice(0,1000).join(', ')}</div>`;
      } else if (Array.isArray(result?.sample1_values) || Array.isArray(result?.sample2_values)) {
        const a = (result.sample1_values || []).slice(0,1000).join(', ');
        const b = (result.sample2_values || []).slice(0,1000).join(', ');
        valuesSection = `<h3>Group values</h3><div>Group 1: ${a}</div><div style="margin-top:8px">Group 2: ${b}</div>`;
      }

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${style}</style></head><body><h1>${title}</h1><table>${summaryRows.join('')}</table>${valuesSection}</body></html>`;
      const w = window.open('', '_blank');
      if (!w) throw new Error('Popup blocked');
      w.document.write(html);
      w.document.close();
      setTimeout(() => { try { w.focus(); w.print(); } catch(e){ /* ignore */ } }, 250);
    } catch (e) {
      console.error('Export failed', e);
      // no user-facing alert here; keep console error for debugging
    }
  };

  useImperativeHandle(ref, () => ({ clearAll, exportPdf }));

  // Removed legacy renderValuesUsed; handled by ResultPanel/ValuesTable now

  return (
  <div ref={containerRef} className="insight-card" style={{ position:'relative', minWidth: 0, maxWidth: '100%', padding: 8 }}>
    <h4 style={{ margin: '2px 0 8px' }}>Advanced Statistics</h4>
    {/* gear was moved back to the actions area */}
  <div>
  <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 1fr', gridTemplateRows:'repeat(2, auto)', gap:10, alignItems:'start', fontSize:13, minWidth:0 }}>
      {/* Row 1: Applied Standard, Parameter, Confidence Level (compact) */}
      <div style={{ gridColumn: '1 / span 1', minWidth:0 }}>
        <select className="pill-btn" value={appliedStandardId} onChange={e=>{setAppliedStandardId(e.target.value); setResult(null);}} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
          <option value="">Select Applied Standard</option>
          {standards.map(s => <option key={s.id} value={s.id}>{s.code || s.name || s.id}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: '2 / span 1', minWidth:0 }}>
        <select className="pill-btn" value={paramCode} onChange={e=>{setParamCode(e.target.value); setResult(null);}} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
          <option value="">Select parameter</option>
          {paramOptions.length ? (
            paramOptions.map(p => (
              <option key={p.key || p.id || p.code} value={p.code}>
                {p.label || p.name || p.code}
              </option>
            ))
          ) : null}
        </select>
      </div>
      <div style={{ gridColumn: '3 / span 2', display:'flex', justifyContent:'flex-end', minWidth:0 }}>
        <div style={{ display:'flex', gap:8, width:'100%' }}>
            <select className="pill-btn" value={selectedTest} onChange={e=>{setSelectedTest(e.target.value); setResult(null);}} style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'8px 10px', fontSize:12, height:36, lineHeight:'18px' }}>
            <option value="" disabled>Select test</option>
            <option value="shapiro_wilk" disabled={inferredTest!=='one-sample'}>Shapiro–Wilk normality test</option>
            {/* One-sample options. When parameter has an authoritative range threshold, only TOST is allowed (Shapiro remains available). */}
            <option value="t_one_sample" disabled={inferredTest!=='one-sample' || paramHasRange}>One-sample t-test</option>
            <option value="wilcoxon_signed_rank" disabled={inferredTest!=='one-sample' || paramHasRange}>Wilcoxon signed-rank</option>
            <option value="sign_test" disabled={inferredTest!=='one-sample' || paramHasRange}>Sign test</option>
            <option value="tost" disabled={inferredTest!=='one-sample'}>Equivalence TOST</option>
            {/* Two-sample options */}
            <option value="t_student" disabled={inferredTest!=='two-sample'}>Student t-test (equal var)</option>
            <option value="t_welch" disabled={inferredTest!=='two-sample'}>Welch t-test (unequal var)</option>
            <option value="mann_whitney" disabled={inferredTest!=='two-sample'}>Mann–Whitney U</option>
            <option value="mood_median_test" disabled={inferredTest!=='two-sample'}>Mood’s median test</option>
          </select>
        </div>
      </div>

      {/* Row 2: Lake | Class (header + selector) | Compare Lake | Years */}
      <div style={{ gridColumn: '1 / span 1', minWidth:0 }}>
        <select className="pill-btn" value={lakeId} onChange={e=>{setLakeId(e.target.value); setResult(null);}} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
          <option value="">Primary Lake</option>
          {lakes.map(l => <option key={l.id} value={l.id}>{l.name || `Lake ${l.id}`}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: '2 / span 1', minWidth:0 }}>
        <select className="pill-btn" value={compareValue} onChange={e=>{
          const v = e.target.value;
          setCompareValue(v);
          setResult(null);
          // if user picked a class, keep classCode in sync
          if (v && String(v).startsWith('class:')) {
            setClassCode(String(v).split(':')[1] || '');
          }
        }} style={{ width:'100%', padding:'10px 12px', height:40, lineHeight:'20px' }}>
          <option value="">Compare (Class or Lake)</option>
          {classes.map(c => <option key={`class-${c.code}`} value={`class:${c.code}`}>{`Class ${c.code}`}</option>)}
          <optgroup label="Lakes">
            {lakes.map(l => <option key={`lake-${l.id}`} value={`lake:${l.id}`}>{l.name || `Lake ${l.id}`}</option>)}
          </optgroup>
        </select>
      </div>
      <div style={{ gridColumn: '3 / span 1', minWidth:0 }}>
        <select className="pill-btn" value={organizationId} onChange={e=>{ setOrganizationId(e.target.value); setResult(null); }} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
          <option value="">Organization</option>
          {orgOptions.map(o => <option key={`org-${o.id}`} value={o.id}>{o.name || o.id}</option>)}
        </select>
      </div>
      {/* Secondary organization only when comparing to another lake */}
      {compareValue && String(compareValue).startsWith('lake:') ? (
        <div style={{ gridColumn: '4 / span 1', minWidth:0 }}>
          <select className="pill-btn" value={secondaryOrganizationId} onChange={e=>{ setSecondaryOrganizationId(e.target.value); setResult(null); }} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
            <option value="">Organization (secondary lake, optional)</option>
            {secondaryOrgOptions.map(o => <option key={`org2-${o.id}`} value={o.id}>{o.name || o.id}</option>)}
          </select>
        </div>
      ) : null}
      {/* Year inputs moved into gear popover */}
      <div style={{ gridColumn: '4 / span 1', display:'flex', gap:8, minWidth:0 }}>
        <div style={{ width: '100%' }} />
      </div>
    </div>

    {/* Actions and notices */}
      <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <div style={{ fontSize:12, opacity:0.8 }}>Lake-to-lake comparisons aggregate station measurements per lake (mean).</div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button ref={gearBtnRef} aria-label="Advanced options" title="Advanced options" className="pill-btn" onClick={() => setShowGearPopover(s => !s)} style={{ padding:'6px 10px', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
          <FiSettings size={16} />
        </button>
  <button className="pill-btn liquid" disabled={runDisabled} onClick={run} style={{ padding:'6px 10px' }}>{loading ? 'Running...' : 'Run Test'}</button>
      </div>
    </div>

    {/* Note about range thresholds when present */}
    {paramHasRange && inferredTest === 'one-sample' ? (
      <div style={{ marginTop:8, fontSize:12, color:'#eee' }}>
        <strong>Note:</strong> This parameter has an authoritative acceptable range; equivalence (TOST) is required. Other one-sample tests are disabled.
      </div>
    ) : null}

    {/* Gear popover: contains Year From / Year To / Confidence Level */}
    <Popover anchorRef={gearBtnRef} open={showGearPopover} onClose={() => setShowGearPopover(false)} minWidth={320}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#f0f6fb' }}>Year Range & Confidence Level</div>
        <button aria-label="Close advanced options" title="Close" onClick={() => setShowGearPopover(false)} className="pill-btn" style={{ padding:'4px 8px', height:30, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
          <FiX size={14} />
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <input className="pill-btn" type="number" placeholder="Year from" value={yearFrom} onChange={e=>setYearFrom(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', height:36 }} />
        <input className="pill-btn" type="number" placeholder="Year to" value={yearTo} onChange={e=>setYearTo(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', height:36 }} />
        <select className="pill-btn" value={cl} onChange={e=>{setCl(e.target.value); setResult(null);}} style={{ gridColumn: '1 / span 2', width:'100%', boxSizing:'border-box', padding:'8px 10px', height:36 }}>
          <option value="0.9">90% CL</option>
          <option value="0.95">95% CL</option>
          <option value="0.99">99% CL</option>
        </select>
      </div>
    </Popover>

    {/* Notices/errors */}
    <div style={{ marginTop:8 }}>
      {error && <div style={{ color:'#ff8080', fontSize:12 }}>{error}</div>}
      {error && (error.includes('threshold_missing') || error.includes('threshold')) && (
        <div style={{ fontSize:11, marginTop:6, color:'#ffd9d9' }}>
          Server debug: <pre style={{ whiteSpace:'pre-wrap', fontSize:11 }}>{JSON.stringify((error && (typeof error === 'string') ? null : null) || '' )}</pre>
        </div>
      )}
      {/* Manual threshold flow removed in backend; no prompt needed here */}
    </div>

    {/* Result */}
    {result && (
      <div style={{ marginTop:8 }}>
        <ResultPanel
          result={result}
          paramCode={paramCode}
          paramOptions={paramOptions}
          classCode={classCode}
          staticThresholds={staticThresholds}
          lakes={lakes}
          cl={cl}
          lakeId={lakeId}
          compareValue={compareValue}
          showAllValues={showAllValues}
          setShowAllValues={setShowAllValues}
          showExactP={showExactP}
          setShowExactP={setShowExactP}
        />
      </div>
    )}
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

// Export wrapped with forwardRef so parent components can call imperative methods via ref
export default React.forwardRef(AdvancedStat);
