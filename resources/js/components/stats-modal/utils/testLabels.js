// Central test label mapping reused across UI and exports

const LABELS = {
  shapiro_wilk: 'Shapiro–Wilk normality test',
  diagnostic_one: 'Shapiro–Wilk normality test',
  diagnostic_two: 'Shapiro–Wilk + Levene Variance test',
  t_one_sample: 'One-sample t-test',
  wilcoxon_signed_rank: 'Wilcoxon signed-rank',
  sign_test: 'Sign test',
  tost: 'Equivalence TOST (t-test)',
  tost_wilcoxon: 'Equivalence TOST (Wilcoxon)',
  t_student: 'Student t-test (equal var)',
  t_welch: 'Welch t-test (unequal var)',
  levene: 'Levene (Brown–Forsythe) variance test',
  mann_whitney: 'Mann–Whitney U',
  mood_median_test: "Mood’s median test",
  // Types fallbacks
  'one-sample': 'One-sample t-test',
  'one-sample-nonparam': 'Wilcoxon signed-rank',
  'two-sample-welch': 'Two-sample Welch t-test',
  'two-sample-nonparam': 'Two-sample nonparametric test',
  tost_type: 'Equivalence TOST',
};

export function testLabelFromCode(code) {
  if (!code) return '';
  const key = String(code);
  return LABELS[key] || key.replace(/_/g, ' ');
}

export function testLabelFromResult(result) {
  if (!result) return '';
  const code = result.test_used || result.type;
  return testLabelFromCode(code);
}

export default { testLabelFromCode, testLabelFromResult };
