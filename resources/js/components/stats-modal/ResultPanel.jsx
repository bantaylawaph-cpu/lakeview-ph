import React from 'react';
import ValuesTable from './ValuesTable';
import buildInterpretation from './interpretation';
import { fmt, sci } from './formatters';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function ResultPanel({ result, paramCode, paramOptions, classCode, staticThresholds, lakes, cl, lakeId, compareValue, showAllValues, setShowAllValues, showExactP, setShowExactP }) {
  if (!result) return null;

  const gridItems = [];
  const push = (k,v)=>gridItems.push({k,v});

  const labelMap = {
    'one-sample':'One-sample t-test',
    'one-sample-nonparam':'Wilcoxon signed-rank',
    'two-sample-welch':'Two-sample Welch t-test',
    'two-sample-nonparam':'Mann-Whitney U test',
    'tost':'Equivalence TOST',
    't_one_sample':'One-sample t-test',
    'wilcoxon_signed_rank':'Wilcoxon signed-rank',
    'sign_test':'Sign test',
    't_student':'Student t-test (equal var)',
    't_welch':'Welch t-test (unequal var)',
    'mann_whitney':'Mann–Whitney U',
    'mood_median_test':'Mood’s median test',
    'shapiro_wilk':'Shapiro–Wilk normality test'
  };
  const testLabel = labelMap[result.test_used] || labelMap[result.type] || result.test_used || result.type;
  push('Test Selected', testLabel);

  const basicStats = (arr) => {
    if (!Array.isArray(arr)) return null;
    const xs = arr.map(Number).filter(Number.isFinite);
    const n = xs.length; if (!n) return null;
    const mean = xs.reduce((a,b)=>a+b,0)/n;
    const sorted = xs.slice().sort((a,b)=>a-b);
    const mid = Math.floor(n/2); const median = n%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
    const sd = n>1?Math.sqrt(xs.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(n-1)):0;
    return { n, mean, median, sd };
  };

  const one = Array.isArray(result.sample_values) ? result.sample_values : null;
  const two1 = Array.isArray(result.sample1_values) ? result.sample1_values : null;
  const two2 = Array.isArray(result.sample2_values) ? result.sample2_values : null;
  const oneStats = one ? basicStats(one) : null;
  const stats1 = two1 ? basicStats(two1) : null;
  const stats2 = two2 ? basicStats(two2) : null;

  if ('n' in result) push('N', fmt(result.n || result.sample_n)); else if (oneStats) push('N', fmt(oneStats.n));
  if ('n1' in result) push('N1', fmt(result.n1 || result.sample1_n)); else if (stats1) push('N1', fmt(stats1.n));
  if ('n2' in result) push('N2', fmt(result.n2 || result.sample2_n)); else if (stats2) push('N2', fmt(stats2.n));
  if ('mean' in result) push('Mean', fmt(result.mean)); else if (oneStats) push('Mean', fmt(oneStats.mean));
  if ('median' in result) push('Median', fmt(result.median)); else if (oneStats) push('Median', fmt(oneStats.median));
  if ('mean1' in result) push('Mean (Lake 1)', fmt(result.mean1)); else if (stats1) push('Mean (Lake 1)', fmt(stats1.mean));
  if ('median1' in result) push('Median (Lake 1)', fmt(result.median1)); else if (stats1) push('Median (Lake 1)', fmt(stats1.median));
  if ('mean2' in result) push('Mean (Lake 2)', fmt(result.mean2)); else if (stats2) push('Mean (Lake 2)', fmt(stats2.mean));
  if ('median2' in result) push('Median (Lake 2)', fmt(result.median2)); else if (stats2) push('Median (Lake 2)', fmt(stats2.median));
  if ('sd' in result) push('SD', fmt(result.sd)); else if (oneStats) push('SD', fmt(oneStats.sd));
  if ('W' in result) push('W', fmt(result.W));
  if ('sd1' in result) push('SD (Lake 1)', fmt(result.sd1)); else if (stats1) push('SD (Lake 1)', fmt(stats1.sd));
  if ('sd2' in result) push('SD (Lake 2)', fmt(result.sd2)); else if (stats2) push('SD (Lake 2)', fmt(stats2.sd));
  if ('t' in result) push('t statistic', fmt(result.t));
  if ('U' in result) push('U', fmt(result.U));
  if ('z' in result) push('z', fmt(result.z));
  if ('df' in result) push('Degrees Freedom', fmt(result.df));
  if ('statistic' in result) push('Statistic', fmt(result.statistic));
  if ('chi2' in result) push('Chi-square', fmt(result.chi2));
  if ('k_positive' in result) push('Positives', fmt(result.k_positive));
  if ('k_negative' in result) push('Negatives', fmt(result.k_negative));
  if (!('statistic' in result)) {
    if ('Wplus' in result) push('W+', fmt(result.Wplus));
    if ('Wminus' in result) push('W-', fmt(result.Wminus));
  }
  if (result.test_used === 'tost' || result.type === 'tost') {
    if ('t1' in result) push('t1 (lower)', fmt(result.t1));
    if ('p1' in result) push('p1 (H0: mean ≤ lower)', sci(result.p1));
    if ('t2' in result) push('t2 (upper)', fmt(result.t2));
    if ('p2' in result) push('p2 (H0: mean ≥ upper)', sci(result.p2));
    if ('equivalent' in result) push('Equivalent?', result.equivalent ? 'Yes' : 'No');
  }
  if ('p_value' in result) {
    const pvNum = Number(result.p_value);
    if (Number.isFinite(pvNum) && pvNum < 0.001) {
      const btnStyle = { marginLeft:6, padding:'2px 6px', fontSize:12, lineHeight:'14px', border:'none', background:'transparent', color:'inherit', cursor:'pointer', display:'inline-flex', alignItems:'center' };
      const label = showExactP ? 'Hide exact p-value' : 'Show exact p-value';
      push('p-value', (
        <span>
          {showExactP ? sci(pvNum) : '<0.001'}
          <button type="button" onClick={()=>setShowExactP(s=>!s)} title={label} aria-label={label} style={btnStyle}>
            {showExactP ? <FiEyeOff size={14} /> : <FiEye size={14} />}
          </button>
        </span>
      ));
    } else {
      push('p-value', sci(result.p_value));
    }
  }
  if ('mu0' in result) push('Threshold (μ0)', fmt(result.mu0));
  if (result.threshold_min != null) push('Threshold Min', fmt(result.threshold_min));
  if (result.threshold_max != null) push('Threshold Max', fmt(result.threshold_max));
  if (result.standard_code) push('Standard', result.standard_code);
  if (result.class_code_used) push('Class Used', result.class_code_used);
  if (result.standard_fallback) push('Std Fallback', 'Yes');
  if (result.class_fallback) push('Class Fallback', 'Yes');

  const finalInterpretation = buildInterpretation({ result, paramCode, paramOptions, classCode, staticThresholds, lakes, cl, fmt, sci, lakeId, compareValue });
  const ciLine = (r) => (r.ci_lower != null && r.ci_upper != null ? <div>CI ({Math.round((r.ci_level||0)*100)}%): [{fmt(r.ci_lower)}, {fmt(r.ci_upper)}]</div> : null);

  return (
    <div className="stat-box">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
        {gridItems.map((it,i)=>(
          <React.Fragment key={i}>
            <div style={{ fontSize:12, opacity:0.85, padding:6, borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{it.k}</div>
            <div style={{ fontSize:13, padding:6, borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{(typeof it.v === 'string' || typeof it.v === 'number') ? String(it.v) : it.v}</div>
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
      <ValuesTable result={result} lakes={lakes} lakeId={lakeId} compareValue={compareValue} showAllValues={showAllValues} setShowAllValues={setShowAllValues} fmt={fmt} />
    </div>
  );
}
