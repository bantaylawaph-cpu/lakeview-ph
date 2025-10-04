// Adapter to map a selected test key to statsUtils functions and return normalized results
import { tOneSampleAsync, tTwoSampleWelchAsync, tTwoSampleStudentAsync, mannWhitneyAsync, signTestAsync, tostEquivalenceAsync, wilcoxonSignedRankAsync, moodMedianAsync, shapiroWilkAsync } from '../../stats/statsUtils';

// Normalize a result object to ensure consistent keys for UI consumption
function normalize(base, extra={}) {
  return { ...base, ...extra };
}

export async function runOneSample({ selectedTest, values, mu0, alpha, evalType, thrMin, thrMax }) {
  if (selectedTest === 'shapiro_wilk') {
    const r = await shapiroWilkAsync(values, alpha);
    return normalize(r, { type:'one-sample-normality', test_used:'shapiro_wilk', sample_values: values, evaluation_type: evalType || null });
  }
  if (selectedTest === 'wilcoxon_signed_rank') {
    const r = await wilcoxonSignedRankAsync(values, Number(mu0), alpha, 'two-sided');
    return normalize({
      type: 'one-sample-nonparam', test_used: 'wilcoxon_signed_rank', sample_values: values, mu0, evaluation_type: evalType || null, threshold_min: thrMin ?? null, threshold_max: thrMax ?? null,
      n: r.n, statistic: r.statistic, p_value: r.p_value, alpha: r.alpha ?? alpha, significant: r.p_value < (r.alpha ?? alpha)
    });
  }
  if (selectedTest === 'sign_test') {
    const r = await signTestAsync(values, Number(mu0), alpha, 'two-sided');
    return normalize(r, { type:'one-sample-nonparam', test_used:'sign_test', mu0, sample_values: values, evaluation_type: evalType || null, threshold_min: thrMin ?? null, threshold_max: thrMax ?? null });
  }
  if (selectedTest === 'tost') {
    const r = await tostEquivalenceAsync(values, Number(thrMin), Number(thrMax), alpha);
    return normalize(r, { test_used:'tost', sample_values: values, threshold_min: thrMin, threshold_max: thrMax, evaluation_type:'range', significant: !!r.equivalent });
  }
  // default one-sample t-test
  const r = await tOneSampleAsync(values, Number(mu0), alpha, 'two-sided');
  return normalize(r, { type:'one-sample', test_used:'t_one_sample', mu0, sample_values: values, evaluation_type: evalType || null, threshold_min: thrMin ?? null, threshold_max: thrMax ?? null });
}

export async function runTwoSample({ selectedTest, sample1, sample2, alpha, evalType }) {
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
    return normalize(r, { type:'two-sample-nonparam', test_used:'mood_median_test', sample1_values: sample1, sample2_values: sample2, evaluation_type: evalType || null });
  }
  // default Welch
  const r = await tTwoSampleWelchAsync(sample1, sample2, alpha, 'two-sided');
  return normalize(r, { type:'two-sample-welch', test_used:'t_welch', sample1_values: sample1, sample2_values: sample2, evaluation_type: evalType || null });
}

export default { runOneSample, runTwoSample };