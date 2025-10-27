// Interpretation builder for AdvancedStat
// Accepts dependencies and returns a composed interpretation string.
export function buildInterpretation({
  result,
  paramCode,
  paramOptions = [],
  classCode,
  lakes = [],
  cl = '0.95',
  fmt,
  sci,
  lakeId,
  compareValue
}) {
  if (!result) return '';

  // ---------------------------------------------------------------------
  // Helper utilities (refactored)
  // ---------------------------------------------------------------------
  const SMALL_N = 8;
  const BORDERLINE_REL = 0.15; // relative distance to alpha to show a borderline note
  const safeFmt = (v) => {
    if (v == null || Number.isNaN(v)) return '—';
    try { return fmt ? fmt(v) : String(v); } catch { return String(v); }
  };
  const sciFmt = (v) => {
    if (v == null) return '';
    if (typeof v === 'string' && /</.test(v)) return v;
    const num = Number(v);
    if (!Number.isFinite(num)) return String(v);
    try { return sci ? sci(num) : String(num); } catch { return String(num); }
  };
  const formatP = (pv) => {
    if (!Number.isFinite(pv)) return '';
    return pv < 0.001 ? 'p < 0.001' : `p = ${sciFmt(pv)}`;
  };
  // Format p-value compared to alpha (always show comparison when possible)
  const formatPvA = (pv, a) => {
    if (!Number.isFinite(pv)) return '';
    const pStr = pv < 0.001 ? 'p < 0.001' : `p = ${sciFmt(pv)}`;
    const aStr = Number.isFinite(a) ? `α = ${sciFmt(a)}` : null;
    let cmp = '';
    if (Number.isFinite(a)) {
      if (pv < a) cmp = '(p < α)';
      else if (pv > a) cmp = '(p > α)';
      else cmp = '(p = α)';
    }
    return aStr ? `${pStr} vs ${aStr} ${cmp}` : pStr;
  };
  // Build a parenthetical method + significance string with graceful fallback
  const methodWithSig = (methodLabel, pv, a) => {
    const sig = formatPvA(pv, a);
    if (sig) return `(${methodLabel}, ${sig})`;
    // If p is unavailable, avoid dangling comma
    return methodLabel ? `(${methodLabel})` : '';
  };
  const join = (parts) => parts.filter(Boolean).map(s => s.trim()).filter(Boolean).map(s => /[.!?]$/.test(s)? s : s + '.').join(' ');
  const normBool = (v) => (v === true || v === false) ? v : (v === 1 || v === '1') ? true : (v === 0 || v === '0') ? false : null;
  const toNum = (x) => (x != null && x !== '' && !Number.isNaN(Number(x)) ? Number(x) : null);

  const pMeta = (paramOptions || []).find(pp => [pp.code, pp.key, pp.id].some(x => String(x) === String(paramCode)));
  const paramLabel = pMeta?.label || pMeta?.name || pMeta?.display_name || String(paramCode || 'parameter');

  // Normalize parameter evaluation_type (DB pretty label -> canonical)
  const paramEvalRaw = (pMeta?.evaluation_type || pMeta?.evaluationType || '').toLowerCase();
  const paramEval = paramEvalRaw.startsWith('max') ? 'max'
    : paramEvalRaw.startsWith('min') ? 'min'
    : paramEvalRaw.startsWith('range') ? 'range'
    : null;

  // Direction derivation (higherIsWorse true = higher values harmful)
  const higherIsWorse = (() => {
    if (paramEval === 'max') return true;
    if (paramEval === 'min') return false;
    if (typeof pMeta?.higher_is_worse === 'boolean') return !!pMeta.higher_is_worse;
    if (typeof pMeta?.direction === 'string') {
      if (pMeta.direction === 'higher_is_worse') return true;
      if (pMeta.direction === 'lower_is_worse') return false;
    }
    const resEval = result.evaluation_type;
    if (resEval === 'max') return true;
    if (resEval === 'min') return false;
    return null; // range or unknown
  })();

  // Threshold resolution (reuse logic but simplified)
  const resolveThreshold = () => {
    const minVal = toNum(result.threshold_min);
    const maxVal = toNum(result.threshold_max);
    if (minVal != null && maxVal != null) return { type: 'range', min: minVal, max: maxVal };
    if (minVal != null) return { type: 'min', value: minVal };
    if (maxVal != null) return { type: 'max', value: maxVal };
    if (result.mu0 != null && result.mu0 !== '') {
      const mu = toNum(result.mu0);
      if (mu != null) {
        const kind = result.evaluation_type === 'min' ? 'min' : (result.evaluation_type === 'max' ? 'max' : 'value');
        if (kind === 'min') return { type: 'min', value: mu };
        if (kind === 'max') return { type: 'max', value: mu };
        return { type: 'value', value: mu };
      }
    }
    return null;
  };
  const thr = resolveThreshold();

  const thresholdSummary = (t) => {
    if (!t) return 'no authoritative threshold';
    if (t.type === 'range') return `acceptable range ${safeFmt(t.min)}–${safeFmt(t.max)}`;
    if (t.type === 'min') return `minimum ≥ ${safeFmt(t.value)}`;
    if (t.type === 'max') return `maximum ≤ ${safeFmt(t.value)}`;
    if (t.type === 'value') return `reference value ${safeFmt(t.value)}`;
    return 'threshold';
  };

  const alpha = Number(result.alpha != null ? result.alpha : (1 - Number(cl || '0.95')));
  const p = toNum(result.p_value);
  const reject = (Number.isFinite(p) && Number.isFinite(alpha)) ? p < alpha : null;
  const borderline = (Number.isFinite(p) && Number.isFinite(alpha) && Math.abs(p - alpha) / (alpha || 1) < BORDERLINE_REL) ? true : false;
  const borderlineNote = borderline ? 'Near the cutoff; more data may help.' : null;

  // Central tendency (one or two sample)
  const computeStats = (arr) => {
    if (!Array.isArray(arr)) return null;
    const xs = arr.map(Number).filter(Number.isFinite);
    if (!xs.length) return null;
    const n = xs.length;
    const mean = xs.reduce((a,b)=>a+b,0)/n;
    const sorted = xs.slice().sort((a,b)=>a-b);
    const mid = Math.floor(n/2);
    const median = n%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
    return { n, mean, median };
  };

  const oneSampleValues = result.sample_values;
  const statsOne = computeStats(oneSampleValues);
  const mean = toNum(result.mean != null ? result.mean : statsOne?.mean);
  const median = toNum(result.median != null ? result.median : statsOne?.median);
  const centralMetric = (result.test_used && /wilcoxon|sign/i.test(result.test_used)) ? 'median' : (mean != null ? 'mean' : 'median');
  const centralValue = centralMetric === 'mean' ? mean : median;

  // Treat as two-sample if explicit n1/n2 provided OR if both sample1_values & sample2_values arrays exist.
  // Mood's median test previously lacked n1/n2 so it was being misclassified as one-sample.
  const twoSample = (('n1' in result) && ('n2' in result)) || (Array.isArray(result.sample1_values) && Array.isArray(result.sample2_values));
  let stats1=null, stats2=null;
  if (twoSample) {
    const s1 = computeStats(result.sample1_values);
    const s2 = computeStats(result.sample2_values);
    stats1 = s1; stats2 = s2;
  }

  // Lake name helpers
  const lakeNameById = (id) => {
    const lk = lakes.find(l => String(l.id) === String(id));
    return lk ? (lk.name || `Lake ${lk.id}`) : (id == null ? 'Lake' : `Lake ${id}`);
  };
  const lake1Name = lakeNameById(lakeId);
  const lake2Id = (compareValue && String(compareValue).startsWith('lake:')) ? String(compareValue).split(':')[1] : null;
  const lake2Name = lake2Id ? lakeNameById(lake2Id) : null;

  // Compliance classification
  const classifyCompliance = (value, t) => {
    if (value == null || !t) return { status: 'unknown' };
    if (t.type === 'range') {
      if (value < t.min) return { status: 'below_range' };
      if (value > t.max) return { status: 'above_range' };
      return { status: 'within_range' };
    }
    if (t.type === 'min') return (value >= t.value) ? { status: 'compliant' } : { status: 'below_min' };
    if (t.type === 'max') return (value <= t.value) ? { status: 'compliant' } : { status: 'above_max' };
    if (t.type === 'value') {
      if (value === t.value) return { status: 'at_value' };
      return { status: value > t.value ? 'above_value' : 'below_value' };
    }
    return { status: 'unknown' };
  };

  const comp = classifyCompliance(centralValue, thr);
  const harmfulDeviation = (st) => {
    if (!thr) return false;
    if (thr.type === 'range') {
      if (st === 'above_range') return higherIsWorse === true ? true : (higherIsWorse === null ? true : false);
      if (st === 'below_range') return higherIsWorse === false ? true : (higherIsWorse === null ? true : false);
      return false;
    }
    if (thr.type === 'max' && st === 'above_max') return true;
    if (thr.type === 'min' && st === 'below_min') return true;
    return false;
  };
  const beneficialDeviation = (st) => {
    if (!thr) return false;
    if (thr.type === 'range') {
      if (st === 'above_range') return higherIsWorse === false;
      if (st === 'below_range') return higherIsWorse === true;
      return false;
    }
    if (thr.type === 'max' && st === 'above_max') return false; // harmful already
    if (thr.type === 'min' && st === 'below_min') return false;
    if (thr.type === 'max' && st === 'compliant' && higherIsWorse === true && centralValue < thr.value) return true;
    if (thr.type === 'min' && st === 'compliant' && higherIsWorse === false && centralValue > thr.value) return true;
    return false;
  };

  const smallSampleCaveat = () => {
    if (twoSample) {
      const n1 = result.n1 || stats1?.n; const n2 = result.n2 || stats2?.n;
      if ((n1 && n1 < SMALL_N) || (n2 && n2 < SMALL_N)) return 'Small sample size; interpret with caution.';
    } else {
      const n = result.n || statsOne?.n;
      if (n && n < SMALL_N) return 'Small sample size; interpret with caution.';
    }
    return null;
  };

  // ------------------------------------------------------------------
  // 1. Normality (Shapiro–Wilk)
  // ------------------------------------------------------------------
  if (result.test_used === 'shapiro_wilk' || result.type === 'one-sample-normality') {
    const n = result.n || statsOne?.n;
    if (!Number.isFinite(p)) return join([`Normality check for ${paramLabel} in ${lake1Name}.`, 'Result unavailable.', smallSampleCaveat()]);
    const follows = reject ? 'does not follow' : 'appears to follow';
    const isRangeParam = (paramEval === 'range') || (thr && thr.type === 'range');
    const guidance = reject
      ? (
          isRangeParam
            ? 'This suggests skew or outliers. For range‑based evaluation, use Equivalence TOST (Wilcoxon). For other comparisons, use non‑parametric tests (Wilcoxon, Mann–Whitney, Sign, Mood’s median).'
            : 'This suggests skew or outliers. Use non‑parametric tests for comparisons (Wilcoxon, Mann–Whitney, Sign, Mood’s median).'
        )
      : (
          isRangeParam
            ? 'Parametric tests are reasonable. For range‑based evaluation, use Equivalence TOST (t).'
            : 'Parametric tests are reasonable (t‑tests, Welch, TOST).'
        );
    return join([
      `${paramLabel} in ${lake1Name} ${follows} a normal distribution (Shapiro–Wilk, ${formatPvA(p, alpha)}).`,
      guidance,
      borderlineNote,
      smallSampleCaveat()
    ]);
  }

  // ------------------------------------------------------------------
  // 2. Variance (Levene)
  // ------------------------------------------------------------------
  if (result.test_used === 'levene') {
    const n1 = result.n1 || stats1?.n; const n2 = result.n2 || stats2?.n;
    if (!Number.isFinite(p)) return join([`Variance check for ${paramLabel}: ${lake1Name} vs ${lake2Name}.`, 'Result unavailable.', smallSampleCaveat()]);
    const differ = reject ? 'differ' : 'are similar';
    const advice = reject
      ? 'Prefer Welch’s t‑test; if data is not normal, use Mann–Whitney or Mood’s median.'
      : 'Student’s t‑test is acceptable if normal; otherwise use non‑parametric tests.';
    return join([
      `For ${paramLabel}, variances between ${lake1Name} and ${lake2Name} ${differ} (Levene, ${formatPvA(p, alpha)}).`,
      advice,
      borderlineNote,
      smallSampleCaveat()
    ]);
  }

  // Identify one-sample vs two-sample test categories
  const testKey = result.test_used || result.type || '';
  const isOneSample = !twoSample;

  // ------------------------------------------------------------------
  // 3. One-sample tests (Compliance / Degradation / Improvement)
  // ------------------------------------------------------------------
  if (isOneSample) {
    const n = result.n || statsOne?.n;
    const centralLabel = centralMetric === 'mean' ? 'mean' : 'median';
    const thrSummary = thresholdSummary(thr);

    // Equivalence (TOST)
    if (/tost/.test(testKey)) {
      const eq = !!result.equivalent;
      const method = /wilcoxon/.test(testKey) ? 'TOST (Wilcoxon)' : 'TOST';
      // Derive a single TOST p-value: standard practice is max of the two one-sided p-values
      const pTost = (() => {
        const pDirect = toNum(result.pTOST ?? result.p_tost ?? result.p_tost_value);
        if (Number.isFinite(pDirect)) return pDirect;
        const pl = toNum(result.p_lower ?? result.p1 ?? result.p_left ?? result.p_low);
        const pu = toNum(result.p_upper ?? result.p2 ?? result.p_right ?? result.p_high);
        if (Number.isFinite(pl) && Number.isFinite(pu)) return Math.max(pl, pu);
        return toNum(result.p_value);
      })();
      const bounds = thr && thr.type === 'range'
        ? `${safeFmt(thr.min)}–${safeFmt(thr.max)}`
        : `${safeFmt(result.lower ?? result.threshold_min)}–${safeFmt(result.upper ?? result.threshold_max)}`;
      const classTxt = classCode ? ` for Class ${classCode} waters` : '';
      const withinTxt = `The ${paramLabel} values in ${lake1Name} fall within the acceptable range of ${bounds}${classTxt}.`;
      const tostParen = methodWithSig(method, pTost, alpha);
      const supportedTxt = `The equivalence test indicates there is enough statistical evidence to suggest that the lake’s ${paramLabel} stays inside this range ${tostParen}.`;
      const notEstablishedTxt = `Equivalence was not established; there is not enough statistical evidence that values stay inside this range ${tostParen}.`;
      return join([
        withinTxt,
        eq ? supportedTxt : notEstablishedTxt,
        smallSampleCaveat()
      ]);
    }

    // Non-equivalence one-sample tests (t, Wilcoxon, Sign)
    const compliancePhrase = (() => {
      if (!thr) return 'No official threshold provided — compliance can’t be assessed.';
      switch (comp.status) {
        case 'within_range': return 'Compliant (within acceptable range).';
        case 'compliant': return 'Compliant with the threshold.';
        case 'above_max': return 'Non‑compliant (exceeds the maximum threshold).';
        case 'below_min': return 'Non‑compliant (below the minimum threshold).';
        case 'above_range': return 'Non‑compliant (above the acceptable range).';
        case 'below_range': return 'Non‑compliant (below the acceptable range).';
        case 'above_value': return 'Above the reference value.';
        case 'below_value': return 'Below the reference value.';
        default: return 'Compliance status unknown.';
      }
    })();

    const testLabel = /wilcoxon/.test(testKey) ? 'Wilcoxon signed‑rank' : /sign_test|sign/.test(testKey) ? 'Sign test' : 'One‑sample t‑test';
    const thresholdPhrase = (() => {
      if (!thr) return 'no official threshold';
      if (thr.type === 'range') return `acceptable range ${safeFmt(thr.min)}–${safeFmt(thr.max)}`;
      if (thr.type === 'min') return `minimum threshold ${safeFmt(thr.value)}`;
      if (thr.type === 'max') return `maximum threshold ${safeFmt(thr.value)}`;
      return `reference value ${safeFmt(thr.value)}`;
    })();
    const centralValPhrase = centralValue != null ? `${centralLabel} is ${safeFmt(centralValue)}` : `${centralLabel} unavailable`;
    // New significance language with explicit evidence framing and alpha comparison
    const sigTxt = (() => {
      if (!Number.isFinite(p)) return 'Significance could not be evaluated.';
      const pvAlpha = formatPvA(p, alpha);
      const relativeTo = thr ? `relative to the ${thresholdPhrase}` : 'in this assessment';
      if (reject) {
        return `Based on ${testLabel} (${pvAlpha}), there is enough statistical evidence to suggest that the observed difference ${relativeTo} is not due to random variation.`;
      }
      return `Based on ${testLabel} (${pvAlpha}), there is not enough statistical evidence to conclude a real difference ${relativeTo}; the observed difference could be due to random variation.`;
    })();

    // Human-readable, threshold-focused narrative
    const classTxt = classCode ? ` for Class ${classCode}` : '';
    const whereTxt = (() => {
      if (!thr) return null;
      if (thr.type === 'range') {
        if (comp.status === 'within_range') return `which is within the acceptable range of ${safeFmt(thr.min)} to ${safeFmt(thr.max)}${classTxt}.`;
        if (comp.status === 'above_range') return `which is above the acceptable range of ${safeFmt(thr.min)} to ${safeFmt(thr.max)}${classTxt}.`;
        if (comp.status === 'below_range') return `which is below the acceptable range of ${safeFmt(thr.min)} to ${safeFmt(thr.max)}${classTxt}.`;
        return `relative to the acceptable range of ${safeFmt(thr.min)} to ${safeFmt(thr.max)}${classTxt}.`;
      }
      if (thr.type === 'max') {
        return centralValue != null && centralValue <= thr.value
          ? `which is below the${classTxt} standard limit of ${safeFmt(thr.value)}.`
          : `which is above the${classTxt} standard limit of ${safeFmt(thr.value)}.`;
      }
      if (thr.type === 'min') {
        return centralValue != null && centralValue >= thr.value
          ? `which is above the minimum acceptable value of ${safeFmt(thr.value)}${classTxt}.`
          : `which is below the minimum acceptable value of ${safeFmt(thr.value)}${classTxt}.`;
      }
      return null;
    })();

    const compliantTxt = (/compliant|within_range/.test(comp.status || ''))
      ? `This means the lake is currently within the allowable guideline for ${paramLabel}.`
      : (comp.status ? `This means the lake is not compliant with the guideline for ${paramLabel}.` : null);

    return join([
      `The ${centralLabel} ${paramLabel} level in ${lake1Name} is ${safeFmt(centralValue)}${whereTxt ? `, ${whereTxt}` : ''}`,
      compliantTxt,
      sigTxt,
      borderlineNote,
      smallSampleCaveat()
    ]);
  }

  // ------------------------------------------------------------------
  // 4. Two-sample tests (Lake A vs Lake B)
  // ------------------------------------------------------------------
  if (twoSample) {
    const n1 = result.n1 || stats1?.n; const n2 = result.n2 || stats2?.n;
    // Means / medians
    const mean1 = toNum(result.mean1 ?? stats1?.mean); const mean2 = toNum(result.mean2 ?? stats2?.mean);
    const median1 = toNum(result.median1 ?? stats1?.median); const median2 = toNum(result.median2 ?? stats2?.median);
    const useMedian = /mann_whitney|mood_median|median_test/i.test(testKey);
    const c1 = useMedian ? (median1 != null ? median1 : mean1) : (mean1 != null ? mean1 : median1);
    const c2 = useMedian ? (median2 != null ? median2 : mean2) : (mean2 != null ? mean2 : median2);
    const qualifier = useMedian ? 'median' : 'average';

    const testLabelTwoSample = /t_student/.test(testKey) ? 'Student t-test'
      : /t_welch|welch/.test(testKey) ? 'Welch t-test'
      : /mann_whitney/.test(testKey) ? 'Mann–Whitney U test'
      : /mood_median/.test(testKey) ? 'Mood’s median test'
      : 'Two-sample test';

    const narrative = (() => {
      if (c1 == null || c2 == null) return 'Central tendency values are unavailable for comparison.';
      if (c1 === c2) return `${lake1Name} has the same ${paramLabel} as ${lake2Name} (${qualifier} ${safeFmt(c1)}).`;
      const rel = c1 < c2 ? 'lower' : 'higher';
      return `${lake1Name} has a ${rel} ${paramLabel} than ${lake2Name} (about ${safeFmt(c1)} vs ${safeFmt(c2)} on ${qualifier}).`;
    })();

    const significanceSentence = (() => {
      if (!Number.isFinite(p)) return 'Significance could not be determined.';
      const pvAlpha = formatPvA(p, alpha);
      return reject
        ? `Based on ${testLabelTwoSample} (${pvAlpha}), there is enough statistical evidence to suggest that the difference between ${lake1Name} and ${lake2Name} is not due to random variation.`
        : `Based on ${testLabelTwoSample} (${pvAlpha}), there is not enough statistical evidence to conclude a real difference between ${lake1Name} and ${lake2Name}; the observed gap could be due to random variation.`;
    })();

    const qualitySentence = (() => {
      if (c1 == null || c2 == null || c1 === c2) return null;
      const lakeWithLower = (c1 < c2) ? lake1Name : lake2Name;
      const lakeWithHigher = (c1 > c2) ? lake1Name : lake2Name;
      if (higherIsWorse === true) {
        return `Because lower ${paramLabel} means better quality, ${lakeWithLower} has better water quality based on this parameter.`;
      }
      if (higherIsWorse === false) {
        return `Because higher ${paramLabel} means better quality, ${lakeWithHigher} has better water quality based on this parameter.`;
      }
      return null;
    })();

    return join([
      narrative,
      significanceSentence,
      qualitySentence,
      borderlineNote,
      smallSampleCaveat()
    ]);
  }

  // Fallback (should rarely hit)
  return '';
}

export default buildInterpretation;