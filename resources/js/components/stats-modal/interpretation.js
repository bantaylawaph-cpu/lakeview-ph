// Interpretation builder for AdvancedStat
// Accepts dependencies and returns a composed interpretation string.
export function buildInterpretation({ result, paramCode, paramOptions = [], classCode, staticThresholds = {}, lakes = [], cl = '0.95', fmt, sci, lakeId, compareValue }) {
  if (!result) return '';
  const interpretation = result.interpretation_detail || result.interpretation || '';

  const pMeta = (paramOptions || []).find(pp => String(pp.code) === String(paramCode) || String(pp.key) === String(paramCode) || String(pp.id) === String(paramCode));
  const paramLabel = pMeta?.label || pMeta?.name || String(paramCode || 'parameter');

  const getThreshold = () => {
    if (result.threshold_min != null && result.threshold_max != null) return { type: 'range', min: Number(result.threshold_min), max: Number(result.threshold_max), kind: 'range' };
    if (result.mu0 != null) {
      const et = result.evaluation_type || null;
      const kind = et === 'min' ? 'min' : (et === 'max' ? 'max' : 'value');
      return { type: 'value', value: Number(result.mu0), kind };
    }
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

  // Helper: determine whether higher values are worse from authoritative sources
  const higherIsWorse = (() => {
    const et = result.evaluation_type || null;
    if (et === 'min') return false; // lower values are worse
    if (et === 'max') return true; // higher values are worse
    if (pMeta && typeof pMeta.higher_is_worse === 'boolean') return !!pMeta.higher_is_worse;
    if (pMeta && typeof pMeta.direction === 'string') return pMeta.direction === 'higher_is_worse';
    return null;
  })();

  // One-sample / single-mean flows
  if ('n' in result || (!('n1' in result) && !('n2' in result))) {
    const mean = result.mean != null ? Number(result.mean) : null;

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
      if (result.mu0 != null) {
        if (higherIsWorse === false) return mean < result.mu0 ? 'degradation' : 'improvement';
        if (higherIsWorse === true) return mean > result.mu0 ? 'degradation' : 'improvement';
        return 'stable';
      }
      if (result.significant != null) {
        if (higherIsWorse === false) return mean < 0 ? 'degradation' : 'stable';
        if (higherIsWorse === true) return mean > 0 ? 'degradation' : 'stable';
        return 'stable';
      }
      return 'stable';
    };

    const verdict = decideVerdict();

    // TOST handling
    if (result.test_used === 'tost' || result.type === 'tost') {
      const meanVal = mean;
      if (result.equivalent) {
        return [interpretation, `Equivalence test: mean ${paramLabel} appears within the acceptable range${classCode ? ` for Class ${classCode}` : ''}. This indicates no clear change in water quality.`].filter(Boolean).join(' ');
      }
      // Not equivalent -> descriptive statements
      if (thr && meanVal != null) {
        if (thr.type === 'range') {
          if (meanVal < thr.min) return [interpretation, `Descriptively, mean ${paramLabel} (${fmt(meanVal)}) is below the acceptable range [${fmt(thr.min)}, ${fmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
          if (meanVal > thr.max) return [interpretation, `Descriptively, mean ${paramLabel} (${fmt(meanVal)}) is above the acceptable range [${fmt(thr.min)}, ${fmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
          return [interpretation, `Descriptively, mean ${paramLabel} (${fmt(meanVal)}) is within the acceptable range but did not meet equivalence criteria${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
        }
        if (thr.value != null) {
          const kind = thr.kind || (thr.type === 'value' ? 'max' : thr.type);
          if (kind === 'max') return [interpretation, `Descriptively, mean ${paramLabel} (${fmt(meanVal)}) is ${meanVal > thr.value ? 'above' : 'below'} threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
          return [interpretation, `Descriptively, mean ${paramLabel} (${fmt(meanVal)}) is ${meanVal < thr.value ? 'below' : 'above'} minimum threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
        }
      }
      return [interpretation, `Equivalence test: mean ${paramLabel} did not meet equivalence bounds${classCode ? ` for Class ${classCode}` : ''}; results are inconclusive regarding direction.`].filter(Boolean).join(' ');
    }

    // Non-TOST one-sample: if significant -> strong language, else descriptive + p
    if (result.significant) {
      if (verdict === 'degradation') {
        if (thr && thr.type === 'range') return [interpretation, `Statistical evidence suggests a possible degradation in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) falls outside the acceptable range [${fmt(thr.min)}, ${fmt(thr.max)}]${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
        if (thr && thr.value != null) {
          const kind = thr.kind || (thr.type === 'value' ? 'max' : thr.type);
          if (kind === 'max') return [interpretation, `Statistical evidence suggests a possible degradation in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) is above the threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
          return [interpretation, `Statistical evidence suggests a possible degradation in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) is below the minimum threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
        }
        return [interpretation, `Statistical evidence suggests a possible degradation in water quality for ${paramLabel} (mean ${fmt(mean)}).`].filter(Boolean).join(' ');
      }
      if (verdict === 'improvement') {
        if (thr && thr.type === 'range') return [interpretation, `Statistical evidence suggests a possible improvement in water quality for ${paramLabel}.`].filter(Boolean).join(' ');
        if (thr && thr.value != null) {
          const kind = thr.kind || (thr.type === 'value' ? 'max' : thr.type);
          if (kind === 'max') return [interpretation, `Statistical evidence suggests a possible improvement in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) is below the threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
          return [interpretation, `Statistical evidence suggests a possible improvement in water quality for ${paramLabel}. The sample mean (${fmt(mean)}) is above the minimum threshold ${fmt(thr.value)}${classCode ? ` for Class ${classCode}` : ''}.`].filter(Boolean).join(' ');
        }
        return [interpretation, `Statistical evidence suggests a possible improvement in water quality for ${paramLabel} (mean ${fmt(mean)}).`].filter(Boolean).join(' ');
      }
      return [interpretation, `Statistical evidence indicates a difference for ${paramLabel}.`].filter(Boolean).join(' ');
    }

    // Not significant: descriptive + p-value
    const pv = result.p_value != null ? ` (p=${sci(result.p_value)})` : '';
    return [interpretation, `Descriptively, mean ${paramLabel} is ${fmt(mean)}.${pv} No statistical evidence of a difference at the selected confidence level.`].filter(Boolean).join(' ');
  }

  // Two-sample flows
  if ('n1' in result && 'n2' in result) {
    const m1 = result.mean1 != null ? Number(result.mean1) : null;
    const m2 = result.mean2 != null ? Number(result.mean2) : null;
    if (m1 == null || m2 == null) return interpretation;
    const lakeNameById = (id) => {
      const lk = lakes.find(l => String(l.id) === String(id));
      return lk ? (lk.name || `Lake ${lk.id}`) : (id == null ? '' : `Lake ${id}`);
    };
    const lake1Name = lakeNameById(lakeId);
    const otherId = (compareValue && String(compareValue).startsWith('lake:')) ? String(compareValue).split(':')[1] : null;
    const lake2Name = lakeNameById(otherId);

    const perLakeThresholdsAvailable = !!(result.threshold_min_by_lake || result.threshold_max_by_lake || result.mu0_by_lake);
    if (perLakeThresholdsAvailable) {
      return [interpretation, `${lake1Name} mean ${paramLabel} (${fmt(m1)}) vs ${lake2Name} (${fmt(m2)}). Per-lake thresholds evaluated where available.`].filter(Boolean).join(' ');
    }
    const delta = m1 - m2;
    const dir = delta > 0 ? 'higher' : (delta < 0 ? 'lower' : 'similar');
    if (result.significant) {
      return [interpretation, `${lake1Name} mean ${paramLabel} (${fmt(m1)}) is ${dir} than ${lake2Name} (${fmt(m2)}) (Δ = ${fmt(delta)}).`].filter(Boolean).join(' ');
    }
    return [interpretation, `Descriptively, ${lake1Name} mean ${paramLabel} (${fmt(m1)}) is ${dir} than ${lake2Name} (${fmt(m2)}) (Δ = ${fmt(delta)}). No statistical evidence of a difference.`].filter(Boolean).join(' ');
  }

  return interpretation;
}

export default buildInterpretation;
