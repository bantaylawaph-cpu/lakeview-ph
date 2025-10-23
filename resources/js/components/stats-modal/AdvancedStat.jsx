import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import { FiSettings, FiX, FiInfo } from 'react-icons/fi';
import Popover from "../common/Popover";
import { apiPublic, getToken } from "../../lib/api";
import { fetchSampleEvents, deriveOrgOptions } from "./data/fetchers"; // removed unused fetchParameters
import { alertSuccess, alertError } from '../../lib/alerts';
import { runOneSample, runTwoSample } from './statsAdapter'; // consolidated test execution
import { fmt, sci } from './formatters';
import ResultPanel from './ResultPanel';
import InfoModal from '../common/InfoModal';

function AdvancedStat({ lakes = [], params = [], paramOptions: parentParamOptions = [], staticThresholds = {} }, ref) {
  const [paramCode, setParamCode] = useState('');
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
  const [depthMode, setDepthMode] = useState('all');
  const [depthValue, setDepthValue] = useState('');
  const [availableDepths, setAvailableDepths] = useState([]);
  const [cl, setCl] = useState('0.95');
  const [showGearPopover, setShowGearPopover] = useState(false);
  const [yearError, setYearError] = useState('');
  const [debouncedYearFrom, setDebouncedYearFrom] = useState('');
  const [debouncedYearTo, setDebouncedYearTo] = useState('');
  const [advisories, setAdvisories] = useState([]);
  const [flagProblems, setFlagProblems] = useState(false);
  const paramOptions = (parentParamOptions && parentParamOptions.length ? parentParamOptions : (params || []));
  const [standards, setStandards] = useState([]);
  const [classes, setClasses] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [secondaryOrgOptions, setSecondaryOrgOptions] = useState([]);
  const [paramEvaluationType, setParamEvaluationType] = useState(null);

  const [stationId, setStationId] = useState('');
  const [stationOptions, setStationOptions] = useState([]);

  const containerRef = useRef(null);
  const gearBtnRef = useRef(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Plain-English help content for end users
  const infoSections = React.useMemo(() => ([
    {
      heading: 'Purpose',
      text: 'Answer water‑quality questions with your filtered data: check if a lake meets a standard, compare two lakes, or confirm values sit within a safe range.'
    },
    {
      heading: 'When to use it',
      bullets: [
        'One‑sample: One lake vs a standard/class or a target.',
        'Two‑sample: Compare two lakes in the same period.',
        'Equivalence (TOST): Show the typical value is inside a safe window.'
      ]
    },
    {
      heading: 'Dataset Sources (required)',
      text: 'Pick the dataset source. For two‑lake comparisons, select one dataset source per lake to avoid mixing sources. For lake vs threshold, optionally select a station to focus the analysis.'
    },
    {
      heading: 'Quick start',
      bullets: [
        'Select Applied Standard and Parameter (e.g., DO, pH).',
        'Choose Primary Lake + its Dataset Source.',
        'Optionally set Compare to a Class (then optionally pick a Station) or another Lake (then pick its Dataset Source).',
        'Open the gear to set years and (optionally) an exact depth.',
        'Pick a Test (disabled when not applicable) and click Run Test.',
        'Review the summary, p‑value, and advisories; use Export for PDF.'
      ]
    },
    {
      heading: 'Depth & date',
      bullets: [
        'All depths (mean): Use all available depths together.',
        'Exact depth: Focus on one depth (list responds to filters).',
        'Years: “From” must not exceed “To”.'
      ]
    },
    {
      heading: 'Test guide (plain English)',
      bullets: [
        'Shapiro–Wilk: Normality check; if not normal or n is small, prefer Wilcoxon/Sign.',
        'Levene: Compares variability; if unequal, prefer Welch or non‑parametric.',
        'One‑sample t: Is the average different from a target/limit?',
        'Wilcoxon (1‑sample): Robust alternative when not normal.',
        'Sign test (1‑sample): Very robust; uses above/below only.',
        'TOST (t/Wilcoxon): Show the mean is within lower/upper bounds.',
        'Student t (2‑sample): Averages with similar variability.',
        'Welch t (2‑sample): Safer when variability differs.',
        'Mann–Whitney U: Non‑parametric comparison of typical values.',
        'Mood median: Compares medians.'
      ]
    },
    {
      heading: 'Interpreting results',
      bullets: [
        'p‑value: Smaller (e.g., < 0.05) = stronger evidence.',
        'Confidence level: 95% is common; higher = wider intervals, stricter.',
        'TOST: Pass when both one‑sided p‑values are below alpha (e.g., 0.05).',
        'Advisories: Notes on sample size, imbalance, and distance to limits.'
      ]
    },
    {
      heading: 'Export & options',
      bullets: [
        'Export PDF: Saves selections and results (with events when available).',
        'Gear: Set year range and confidence level.',
        'Result toggles: “Exact p‑values” and “Show all values” for auditing.'
      ]
    },
    {
      heading: 'Tips & edge cases',
      bullets: [
  'Run disabled? Check Standard, Parameter, Lake, Dataset Source(s), Test, and years.',
        'Data minimums: Many tests need ≥2 samples (per group).',
  'Empty depth list? Adjust years, lake, parameter, or dataset source.',
        'Two‑lake mode uses server per‑lake aggregates; the client doesn’t average stations.'
      ]
    }
  ]), []);

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

  const paramHasRange = React.useMemo(() => {
    return paramEvaluationType === 'range';
  }, [paramEvaluationType]);

  const allowedTests = React.useMemo(() => {
    if (inferredTest === 'one-sample') {
      return paramHasRange ? ['shapiro_wilk','tost','tost_wilcoxon'] : ['shapiro_wilk','t_one_sample','wilcoxon_signed_rank','sign_test'];
    }
    return ['t_student','t_welch','levene','mann_whitney','mood_median_test'];
  }, [inferredTest, paramHasRange]);

  useEffect(() => {
    if (selectedTest && !allowedTests.includes(selectedTest)) {
      // silently clear invalid selection
      setSelectedTest('');
      setResult(null);
    }
  }, [allowedTests, selectedTest]);

  // Debounce year changes
  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedYearFrom(yearFrom || '');
      setDebouncedYearTo(yearTo || '');
    }, 400);
    return () => clearTimeout(h);
  }, [yearFrom, yearTo]);

  // Validate years
  useEffect(() => {
    const curYr = new Date().getFullYear();
    const yf = yearFrom ? Number(yearFrom) : null;
    const yt = yearTo ? Number(yearTo) : null;
    const isValid = (y) => y && /^\d{4}$/.test(String(y)) && y >= 1970 && y <= curYr + 1;
    let err = '';
    if (yearFrom && !isValid(yf)) err = 'Invalid from year';
    else if (yearTo && !isValid(yt)) err = 'Invalid to year';
    else if (isValid(yf) && isValid(yt) && yf > yt) err = 'Year from must not exceed year to';
    setYearError(err);
  }, [yearFrom, yearTo]);

  // Populate dataset source options for primary lake when lake or (debounced) date range changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!lakeId) { if (mounted) setOrgOptions([]); return; }
      try {
        const lim = 500;
        const fromEff = debouncedYearFrom ? `${debouncedYearFrom}-01-01` : undefined;
        const toEff = debouncedYearTo ? `${debouncedYearTo}-12-31` : undefined;
        const recs = await fetchSampleEvents({ lakeId: Number(lakeId), from: fromEff, to: toEff, limit: lim });
        if (!mounted) return;
        const derived = deriveOrgOptions(recs || []);
        setOrgOptions(derived);
      } catch (e) {
        if (!mounted) return;
        setOrgOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, [lakeId, debouncedYearFrom, debouncedYearTo]);

  // Populate secondary dataset source options when comparing to another lake (debounced years)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!compareValue || !String(compareValue).startsWith('lake:')) { if (mounted) setSecondaryOrgOptions([]); return; }
      const otherLakeId = Number(String(compareValue).split(':')[1]);
      if (!otherLakeId) { if (mounted) setSecondaryOrgOptions([]); return; }
      try {
        const lim = 500;
        const fromEff = debouncedYearFrom ? `${debouncedYearFrom}-01-01` : undefined;
        const toEff = debouncedYearTo ? `${debouncedYearTo}-12-31` : undefined;
        const recs = await fetchSampleEvents({ lakeId: otherLakeId, from: fromEff, to: toEff, limit: lim });
        if (!mounted) return;
        const derived = deriveOrgOptions(recs || []);
        setSecondaryOrgOptions(derived);
      } catch (e) {
        if (!mounted) return;
        setSecondaryOrgOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, [compareValue, debouncedYearFrom, debouncedYearTo]);

  // Disable run based on required selections
  const runDisabled = React.useMemo(() => {
    return false; // Always enable to show popups on missing fields
  }, []);
  

  // Fetch depths when parameter, lake(s), debounced date range or organization changes (one-sample or lake-vs-lake two-sample)
  useEffect(() => {
    let abort = false;
    (async () => {
      // Determine if depth context is valid: one-sample OR two-sample with lake comparison
      const isTwoLake = inferredTest==='two-sample' && compareValue && String(compareValue).startsWith('lake:');
      if (!paramCode || !lakeId || (inferredTest==='two-sample' && !isTwoLake)) { setAvailableDepths([]); setDepthValue(''); return; }
      try {
        const params = new URLSearchParams({ parameter_code: paramCode });
        if (isTwoLake) {
          const otherLakeId = Number(String(compareValue).split(':')[1]);
            params.append('lake_ids[]', String(lakeId));
            params.append('lake_ids[]', String(otherLakeId));
        } else {
          params.append('lake_id', String(lakeId));
        }
        if (debouncedYearFrom) params.append('date_from', `${debouncedYearFrom}-01-01`);
        if (debouncedYearTo) params.append('date_to', `${debouncedYearTo}-12-31`);
        if (organizationId) params.append('organization_id', organizationId);
        if (stationId && stationId !== "all") params.append('station_id', stationId);
        const res = await apiPublic(`/stats/depths?${params.toString()}`);
        if (abort) return;
        const depths = Array.isArray(res?.depths) ? res.depths : (Array.isArray(res?.data?.depths) ? res.data.depths : []);
        setAvailableDepths(depths);
        // Reset depth selection if current value not in new list
        if (depthMode === 'single' && depthValue && !depths.includes(Number(depthValue))) {
          setDepthValue('');
        }
      } catch(e) {
        if (abort) return;
        setAvailableDepths([]);
      }
    })();
    return () => { abort = true; };
  }, [paramCode, lakeId, compareValue, debouncedYearFrom, debouncedYearTo, organizationId, secondaryOrganizationId, inferredTest, depthMode, stationId]);

  // Fetch stations when parameter, lake, debounced date range or organization changes (one-sample vs class)
  useEffect(() => {
    if (!paramCode || !lakeId || !organizationId || inferredTest !== 'one-sample' || !compareValue || !compareValue.startsWith('class:')) {
      setStationOptions([]);
      return;
    }
    const fetchStations = async () => {
      try {
        const params = new URLSearchParams({
          parameter_code: paramCode,
          lake_id: lakeId,
          organization_id: organizationId,
          date_from: debouncedYearFrom ? `${debouncedYearFrom}-01-01` : '',
          date_to: debouncedYearTo ? `${debouncedYearTo}-12-31` : '',
        });
        const res = await apiPublic(`/stats/stations?${params}`);
        setStationOptions(res.stations || []);
      } catch (e) {
        console.error('Failed to fetch stations', e);
        setStationOptions([]);
      }
    };
    fetchStations();
  }, [paramCode, lakeId, organizationId, debouncedYearFrom, debouncedYearTo, inferredTest, compareValue]);

  // Clear TOST selection if it becomes invalid (e.g., user changed to a non-range param or switched to two-sample)
  useEffect(() => {
    if ((selectedTest === 'tost' || selectedTest === 'tost_wilcoxon') && (!paramHasRange || inferredTest !== 'one-sample')) {
      setSelectedTest('');
      setResult(null);
    }
  }, [selectedTest, paramHasRange, inferredTest]);

  useEffect(() => {
    if (!compareValue || !String(compareValue).startsWith('lake:')) {
      if (secondaryOrganizationId) setSecondaryOrganizationId('');
    }
  }, [compareValue, secondaryOrganizationId]);

  // Defensive: if compare lake becomes the same as primary, clear it
  useEffect(() => {
    const isLake = compareValue && String(compareValue).startsWith('lake:');
    const other = isLake ? String(compareValue).split(':')[1] : '';
    if (isLake && other && String(other) === String(lakeId)) {
      setCompareValue('');
      setSecondaryOrganizationId('');
    }
  }, [lakeId, compareValue]);

  useEffect(() => { if (result) setResult(null); }, [debouncedYearFrom, debouncedYearTo]);

  // Clear advisories whenever primary UI selections or framing change
  useEffect(() => {
    // Any UI toggle that meaningfully changes the context should clear previously computed advisories
    setAdvisories([]);
  }, [inferredTest, compareValue, selectedTest, lakeId, classCode, organizationId, secondaryOrganizationId, depthMode, depthValue, flagProblems, debouncedYearFrom, debouncedYearTo, paramCode, appliedStandardId]);

  useEffect(() => {
    fetchThreshold();
  }, [inferredTest, lakeId, paramCode, appliedStandardId]);

  const run = async () => {
    setLoading(true); setError(null); setResult(null); setShowExactP(false); setAdvisories([]);
    // Check for missing required fields and show popups
    if (!appliedStandardId) {
      alertError('Missing Applied Standard', 'Please select an Applied Standard before running the test.');
      setLoading(false);
      return;
    }
    if (!paramCode) {
      alertError('Missing Parameter', 'Please select a Parameter before running the test.');
      setLoading(false);
      return;
    }
    if (!lakeId) {
      alertError('Missing Lake', 'Please select a Primary Lake before running the test.');
      setLoading(false);
      return;
    }
    if (!organizationId) {
      alertError('Missing Dataset Source', 'Please select a Dataset Source before running the test.');
      setLoading(false);
      return;
    }
    if (!selectedTest) {
      alertError('Missing Test', 'Please select a Test before running the test.');
      setLoading(false);
      return;
    }
    if (!allowedTests.includes(selectedTest)) {
      alertError('Invalid Test Selection', 'The selected test is not applicable for the current comparison mode.');
      setLoading(false);
      return;
    }
    if (inferredTest === 'two-sample') {
      if (!compareValue || !String(compareValue).startsWith('lake:')) {
        alertError('Missing Comparison Lake', 'For two-sample tests, please select a lake to compare against.');
        setLoading(false);
        return;
      }
      if (!secondaryOrganizationId) {
        alertError('Missing Secondary Dataset Source', 'Please select a Secondary Dataset Source for the comparison lake.');
        setLoading(false);
        return;
      }
    } else if (inferredTest === 'one-sample') {
      if (!compareValue) {
        alertError('Missing Comparison', 'Please select a Class or Lake to compare against.');
        setLoading(false);
        return;
      }
      if (String(compareValue).startsWith('class:') && stationId === "") {
        alertError('Missing Station Selection', 'Please select a station or "All Stations" for lake vs class threshold tests.');
        setLoading(false);
        return;
      }
    }
    if (yearError) {
      alertError('Invalid Year Range', yearError);
      setLoading(false);
      return;
    }
    try {
      // 1. Build request body for series endpoint
      const body = {
        parameter_code: paramCode,
        date_from: yearFrom ? `${yearFrom}-01-01` : undefined,
        date_to: yearTo ? `${yearTo}-12-31` : undefined,
        applied_standard_id: appliedStandardId || undefined
      };
      // Depth filtering: apply when single depth selected (one-sample or lake vs lake)
      if (depthMode === 'single' && depthValue) {
        body.depth_m = Number(depthValue);
      }
      if (organizationId) body.organization_id = organizationId;
      if (stationId && stationId !== "all") body.station_id = Number(stationId);

      const otherLake = (compareValue && String(compareValue).startsWith('lake:')) ? Number(String(compareValue).split(':')[1]) : undefined;

      if (inferredTest === 'one-sample') {
        body.lake_id = Number(lakeId);
      } else {
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

      const primaryName = lakes.find(l => String(l.id) === String(lakeId))?.name || `Lake ${lakeId}`;
      const secondaryName = otherLake ? (lakes.find(l => String(l.id) === String(otherLake))?.name || `Lake ${otherLake}`) : '';

      let computed;
      if (inferredTest === 'one-sample') {
        const values = (series?.sample_values || []).map(Number).filter(Number.isFinite);
        if (values.length < 2) {
          alertError('Not enough data', `Not enough samples to run the test: found ${values.length}, need at least 2.`);
          setResult(null); setLoading(false); return;
        }

        let mu0 = null;
        const thrMin = series?.threshold_min ?? null;
        const thrMax = series?.threshold_max ?? null;
        let alt = 'two-sided';
        if (evalType === 'range') {
          if (thrMin == null || thrMax == null) throw new Error('threshold_missing_range');
          // Delegated to adapter (supports tost & tost_wilcoxon & shapiro)
          computed = await runOneSample({ selectedTest, values, mu0, alpha, evalType, thrMin, thrMax });
        } else {
          if (thrMin != null || thrMax != null) {
            if (evalType === 'min') mu0 = thrMin != null ? thrMin : thrMax;
            else if (evalType === 'max') mu0 = thrMax != null ? thrMax : thrMin;
            else mu0 = thrMax != null ? thrMax : thrMin;
            // One-sided alternative for single-bound thresholds
            if (selectedTest === 't_one_sample' || selectedTest === 'wilcoxon_signed_rank' || selectedTest === 'sign_test') {
              if (evalType === 'min') alt = 'greater';
              else if (evalType === 'max') alt = 'less';
            }
          } else {
            mu0 = null;
          }
          if (flagProblems && (alt === 'greater' || alt === 'less')) {
            // invert direction for problem framing
            alt = alt === 'greater' ? 'less' : 'greater';
          }
          computed = await runOneSample({ selectedTest, values, mu0, alpha, evalType, thrMin, thrMax, alt });
        }
        // One-sample advisories
        const adv = [];
        const n = (values || []).length;
        if (n < 5) adv.push('Fewer than 5 samples; low statistical power.');
        else if (n < 10) adv.push('Moderate sample size (<10); interpret with caution.');
        const mean = computed.mean != null ? computed.mean : (values.reduce((a,b)=>a+b,0)/values.length);
        const thrMinEff = series?.threshold_min ?? null;
        const thrMaxEff = series?.threshold_max ?? null;
        if (evalType === 'min' && thrMinEff != null) {
          const dist = mean - thrMinEff; // positive = above minimum
          computed.range_distance = dist;
          if (dist >= 0) adv.push(`Mean is above minimum by ${fmt(dist)}`);
          else adv.push(`Mean is below minimum by ${fmt(Math.abs(dist))}`);
        } else if (evalType === 'max' && thrMaxEff != null) {
          const dist = thrMaxEff - mean; // positive = below maximum
          computed.range_distance = dist;
          if (dist >= 0) adv.push(`Mean is below maximum by ${fmt(dist)}`);
          else adv.push(`Mean exceeds maximum by ${fmt(Math.abs(dist))}`);
        } else if (evalType === 'range' && thrMinEff != null && thrMaxEff != null) {
          let dist = 0;
          if (mean < thrMinEff) dist = thrMinEff - mean;
          else if (mean > thrMaxEff) dist = mean - thrMaxEff;
          computed.range_distance = dist; // 0 inside
          if (dist === 0) adv.push('Mean lies within acceptable range.');
          else if (mean < thrMinEff) adv.push(`Mean is below range by ${fmt(dist)}`);
          else adv.push(`Mean is above range by ${fmt(dist)}`);
        }
        if (adv.length) setAdvisories(adv);
      } else {
        const x = (series?.sample1_values || []).map(Number).filter(Number.isFinite);
        const y = (series?.sample2_values || []).map(Number).filter(Number.isFinite);
        if (x.length < 2 || y.length < 2) {
          alertError('Not enough data', `Not enough samples: ${primaryName} has ${x.length}, ${secondaryName} has ${y.length}; need at least 2 each.`);
          setResult(null); setLoading(false); return;
        }
        computed = await runTwoSample({ selectedTest, sample1: x, sample2: y, alpha, evalType });
        // Advisory & threshold distance logic
        const adv = [];
        const n1 = x.length, n2 = y.length;
        const small = Math.min(n1, n2), large = Math.max(n1, n2);
        if (small < 5) adv.push('One group has fewer than 5 samples; statistical power is limited.');
        if (large > 0 && small / large < 0.5) adv.push('Sample size imbalance (smaller group < 50% of larger); consider cautious interpretation.');
        const thrMin = series?.threshold_min ?? null;
        const thrMax = series?.threshold_max ?? null;
        if (thrMin != null || thrMax != null) {
          const mean1 = computed.mean1 != null ? computed.mean1 : (x.reduce((a,b)=>a+b,0)/x.length);
          const mean2 = computed.mean2 != null ? computed.mean2 : (y.reduce((a,b)=>a+b,0)/y.length);
          const distCalc = (m) => {
            if (evalType === 'min' && thrMin != null) return m - thrMin; // positive = above minimum
            if (evalType === 'max' && thrMax != null) return thrMax - m; // positive = below maximum
            if (evalType === 'range' && thrMin != null && thrMax != null) {
              if (m < thrMin) return thrMin - m; // distance below
              if (m > thrMax) return m - thrMax; // distance above
              return 0; // inside
            }
            return null;
          };
          const d1 = distCalc(mean1);
          const d2 = distCalc(mean2);
          if (d1 != null) computed.range_distance1 = d1;
          if (d2 != null) computed.range_distance2 = d2;
          if (evalType === 'range') {
            if (d1 === 0 && d2 === 0) adv.push('Both group means lie within the acceptable range.');
            else if ((d1 === 0 && d2 !== 0) || (d2 === 0 && d1 !== 0)) adv.push('Only one group mean lies within the acceptable range.');
          }
        }
        if (adv.length) setAdvisories(adv);
        // advisories derived above
      }

      if (series?.events) {
        computed = { ...computed, events: series.events };
      }
      setResult(computed);
      alertSuccess('Test Result', 'Computed statistical test successfully.');
    } catch (e) {
      console.error('[Stats] run error', e);
      const msg = e?.message || 'Failed';
      setError(msg);
      if (msg === 'threshold_missing_range') {
        alertError('Threshold missing', 'Range evaluation requires both lower and upper thresholds.');
      } else if (/not enough data/i.test(msg)) {
      } else {
        alertError('Test Error', msg);
      }
    } finally { setLoading(false); }
  };

  const clearAll = () => {
  // clearAll invoked
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
    setAdvisories([]);
    setParamEvaluationType(null);
    setStationId('');
    setStationOptions([]);
  };

  const fetchThreshold = async () => {
    if (inferredTest !== 'one-sample' || !lakeId || !paramCode) {
      setParamEvaluationType(null);
      return;
    }
    try {
      const data = {
        parameter_code: paramCode,
        lake_id: Number(lakeId),
        applied_standard_id: appliedStandardId || undefined,
      };
      const res = await apiPublic('/stats/series', { method: 'POST', body: data });
      setParamEvaluationType(res?.evaluation_type || null);
    } catch (e) {
      setParamEvaluationType(null);
    }
  };

  const exportPdf = async () => {
    try {
      // Require user to be signed-in
      const token = getToken();
      if (!token) {
        await alertError('Sign in required', 'You must be a registered user to export results.');
        return;
      }
      if (!result) return;
      const title = `Advanced statistics - ${paramCode || ''}`;
      const style = `body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 18px; } h1 { font-size: 18px; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 6px; }`;
        const testNames = {
          shapiro_wilk: 'Shapiro–Wilk',
          t_one_sample: 'One-sample t-test',
          wilcoxon_signed_rank: 'Wilcoxon signed-rank',
          sign_test: 'Sign test',
          tost: 'Equivalence TOST t',
          tost_wilcoxon: 'Equivalence TOST Wilcoxon',
          t_student: 'Student t-test',
          t_welch: 'Welch t-test',
          levene: 'Levene variance test',
          mann_whitney: 'Mann–Whitney U',
          mood_median_test: "Mood median test"
        };

        const findTestLabel = (r) => {
          const code = (r.test_used || r.type || selectedTest || '').toString();
          return testNames[code] || code.replace(/_/g, ' ');
        };

        const fmtP = (p) => {
          if (p == null || Number.isNaN(Number(p))) return '';
          const n = Number(p);
          if (isFinite(n) && n > 0 && n < 0.001) return '&lt;0.001';
          return sci(n);
        };

        const findParamName = (code) => {
          if (!code) return '';
          const e = (paramOptions || []).find(x => x.code === code || x.key === code || String(x.id) === String(code));
          return e ? (e.label || e.name || e.code) : code;
        };

        const findLakeName = (id) => {
          if (!id) return '';
          const e = (lakes || []).find(x => String(x.id) === String(id));
          return e ? (e.name || `Lake ${e.id}`) : String(id);
        };

        const summaryRows = [];
        if (result) {
          summaryRows.push(`<tr><th>Test</th><td>${findTestLabel(result)}</td></tr>`);
          summaryRows.push(`<tr><th>Framing</th><td>${flagProblems ? 'Problem (exceedance)' : 'Compliance (meeting standard)'}</td></tr>`);
          if (result.alternative) summaryRows.push(`<tr><th>Alternative</th><td>${result.alternative}</td></tr>`);
          if (result.p_value != null) summaryRows.push(`<tr><th>p-value</th><td>${fmtP(result.p_value)}</td></tr>`);
          if (result.p_lower != null && result.p_upper != null) summaryRows.push(`<tr><th>TOST p (lower/upper)</th><td>${fmtP(result.p_lower)} / ${fmtP(result.p_upper)}</td></tr>`);
          if (result.pTOST != null) summaryRows.push(`<tr><th>TOST max p</th><td>${fmtP(result.pTOST)}</td></tr>`);
          if (result.mean != null) summaryRows.push(`<tr><th>Mean</th><td>${fmt(result.mean)}</td></tr>`);
          if (result.median != null) summaryRows.push(`<tr><th>Median</th><td>${fmt(result.median)}</td></tr>`);
          if (result.sd != null) summaryRows.push(`<tr><th>SD</th><td>${fmt(result.sd)}</td></tr>`);
          if (result.n != null) summaryRows.push(`<tr><th>N</th><td>${fmt(result.n)}</td></tr>`);
          if (paramCode) summaryRows.push(`<tr><th>Parameter</th><td>${findParamName(paramCode)}</td></tr>`);
          if (lakeId) summaryRows.push(`<tr><th>Lake</th><td>${findLakeName(lakeId)}</td></tr>`);
          if (compareValue && String(compareValue).startsWith('lake:')) {
            const otherId = String(compareValue).split(':')[1];
            summaryRows.push(`<tr><th>Compare (lake)</th><td>${findLakeName(otherId)}</td></tr>`);
          } else if (compareValue && String(compareValue).startsWith('class:')) {
            summaryRows.push(`<tr><th>Compare (class)</th><td>${String(compareValue).split(':')[1] || ''}</td></tr>`);
          }
          if (result.mean1 != null) summaryRows.push(`<tr><th>Group 1 mean</th><td>${fmt(result.mean1)}</td></tr>`);
          if (result.mean2 != null) summaryRows.push(`<tr><th>Group 2 mean</th><td>${fmt(result.mean2)}</td></tr>`);
          if (result.sd1 != null) summaryRows.push(`<tr><th>Group 1 SD</th><td>${fmt(result.sd1)}</td></tr>`);
          if (result.sd2 != null) summaryRows.push(`<tr><th>Group 2 SD</th><td>${fmt(result.sd2)}</td></tr>`);
          if (result.n1 != null) summaryRows.push(`<tr><th>Group 1 N</th><td>${fmt(result.n1)}</td></tr>`);
          if (result.n2 != null) summaryRows.push(`<tr><th>Group 2 N</th><td>${fmt(result.n2)}</td></tr>`);
          if (result.var1 != null) summaryRows.push(`<tr><th>Variance (Group 1)</th><td>${fmt(result.var1)}</td></tr>`);
          if (result.var2 != null) summaryRows.push(`<tr><th>Variance (Group 2)</th><td>${fmt(result.var2)}</td></tr>`);
          if (!result.var1 && Array.isArray(result.group_variances)) summaryRows.push(`<tr><th>Group variances</th><td>${result.group_variances.map(v=>fmt(v)).join(', ')}</td></tr>`);
          if (result.threshold_min != null || result.threshold_max != null) summaryRows.push(`<tr><th>Threshold(s)</th><td>${result.threshold_min ?? ''}${(result.threshold_min!=null && result.threshold_max!=null)?' - ':''}${result.threshold_max ?? ''}</td></tr>`);
          if (result.range_distance != null) summaryRows.push(`<tr><th>Distance to bound/range</th><td>${fmt(result.range_distance)}</td></tr>`);
          if (result.range_distance1 != null || result.range_distance2 != null) summaryRows.push(`<tr><th>Range distance (group 1 / 2)</th><td>${result.range_distance1 != null ? fmt(result.range_distance1) : ''} / ${result.range_distance2 != null ? fmt(result.range_distance2) : ''}</td></tr>`);
          if (result.mu0 != null) summaryRows.push(`<tr><th>Reference (mu0)</th><td>${fmt(result.mu0)}</td></tr>`);
          if (advisories.length) summaryRows.push(`<tr><th>Advisories</th><td>${advisories.map(a=>a.replace(/</g,'&lt;')).join('<br/>')}</td></tr>`);
        }

      let valuesSection = '';
      if (Array.isArray(result?.events) && result.events.length) {
        const findStationName = (ev) => ev.station_name || ev.station_label || ev.station_id || '';
        const rowsHtml = result.events.slice(0, 1000).map(ev => `<tr><td>${ev.sampled_at || ''}</td><td>${findLakeName(ev.lake_id) || ''}</td><td>${findStationName(ev) || ''}</td><td>${ev.value ?? ''}</td></tr>`).join('');
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
    }
  };

  useImperativeHandle(ref, () => ({ clearAll, exportPdf }));

  return (
  <div ref={containerRef} className="insight-card" style={{ position:'relative', minWidth: 0, maxWidth: '100%', padding: 8 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
      <h4 style={{ margin: '2px 0 8px' }}>Advanced Statistics</h4>
      <button
        type="button"
        className="pill-btn liquid"
        title="Explain this tool"
        onClick={() => setInfoOpen(true)}
        style={{ padding:'4px 6px', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
      >
        <FiInfo size={14} />
      </button>
    </div>
  <div>
  <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 1fr', gridTemplateRows:'repeat(2, auto)', gap:10, alignItems:'start', fontSize:13, minWidth:0 }}>
      {/* Row 1: Applied Standard, Parameter, Confidence Level (compact) */}
      <div style={{ gridColumn: '1 / span 1', minWidth:0 }}>
        <select required className="pill-btn" value={appliedStandardId} onChange={e=>{setAppliedStandardId(e.target.value); setResult(null);}} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
          <option value="">Select Applied Standard</option>
          {standards.map(s => <option key={s.id} value={s.id}>{s.code || s.name || s.id}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: '2 / span 1', minWidth:0 }}>
        <div style={{ display:'flex', gap:6 }}>
          <select className="pill-btn" value={paramCode} onChange={e=>{setParamCode(e.target.value); setResult(null);}} style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
            <option value="">Select parameter</option>
            {paramOptions.length ? (
              paramOptions.map(p => (
                <option key={p.key || p.id || p.code} value={p.code}>
                  {p.label || p.name || p.code}
                </option>
              ))
            ) : null}
          </select>
          {/* Depth selector (one-sample or lake vs lake two-sample) */}
          <div style={{ width: paramCode && (inferredTest==='one-sample' || (inferredTest==='two-sample' && compareValue && String(compareValue).startsWith('lake:'))) ? 150 : 0, transition:'width 0.2s ease', overflow:'hidden' }}>
            {paramCode && (inferredTest==='one-sample' || (inferredTest==='two-sample' && compareValue && String(compareValue).startsWith('lake:'))) ? (
              <select className="pill-btn" value={depthMode === 'all' ? 'all' : (depthValue || '')} onChange={e=>{
                const v = e.target.value;
                if (v === 'all') { setDepthMode('all'); setDepthValue(''); }
                else { setDepthMode('single'); setDepthValue(v); }
                setResult(null);
              }} style={{ width:'100%', padding:'10px 12px', height:40 }}>
                <option value="all">All depths (mean)</option>
                {availableDepths.map(d => (<option key={`depth-${d}`} value={d}>{d} m</option>))}
              </select>
            ) : null}
          </div>
        </div>
      </div>
      <div style={{ gridColumn: '3 / span 2', display:'flex', justifyContent:'flex-end', minWidth:0 }}>
        <div style={{ display:'flex', gap:8, width:'100%' }}>
            <select className="pill-btn" value={selectedTest} onChange={e=>{setSelectedTest(e.target.value); setResult(null);}} style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'8px 10px', fontSize:12, height:36, lineHeight:'18px' }}>
                <option value="" disabled>Select test</option>
                <option value="shapiro_wilk" disabled={inferredTest!=='one-sample'}>Shapiro–Wilk</option>
                <option value="levene" disabled={inferredTest!=='two-sample'}>Levene variance test</option>
                <option value="t_one_sample" disabled={inferredTest!=='one-sample' || paramHasRange}>One-sample t-test</option>
                <option value="wilcoxon_signed_rank" disabled={inferredTest!=='one-sample' || paramHasRange}>Wilcoxon signed-rank</option>
                <option value="sign_test" disabled={inferredTest!=='one-sample' || paramHasRange}>Sign test</option>
                <option value="tost" disabled={inferredTest!=='one-sample' || !paramHasRange}>Equivalence TOST t</option>
                <option value="tost_wilcoxon" disabled={inferredTest!=='one-sample' || !paramHasRange}>Equivalence TOST Wilcoxon</option>
                <option value="t_student" disabled={inferredTest!=='two-sample'}>Student t-test</option>
                <option value="t_welch" disabled={inferredTest!=='two-sample'}>Welch t-test</option>
                <option value="mann_whitney" disabled={inferredTest!=='two-sample'}>Mann–Whitney U</option>
                <option value="mood_median_test" disabled={inferredTest!=='two-sample'}>Mood median test</option>
              </select>
        </div>
      </div>

      {/* Row 2: Lake | Class (header + selector) | Compare Lake | Years */}
      <div style={{ gridColumn: '1 / span 1', minWidth:0 }}>
        <select className="pill-btn" value={lakeId} onChange={e=>{setLakeId(e.target.value); setResult(null);}} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
          <option value="">Primary Lake</option>
          {lakes.map(l => {
            const raw = l.class_code || l.classification || l.class || '';
            const code = raw ? String(raw).replace(/^class\s*/i, '') : '';
            const suffix = code ? ` (Class ${code})` : '';
            return <option key={l.id} value={l.id}>{(l.name || `Lake ${l.id}`) + suffix}</option>;
          })}
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
            {lakes.filter(l => String(l.id) !== String(lakeId)).map(l => {
              const raw = l.class_code || l.classification || l.class || '';
              const code = raw ? String(raw).replace(/^class\s*/i, '') : '';
              const suffix = code ? ` (Class ${code})` : '';
              return <option key={`lake-${l.id}`} value={`lake:${l.id}`}>{(l.name || `Lake ${l.id}`) + suffix}</option>;
            })}
          </optgroup>
        </select>
      </div>
      <div style={{ gridColumn: '3 / span 1', minWidth:0 }}>
        <select required className="pill-btn" value={organizationId} onChange={e=>{ setOrganizationId(e.target.value); setResult(null); }} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
          <option value="">Dataset Source</option>
          {orgOptions.map(o => <option key={`org-${o.id}`} value={o.id}>{o.name || o.id}</option>)}
        </select>
      </div>
      {compareValue && String(compareValue).startsWith('lake:') ? (
        <div style={{ gridColumn: '4 / span 1', minWidth:0 }}>
          <select required={true} className="pill-btn" value={secondaryOrganizationId} onChange={e=>{ setSecondaryOrganizationId(e.target.value); setResult(null); }} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }}>
            <option value="">Secondary Dataset Source</option>
            {secondaryOrgOptions.map(o => <option key={`org2-${o.id}`} value={o.id}>{o.name || o.id}</option>)}
          </select>
        </div>
      ) : compareValue && String(compareValue).startsWith('class:') ? (
        <div style={{ gridColumn: '4 / span 1', minWidth:0 }}>
          <select className="pill-btn" value={stationId} onChange={e=>{ setStationId(e.target.value); setResult(null); }} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px' }} disabled={!organizationId}>
            <option value="">Select a station</option>
            <option value="all">All Stations</option>
            {stationOptions.map(s => <option key={`station-${s.id}`} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      ) : (
        <div style={{ gridColumn: '4 / span 1', display:'flex', gap:8, minWidth:0 }}>
          <div style={{ width: '100%' }} />
        </div>
      )}
    </div>

      <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
      <div style={{ display:'flex', gap:8 }}>
        <button className={flagProblems ? 'pill-btn danger' : 'pill-btn'} onClick={() => setFlagProblems(f => !f)} style={{ padding:'6px 10px', fontSize:12 }} title={flagProblems ? 'Problem framing active: alternatives target exceedances' : 'Compliance framing: alternatives target meeting standards'} disabled={inferredTest==='two-sample'}>
          {flagProblems ? 'Flag Problems' : 'Compliance'}
        </button>
        <button ref={gearBtnRef} aria-label="Advanced options" title="Advanced options" className="pill-btn" onClick={() => setShowGearPopover(s => !s)} style={{ padding:'6px 10px', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
          <FiSettings size={16} />
        </button>
  <button className="pill-btn liquid" onClick={run} style={{ padding:'6px 10px' }}>{loading ? 'Running...' : 'Run Test'}</button>
      </div>
    </div>

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
        {yearError ? <div style={{ gridColumn:'1 / span 2', fontSize:11, color:'#ffb3b3' }}>{yearError}</div> : null}
      </div>
    </Popover>

    <div style={{ marginTop:8 }}>
  {error && <div style={{ color:'#ff8080', fontSize:12 }}>{error}</div>}
  {!error && yearError && <div style={{ color:'#ffb3b3', fontSize:12 }}>{yearError}</div>}
      {error && (error.includes('threshold_missing') || error.includes('threshold')) && (
        <div style={{ fontSize:11, marginTop:6, color:'#ffd9d9' }}>
          Server debug: <pre style={{ whiteSpace:'pre-wrap', fontSize:11 }}>{JSON.stringify((error && (typeof error === 'string') ? null : null) || '' )}</pre>
        </div>
      )}
      {advisories.length ? (
        <div style={{ marginTop:6, fontSize:12, color:'#f0f0f0' }}>
          <strong>Advisories:</strong>
          <ul style={{ margin:'4px 0 0 16px', padding:0 }}>
            {advisories.map((a,i)=>(<li key={`adv-${i}`}>{a}</li>))}
          </ul>
        </div>
      ) : null}
    </div>

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
    <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title="Advanced Statistics – What it does and how to use it" sections={infoSections} />
  </div>
    </div>
  );
}

export default React.forwardRef(AdvancedStat);
