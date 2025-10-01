import React, { useState, useEffect, useRef } from "react";
import { FiSettings, FiX } from 'react-icons/fi';
import Popover from "../common/Popover";
import { apiPublic } from "../../lib/api";
import { fetchParameters, fetchSampleEvents, deriveOrgOptions } from "./data/fetchers";
import { alertSuccess, alertError } from '../../utils/alerts';
import { tOneSampleAsync, tTwoSampleWelchAsync, tTwoSampleStudentAsync, mannWhitney, signTestAsync, tostEquivalenceAsync, wilcoxonSignedRankAsync, moodMedianAsync } from '../../stats/statsUtils';

export default function AdvancedStat({ lakes = [], params = [], paramOptions: parentParamOptions = [], staticThresholds = {} }) {
  // test mode is now inferred from the user's compare selection (class vs lake)
  const [lakeId, setLakeId] = useState(''); // primary lake selection (first dropdown)
  // Comparison target encoded as "class:CODE" or "lake:ID"
  // (we store it in `compareValue` below)

  // Station selection removed; backend aggregates by lake across all stations
  const [classes, setClasses] = useState([]);
  const [paramOptions, setParamOptions] = useState([]);
  const [paramCode, setParamCode] = useState('');
  const [standards, setStandards] = useState([]);
  const [appliedStandardId, setAppliedStandardId] = useState('');

  // Adopt parent-provided params first (support both `paramOptions` and legacy `params`), otherwise fetch centrally
  useEffect(() => {
    let aborted = false;
    const normalize = (rows) => rows.map(pr => ({
      id: pr.id,
      key: pr.key || pr.id || pr.code || String(pr.id),
      code: pr.code || pr.key || pr.id || String(pr.id),
      label: pr.label || pr.long_name || pr.full_name || pr.display_name || pr.name || pr.code || String(pr.id),
      unit: pr.unit || pr.parameter?.unit || ''
    }));
    const shallowEq = (a,b) => {
      if (a.length !== b.length) return false;
      for (let i=0;i<a.length;i++) {
        if (a[i].key !== b[i].key || a[i].code !== b[i].code || a[i].label !== b[i].label || a[i].unit !== b[i].unit) return false;
      }
      return true;
    };
    const load = async () => {
      const parentRows = Array.isArray(parentParamOptions) && parentParamOptions.length ? parentParamOptions : (Array.isArray(params) && params.length ? params : null);
      if (parentRows) {
        const norm = normalize(parentRows);
        setParamOptions(prev => shallowEq(prev, norm) ? prev : norm);
        return;
      }
      try {
        const list = await fetchParameters();
        if (!aborted) {
          setParamOptions(prev => shallowEq(prev, list) ? prev : list);
        }
      } catch {
        if (!aborted) setParamOptions([]);
      }
    };
    load();
    return () => { aborted = true; };
    // We intentionally stringify only minimal signatures to avoid infinite loops due to new array identities from parent
  }, [
    JSON.stringify((Array.isArray(parentParamOptions)?parentParamOptions:[]).map(r=>r.id||r.key||r.code)),
    JSON.stringify((Array.isArray(params)?params:[]).map(r=>r.id||r.key||r.code))
  ]);

  const [classCode, setClassCode] = useState('');
  const [compareValue, setCompareValue] = useState(''); // format: "class:CODE" or "lake:ID"
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [orgOptions, setOrgOptions] = useState([]);
  // For two-sample comparisons we can optionally scope each lake to a different organization
  const [secondaryOrganizationId, setSecondaryOrganizationId] = useState('');
  const [secondaryOrgOptions, setSecondaryOrgOptions] = useState([]);
  const [cl, setCl] = useState('0.95');
  const [selectedTest, setSelectedTest] = useState(''); // manual test selection
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showAllValues, setShowAllValues] = useState(false);
  // Gear popover state/refs for advanced (moved Year/CL inputs)
  const [showGearPopover, setShowGearPopover] = useState(false);
  const gearBtnRef = useRef(null);
  const containerRef = useRef(null);
  
  // Manual threshold flow removed
  // Preview functionality removed — tests now run fully on demand

  const disabled = loading || !paramCode || !lakeId || !compareValue || !selectedTest;

  // infer test mode at runtime: two-sample when compareValue is a lake
  const inferredTest = (compareValue && String(compareValue).startsWith('lake:')) ? 'two-sample' : 'one-sample';

  // Require class selection when comparing to a class
  const disabledWithClass = (String(compareValue).startsWith('class:') && !classCode);
  const runDisabled = disabled || disabledWithClass;

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
      } catch (e) {
        console.error('Failed to load classes', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch standards for applied dropdown
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiPublic('/options/wq-standards');
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (!mounted) return;
        setStandards(rows || []);
      } catch (e) {
        console.error('Failed to load standards', e);
        if (mounted) setStandards([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Station fetching removed

  // Auto-select class + compare target from lake's class. Fires only when lake changes.
  useEffect(() => {
    if (!lakeId) return;
    const lake = lakes.find(l => String(l.id) === String(lakeId));
    if (!lake) return;
    const raw = lake.class_code || (lake.class && (lake.class.code || lake.class)) || lake.class; // support different shapes
    if (!raw) return;
    const code = String(raw);
    setClassCode(prev => prev === code ? prev : code);
    // If user has NOT chosen a different compare target (or existing compare is a class but mismatched), sync it.
    setCompareValue(prev => {
      if (!prev) return `class:${code}`;
      if (prev.startsWith('class:')) {
        const current = prev.split(':')[1];
        if (current !== code) return `class:${code}`;
      }
      return prev;
    });
  }, [lakeId, lakes]);

  // When lake changes, load organization options present in recent sample-events for that lake
  useEffect(() => {
    if (!lakeId) { setOrgOptions([]); setOrganizationId(''); return; }
    let mounted = true;
    (async () => {
      try {
        const ev = await fetchSampleEvents({ lakeId: Number(lakeId), limit: 500 });
        if (!mounted) return;
        const opts = deriveOrgOptions(ev || []);
        setOrgOptions(opts || []);
        // clear selection if not present
        if (organizationId && !opts.find(o => String(o.id) === String(organizationId))) {
          setOrganizationId('');
        }
      } catch (e) {
        if (!mounted) return;
        setOrgOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, [lakeId]);

  // When compare target is a lake and the secondary lake id changes, load org options for secondary lake
  useEffect(() => {
    if (!compareValue || !String(compareValue).startsWith('lake:')) { setSecondaryOrgOptions([]); setSecondaryOrganizationId(''); return; }
    const otherId = Number(String(compareValue).split(':')[1]);
    if (!otherId) { setSecondaryOrgOptions([]); setSecondaryOrganizationId(''); return; }
    let mounted = true;
    (async () => {
      try {
        const ev = await fetchSampleEvents({ lakeId: otherId, limit: 500 });
        if (!mounted) return;
        const opts = deriveOrgOptions(ev || []);
        setSecondaryOrgOptions(opts || []);
        if (secondaryOrganizationId && !opts.find(o => String(o.id) === String(secondaryOrganizationId))) {
          setSecondaryOrganizationId('');
        }
      } catch (e) {
        if (!mounted) return;
        setSecondaryOrgOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, [compareValue]);

  // Clear selected test when inferred test mode changes (e.g., switching Lake vs Class to Lake vs Lake)
  useEffect(() => {
    setSelectedTest('');
    setResult(null);
  }, [inferredTest]);

  // Auto-select TOST when staticThresholds indicate a range for the selected parameter (one-sample only)
  useEffect(() => {
    try {
      if (!paramCode) return;
      const st = staticThresholds && staticThresholds[paramCode];
      if (st && st.type === 'range' && inferredTest === 'one-sample') {
        setSelectedTest(prev => prev === 'tost' ? prev : 'tost');
      }
    } catch (e) {
      // ignore
    }
  }, [paramCode, inferredTest, staticThresholds]);

  // If TOST is currently selected but the parameter no longer has a range threshold, clear it.
  useEffect(() => {
    try {
      if (selectedTest !== 'tost') return;
      // If the current param no longer supports range thresholds, remove TOST selection
      const st = paramCode ? (staticThresholds && staticThresholds[paramCode]) : null;
      if (!st || st.type !== 'range' || inferredTest !== 'one-sample') {
        setSelectedTest('');
        setResult(null);
      }
    } catch (e) {
      // ignore
    }
  }, [selectedTest, paramCode, staticThresholds, inferredTest]);

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      // Step 1: fetch series from server (minimal exposure)
      const seriesBody = {
        parameter_code: paramCode,
        date_from: yearFrom ? `${yearFrom}-01-01` : undefined,
        date_to: yearTo ? `${yearTo}-12-31` : undefined,
        applied_standard_id: appliedStandardId || undefined
      };
      if (organizationId) seriesBody.organization_id = organizationId;
      if (inferredTest === 'one-sample') {
        seriesBody.lake_id = Number(lakeId);
      } else {
        const other = (compareValue && String(compareValue).startsWith('lake:')) ? Number(String(compareValue).split(':')[1]) : undefined;
        const lakeIds = [Number(lakeId), other].filter(Boolean);
        seriesBody.lake_ids = lakeIds;
        // include per-lake organization filters if provided
        const orgIds = [organizationId || null, secondaryOrganizationId || null];
        if (orgIds.some(v => v)) {
          // ensure ordering matches lake_ids: we only include entries for positions that exist in lakeIds
          const padded = [];
          for (let i=0;i<lakeIds.length;i++) {
            padded.push(orgIds[i] ?? null);
          }
          seriesBody.organization_ids = padded;
        }
      }
  const series = await apiPublic('/stats/series', { method: 'POST', body: seriesBody });
  // expose server-declared evaluation type for downstream logic (min/max/range)
  const evalType = series?.evaluation_type;
  // debug: log server series response to verify events payload
  try { console.debug('[Stats] series response:', series); } catch(e) {}

      // Step 2: compute client-side using stdlib-js (statsUtils)
      const alpha = 1 - Number(cl || '0.95');
      let computed = null;
      if (inferredTest === 'one-sample') {
        const values = (series?.sample_values || []).map(v => Number(v)).filter(Number.isFinite);
        const n = values.length;
        if (!n || n < 2) {
          alertError('Not enough data', `Not enough samples to run the test: found ${n}, need at least 2.`);
          setResult(null);
          return;
        }
  // Determine mu0 for one-sample tests
  let mu0 = null; // prefer server-provided threshold
          if (evalType === 'range') {
          const thrMin = series?.threshold_min; const thrMax = series?.threshold_max;
          if (thrMin == null || thrMax == null) {
            alertError('Threshold missing', 'Range evaluation requires both lower and upper thresholds.');
            setResult(null);
            return;
          }
          const tt = await tostEquivalenceAsync(values, Number(thrMin), Number(thrMax), alpha);
          // Mark decision for unified UI line; keep detailed fields p1/p2, t1/t2
          computed = { ...tt, significant: !!tt.equivalent, sample_values: values, threshold_min: thrMin, threshold_max: thrMax, evaluation_type: 'range', test_used: 'tost' };
        } else {
          const thrMin = series?.threshold_min;
          const thrMax = series?.threshold_max;
          if (thrMin != null || thrMax != null) {
            mu0 = thrMax != null ? thrMax : thrMin;
          } else {
            mu0 = suggestThreshold(paramCode, classCode, staticThresholds);
          }
          if (selectedTest === 'wilcoxon_signed_rank') {
            const qp = await wilcoxonSignedRankAsync(values, Number(mu0), alpha, 'two-sided');
            computed = {
              type: 'one-sample-nonparam',
              test_used: 'wilcoxon_signed_rank',
              n: qp.n,
              statistic: qp.statistic,
              p_value: qp.p_value,
              alpha: qp.alpha ?? alpha,
              significant: typeof qp.p_value === 'number' ? (qp.p_value < (qp.alpha ?? alpha)) : undefined,
              mu0: mu0,
              sample_values: values,
              threshold_min: thrMin ?? null,
              threshold_max: thrMax ?? null,
              evaluation_type: evalType || null,
              standard_code: series?.standard_code || null,
              class_code_used: series?.class_code_used || null
            };
          } else if (selectedTest === 't_one_sample') {
            const tp = await tOneSampleAsync(values, Number(mu0), alpha, 'two-sided');
            computed = { type: 'one-sample', test_used: 't_one_sample', ...tp, mu0: mu0, sample_values: values, threshold_min: thrMin ?? null, threshold_max: thrMax ?? null, evaluation_type: evalType || null };
          } else if (selectedTest === 'sign_test') {
            const sp = await signTestAsync(values, Number(mu0), alpha, 'two-sided');
            computed = { type: 'one-sample-nonparam', test_used: 'sign_test', ...sp, mu0: mu0, sample_values: values, threshold_min: thrMin ?? null, threshold_max: thrMax ?? null, evaluation_type: evalType || null };
          } else {
            // default to t_one_sample
            const tp = await tOneSampleAsync(values, Number(mu0), alpha, 'two-sided');
            computed = { type: 'one-sample', test_used: 't_one_sample', ...tp, mu0: mu0, sample_values: values, threshold_min: thrMin ?? null, threshold_max: thrMax ?? null, evaluation_type: evalType || null };
          }
        }
      } else {
        // two-sample
        const x = (series?.sample1_values || []).map(v => Number(v)).filter(Number.isFinite);
        const y = (series?.sample2_values || []).map(v => Number(v)).filter(Number.isFinite);
        if (x.length < 2 || y.length < 2) {
          alertError('Not enough data', `Not enough samples: group 1 has ${x.length}, group 2 has ${y.length}; need at least 2 each.`);
          setResult(null);
          return;
        }
        if (selectedTest === 'mann_whitney') {
          const mp = mannWhitney(x, y, alpha, 'two-sided');
          computed = { type: 'two-sample-nonparam', test_used: 'mann_whitney', ...mp, sample1_values: x, sample2_values: y, evaluation_type: evalType || null };
        } else if (selectedTest === 't_student') {
          const tp = await tTwoSampleStudentAsync(x, y, alpha, 'two-sided');
          computed = { type: 'two-sample-t', test_used: 't_student', ...tp, sample1_values: x, sample2_values: y, evaluation_type: evalType || null };
        } else if (selectedTest === 'mood_median_test') {
          const mp = await moodMedianAsync(x, y, alpha);
          computed = { type: 'two-sample-nonparam', test_used: 'mood_median_test', ...mp, sample1_values: x, sample2_values: y, evaluation_type: evalType || null };
        } else { // default welch
          const tp = await tTwoSampleWelchAsync(x, y, alpha, 'two-sided');
          computed = { type: 'two-sample-welch', test_used: 't_welch', ...tp, sample1_values: x, sample2_values: y, evaluation_type: evalType || null };
        }
      }

      // include event-level metadata from the server if available so the UI can show the events table
      if (series?.events) {
        try { computed = { ...computed, events: series.events }; } catch (e) { /* ignore */ }
      }
      setResult(computed);
      alertSuccess('Test Result', 'Computed on the client using preloaded series.');
    } catch (e) {
      const msg = e?.message || 'Failed';
      setError(msg);
      const body = e?.body || null;
      console.error('[Stats] Run error:', e, body || 'no-body');
      if (body && body.error === 'threshold_missing') {
        alertError('Missing Threshold', 'No threshold found for this parameter/class — set thresholds in the Admin panel.');
      } else if (body && body.error === 'insufficient_data') {
        const minReq = body.min_required || 3;
        if (body.n != null) {
          alertError('Not enough data', `Not enough samples to run the test: found ${body.n}, need at least ${minReq}.`);
        } else if (body.n1 != null || body.n2 != null) {
          const n1 = body.n1 ?? 0; const n2 = body.n2 ?? 0; const mr = body.min_required ?? minReq;
          alertError('Not enough data', `Not enough samples: group 1 has ${n1}, group 2 has ${n2}; need at least ${mr} each.`);
        } else {
          alertError('Not enough data', `Insufficient data to run the test (need at least ${minReq} observations).`);
        }
      }
      else {
        alertError('Test Error', msg);
      }
    } finally { setLoading(false); }
  };

  // Preview removal: no preview fetcher

  const fmt = (v) => (v == null ? '' : Number(v).toFixed(2));
  const sci = (v) => (v == null ? '' : (v < 0.001 ? Number(v).toExponential(2) : v.toFixed(4)));
  const ciLine = (r) => (r.ci_lower != null && r.ci_upper != null ? <div>CI ({Math.round((r.ci_level||0)*100)}%): [{fmt(r.ci_lower)}, {fmt(r.ci_upper)}]</div> : null);

  // basic stats helpers for fallbacks
  const basicStats = (arr) => {
    if (!Array.isArray(arr)) return null;
    const xs = arr.map(Number).filter(Number.isFinite);
    const n = xs.length;
    if (n === 0) return null;
    const mean = xs.reduce((a,b)=>a+b,0)/n;
    const sorted = xs.slice().sort((a,b)=>a-b);
    const mid = Math.floor(n/2);
    const median = n % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
    const sd = n > 1 ? Math.sqrt(xs.reduce((a,b)=>a + Math.pow(b-mean,2), 0)/(n-1)) : 0;
    return { n, mean, median, sd };
  };

  const renderResult = () => {
    if (!result) return null;
    const gridItems = [];
    const push = (k, v) => gridItems.push({ k, v });
    const labelMap = {
      // types
      'one-sample':'One-sample t-test',
      'one-sample-nonparam':'Wilcoxon signed-rank',
      'two-sample-welch':'Two-sample Welch t-test',
      'two-sample-nonparam':'Mann-Whitney U test',
      'tost':'Equivalence TOST',
      // test_used
      't_one_sample':'One-sample t-test',
      'wilcoxon_signed_rank':'Wilcoxon signed-rank',
      'sign_test':'Sign test',
      't_student':'Student t-test (equal var)',
      't_welch':'Welch t-test (unequal var)',
      'mann_whitney':'Mann–Whitney U',
      'mood_median_test':'Mood’s median test',
    };
    const testLabel = labelMap[result.test_used] || labelMap[result.type] || result.test_used || result.type;
    push('Test Selected', testLabel);
    if (result.normality_test) {
      if (result.normality_test.sample1) {
        push('Normality S1', result.normality_test.sample1.normal ? 'Normal' : 'Non-normal');
        push('Normality S2', result.normality_test.sample2.normal ? 'Normal' : 'Non-normal');
      } else if (result.normality_test.normal !== undefined) {
        push('Normality', result.normality_test.normal ? 'Normal' : 'Non-normal');
      }
    }
  // Ensure core descriptive stats are present for all tests using fallbacks from raw samples
  const one = Array.isArray(result.sample_values) ? result.sample_values : null;
  const two1 = Array.isArray(result.sample1_values) ? result.sample1_values : null;
  const two2 = Array.isArray(result.sample2_values) ? result.sample2_values : null;
  const oneStats = one ? basicStats(one) : null;
  const stats1 = two1 ? basicStats(two1) : null;
  const stats2 = two2 ? basicStats(two2) : null;

  if ('n' in result) push('N', result.n || result.sample_n);
  else if (oneStats) push('N', oneStats.n);

  if ('n1' in result) push('N1', result.n1 || result.sample1_n);
  else if (stats1) push('N1', stats1.n);

  if ('n2' in result) push('N2', result.n2 || result.sample2_n);
  else if (stats2) push('N2', stats2.n);

  if ('mean' in result) push('Mean', fmt(result.mean));
  else if (oneStats) push('Mean', fmt(oneStats.mean));

  if ('median' in result) push('Median', fmt(result.median));
  else if (oneStats) push('Median', fmt(oneStats.median));

  if ('mean1' in result) push('Mean (Lake 1)', fmt(result.mean1));
  else if (stats1) push('Mean (Lake 1)', fmt(stats1.mean));

  if ('median1' in result) push('Median (Lake 1)', fmt(result.median1));
  else if (stats1) push('Median (Lake 1)', fmt(stats1.median));

  if ('mean2' in result) push('Mean (Lake 2)', fmt(result.mean2));
  else if (stats2) push('Mean (Lake 2)', fmt(stats2.mean));

  if ('median2' in result) push('Median (Lake 2)', fmt(result.median2));
  else if (stats2) push('Median (Lake 2)', fmt(stats2.median));

  if ('sd' in result) push('SD', fmt(result.sd));
  else if (oneStats) push('SD', fmt(oneStats.sd));

  if ('sd1' in result) push('SD (Lake 1)', fmt(result.sd1));
  else if (stats1) push('SD (Lake 1)', fmt(stats1.sd));

  if ('sd2' in result) push('SD (Lake 2)', fmt(result.sd2));
  else if (stats2) push('SD (Lake 2)', fmt(stats2.sd));
    if ('t' in result) push('t statistic', fmt(result.t));
    if ('U' in result) push('U', fmt(result.U));
    if ('z' in result) push('z', fmt(result.z));
    if ('df' in result) push('Degrees Freedom', fmt(result.df));
    if ('statistic' in result) push('Statistic', fmt(result.statistic));
    if ('chi2' in result) push('Chi-square', fmt(result.chi2));
    // Sign test details
    if ('k_positive' in result) push('Positives', result.k_positive);
    if ('k_negative' in result) push('Negatives', result.k_negative);
    // Wilcoxon fallback details
    if (!('statistic' in result)) {
      if ('Wplus' in result) push('W+', fmt(result.Wplus));
      if ('Wminus' in result) push('W-', fmt(result.Wminus));
    }
    // TOST details
    if (result.test_used === 'tost' || result.type === 'tost') {
      if ('t1' in result) push('t1 (lower)', fmt(result.t1));
      if ('p1' in result) push('p1 (H0: mean ≤ lower)', sci(result.p1));
      if ('t2' in result) push('t2 (upper)', fmt(result.t2));
      if ('p2' in result) push('p2 (H0: mean ≥ upper)', sci(result.p2));
      if ('equivalent' in result) push('Equivalent?', result.equivalent ? 'Yes' : 'No');
    }
    if ('p_value' in result) push('p-value', sci(result.p_value));
    if ('mu0' in result) push('Threshold (μ0)', fmt(result.mu0));
    if (result.threshold_min != null) push('Threshold Min', result.threshold_min);
    if (result.threshold_max != null) push('Threshold Max', result.threshold_max);
    if (result.standard_code) push('Standard', result.standard_code);
    if (result.class_code_used) push('Class Used', result.class_code_used);
    if (result.standard_fallback) push('Std Fallback', 'Yes');
    if (result.class_fallback) push('Class Fallback', 'Yes');

    const interpretation = result.interpretation_detail || result.interpretation || '';

    // Build a short water-quality context sentence to accompany the statistical interpretation.
    let wqContext = '';
    try {
      if (paramCode) {
        const p = (paramOptions || []).find(p => String(p.code) === String(paramCode) || String(p.key) === String(paramCode) || String(p.id) === String(paramCode));
        const paramLabel = p?.label || p?.name || String(paramCode);

        const getThreshold = () => {
          // Prefer server-provided thresholds
          if (result.threshold_min != null && result.threshold_max != null) return { type: 'range', min: Number(result.threshold_min), max: Number(result.threshold_max), kind: 'range' };
          if (result.mu0 != null) {
            // try to use evaluation_type if provided from server
            const et = result.evaluation_type || (series && series.evaluation_type) || null;
            const kind = et === 'min' ? 'min' : (et === 'max' ? 'max' : 'value');
            return { type: 'value', value: Number(result.mu0), kind };
          }
          // static thresholds by class
          const entry = staticThresholds && staticThresholds[paramCode];
          if (entry) {
            if (entry.type === 'range') {
              const rng = entry[classCode];
              if (Array.isArray(rng) && rng.length >= 2) return { type: 'range', min: Number(rng[0]), max: Number(rng[1]), kind: 'range' };
            }
            const val = entry[classCode];
            if (val != null) {
              const kind = entry.type === 'min' || entry.type === 'max' ? entry.type : (entry.type === 'value' ? 'max' : (entry.type || 'max'));
              return { type: 'value', value: Number(val), kind };
            }
          }
          return null;
        };

        const thr = getThreshold();

        // One-sample flows (or equivalently when there's a single mean)
        if (result.test_used === 'tost' || result.type === 'tost') {
          const mean = result.mean != null ? Number(result.mean) : null;
          if (result.equivalent) {
            wqContext = `Equivalence test: mean ${paramLabel} appears within the acceptable range${classCode ? ` for Class ${classCode}` : ''}. This indicates no clear change in water quality.`;
          } else {
            // Not equivalent: try use thresholds or heuristic to determine direction
            if (thr && mean != null) {
              if (thr.type === 'range') {
                if (mean < thr.min) wqContext = `Mean ${paramLabel} (${fmt(mean)}) is below the acceptable range [${fmt(thr.min)}, ${fmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}, which may indicate a degradation.`;
                else if (mean > thr.max) wqContext = `Mean ${paramLabel} (${fmt(mean)}) is above the acceptable range [${fmt(thr.min)}, ${fmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}, which may indicate a degradation.`;
                else wqContext = `Mean ${paramLabel} (${fmt(mean)}) is near the acceptable range but not sufficiently equivalent${classCode ? ` for Class ${classCode}` : ''}.`;
              } else if (thr.value != null) {
                const kind = thr.kind || (thr.type === 'value' ? 'max' : thr.type);
                if (kind === 'max') {
                  wqContext = mean > thr.value ? `Mean ${paramLabel} (${fmt(mean)}) is above threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}, which may indicate a degradation.` : `Mean ${paramLabel} (${fmt(mean)}) is below threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}, which does not appear to indicate degradation.`;
                } else {
                  wqContext = mean < thr.value ? `Mean ${paramLabel} (${fmt(mean)}) is below minimum threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}, which may indicate a degradation.` : `Mean ${paramLabel} (${fmt(mean)}) is above minimum threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}, which does not appear to indicate degradation.`;
                }
              }
            } else {
              wqContext = `Equivalence test: mean ${paramLabel} did not meet equivalence bounds${classCode ? ` for Class ${classCode}` : ''}; results are inconclusive regarding direction.`; 
            }
          }
        } else if ('n' in result || (!('n1' in result) && !('n2' in result))) {
          const mean = result.mean != null ? Number(result.mean) : null;
          const mu0 = result.mu0 != null ? Number(result.mu0) : null;
          // Decide direction where possible
          const lowIsWorse = /oxygen|dissolved oxygen|\bdo\b/i.test(paramLabel);

          const decideVerdict = () => {
            if (mean == null) return 'stable';
            if (thr) {
              if (thr.type === 'range') {
                  if (mean < thr.min) return 'degradation';
                  if (mean > thr.max) return 'degradation';
                  return 'stable';
                }
              if (thr.value != null) {
                const kind = thr.kind || (thr.type === 'value' ? 'max' : thr.type);
                if (kind === 'max') return mean > thr.value ? 'degradation' : 'improvement';
                if (kind === 'min') return mean < thr.value ? 'degradation' : 'improvement';
                return 'stable';
              }
            }
            // If mu0 available, compare against it
            if (mu0 != null) {
              if (lowIsWorse) return mean < mu0 ? 'degradation' : 'improvement';
              return mean > mu0 ? 'degradation' : 'improvement';
            }
            // If significance present without thresholds, derive from sign of mean against 0 or report 'neither'
            if (result.significant != null) {
              // compare to median  of sample values? fallback: treat higher as worse unless param indicates otherwise
              if (lowIsWorse) return result.mean1 != null && result.mean2 != null ? (Number(result.mean1) < Number(result.mean2) ? 'degradation' : (Number(result.mean1) > Number(result.mean2) ? 'improvement' : 'stable')) : (mean > 0 ? 'degradation' : 'stable');
              return mean > 0 ? 'degradation' : 'stable';
            }
            return 'stable';
          };

          const verdict = decideVerdict();

            if (thr && thr.type === 'range' && mean != null) {
            if (mean < thr.min || mean > thr.max) wqContext = `Mean ${paramLabel} (${fmt(mean)}) is outside the acceptable range [${fmt(thr.min)}, ${fmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}. This may suggest a ${verdict} in water quality.`;
            else wqContext = `Mean ${paramLabel} (${fmt(mean)}) is within the acceptable range${classCode ? ` for Class ${classCode}` : ''}. This suggests ${verdict === 'stable' ? 'no clear change in water quality' : `a ${verdict}`}.`;
          } else if (thr && thr.value != null && mean != null) {
            const kind = thr.kind || (thr.type === 'value' ? 'max' : thr.type);
            if (kind === 'max') {
              if (mean > thr.value) wqContext = `Mean ${paramLabel} (${fmt(mean)}) is above threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}, which may indicate a degradation.`;
              else wqContext = `Mean ${paramLabel} (${fmt(mean)}) is below threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}, which does not appear to indicate degradation.`;
            } else {
              if (mean < thr.value) wqContext = `Mean ${paramLabel} (${fmt(mean)}) is below minimum threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}, which may indicate a degradation.`;
              else wqContext = `Mean ${paramLabel} (${fmt(mean)}) is above minimum threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}, which does not appear to indicate degradation.`;
            }
          } else {
            if (result.significant != null) {
              if (result.significant) {
                // Build a clearer water-quality sentence using thresholds when available
                if (verdict === 'degradation') {
                  if (thr && thr.type === 'range') {
                    wqContext = `Statistical evidence suggests a possible degradation in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) falls outside the acceptable range [${fmt(thr.min)}, ${fmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}, which may be of concern.`;
                  } else if (thr && thr.value != null) {
                    const kind = thr.kind || (thr.type === 'value' ? 'max' : thr.type);
                    if (kind === 'max') wqContext = `Statistical evidence suggests a possible degradation in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) is above the threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`;
                    else wqContext = `Statistical evidence suggests a possible degradation in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) is below the minimum threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`;
                  } else {
                    wqContext = `Statistical evidence suggests a possible degradation in water quality for ${paramLabel} (mean ${fmt(mean)}).`;
                  }
                } else if (verdict === 'improvement') {
                  if (thr && thr.type === 'range') {
                    wqContext = `Statistical evidence suggests a possible improvement in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) is closer to the acceptable range [${fmt(thr.min)}, ${fmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}.`;
                  } else if (thr && thr.value != null) {
                    const kind = thr.kind || (thr.type === 'value' ? 'max' : thr.type);
                    if (kind === 'max') wqContext = `Statistical evidence suggests a possible improvement in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) is below the threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`;
                    else wqContext = `Statistical evidence suggests a possible improvement in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) is above the minimum threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`;
                  } else {
                    wqContext = `Statistical evidence suggests a possible improvement in water quality for ${paramLabel} (mean ${fmt(mean)}).`;
                  }
                } else {
                  wqContext = `Statistical evidence indicates a difference for ${paramLabel}, but does not point clearly to degradation or improvement; water quality appears relatively stable.`;
                }
              } else {
                wqContext = `No statistical evidence of difference for ${paramLabel} compared to reference; water quality appears stable with respect to this parameter.`;
              }
            }
          }
        } else if ('n1' in result && 'n2' in result) {
          const m1 = result.mean1 != null ? Number(result.mean1) : null;
          const m2 = result.mean2 != null ? Number(result.mean2) : null;
          if (m1 != null && m2 != null) {
            // Resolve lake names from provided lakes list
            const lakeNameById = (id) => {
              const lk = lakes.find(l => String(l.id) === String(id));
              return lk ? (lk.name || `Lake ${lk.id}`) : (id == null ? '' : `Lake ${id}`);
            };
            const lake1Name = lakeNameById(lakeId);
            const otherId = (compareValue && String(compareValue).startsWith('lake:')) ? String(compareValue).split(':')[1] : null;
            const lake2Name = lakeNameById(otherId);

            if (result.significant) {
              // Decide degradation/improvement/stable using thresholds when available, otherwise heuristics
              let verdict = 'stable';
              if (thr) {
                if (thr.type === 'range') {
                  const dist = (m, t) => {
                    if (m < t.min) return t.min - m;
                    if (m > t.max) return m - t.max;
                    return 0;
                  };
                  const d1 = dist(m1, thr);
                  const d2 = dist(m2, thr);
                  if (d1 > d2) verdict = 'degradation';
                  else if (d1 < d2) verdict = 'improvement';
                  else verdict = 'stable';
                } else if (thr.value != null) {
                  const kind = thr.kind || (thr.type === 'value' ? 'max' : thr.type);
                  if (kind === 'max') {
                    if (m1 > m2) verdict = 'degradation'; else if (m1 < m2) verdict = 'improvement';
                  } else if (kind === 'min') {
                    if (m1 < m2) verdict = 'degradation'; else if (m1 > m2) verdict = 'improvement';
                  }
                }
              } else {
                // Heuristic: for oxygen-like params lower is worse; otherwise assume higher is worse
                const lowIsWorse = /oxygen|dissolved oxygen|do\b/i.test(paramLabel);
                if (lowIsWorse) {
                  if (m1 < m2) verdict = 'degradation'; else if (m1 > m2) verdict = 'improvement';
                } else {
                  if (m1 > m2) verdict = 'degradation'; else if (m1 < m2) verdict = 'improvement';
                }
              }

              const dir = m1 > m2 ? 'higher' : (m1 < m2 ? 'lower' : 'similar');
              wqContext = `${lake1Name} mean ${paramLabel} (${fmt(m1)}) is ${dir} than ${lake2Name} (${fmt(m2)}). This may suggest a ${verdict} in water quality for ${lake1Name} relative to ${lake2Name}.`;
            } else {
              wqContext = `No significant difference between ${lake1Name} and ${lake2Name} for ${paramLabel}; no clear change detected.`;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to build water-quality context', e);
    }

    const finalInterpretation = [interpretation, wqContext].filter(Boolean).join(' ');

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
          <div style={{ marginTop:6 }}>{finalInterpretation}</div>
          {result.significant != null && (
            <div style={{ marginTop:6, fontSize:12, opacity:0.8 }}>
              Statistical decision: {result.significant ? 'Reject null hypothesis (difference detected).' : 'Fail to reject null hypothesis.'}
            </div>
          )}
        </div>
        {/* Values used panel (shown only after running a test) */}
        {renderValuesUsed(result)}
      </div>
    );
  };

  const renderValuesUsed = (r) => {
    // Prefer events array (contains sampled_at, station_id, lake_id, value) if available
    const events = Array.isArray(r.events) ? r.events : null;

    // Fallback to the older arrays for backward compatibility
    const one = Array.isArray(r.sample_values) ? r.sample_values : null;
    const two1 = Array.isArray(r.sample1_values) ? r.sample1_values : null;
    const two2 = Array.isArray(r.sample2_values) ? r.sample2_values : null;
    if (!events && !one && !(two1 && two2)) return null;

    const limit = 200;
    const showAll = showAllValues;
    const slice = (arr) => (showAll ? arr : arr.slice(0, limit));

    const lakeName = (id) => {
      const lk = lakes.find(l => String(l.id) === String(id));
      return lk ? (lk.name || `Lake ${lk.id}`) : (id == null ? '' : `Lake ${id}`);
    };

    const copyValues = async () => {
      try {
        let text = '';
        if (events) {
          // CSV: sampled_at,lake,station,value
          const lines = [ 'sampled_at,lake,station_id,value' ];
          slice(events).forEach(ev => lines.push(`${ev.sampled_at || ''},"${lakeName(ev.lake_id)}",${ev.station_id ?? ''},${ev.value ?? ''}`));
          text = lines.join('\n');
        } else if (one) {
          text = slice(one).join(', ');
        } else {
          const maxLen = Math.max(two1.length, two2.length);
          const lines = [ [groupLabel(two1, two2, 1), groupLabel(two1, two2, 2)].join(',') ];
          for (let i=0;i<maxLen;i++) {
            const a = i < two1.length ? two1[i] : '';
            const b = i < two2.length ? two2[i] : '';
            lines.push(`${a},${b}`);
          }
          text = lines.join('\n');
        }

        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          alertSuccess('Copied', 'Values copied to clipboard.');
        } else {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
          alertSuccess('Copied', 'Values copied to clipboard.');
        }
      } catch (e) {
        console.warn('Copy failed', e);
        alertError('Copy failed', 'Could not copy values to clipboard.');
      }
    };

    const copyValuesOnly = async () => {
      try {
        let text = '';
        if (events) {
          text = slice(events).map(ev => (ev.value != null ? ev.value : '')).join(', ');
        } else if (one) {
          text = slice(one).join(', ');
        } else if (two1 && two2) {
          // Copy both groups as two comma-separated lines with labels
          const a = slice(two1).join(', ');
          const b = slice(two2).join(', ');
          text = `${groupLabel(two1, two2, 1)}: ${a}\n${groupLabel(two1, two2, 2)}: ${b}`;
        }

        if (!text) throw new Error('No values to copy');

        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          alertSuccess('Copied', 'Values copied to clipboard.');
        } else {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
          alertSuccess('Copied', 'Values copied to clipboard.');
        }
      } catch (e) {
        console.warn('Copy values-only failed', e);
        alertError('Copy failed', 'Could not copy values to clipboard.');
      }
    };

    // helper to label two-sample columns when falling back
    const groupLabel = (a,b,idx) => {
      if (!(a && b)) return idx === 1 ? 'Group 1' : 'Group 2';
      const lake = lakes.find(l => String(l.id) === String(lakeId));
      if (idx === 1) return lake?.name ? `${lake.name}` : 'Group 1';
      if (compareValue && String(compareValue).startsWith('lake:')){
        const otherId = String(compareValue).split(':')[1];
        const lake2 = lakes.find(l => String(l.id) === String(otherId));
        return lake2?.name ? `${lake2.name}` : 'Group 2';
      }
      return 'Group 2';
    };

    return (
      <div style={{ marginTop:10, padding:10, background:'rgba(255,255,255,0.02)', borderRadius:6 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <strong>Values used</strong>
          <div style={{ display:'flex', gap:8 }}>
            <button className="pill-btn" onClick={()=>setShowAllValues(s=>!s)}>{showAll ? `Show first ${limit}` : 'Show all'}</button>
            <button className="pill-btn" onClick={copyValues}>Copy</button>
            <button className="pill-btn" onClick={copyValuesOnly}>Copy values</button>
          </div>
        </div>

        {events ? (
          <div style={{ marginTop:8 }}>
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.02)', borderRadius:6, minWidth:0 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, tableLayout: 'fixed', minWidth:0 }}>
              <thead>
                <tr style={{ textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding:'6px 8px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>Sampled at</th>
                  <th style={{ padding:'6px 8px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>Lake</th>
                  <th style={{ padding:'6px 8px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>Station</th>
                  <th style={{ padding:'6px 8px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {slice(events).map((ev, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding:'6px 8px', fontSize:12, overflowWrap: 'anywhere', wordBreak: 'break-word', minWidth:0 }}>{ev.sampled_at || ''}</td>
                    <td style={{ padding:'6px 8px', fontSize:12, overflowWrap: 'anywhere', wordBreak: 'break-word', minWidth:0 }}>{lakeName(ev.lake_id)}</td>
                    <td style={{ padding:'6px 8px', fontSize:12, overflowWrap: 'anywhere', wordBreak: 'break-word', minWidth:0 }}>{ev.station_name ?? (ev.station_id ?? '')}</td>
                    <td style={{ padding:'6px 8px', fontSize:12, overflowWrap: 'anywhere', wordBreak: 'break-word', minWidth:0 }}>{ev.value != null ? Number(ev.value).toFixed(2) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {!showAll && events.length > limit && (
              <div style={{ marginTop:6, fontSize:11, opacity:0.65 }}>Showing first {limit} of {events.length} events</div>
            )}
          </div>
        ) : one ? (
          <div style={{ marginTop:8, fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:12, lineHeight:'18px', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
            {slice(one).join(', ')}
            {!showAll && one.length > limit && (
              <div style={{ marginTop:6, fontSize:11, opacity:0.65 }}>Showing first {limit} of {one.length} values</div>
            )}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:8 }}>
            <div>
              <div style={{ fontSize:12, opacity:0.8, marginBottom:6 }}>{groupLabel(two1, two2, 1)} ({two1.length})</div>
              <div style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:12, lineHeight:'18px', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                {slice(two1).join(', ')}
                {!showAll && two1.length > limit && (
                  <div style={{ marginTop:6, fontSize:11, opacity:0.65 }}>Showing first {limit} of {two1.length} values</div>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize:12, opacity:0.8, marginBottom:6 }}>{groupLabel(two1, two2, 2)} ({two2.length})</div>
              <div style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:12, lineHeight:'18px', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                {slice(two2).join(', ')}
                {!showAll && two2.length > limit && (
                  <div style={{ marginTop:6, fontSize:11, opacity:0.65 }}>Showing first {limit} of {two2.length} values</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
  <div ref={containerRef} className="insight-card" style={{ position:'relative', minWidth: 0, maxWidth: '100%', padding: 8 }}>
    <h4 style={{ margin: '2px 0 8px' }}>Advanced Statistics</h4>
    {/* gear was moved back to the actions area */}
  <div>
  <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 1fr', gridTemplateRows:'repeat(2, auto)', gap:10, alignItems:'start', fontSize:13, minWidth:0 }}>
      {/* Row 1: Applied Standard, Parameter, Confidence Level (compact) */}
      <div style={{ gridColumn: '1 / span 1', minWidth:0 }}>
        <select className="pill-btn" value={appliedStandardId} onChange={e=>{setAppliedStandardId(e.target.value); setResult(null);}} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
          <option value="">Applied Standard</option>
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
            {/* One-sample options */}
            <option value="t_one_sample" disabled={inferredTest!=='one-sample'}>One-sample t-test</option>
            <option value="wilcoxon_signed_rank" disabled={inferredTest!=='one-sample'}>Wilcoxon signed-rank</option>
            <option value="sign_test" disabled={inferredTest!=='one-sample'}>Sign test</option>
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
          <option value="">Organization (optional)</option>
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
    <div style={{ marginTop:8 }}>{renderResult()}</div>
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
