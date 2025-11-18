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

  const join = (parts) => parts.filter(Boolean).map(s => s.trim()).filter(Boolean).map(s => /[.!?]$/.test(s)? s : s + '.').join(' ');
  const toNum = (x) => (x != null && x !== '' && !Number.isNaN(Number(x)) ? Number(x) : null);

  const pMeta = (paramOptions || []).find(pp => [pp.code, pp.key, pp.id].some(x => String(x) === String(paramCode)));
  const paramLabel = pMeta?.label || pMeta?.name || pMeta?.display_name || String(paramCode || 'parameter');

  const paramEvalRaw = (pMeta?.evaluation_type || pMeta?.evaluationType || '').toLowerCase();
  const paramEval = paramEvalRaw.startsWith('max') ? 'max'
    : paramEvalRaw.startsWith('min') ? 'min'
    : paramEvalRaw.startsWith('range') ? 'range'
    : null;

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

  const alpha = Number(result.alpha != null ? result.alpha : (1 - Number(cl || '0.95')));
  const p = toNum(result.p_value);

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

  const twoSample = (('n1' in result) && ('n2' in result)) || (Array.isArray(result.sample1_values) && Array.isArray(result.sample2_values));
  let stats1=null, stats2=null;
  if (twoSample) {
    const s1 = computeStats(result.sample1_values);
    const s2 = computeStats(result.sample2_values);
    stats1 = s1; stats2 = s2;
  }

  const lakeNameById = (id) => {
    if (String(id) === 'custom') return 'Custom dataset';
    const lk = lakes.find(l => String(l.id) === String(id));
    return lk ? (lk.name || `Lake ${lk.id}`) : (id == null ? 'Lake' : `Lake ${id}`);
  };
  const lake1Name = lakeNameById(lakeId);
  const lake2Id = (compareValue && String(compareValue).startsWith('lake:')) ? String(compareValue).split(':')[1] : null;
  const lake2Name = lake2Id ? lakeNameById(lake2Id) : null;
  const lake2Label = lake2Name || 'Lake 2';
  const lake1Label = (String(lakeId) === 'custom') ? 'the custom dataset' : lake1Name;

  // Compliance classification

  // ------------------------------------------------------------------
  // 1. Normality (Shapiro–Wilk) or Diagnostic
  // ------------------------------------------------------------------
  if (result.test_used === 'shapiro_wilk' || result.type === 'one-sample-normality' || result.test_used === 'diagnostic_one') {
    // One-sample normality
    if (!Number.isFinite(p)) return '';
    const isRange = paramEval === 'range';
    if (p < alpha) {
      // Non-normal
      const advice = isRange
        ? 'Run Equivalence TOST Wilcoxon test.'
        : 'Run Wilcoxon signed-rank test or Sign test.';
      const suggested = isRange ? ['tost_wilcoxon'] : ['wilcoxon_signed_rank','sign_test'];
      return { text: join([
        `There is enough statistical evidence to suggest that the ${paramLabel} of ${lake1Label} deviates from normality`,
        advice
      ]), suggestedTests: suggested };
    } else {
      // Normal
      const advice = isRange
        ? 'Run Equivalence TOST t-test.'
        : 'Run One-sample t-test.';
      const suggested = isRange ? ['tost'] : ['t_one_sample'];
      return { text: join([
        `There is not enough statistical evidence to suggest that the ${paramLabel} of ${lake1Label} deviates from normality`,
        advice
      ]), suggestedTests: suggested };
    }
  } else if (result.test_used === 'diagnostic_two' || result.type === 'two-sample-diagnostic') {
    // Two-sample diagnostic: Shapiro + Levene
    const p1 = toNum(result.p1);
    const p2 = toNum(result.p2);
    const pLevene = toNum(result.p_levene);
    const normal1 = result.normal1 != null ? !!result.normal1 : (p1 != null ? p1 >= alpha : null);
    const normal2 = result.normal2 != null ? !!result.normal2 : (p2 != null ? p2 >= alpha : null);
    const equalVar = result.equal_variances != null ? !!result.equal_variances : (pLevene != null ? pLevene >= alpha : null);
    const bothNormal = normal1 === true && normal2 === true;
    const lake1Normal = normal1 === true ? `There is not enough statistical evidence to suggest that the ${paramLabel} of ${lake1Label} deviates from normality` : `There is enough statistical evidence to suggest that the ${paramLabel} of ${lake1Label} deviates from normality`;
    const lake2Normal = normal2 === true ? `There is not enough statistical evidence to suggest that the ${paramLabel} of ${lake2Name} deviates from normality` : `There is enough statistical evidence to suggest that the ${paramLabel} of ${lake2Name} deviates from normality`;
    const varEqual = equalVar === true ? 'There is not enough statistical evidence to suggest that variances differ' : 'There is enough statistical evidence to suggest that variances differ';
    let advice = '';
    let suggested = [];
    if (bothNormal) {
      advice = equalVar === true ? 'Run Student t-test.' : 'Run Welch t-test.';
      suggested = equalVar === true ? ['t_student'] : ['t_welch'];
    } else {
      advice = 'Run Mann–Whitney U test or Mood median test.';
      suggested = ['mann_whitney','mood_median_test'];
    }
    return { text: join([lake1Normal, lake2Normal, varEqual, advice]), suggestedTests: suggested };
  } else if (result.test_used === 'shapiro_wilk' && twoSample) {
    // Two-sample Shapiro (individual)
    const p1 = toNum(result.p1);
    const p2 = toNum(result.p2);
    const normal1 = result.normal1 != null ? !!result.normal1 : (p1 != null ? p1 >= alpha : null);
    const normal2 = result.normal2 != null ? !!result.normal2 : (p2 != null ? p2 >= alpha : null);
    const lake1Normal = normal1 === true ? `There is not enough statistical evidence to suggest that the ${paramLabel} of ${lake1Label} deviates from normality` : `There is enough statistical evidence to suggest that the ${paramLabel} of ${lake1Label} deviates from normality`;
    const lake2Normal = normal2 === true ? `There is not enough statistical evidence to suggest that the ${paramLabel} of ${lake2Name} deviates from normality` : `There is enough statistical evidence to suggest that the ${paramLabel} of ${lake2Name} deviates from normality`;
    const advice = (normal1 && normal2) ? 'Parametric tests (Student’s t-test or Welch’s t-test) are reasonable for comparing means.' : 'Use non-parametric tests: Mann–Whitney U or Mood’s median test for comparing distributions.';
    return join([lake1Normal, lake2Normal, advice]);
  }

  // ------------------------------------------------------------------
  // 2. Variance (Levene)
  // ------------------------------------------------------------------
  if (result.test_used === 'levene') {
    if (!Number.isFinite(p)) return '';
    return (p < alpha)
      ? join([`There is enough statistical evidence to suggest that the variances of ${paramLabel} differ between ${lake1Label} and ${lake2Label}`, 'Prefer Welch’s t-test; if non-normal, use Mann–Whitney or Mood’s median'])
      : join([`There is not enough statistical evidence to suggest that the variances of ${paramLabel} differ between ${lake1Label} and ${lake2Label}`, 'Student’s t-test is acceptable if normal; otherwise use non-parametric tests']);
  }

  // Identify one-sample vs two-sample test categories
  const testKey = result.test_used || result.type || '';
  const isOneSample = !twoSample;

  // ------------------------------------------------------------------
  // 3. One-sample tests (Compliance / Degradation / Improvement)
  // ------------------------------------------------------------------
  if (isOneSample) {
    const centralLabel = centralMetric === 'mean' ? 'mean' : 'median';

    const tkl = String(testKey || '').toLowerCase();
    if (/tost/.test(tkl)) {
      const centerWord = tkl.includes('wilcoxon') ? 'median' : 'mean';
      let isEquiv = ('equivalent' in result) ? !!result.equivalent : null;
      if (isEquiv == null) {
        const pLower = toNum(result.p_lower ?? result.p1);
        const pUpper = toNum(result.p_upper ?? result.p2);
        const pTost = (Number.isFinite(pLower) && Number.isFinite(pUpper)) ? Math.max(pLower, pUpper) : toNum(result.p_value);
        if (Number.isFinite(pTost) && Number.isFinite(alpha)) isEquiv = pTost < alpha;
      }
      const primary = isEquiv === true
        ? `The typical level (${centerWord}) is statistically within the target band based on the guideline metrics for ${paramLabel}`
        : `The typical level (${centerWord}) is not demonstrated to be within the target band based on the guideline metrics for ${paramLabel}`;
      return join([primary]);
    }

    let direction = 'different from';
    if (thr && Number.isFinite(centralValue)) {
      if (thr.type === 'min' || thr.type === 'max' || thr.type === 'value') {
        const t = thr.type === 'value' ? thr.value : thr.value;
        if (Number.isFinite(t)) direction = centralValue > t ? 'above' : (centralValue < t ? 'below' : 'different from');
      } else if (thr.type === 'range') {
        direction = 'different from';
      }
    }
    if (!Number.isFinite(p)) return '';
    const primary = (p < alpha)
      ? `There is statistical evidence that the typical level (${centralLabel}) is ${direction} the guideline`
      : `No strong statistical evidence that the typical level (${centralLabel}) exceeds the guideline`;

    // Compliance framing
    const therefore = (() => {
      if (!thr) return null;
      if (thr.type === 'max') {
        if (p < alpha && direction === 'above') return 'This indicates an exceedance relative to the maximum guideline.';
        if (p < alpha && (direction === 'below' || direction === 'different from')) return 'This does not indicate an exceedance of the maximum guideline.';
        return 'Insufficient evidence to indicate exceedance of the maximum guideline.';
      }
      if (thr.type === 'min') {
        if (p < alpha && direction === 'below') return 'This indicates being below the minimum guideline.';
        if (p < alpha && (direction === 'above' || direction === 'different from')) return 'This does not indicate being below the minimum guideline.';
        return 'Insufficient evidence to indicate being below the minimum guideline.';
      }
      if (thr.type === 'range') {
        if (!Number.isFinite(centralValue)) return null;
        if (centralValue < thr.min) return 'This indicates being below the target band.';
        if (centralValue > thr.max) return 'This indicates being above the target band.';
        return 'This indicates being within the target band.';
      }
      return null;
    })();

    return join([primary, therefore]);
  }

  // ------------------------------------------------------------------
  // 4. Two-sample tests (Lake A vs Lake B)
  // ------------------------------------------------------------------
  if (twoSample) {
    // Choose center based on test: means for t-tests; medians for rank/median tests
    const mean1 = toNum(result.mean1 ?? stats1?.mean); const mean2 = toNum(result.mean2 ?? stats2?.mean);
    const median1 = toNum(result.median1 ?? stats1?.median); const median2 = toNum(result.median2 ?? stats2?.median);
    const useMedian = /mann_whitney|mood_median|median_test/i.test(testKey);
    const c1 = useMedian ? (median1 != null ? median1 : mean1) : (mean1 != null ? mean1 : median1);
    const c2 = useMedian ? (median2 != null ? median2 : mean2) : (mean2 != null ? mean2 : median2);
    if (!Number.isFinite(p)) return '';
    if (p < alpha) {
      let dirWord = 'different from';
      if (Number.isFinite(c1) && Number.isFinite(c2) && c1 !== c2) dirWord = c1 > c2 ? 'higher than' : 'lower than';
      const primary = `There is enough statistical evidence to suggest that ${lake1Label} ${paramLabel} is significantly ${dirWord} ${lake2Label}’s.`;
      // Add a parameter-focused favorability sentence (not overall water quality)
      let favor = null;
      if (Number.isFinite(c1) && Number.isFinite(c2) && c1 !== c2 && typeof higherIsWorse === 'boolean') {
        const favorableLake = higherIsWorse ? (c1 < c2 ? lake1Label : lake2Label) : (c1 > c2 ? lake1Label : lake2Label);
        favor = `Based on this parameter alone, ${favorableLake} shows a more favorable status for this parameter.`;
      }
      return join([primary, favor]);
    }
    return `There is not enough statistical evidence to suggest a difference in ${paramLabel} between ${lake1Label} and ${lake2Label}.`;
  }

  // Fallback (should rarely hit)
  return '';
}

export default buildInterpretation;
