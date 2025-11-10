// Adapter to map a selected test key to statsUtils functions and return normalized results
import { tOneSampleAsync, tTwoSampleWelchAsync, tTwoSampleStudentAsync, mannWhitneyAsync, signTestAsync, tostEquivalenceAsync, tostEquivalenceWilcoxonAsync, wilcoxonSignedRankAsync, moodMedianAsync, shapiroWilkAsync, leveneTwoSampleAsync } from '../../stats/statsUtils';

// Normalize a result object to ensure consistent keys for UI consumption
function normalize(base, extra={}) {
  return { ...base, ...extra };
}

export async function runOneSample({ selectedTest, values, mu0, alpha, evalType, thrMin, thrMax, alt }) {
  const alternative = alt || 'two-sided';
  if (selectedTest === 'shapiro_wilk' || selectedTest === 'diagnostic_one') {
    const r = await shapiroWilkAsync(values, alpha);
    return normalize(r, { type:'one-sample-normality', test_used:selectedTest, sample_values: values, evaluation_type: evalType || null });
  }
  if (selectedTest === 'wilcoxon_signed_rank') {
    const r = await wilcoxonSignedRankAsync(values, Number(mu0), alpha, alternative);
    // derive median for downstream interpretation when mean is absent
    let median = null; try { const sorted=[...values].filter(Number.isFinite).sort((a,b)=>a-b); const n=sorted.length; if(n) median = (n%2? sorted[(n-1)/2] : (sorted[n/2-1]+sorted[n/2])/2); } catch(e) { /* ignore */ }
    return normalize({
      type: 'one-sample-nonparam', test_used: 'wilcoxon_signed_rank', sample_values: values, mu0, evaluation_type: evalType || null, threshold_min: thrMin ?? null, threshold_max: thrMax ?? null,
      n: r.n, statistic: r.statistic, p_value: r.p_value, alpha: r.alpha ?? alpha, significant: r.p_value < (r.alpha ?? alpha), median, alternative: r.alt || alternative
    });
  }
  if (selectedTest === 'sign_test') {
    const r = await signTestAsync(values, Number(mu0), alpha, alternative);
    let median = null; try { const sorted=[...values].filter(Number.isFinite).sort((a,b)=>a-b); const n=sorted.length; if(n) median = (n%2? sorted[(n-1)/2] : (sorted[n/2-1]+sorted[n/2])/2); } catch(e) { /* ignore */ }
    return normalize(r, { type:'one-sample-nonparam', test_used:'sign_test', mu0, sample_values: values, evaluation_type: evalType || null, threshold_min: thrMin ?? null, threshold_max: thrMax ?? null, median, alternative: r.alternative || alternative });
  }
  if (selectedTest === 'tost') {
    const r = await tostEquivalenceAsync(values, Number(thrMin), Number(thrMax), alpha);
    return normalize(r, { test_used:'tost', sample_values: values, threshold_min: thrMin, threshold_max: thrMax, evaluation_type:'range', significant: !!r.equivalent, alternative:'equivalence' });
  }
  if (selectedTest === 'tost_wilcoxon') {
    const r = await tostEquivalenceWilcoxonAsync(values, Number(thrMin), Number(thrMax), alpha);
    return normalize(r, { test_used:'tost_wilcoxon', sample_values: values, threshold_min: thrMin, threshold_max: thrMax, evaluation_type:'range', significant: !!r.equivalent, alternative:'equivalence' });
  }
  // default one-sample t-test
  const r = await tOneSampleAsync(values, Number(mu0), alpha, alternative);
  return normalize(r, { type:'one-sample', test_used:'t_one_sample', mu0, sample_values: values, evaluation_type: evalType || null, threshold_min: thrMin ?? null, threshold_max: thrMax ?? null, alternative: r.alternative || alternative });
}

export async function runTwoSample({ selectedTest, sample1, sample2, alpha, evalType }) {
  if (selectedTest === 'diagnostic_two') {
    const r1 = await shapiroWilkAsync(sample1, alpha);
    const r2 = await shapiroWilkAsync(sample2, alpha);
    const rLevene = await leveneTwoSampleAsync(sample1, sample2, alpha, 'median');
    return normalize({
      type: 'two-sample-diagnostic',
      test_used: 'diagnostic_two',
      sample1_values: sample1,
      sample2_values: sample2,
      evaluation_type: evalType || null,
      W1: r1.W,
      p1: r1.p_value,
      normal1: r1.normal,
      W2: r2.W,
      p2: r2.p_value,
      normal2: r2.normal,
      equal_variances: rLevene.equal_variances,
      p_levene: rLevene.p_value,
      alpha: r1.alpha ?? alpha
    });
  }
  if (selectedTest === 'mann_whitney') {
    const r = await mannWhitneyAsync(sample1, sample2, alpha, 'two-sided');
    return normalize(r, { type:'two-sample-nonparam', test_used:'mann_whitney', sample1_values: sample1, sample2_values: sample2, evaluation_type: evalType || null });
  }
  if (selectedTest === 't_student') {
    const r = await tTwoSampleStudentAsync(sample1, sample2, alpha, 'two-sided');
    return normalize(r, { type:'two-sample-t', test_used:'t_student', sample1_values: sample1, sample2_values: sample2, evaluation_type: evalType || null });
  }
  if (selectedTest === 'mood_median_test') {
    const r = await moodMedianAsync(sample1, sample2, alpha);
    return normalize(r, { type:'two-sample-nonparam', test_used:'mood_median_test', sample1_values: sample1, sample2_values: sample2, n1: sample1?.length || r.n1 || null, n2: sample2?.length || r.n2 || null, evaluation_type: evalType || null });
  }
  // default Welch
  const r = await tTwoSampleWelchAsync(sample1, sample2, alpha, 'two-sided');
  return normalize(r, { type:'two-sample-welch', test_used:'t_welch', sample1_values: sample1, sample2_values: sample2, evaluation_type: evalType || null });
}

export default { runOneSample, runTwoSample };