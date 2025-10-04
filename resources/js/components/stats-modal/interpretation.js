// Interpretation builder for AdvancedStat
// Accepts dependencies and returns a composed interpretation string.
export function buildInterpretation({
  result,
  paramCode,
  paramOptions = [],
  classCode,
  staticThresholds = {},
  lakes = [],
  cl = '0.95',
  fmt,
  sci,
  lakeId,
  compareValue
}) {
  if (!result) return '';

  // Helpers ---------------------------------------------------------------
  const safeFmt = (v) => {
    if (v == null || Number.isNaN(v)) return '—';
    try { return fmt ? fmt(v) : String(v); } catch { return String(v); }
  };

  const sciFmt = (v) => {
    if (v == null) return '';
    // allow textual p-values like '<0.001'
    if (typeof v === 'string' && /</.test(v)) return v;
    const num = Number(v);
    if (!Number.isFinite(num)) return String(v);
    try { return sci ? sci(num) : String(num); } catch { return String(num); }
  };

  const joinSentences = (parts) => parts
    .filter(Boolean)
    .map(s => String(s).trim())
    .filter(s => s.length)
    .map(s => /[.!?]$/.test(s) ? s : s + '.')
    .join(' ');

  const normBool = (v) => {
    if (v === true || v === false) return v;
    if (v === 1 || v === '1') return true;
    if (v === 0 || v === '0') return false;
    return null;
  };

  const pMeta = (paramOptions || []).find(pp => [pp.code, pp.key, pp.id].some(x => String(x) === String(paramCode)));
  const paramLabel = pMeta?.label || pMeta?.name || String(paramCode || 'parameter');

  // Threshold extraction precedence: explicit min/max range > mu0 > static
  const getThreshold = () => {
    const toNum = (x) => (x != null && x !== '' && !Number.isNaN(Number(x)) ? Number(x) : null);
    const minVal = toNum(result.threshold_min);
    const maxVal = toNum(result.threshold_max);
    if (minVal != null && maxVal != null) return { type: 'range', min: minVal, max: maxVal, kind: 'range' };
    if (result.mu0 != null && result.mu0 !== '') {
      const et = result.evaluation_type || null; // 'min' | 'max' | etc
      const kind = et === 'min' ? 'min' : (et === 'max' ? 'max' : 'value');
      const value = toNum(result.mu0);
      if (value != null) return { type: 'value', value, kind };
    }
    const entry = staticThresholds && staticThresholds[paramCode];
    if (entry) {
      if (entry.type === 'range') {
        const rng = entry[classCode];
        if (Array.isArray(rng) && rng.length >= 2) {
          const a = toNum(rng[0]);
          const b = toNum(rng[1]);
          if (a != null && b != null) return { type: 'range', min: a, max: b, kind: 'range' };
        }
      }
      const val = entry[classCode];
      const numVal = toNum(val);
      if (numVal != null) {
        // keep declared kind if explicit otherwise treat as neutral value
        const declared = (entry.type === 'min' || entry.type === 'max') ? entry.type : 'value';
        return { type: 'value', value: numVal, kind: declared };
      }
    }
    return null;
  };

  const thr = getThreshold();

  // Determine direction: true => higher is worse, false => lower is worse, null => unknown
  const higherIsWorse = (() => {
    const et = result.evaluation_type || null;
    if (et === 'min') return false;
    if (et === 'max') return true;
    if (pMeta && typeof pMeta.higher_is_worse === 'boolean') return !!pMeta.higher_is_worse;
    if (pMeta && typeof pMeta.direction === 'string') {
      if (pMeta.direction === 'higher_is_worse') return true;
      if (pMeta.direction === 'lower_is_worse') return false;
    }
    return null;
  })();

  const interpretationBase = result.interpretation_detail || result.interpretation || '';
  const alphaVal = result.alpha != null ? Number(result.alpha) : (1 - Number(cl || '0.95'));
  const isSignificant = normBool(result.significant); // null if unknown

  // Utility to classify position relative to threshold
  const classifyRelativeToThreshold = (mean) => {
    if (mean == null || !thr) return 'unknown';
    if (thr.type === 'range') {
      if (mean < thr.min) return 'below';
      if (mean > thr.max) return 'above';
      return 'within';
    }
    if (thr.type === 'value' && thr.value != null) {
      if (mean < thr.value) return 'below_value';
      if (mean > thr.value) return 'above_value';
      return 'equal_value';
    }
    return 'unknown';
  };

  const classifyVerdict = (mean) => {
    if (mean == null) return 'stable';
    if (thr) {
      const pos = classifyRelativeToThreshold(mean);
      if (thr.type === 'range') {
        if (pos === 'within') return 'stable';
        if (higherIsWorse === true) {
          if (pos === 'above') return 'degradation';
          if (pos === 'below') return 'improvement';
        } else if (higherIsWorse === false) {
          if (pos === 'below') return 'degradation';
          if (pos === 'above') return 'improvement';
        } else {
          // Unknown direction – treat any excursion as degradation (conservative)
          return 'degradation';
        }
        return 'stable';
      }
      if (thr.type === 'value') {
        const kind = thr.kind === 'min' ? 'min' : (thr.kind === 'max' ? 'max' : 'value');
        if (kind === 'max') {
          if (mean > thr.value) return 'degradation';
          if (mean < thr.value) return 'improvement';
          return 'stable';
        }
        if (kind === 'min') {
          if (mean < thr.value) return 'degradation';
          if (mean > thr.value) return 'improvement';
          return 'stable';
        }
        // neutral value baseline: do not force improvement/degradation, stay stable unless direction known
        return 'stable';
      }
    }
    // If no threshold & mu0 exists treat deviation relative to mu0 using directionality
    if (result.mu0 != null && Number.isFinite(Number(result.mu0))) {
      const mu0 = Number(result.mu0);
      if (higherIsWorse === true) {
        if (mean > mu0) return 'degradation';
        if (mean < mu0) return 'improvement';
      } else if (higherIsWorse === false) {
        if (mean < mu0) return 'degradation';
        if (mean > mu0) return 'improvement';
      }
      return 'stable';
    }
    // Do NOT infer from sign vs zero (avoid misleading conclusion)
    return 'stable';
  };

  // Shapiro–Wilk (normality) dedicated path ------------------------------
  if (result.test_used === 'shapiro_wilk' || result.type === 'one-sample-normality') {
    const p = Number(result.p_value);
    const nSamples = Number(result.n) || 0;
    let msg = '';
    if (Number.isFinite(p) && Number.isFinite(alphaVal)) {
      msg = p < alphaVal
        ? 'Data depart from normality; consider rank-based or transformation approaches.'
        : 'No strong evidence against normality; parametric tests appear acceptable (verify sample size).';
    }
    if (nSamples && nSamples < 8) msg += ' Very small sample (n < 8): normality tests have low power; interpret cautiously.';
    return joinSentences([interpretationBase, msg]);
  }

  // Levene variance homogeneity path ------------------------------------
  if (result.test_used === 'levene') {
    const p = Number(result.p_value);
    const alphaUsed = Number(result.alpha ?? alphaVal);
    const equalVar = normBool(result.equal_variances);
    const base = interpretationBase;
    let msgCore = '';
    if (Number.isFinite(p) && Number.isFinite(alphaUsed)) {
      if (p < alphaUsed) {
        msgCore = 'Variances appear heterogeneous across groups';
      } else {
        msgCore = 'No strong evidence of variance differences across groups';
      }
    }
    // Provide variance info (if available) and updated guidance.
    const var1 = Number(result.var1 ?? (result.group_variances && result.group_variances[0]));
    const var2 = Number(result.var2 ?? (result.group_variances && result.group_variances[1]));
    const varianceRatio = (Number.isFinite(var1) && Number.isFinite(var2) && var1 > 0) ? (var2 / var1) : null;
    const varRatioStr = varianceRatio != null ? ` Variance ratio (var2/var1) ≈ ${varianceRatio.toFixed(2)}.` : '';

    // Guidance: prefer Welch by default (robust to unequal variances).
    let guidance = '';
    if (p < alphaUsed) {
      guidance = 'Recommendation: variances appear unequal — prefer Welch two-sample t-test for mean comparison; if normality is also violated, prefer Mann–Whitney.';
    } else {
      guidance = 'Recommendation: Welch two-sample t-test is a safe default (robust to unequal variances).';
      guidance += ' If you prefer the pooled Student t-test, ensure normality and justify approximately equal variances';
      if (varianceRatio != null) guidance += ` (variance ratio ≈ ${varianceRatio.toFixed(2)}).`;
      else guidance += '.';
      guidance += ' Note: a non-significant Levene test does not prove variances are equal, especially with small samples.';
    }

    const detail = `F(${result.df1}, ${result.df2})=${isFinite(result.F)? result.F.toFixed(3): '—'}, p=${Number.isFinite(p)? p.toExponential(2): '—'}` + (varRatioStr ? ` ${varRatioStr.trim()}` : '');
    return [base, msgCore + '.', detail + '.', guidance].filter(Boolean).join(' ');
  }

  // Shapiro–Wilk dedicated messaging
  if (result.test_used === 'shapiro_wilk' || result.type === 'one-sample-normality') {
    const p = Number(result.p_value);
    const nSamples = Number(result.n) || 0;
    const alphaVal = result.alpha ?? (1 - Number(cl || '0.95'));
    let msg = '';
    if (Number.isFinite(p) && p < alphaVal) msg = 'Data do not look normal; prefer rank-based tests or log analysis.';
    else msg = 'No evidence against normality; parametric tests are OK (check n).';
    if (nSamples && nSamples < 8) msg += ' Small sample (n < 8): normality tests have low power — interpret results cautiously.';
    return [interpretation, msg].filter(Boolean).join(' ');
  }

  // One-sample / single-mean flows --------------------------------------
  if ('n' in result || (!('n1' in result) && !('n2' in result))) {
    // Central tendency handling: parametric tests provide mean; non-parametric (Wilcoxon / Sign) may only provide median/location
    const mean = (result.mean != null && result.mean !== '') ? Number(result.mean) : null;
    const meanIsFinite = mean != null && Number.isFinite(mean);
    let central = mean;
    let centralIsFinite = meanIsFinite;
    let centralMetric = 'mean';
    if (!centralIsFinite) {
      const medianCandidate = result.median ?? result.location ?? result.location_estimate;
      if (medianCandidate != null && medianCandidate !== '' && Number.isFinite(Number(medianCandidate))) {
        central = Number(medianCandidate);
        centralIsFinite = true;
        centralMetric = 'median';
      }
    }
    const verdict = classifyVerdict(centralIsFinite ? central : null);
    const pos = classifyRelativeToThreshold(centralIsFinite ? central : null);

    // TOST handling
    if (result.test_used === 'tost' || result.type === 'tost') {
      const meanVal = meanIsFinite ? mean : null;
      if (result.equivalent) {
        return joinSentences([
          interpretationBase,
          `Equivalence test: mean ${paramLabel} is within predefined acceptable bounds${classCode ? ` for Class ${classCode}` : ''}`,
          'No meaningful change detected.'
        ]);
      }
      if (thr && meanVal != null) {
        if (thr.type === 'range') {
          if (meanVal < thr.min) return joinSentences([interpretationBase, `Mean ${paramLabel} (${safeFmt(meanVal)}) is below acceptable range [${safeFmt(thr.min)}, ${safeFmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}`]);
          if (meanVal > thr.max) return joinSentences([interpretationBase, `Mean ${paramLabel} (${safeFmt(meanVal)}) is above acceptable range [${safeFmt(thr.min)}, ${safeFmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}`]);
          return joinSentences([interpretationBase, `Mean ${paramLabel} (${safeFmt(meanVal)}) lies within acceptable range but equivalence criteria were not met`]);
        }
        if (thr.type === 'value' && thr.value != null) {
          const kind = thr.kind === 'min' ? 'minimum' : (thr.kind === 'max' ? 'maximum' : 'reference');
          const above = meanVal > thr.value;
            return joinSentences([
              interpretationBase,
              `Mean ${paramLabel} (${safeFmt(meanVal)}) is ${above ? 'above' : (meanVal < thr.value ? 'below' : 'equal to')} ${kind} threshold ${safeFmt(thr.value)}`
            ]);
        }
      }
      return joinSentences([
        interpretationBase,
        `Equivalence test: mean ${paramLabel} did not fall within equivalence bounds${classCode ? ` for Class ${classCode}` : ''}`,
        'Direction remains inconclusive.'
      ]);
    }
    // Non-TOST one-sample: significance messaging
    if (isSignificant === true) {
      const centralStr = centralIsFinite ? safeFmt(central) : '—';
      const centralWord = centralMetric === 'mean' ? 'mean' : 'median';
      const centralWordCap = centralMetric === 'mean' ? 'Mean' : 'Median';
      if (verdict === 'degradation') {
        if (thr && thr.type === 'range') return joinSentences([
          interpretationBase,
          `Evidence of potential degradation for ${paramLabel}: ${centralWord} ${centralStr} outside acceptable range [${safeFmt(thr.min)}, ${safeFmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}`
        ]);
        if (thr && thr.type === 'value' && thr.value != null) {
          const kind = thr.kind === 'min' ? 'minimum' : (thr.kind === 'max' ? 'maximum' : 'reference');
          return joinSentences([
            interpretationBase,
            `Evidence of potential degradation for ${paramLabel}: ${centralWord} ${centralStr} ${thr.kind === 'max' ? 'exceeds' : (thr.kind === 'min' ? 'falls below' : 'differs from')} ${kind} threshold ${safeFmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}`
          ]);
        }
        return joinSentences([interpretationBase, `Evidence of a difference suggesting degradation for ${paramLabel}${centralIsFinite ? ` (${centralWord} ${centralStr})` : ''}`]);
      }
      if (verdict === 'improvement') {
        if (thr && thr.type === 'range') return joinSentences([
          interpretationBase,
          `Evidence of potential improvement for ${paramLabel}: ${centralWord} ${safeFmt(central)} outside prior range boundary in favorable direction`]);
        if (thr && thr.type === 'value' && thr.value != null) {
          const kind = thr.kind === 'min' ? 'minimum' : (thr.kind === 'max' ? 'maximum' : 'reference');
          return joinSentences([
            interpretationBase,
            `Evidence of potential improvement for ${paramLabel}: ${centralWord} ${safeFmt(central)} is ${(thr.kind === 'max') ? 'below' : 'above'} ${kind} threshold ${safeFmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}`
          ]);
        }
        return joinSentences([interpretationBase, `Evidence of a difference suggesting improvement for ${paramLabel}${centralIsFinite ? ` (${centralWord} ${safeFmt(central)})` : ''}`]);
      }
      return joinSentences([interpretationBase, `Statistical evidence indicates a difference for ${paramLabel}`]);
    }

    // Non-significant (or unknown) -> descriptive only
    const pValOut = result.p_value != null ? `p=${sciFmt(result.p_value)}` : null;
    const meanPhrase = centralIsFinite ? `${centralMetric === 'mean' ? 'Mean' : 'Median'} ${paramLabel}: ${safeFmt(central)}${thr ? '' : ''}` : `${centralMetric === 'mean' ? 'Mean' : 'Median'} ${paramLabel} unavailable`;
    let thresholdPhrase = null;
    if (thr && centralIsFinite) {
      if (thr.type === 'range') {
        if (pos === 'within') thresholdPhrase = `Within acceptable range [${safeFmt(thr.min)}, ${safeFmt(thr.max)}]`;
        else if (pos === 'below') thresholdPhrase = `Below acceptable range [${safeFmt(thr.min)}, ${safeFmt(thr.max)}]`;
        else if (pos === 'above') thresholdPhrase = `Above acceptable range [${safeFmt(thr.min)}, ${safeFmt(thr.max)}]`;
      } else if (thr.type === 'value' && thr.value != null) {
        const kind = thr.kind === 'min' ? 'minimum' : (thr.kind === 'max' ? 'maximum' : 'reference');
        if (pos === 'below_value') thresholdPhrase = `Below ${kind} threshold ${safeFmt(thr.value)}`;
        else if (pos === 'above_value') thresholdPhrase = `Above ${kind} threshold ${safeFmt(thr.value)}`;
        else if (pos === 'equal_value') thresholdPhrase = `At ${kind} threshold ${safeFmt(thr.value)}`;
      }
    }
    return joinSentences([
      interpretationBase,
      meanPhrase,
      thresholdPhrase,
      pValOut ? `${pValOut}` : null,
      (isSignificant === false) ? 'No statistical evidence of a difference at the selected confidence level' : null
    ]);
  }

  // Two-sample flows
  if ('n1' in result && 'n2' in result) {
    const m1 = result.mean1 != null ? Number(result.mean1) : null;
    const m2 = result.mean2 != null ? Number(result.mean2) : null;
    if (m1 == null || m2 == null || !Number.isFinite(m1) || !Number.isFinite(m2)) return interpretationBase;
    const lakeNameById = (id) => {
      const lk = lakes.find(l => String(l.id) === String(id));
      return lk ? (lk.name || `Lake ${lk.id}`) : (id == null ? '' : `Lake ${id}`);
    };
    const lake1Name = lakeNameById(lakeId);
    const otherId = (compareValue && String(compareValue).startsWith('lake:')) ? String(compareValue).split(':')[1] : null;
    const lake2Name = lakeNameById(otherId);
    const perLakeThresholdsAvailable = !!(result.threshold_min_by_lake || result.threshold_max_by_lake || result.mu0_by_lake);
    if (perLakeThresholdsAvailable) {
      return joinSentences([
        interpretationBase,
        `${lake1Name} mean ${paramLabel}: ${safeFmt(m1)}`,
        `${lake2Name} mean ${paramLabel}: ${safeFmt(m2)}`,
        'Per-lake thresholds referenced (detailed comparative evaluation not yet implemented)'
      ]);
    }
    const delta = m1 - m2;
    const dir = delta > 0 ? 'higher' : (delta < 0 ? 'lower' : 'similar');
    if (isSignificant === true) {
      return joinSentences([
        interpretationBase,
        `${lake1Name} mean ${paramLabel} (${safeFmt(m1)}) is ${dir} than ${lake2Name} (${safeFmt(m2)}) (Δ=${safeFmt(delta)})`
      ]);
    }
    return joinSentences([
      interpretationBase,
      `${lake1Name} mean ${paramLabel} (${safeFmt(m1)}) is ${dir} than ${lake2Name} (${safeFmt(m2)}) (Δ=${safeFmt(delta)})`,
      'No statistical evidence of a difference'
    ]);
  }

  return interpretationBase;
}

export default buildInterpretation;