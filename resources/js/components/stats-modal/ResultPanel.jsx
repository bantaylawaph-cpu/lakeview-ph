import React from 'react';
import ValuesTable from './ValuesTable';
import buildInterpretation from './interpretation';
import { fmt, sci } from './formatters';
import { testLabelFromResult } from './utils/testLabels';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function ResultPanel({ result, paramCode, paramOptions, classCode, lakes, cl, lakeId, compareValue, showAllValues, setShowAllValues, showExactP, setShowExactP }) {
  if (!result) return null;

  const gridItems = [];
  const push = (k,v)=>gridItems.push({k,v});
  const pushTip = (k, v, tip)=>gridItems.push({k,v,tip});

  const renderP = (p) => {
    const pvNum = Number(p);
    const btnStyle = { marginLeft:6, padding:'2px 6px', fontSize:12, lineHeight:'14px', border:'none', background:'transparent', color:'inherit', cursor:'pointer', display:'inline-flex', alignItems:'center' };
    const label = showExactP ? 'Hide exact p-value' : 'Show exact p-value';
    if (Number.isFinite(pvNum) && pvNum < 0.001) {
      return (
        <span>
          {showExactP ? sci(pvNum) : '<0.001'}
          <button type="button" onClick={()=>setShowExactP(s=>!s)} title={label} aria-label={label} style={btnStyle}>
            {showExactP ? <FiEyeOff size={14} /> : <FiEye size={14} />}
          </button>
        </span>
      );
    }
    return sci(p);
  };

  const fmtYesNo = (b)=> b== null ? '' : (b ? 'Yes' : 'No');

  const testKind = (()=>{
    const t = (result.test_used || result.type || '').toLowerCase();
    if (t.includes('shapiro')) return 'shapiro';
    if (t.includes('levene')) return 'levene';
    if (t === 'tost' || t.includes('tost_t') || (('p1' in result) && ('p2' in result))) return 'tost_t';
    if (t.includes('tost_wilcoxon') || t.includes('wilcoxon-tost') || ('p_lower' in result && 'p_upper' in result)) return 'tost_wilcoxon';
    if ('U' in result || 'u' in result) return 'mannwhitney';
    if ('chi2' in result && 'table' in result) return 'mood_median';
    if ('k_positive' in result || 'k_negative' in result) return 'sign';
    if ('W' in result && ('normal' in result)) return 'shapiro';
    if ('F' in result && ('equal_variances' in result)) return 'levene';
    if (('t' in result) && ('df' in result) && ('n1' in result || 'n2' in result)) return 't_two';
    if (('t' in result) && ('df' in result)) return 't_one';
    if (('statistic' in result) && !('U' in result) && !('chi2' in result) && !('p_lower' in result)) return 'wilcoxon_one';
    return 'generic';
  })();

  const testLabel = testLabelFromResult(result) || result.test_used || result.type;
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

  // Build minimal, user-focused fields per test
  const addCommonAlpha = () => {
    if (result.alpha != null) pushTip('Alpha (α)', fmt(result.alpha), 'Your significance cutoff for deciding.');
  };

  if (testKind === 'shapiro') {
    const n = ('n' in result) ? result.n : (oneStats ? oneStats.n : null);
    if (n != null) pushTip('N', fmt(n), 'Number of values used in the test.');
    if ('W' in result) pushTip('W statistic', fmt(result.W), 'Test statistic for Shapiro–Wilk; closer to 1 suggests more normal.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing data this non-normal if data were normal.');
    if ('normal' in result) pushTip('Normal?', fmtYesNo(result.normal), '“Yes” if no non-normality detected at α.');
    addCommonAlpha();
  } else if (testKind === 'levene') {
    if ('n_total' in result) pushTip('Total N', fmt(result.n_total), 'Total number of observations across groups.');
    if ('k' in result) pushTip('Groups', fmt(result.k), 'Number of groups compared.');
    if ('equal_variances' in result) pushTip('Variances equal?', fmtYesNo(result.equal_variances), '“Yes” if no variance difference detected at α.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing this variance difference if variances were equal.');
    // For two groups, show their variances if available
    const var1 = ('var1' in result) ? result.var1 : (Array.isArray(result.group_variances) && result.group_variances.length===2 ? result.group_variances[0] : null);
    const var2 = ('var2' in result) ? result.var2 : (Array.isArray(result.group_variances) && result.group_variances.length===2 ? result.group_variances[1] : null);
    if (var1 != null && var2 != null) {
      pushTip('Variance (Lake 1)', fmt(var1), 'Estimated variance in group 1.');
      pushTip('Variance (Lake 2)', fmt(var2), 'Estimated variance in group 2.');
    }
    addCommonAlpha();
  } else if (testKind === 't_one') {
    const n = ('n' in result) ? result.n : (oneStats ? oneStats.n : null);
    const meanVal = ('mean' in result) ? result.mean : (oneStats ? oneStats.mean : null);
    const sdVal = ('sd' in result) ? result.sd : (oneStats ? oneStats.sd : null);
    if (n != null) pushTip('N', fmt(n), 'Number of values used.');
    if (meanVal != null) pushTip('Sample mean', fmt(meanVal), 'Average of your sample.');
    if (sdVal != null) pushTip('Standard deviation', fmt(sdVal), 'Variability around the mean.');
    if ('mu0' in result) pushTip('Threshold (μ0)', fmt(result.mu0), 'The standard/target value you’re testing against.');
    if (meanVal != null && 'mu0' in result) pushTip('Difference (mean − μ0)', fmt(meanVal - result.mu0), 'How far the mean is from the threshold.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing a mean this far from μ0 if there were no real difference.');
    addCommonAlpha();
  } else if (testKind === 't_two') {
    const n1 = ('n1' in result) ? result.n1 : (stats1 ? stats1.n : null);
    const n2 = ('n2' in result) ? result.n2 : (stats2 ? stats2.n : null);
    const m1 = ('mean1' in result) ? result.mean1 : (stats1 ? stats1.mean : null);
    const m2 = ('mean2' in result) ? result.mean2 : (stats2 ? stats2.mean : null);
    if (n1 != null) pushTip('N (Lake 1)', fmt(n1), 'Number of values in Lake 1.');
    if (n2 != null) pushTip('N (Lake 2)', fmt(n2), 'Number of values in Lake 2.');
    if (m1 != null) pushTip('Mean (Lake 1)', fmt(m1), 'Average in Lake 1.');
    if (m2 != null) pushTip('Mean (Lake 2)', fmt(m2), 'Average in Lake 2.');
    if (m1 != null && m2 != null) pushTip('Difference (L1 − L2)', fmt(m1 - m2), 'Mean difference between the two groups.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing a difference this large if the true means were equal.');
    addCommonAlpha();
  } else if (testKind === 'wilcoxon_one') {
    const n = ('n' in result) ? result.n : (oneStats ? oneStats.n : null);
    const med = ('median' in result) ? result.median : (oneStats ? oneStats.median : null);
    if (n != null) pushTip('N (effective)', fmt(n), 'Number of non-zero differences used in the test.');
    if (med != null) pushTip('Sample median', fmt(med), 'Middle value of your sample.');
    if ('mu0' in result) pushTip('Threshold (μ0)', fmt(result.mu0), 'The standard/target value you’re testing against.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing ranks this extreme if the true median were μ0.');
    addCommonAlpha();
  } else if (testKind === 'sign') {
    if ('n' in result) pushTip('N (effective)', fmt(result.n), 'Number of values not exactly equal to the threshold.');
    if ('k_positive' in result) pushTip('Above threshold', fmt(result.k_positive), 'Count of values above the threshold.');
    if ('k_negative' in result) pushTip('Below threshold', fmt(result.k_negative), 'Count of values below the threshold.');
    const med = ('median' in result) ? result.median : (oneStats ? oneStats.median : null);
    if (med != null) pushTip('Sample median', fmt(med), 'Middle value of your sample.');
    if ('mu0' in result) pushTip('Threshold (μ0)', fmt(result.mu0), 'The standard/target value you’re testing against.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of this split if the true median were μ0.');
    addCommonAlpha();
  } else if (testKind === 'mannwhitney') {
    const n1 = ('n1' in result) ? result.n1 : (stats1 ? stats1.n : null);
    const n2 = ('n2' in result) ? result.n2 : (stats2 ? stats2.n : null);
    const med1 = ('median1' in result) ? result.median1 : (stats1 ? stats1.median : null);
    const med2 = ('median2' in result) ? result.median2 : (stats2 ? stats2.median : null);
    if (n1 != null) pushTip('N (Lake 1)', fmt(n1), 'Number of values in Lake 1.');
    if (n2 != null) pushTip('N (Lake 2)', fmt(n2), 'Number of values in Lake 2.');
    if (med1 != null) pushTip('Median (Lake 1)', fmt(med1), 'Median in Lake 1.');
    if (med2 != null) pushTip('Median (Lake 2)', fmt(med2), 'Median in Lake 2.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing rank differences this large if the two populations were the same.');
    addCommonAlpha();
  } else if (testKind === 'mood_median') {
    const n1 = stats1 ? stats1.n : (Array.isArray(result.sample1_values) ? result.sample1_values.length : null);
    const n2 = stats2 ? stats2.n : (Array.isArray(result.sample2_values) ? result.sample2_values.length : null);
    const med1 = stats1 ? stats1.median : null;
    const med2 = stats2 ? stats2.median : null;
    if (n1 != null) pushTip('N (Lake 1)', fmt(n1), 'Number of values in Lake 1.');
    if (n2 != null) pushTip('N (Lake 2)', fmt(n2), 'Number of values in Lake 2.');
    if (med1 != null) pushTip('Median (Lake 1)', fmt(med1), 'Median in Lake 1.');
    if (med2 != null) pushTip('Median (Lake 2)', fmt(med2), 'Median in Lake 2.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of this median split if the two populations had the same median.');
    addCommonAlpha();
  } else if (testKind === 'tost_t') {
    const n = ('n' in result) ? result.n : (oneStats ? oneStats.n : null);
    const meanVal = ('mean' in result) ? result.mean : (oneStats ? oneStats.mean : null);
    const lower = (result.threshold_min != null) ? result.threshold_min : (result.lower != null ? result.lower : null);
    const upper = (result.threshold_max != null) ? result.threshold_max : (result.upper != null ? result.upper : null);
    const pTOST = ('pTOST' in result) ? result.pTOST : (('p1' in result && 'p2' in result) ? Math.max(Number(result.p1), Number(result.p2)) : null);
    if (n != null) pushTip('N', fmt(n), 'Number of values used.');
    if (meanVal != null) pushTip('Sample mean', fmt(meanVal), 'Average of your sample.');
    if (lower != null && upper != null) pushTip('Acceptable range', `[${fmt(lower)}, ${fmt(upper)}]`, 'Range of differences considered “practically the same.”');
    if (pTOST != null) pushTip('TOST p-value', renderP(pTOST), 'Single p-value for equivalence; must be < α to conclude equivalence.');
    if ('equivalent' in result) pushTip('Equivalent?', fmtYesNo(result.equivalent), '“Yes” if TOST p-value is below α for both bounds.');
    addCommonAlpha();
  } else if (testKind === 'tost_wilcoxon') {
    const n = ('n' in result) ? result.n : (oneStats ? oneStats.n : null);
    const med = ('median' in result) ? result.median : (oneStats ? oneStats.median : null);
    const lower = (result.lower != null) ? result.lower : (result.threshold_min != null ? result.threshold_min : null);
    const upper = (result.upper != null) ? result.upper : (result.threshold_max != null ? result.threshold_max : null);
    const pTOST = ('pTOST' in result) ? result.pTOST : (('p_lower' in result && 'p_upper' in result) ? Math.max(Number(result.p_lower), Number(result.p_upper)) : null);
    if (n != null) pushTip('N (raw)', fmt(n), 'Total number of values.');
    if (med != null) pushTip('Sample median', fmt(med), 'Middle value of your sample.');
    if (lower != null && upper != null) pushTip('Acceptable range', `[${fmt(lower)}, ${fmt(upper)}]`, 'Range of differences considered “practically the same.”');
    if (pTOST != null) pushTip('TOST p-value', renderP(pTOST), 'Single p-value for equivalence; must be < α to conclude equivalence.');
    if ('equivalent' in result) pushTip('Equivalent?', fmtYesNo(result.equivalent), '“Yes” if TOST p-value is below α for both bounds.');
    addCommonAlpha();
  } else {
    // Generic fallback: show p-value and alpha only to avoid overwhelming
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Primary significance measure for this test.');
    addCommonAlpha();
  }

  const finalInterpretation = buildInterpretation({ result, paramCode, paramOptions, classCode, lakes, cl, fmt, sci, lakeId, compareValue });
  const ciLine = (r) => (r.ci_lower != null && r.ci_upper != null ? <div>CI ({Math.round((r.ci_level||0)*100)}%): [{fmt(r.ci_lower)}, {fmt(r.ci_upper)}]</div> : null);

  return (
    <div className="stat-box">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:8 }}>
        {gridItems.map((it,i)=>(
          <React.Fragment key={i}>
            <div style={{ fontSize:12, opacity:0.85, padding:6, borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{it.k}</div>
            <div style={{ fontSize:13, padding:6, borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{(typeof it.v === 'string' || typeof it.v === 'number') ? String(it.v) : it.v}</div>
            <div style={{ fontSize:12, opacity:0.8, padding:6, borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{(typeof it.tip === 'string' || typeof it.tip === 'number') ? (it.tip ? String(it.tip) : '') : (it.tip || '')}</div>
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
