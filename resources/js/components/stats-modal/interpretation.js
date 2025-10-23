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
  const join = (parts) => parts.filter(Boolean).map(s => s.trim()).filter(Boolean).map(s => /[.!?]$/.test(s)? s : s + '.').join(' ');
  const normBool = (v) => (v === true || v === false) ? v : (v === 1 || v === '1') ? true : (v === 0 || v === '0') ? false : null;
  const toNum = (x) => (x != null && x !== '' && !Number.isNaN(Number(x)) ? Number(x) : null);

  const pMeta = (paramOptions || []).find(pp => [pp.code, pp.key, pp.id].some(x => String(x) === String(paramCode)));
  const paramLabel = pMeta?.label || pMeta?.name || String(paramCode || 'parameter');

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
  const pPhrase = Number.isFinite(p) ? `p=${p < 0.001 ? '<0.001' : sciFmt(p)}` : null;
  const alphaPhrase = Number.isFinite(alpha) ? `α=${safeFmt(alpha)}` : null;
  const borderline = (Number.isFinite(p) && Number.isFinite(alpha) && Math.abs(p - alpha) / (alpha || 1) < 0.15) ? true : false;
  const decisionPhrase = (() => {
    if (!Number.isFinite(p) || !Number.isFinite(alpha)) return null;
    if (reject === true) return `${pPhrase} < ${alphaPhrase}; reject the null hypothesis.`;
    if (reject === false) return `${pPhrase} ≥ ${alphaPhrase}; fail to reject the null hypothesis.`;
    return null;
  })();
  const borderlineNote = borderline ? (reject ? 'Effect is statistically significant but close to the threshold; treat as moderate evidence.' : 'Result is close to the significance cutoff; additional data may clarify.') : null;

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
      if ((n1 && n1 < 8) || (n2 && n2 < 8)) return 'Small sample sizes: interpret with caution.';
    } else {
      const n = result.n || statsOne?.n;
      if (n && n < 8) return 'Small sample size (n<8): interpret with caution.';
    }
    return null;
  };

  // ------------------------------------------------------------------
  // 1. Normality (Shapiro–Wilk)
  // ------------------------------------------------------------------
  if (result.test_used === 'shapiro_wilk' || result.type === 'one-sample-normality') {
    const n = result.n || statsOne?.n;
    const decisionDetail = (() => {
      if (!Number.isFinite(p)) return 'Normality test result unavailable.';
      const core = p < alpha ? 'shows evidence of deviation from normality' : 'does not show strong evidence against normality';
      return `${paramLabel} in ${lake1Name} ${core} (Shapiro–Wilk, ${p < 0.001 ? 'p < 0.001' : `p = ${sciFmt(p)}`}${alphaPhrase?`, ${alphaPhrase}`:''}).`;
    })();
    const recommendation = () => {
      if (reject === true) return 'Next: Prefer robust or non-parametric tests (Wilcoxon, Sign, Mann–Whitney, Mood’s median) or transform the data. Use Welch t only if approximate normality can be defended.';
      if (reject === false) return 'Parametric tests (t-tests, Welch, TOST) are reasonable. Still assess variance equality or outliers.';
      return null;
    };
    return join([
      `Normality check (n = ${n ?? '—'}).`,
      decisionDetail,
      borderlineNote,
      recommendation(),
      smallSampleCaveat()
    ]);
  }

  // ------------------------------------------------------------------
  // 2. Variance (Levene)
  // ------------------------------------------------------------------
  if (result.test_used === 'levene') {
    const n1 = result.n1 || stats1?.n; const n2 = result.n2 || stats2?.n;
    const Fstat = (result.F != null && Number.isFinite(Number(result.F))) ? `F(${result.df1}, ${result.df2})=${safeFmt(Number(result.F))}` : null;
    const varianceRatio = (() => {
      const v1 = toNum(result.var1 ?? (result.group_variances && result.group_variances[0]));
      const v2 = toNum(result.var2 ?? (result.group_variances && result.group_variances[1]));
      if (v1 != null && v2 != null && v1 > 0) return (v2 / v1);
      return null;
    })();
    const ratioPhrase = varianceRatio != null ? `Variance ratio ≈ ${safeFmt(Number(varianceRatio.toFixed(2)))}` : null;
    const decisionDetail = (() => {
      if (!Number.isFinite(p)) return 'Variance test result unavailable.';
      const core = p < alpha ? 'variances differ' : 'no strong evidence of variance difference';
      return `${core} (Levene, ${p < 0.001 ? 'p < 0.001' : `p = ${sciFmt(p)}`}${alphaPhrase?`, ${alphaPhrase}`:''}).`;
    })();
    const rec = reject === true
      ? 'Use Welch t-test for mean comparisons; if normality is doubtful use Mann–Whitney or Mood’s median for medians.'
      : 'Welch t-test remains a robust default; Student t acceptable if other assumptions hold.';
    return join([
      `Variance comparison for ${paramLabel}: ${lake1Name} (n = ${n1 ?? '—'}) vs ${lake2Name} (n = ${n2 ?? '—'}).`,
      decisionDetail,
      Fstat,
      ratioPhrase,
      borderlineNote,
      rec,
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
      const pLower = toNum(result.p1 ?? result.p_lower); const pUpper = toNum(result.p2 ?? result.p_upper);
      const method = /wilcoxon/.test(testKey) ? 'Wilcoxon TOST' : 'TOST';
      const bounds = thr ? (thr.type === 'range' ? `[${safeFmt(thr.min)}, ${safeFmt(thr.max)}]` : '') : `[${safeFmt(result.lower ?? result.threshold_min)}, ${safeFmt(result.upper ?? result.threshold_max)}]`;
      const intro = `For ${paramLabel} in ${lake1Name}, we tested equivalence within bounds ${bounds}.`;
      const decisionTxt = eq ? `Equivalence is supported (${method}, p_lower ${pLower<0.001?'<0.001':`= ${sciFmt(pLower)}`}, p_upper ${pUpper<0.001?'<0.001':`= ${sciFmt(pUpper)}`}, α = ${safeFmt(alpha)}).` : `Equivalence is not established (${method}, p_lower ${pLower<0.001?'<0.001':`= ${sciFmt(pLower)}`}, p_upper ${pUpper<0.001?'<0.001':`= ${sciFmt(pUpper)}`}, α = ${safeFmt(alpha)}).`;
      const complianceLine = (() => {
        if (!thr || thr.type !== 'range') return null;
        if (comp.status === 'within_range') return 'Current value lies numerically inside the acceptable range.';
        if (comp.status === 'above_range') return 'Value lies above the acceptable range.';
        if (comp.status === 'below_range') return 'Value lies below the acceptable range.';
        return null;
      })();
      return join([
        intro,
        decisionTxt,
        complianceLine,
        smallSampleCaveat()
      ]);
    }

    // Non-equivalence one-sample tests (t, Wilcoxon, Sign)
    const compliancePhrase = (() => {
      if (!thr) return 'No authoritative threshold provided—cannot assess compliance.';
      switch (comp.status) {
        case 'within_range': return 'Compliant (within acceptable range).';
        case 'compliant': return 'Compliant with threshold.';
        case 'above_max': return 'Exceeds maximum threshold (non-compliant).';
        case 'below_min': return 'Below minimum threshold (non-compliant).';
        case 'above_range': return 'Above acceptable range (non-compliant).';
        case 'below_range': return 'Below acceptable range (non-compliant).';
        case 'above_value': return 'Above reference value.';
        case 'below_value': return 'Below reference value.';
        default: return 'Compliance status unknown.';
      }
    })();
    const directionPhrase = null;

    // Statistical decision relative to H0 (difference from threshold)
    const diffClause = reject === true
      ? 'Statistical evidence of a difference from the threshold.'
      : (reject === false ? 'No statistical evidence of a difference from the threshold.' : null);

    const testLabel = /wilcoxon/.test(testKey) ? 'Wilcoxon signed-rank' : /sign_test|sign/.test(testKey) ? 'Sign test' : 'One-sample t-test';
    const centralValPhrase = centralValue != null ? `${centralMetric === 'mean' ? 'mean' : 'median'} = ${safeFmt(centralValue)}` : `${centralMetric} unavailable`;
    const thresholdPhrase = (() => {
      if (!thr) return 'no authoritative threshold';
      if (thr.type === 'range') return `acceptable range ${safeFmt(thr.min)}–${safeFmt(thr.max)}`;
      if (thr.type === 'min') return `minimum ${safeFmt(thr.value)}`;
      if (thr.type === 'max') return `maximum ${safeFmt(thr.value)}`;
      return `reference ${safeFmt(thr.value)}`;
    })();
    const intro = `For ${paramLabel} in ${lake1Name}, the sample ${centralValPhrase} versus ${thresholdPhrase}.`;
    const sigPart = (() => {
      if (!Number.isFinite(p)) return 'Significance could not be evaluated.';
      const pTxt = p < 0.001 ? 'p < 0.001' : `p = ${sciFmt(p)}`;
      return reject ? `This difference is statistically significant (${testLabel}, ${pTxt}, α = ${safeFmt(alpha)}), so we reject the null hypothesis.` : `This difference is not statistically significant (${testLabel}, ${pTxt}, α = ${safeFmt(alpha)}), so we fail to reject the null hypothesis.`;
    })();
    const complianceLine = compliancePhrase.replace(/\.$/, '');
    const directionLine = directionPhrase;
    return join([
      intro,
      sigPart,
      complianceLine,
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
    const metricLabel = useMedian ? 'median' : 'mean';

    // Determine which lake is better
    const betterAssessment = (() => {
      if (c1 == null || c2 == null) return { phrase: 'Central tendency unavailable.' };
      if (paramEval === 'range') {
        if (!thr || thr.type !== 'range') return { phrase: `Comparison based on ${metricLabel}s.` };
        const mid = (thr.min + thr.max)/2;
        const d1 = Math.abs(c1 - mid); const d2 = Math.abs(c2 - mid);
        if (Math.abs(d1 - d2) / ((d1 + d2)/2 || 1) < 0.05) return { phrase: `Both lakes similarly close to range center (${safeFmt(mid)}).` };
        return { phrase: d1 < d2 ? `${lake1Name} closer to optimal range center.` : `${lake2Name} closer to optimal range center.` };
      }
      if (higherIsWorse === true) {
        if (c1 < c2) return { phrase: `${lake1Name} better (${metricLabel} lower).` };
        if (c2 < c1) return { phrase: `${lake2Name} better (${metricLabel} lower).` };
        return { phrase: 'No difference in central tendency.' };
      }
      if (higherIsWorse === false) {
        if (c1 > c2) return { phrase: `${lake1Name} better (${metricLabel} higher).` };
        if (c2 > c1) return { phrase: `${lake2Name} better (${metricLabel} higher).` };
        return { phrase: 'No difference in central tendency.' };
      }
      // Unknown direction
      if (c1 === c2) return { phrase: 'Central tendencies are equal.' };
      return { phrase: c1 > c2 ? `${lake1Name} has higher ${metricLabel}.` : `${lake2Name} has higher ${metricLabel}.` };
    })();

  const directionDiffRaw = (c1 != null && c2 != null) ? (c1 - c2) : null;

    const testLabel = /t_student/.test(testKey) ? 'Student t-test'
      : /t_welch|welch/.test(testKey) ? 'Welch t-test'
      : /mann_whitney/.test(testKey) ? 'Mann–Whitney U'
      : /mood_median/.test(testKey) ? 'Mood’s median test'
      : 'Two-sample comparison';

    // Construct standardized natural language sentence
    const narrative = (() => {
      if (c1 == null || c2 == null) return 'Central tendency values are unavailable for comparison.';
      // Decide which lake to lead with (pick "better" if direction known)
      let leadName = lake1Name, otherName = lake2Name, leadVal = c1, otherVal = c2;
      const chooseBetter = higherIsWorse === true || higherIsWorse === false;
      if (chooseBetter) {
        const lake1Better = higherIsWorse === true ? (c1 < c2) : (c1 > c2);
        if (!lake1Better) { // swap
          leadName = lake2Name; otherName = lake1Name; leadVal = c2; otherVal = c1;
        }
      }
      const diff = Math.abs(leadVal - otherVal);
      const rel = leadVal === otherVal ? 'the same as' : (leadVal < otherVal ? 'lower than' : 'higher than');
      const qualifier = useMedian ? 'typical level' : 'average level';
      // Sentence pattern examples:
      // For BOD, Lake A’s average level (2.5) is lower than Lake B’s (6.46) by 3.96.
      // For BOD, Lake A’s average level (5.1) is the same as Lake B’s (5.1).
      if (leadVal === otherVal) {
        return `For ${paramLabel}, ${leadName}’s ${qualifier} (${safeFmt(leadVal)}) is the same as ${otherName}’s (${safeFmt(otherVal)}).`;
      }
      return `For ${paramLabel}, ${leadName}’s ${qualifier} (${safeFmt(leadVal)}) is ${rel} ${otherName}’s (${safeFmt(otherVal)}) by ${safeFmt(diff)}.`;
    })();

    const testLabelTwoSample = /t_student/.test(testKey) ? 'Student t-test'
      : /t_welch|welch/.test(testKey) ? 'Welch t-test'
      : /mann_whitney/.test(testKey) ? 'Mann–Whitney U test'
      : /mood_median/.test(testKey) ? 'Mood’s median test'
      : 'Two-sample test';

    const significanceSentence = (() => {
      if (!Number.isFinite(p)) return 'Significance could not be determined.';
      const pTxt = p < 0.001 ? 'p < 0.001' : `p = ${sciFmt(p)}`;
      return reject
        ? `This difference is statistically significant (${testLabelTwoSample}, ${pTxt}, α = ${safeFmt(alpha)}), so we reject the null hypothesis.`
        : `The observed difference is not statistically significant (${testLabelTwoSample}, ${pTxt}, α = ${safeFmt(alpha)}), so we fail to reject the null hypothesis.`;
    })();

    const qualitySentence = (() => {
      if (c1 == null || c2 == null) return null;
      if (c1 === c2) return null;
      const metricLabelText = useMedian ? 'typical level' : 'average level';
      // helper to select lake with lower/higher central value
      const lakeWithLower = (c1 < c2) ? lake1Name : lake2Name;
      const lakeWithHigher = (c1 > c2) ? lake1Name : lake2Name;

      if (higherIsWorse === true) {
        // lower is better
        if (reject === true) {
          return `Because lower ${paramLabel} indicates better quality, the observed lower ${metricLabelText} in ${lakeWithLower} — together with the statistically significant result — is consistent with better water quality in ${lakeWithLower}.`;
        }
        if (reject === false) {
          return `Because lower ${paramLabel} indicates better quality, the observed lower ${metricLabelText} in ${lakeWithLower} is suggestive but not statistically significant; additional data would be needed to conclude better water quality.`;
        }
        return `Because lower ${paramLabel} indicates better quality, the observed lower ${metricLabelText} in ${lakeWithLower} is noted; statistical evidence is inconclusive.`;
      }

      if (higherIsWorse === false) {
        // higher is better
        if (reject === true) {
          return `Because higher ${paramLabel} indicates better quality, the observed higher ${metricLabelText} in ${lakeWithHigher} — together with the statistically significant result — is consistent with better water quality in ${lakeWithHigher}.`;
        }
        if (reject === false) {
          return `Because higher ${paramLabel} indicates better quality, the observed higher ${metricLabelText} in ${lakeWithHigher} is suggestive but not statistically significant; additional data would be needed to conclude better water quality.`;
        }
        return `Because higher ${paramLabel} indicates better quality, the observed higher ${metricLabelText} in ${lakeWithHigher} is noted; statistical evidence is inconclusive.`;
      }

      // Unknown direction: be neutral
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