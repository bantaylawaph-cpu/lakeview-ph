import React from 'react';
import ValuesTable from './ValuesTable';
import buildInterpretation from './interpretation';
import { fmt, sci } from './formatters';
import { testLabelFromResult, testLabelFromCode } from './utils/testLabels';
import { lakeName } from './utils/shared';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function ResultPanel({ result, paramCode, paramOptions, classCode, lakes, cl, lakeId, compareValue, stationId, showAllValues, setShowAllValues, showExactP, setShowExactP, onRunSuggested }) {
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
          {showExactP ? pvNum.toExponential(3) : '<0.001'}
          <button type="button" onClick={()=>setShowExactP(s=>!s)} title={label} aria-label={label} style={btnStyle}>
            {showExactP ? <FiEyeOff size={14} /> : <FiEye size={14} />}
          </button>
        </span>
      );
    }
    return sci(p);
  };

  const fmtYesNo = (b)=> b== null ? '' : (b ? 'Yes' : 'No');

  // Resolve lake names for two-sample displays
  const primaryLakeName = lakeName(lakes, lakeId) || (lakeId ? `Lake ${lakeId}` : 'Primary Lake');
  const compareLakeId = (compareValue && String(compareValue).startsWith('lake:')) ? Number(String(compareValue).split(':')[1]) : null;
  const secondaryLakeName = compareLakeId ? (lakeName(lakes, compareLakeId) || `Lake ${compareLakeId}`) : 'Comparison Lake';

  const testKind = (()=>{
    const t = (result.test_used || result.type || '').toLowerCase();
    if (t.includes('diagnostic_one')) return 'diagnostic_one';
    if (t.includes('diagnostic_two')) return 'diagnostic_two';
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

  // Resolve station label for display: prefer event station names when available,
  // otherwise use the selected `stationId` (skip if 'all').
  let stationLabelForGrid = null;
  if (stationId != null && String(stationId) !== '' && String(stationId) !== 'all') {
    try {
      const evs = Array.isArray(result?.events) ? result.events : [];
      const names = new Set(evs.map(e => e?.station?.name || e?.station_name).filter(Boolean));
      if (names.size === 1) stationLabelForGrid = Array.from(names)[0];
      else {
        const match = evs.find(e => String(e?.station?.id || e?.station_id || e?.station_name) === String(stationId));
        stationLabelForGrid = match ? (match?.station?.name || match?.station_name || String(stationId)) : String(stationId);
      }
    } catch (_) {
      stationLabelForGrid = String(stationId);
    }
  }
  if (stationLabelForGrid) push('Station', stationLabelForGrid);

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

  // Build a label/value for parameter guideline with operator hints by evaluation type
  const pushGuidelineIfPresent = (muLabelSource = null) => {
    const evalType = result.evaluation_type || result.evalType || null;
    const thrMin = result.threshold_min != null ? result.threshold_min : null;
    const thrMax = result.threshold_max != null ? result.threshold_max : null;
    const mu0 = muLabelSource != null ? muLabelSource : (result.mu0 != null ? result.mu0 : null);
    let value = null;
    if (evalType === 'min') {
      const v = mu0 != null ? mu0 : (thrMin != null ? thrMin : null);
      if (v != null) value = `≥ ${fmt(v)}`;
    } else if (evalType === 'max') {
      const v = mu0 != null ? mu0 : (thrMax != null ? thrMax : null);
      if (v != null) value = `≤ ${fmt(v)}`;
    } else if (evalType === 'range') {
      if (thrMin != null && thrMax != null) value = `[${fmt(thrMin)}, ${fmt(thrMax)}]`;
    } else {
      if (mu0 != null) value = fmt(mu0);
    }
    if (value != null) pushTip('Parameter Guideline', value, 'Guideline used for evaluation based on the selected standard.');
  };

  const twoSample = (('n1' in result) && ('n2' in result)) || (Array.isArray(result.sample1_values) && Array.isArray(result.sample2_values));

  if (testKind === 'diagnostic_one') {
    // One-sample diagnostic: Shapiro-Wilk
    const n = ('n' in result) ? result.n : (oneStats ? oneStats.n : null);
    if (n != null) pushTip('N', fmt(n), 'Number of values used in the test.');
    if ('W' in result) pushTip('W statistic', fmt(result.W), 'Test statistic for Shapiro–Wilk; closer to 1 suggests more normal.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing data this non-normal if data were normal.');
    if ('normal' in result) pushTip('Normal?', fmtYesNo(result.normal), '“Yes” if no non-normality detected at α.');
    addCommonAlpha();
  } else if (testKind === 'diagnostic_two') {
    // Two-sample diagnostic: Shapiro-Wilk + Levene
    const n1 = stats1 ? stats1.n : (Array.isArray(result.sample1_values) ? result.sample1_values.length : null);
    const n2 = stats2 ? stats2.n : (Array.isArray(result.sample2_values) ? result.sample2_values.length : null);
    if (n1 != null) pushTip(`N (${primaryLakeName})`, fmt(n1), `Number of values in ${primaryLakeName}.`);
    if (n2 != null) pushTip(`N (${secondaryLakeName})`, fmt(n2), `Number of values in ${secondaryLakeName}.`);
    // Normality
    if ('W1' in result) pushTip(`W (${primaryLakeName})`, fmt(result.W1), `Shapiro–Wilk statistic for ${primaryLakeName}; closer to 1 suggests more normal.`);
    if ('p1' in result) pushTip(`p-value (${primaryLakeName})`, renderP(result.p1), `Normality p-value for ${primaryLakeName}.`);
    if ('normal1' in result) pushTip(`Normal? (${primaryLakeName})`, fmtYesNo(result.normal1), `“Yes” if no non-normality detected at α for ${primaryLakeName}.`);
    if ('W2' in result) pushTip(`W (${secondaryLakeName})`, fmt(result.W2), `Shapiro–Wilk statistic for ${secondaryLakeName}; closer to 1 suggests more normal.`);
    if ('p2' in result) pushTip(`p-value (${secondaryLakeName})`, renderP(result.p2), `Normality p-value for ${secondaryLakeName}.`);
    if ('normal2' in result) pushTip(`Normal? (${secondaryLakeName})`, fmtYesNo(result.normal2), `“Yes” if no non-normality detected at α for ${secondaryLakeName}.`);
    // Variance
    if ('equal_variances' in result) pushTip('Variances equal?', fmtYesNo(result.equal_variances), '“Yes” if no variance difference detected at α.');
    if ('p_levene' in result) pushTip('Levene p-value', renderP(result.p_levene), 'Probability of seeing this variance difference if variances were equal.');
    addCommonAlpha();
  } else if (testKind === 'shapiro') {
    if (twoSample) {
      // Two-sample Shapiro: normality check for each group
      const n1 = stats1 ? stats1.n : (Array.isArray(result.sample1_values) ? result.sample1_values.length : null);
      const n2 = stats2 ? stats2.n : (Array.isArray(result.sample2_values) ? result.sample2_values.length : null);
      if (n1 != null) pushTip(`N (${primaryLakeName})`, fmt(n1), `Number of values in ${primaryLakeName}.`);
      if (n2 != null) pushTip(`N (${secondaryLakeName})`, fmt(n2), `Number of values in ${secondaryLakeName}.`);
      // Assume backend provides W1, p1 for group 1, W2, p2 for group 2, or similar
      if ('W1' in result) pushTip(`W (${primaryLakeName})`, fmt(result.W1), `Shapiro–Wilk statistic for ${primaryLakeName}; closer to 1 suggests more normal.`);
      if ('p1' in result) pushTip(`p-value (${primaryLakeName})`, renderP(result.p1), `Normality p-value for ${primaryLakeName}.`);
      if ('normal1' in result) pushTip(`Normal? (${primaryLakeName})`, fmtYesNo(result.normal1), `“Yes” if no non-normality detected at α for ${primaryLakeName}.`);
      if ('W2' in result) pushTip(`W (${secondaryLakeName})`, fmt(result.W2), `Shapiro–Wilk statistic for ${secondaryLakeName}; closer to 1 suggests more normal.`);
      if ('p2' in result) pushTip(`p-value (${secondaryLakeName})`, renderP(result.p2), `Normality p-value for ${secondaryLakeName}.`);
      if ('normal2' in result) pushTip(`Normal? (${secondaryLakeName})`, fmtYesNo(result.normal2), `“Yes” if no non-normality detected at α for ${secondaryLakeName}.`);
    } else {
      // One-sample Shapiro
      const n = ('n' in result) ? result.n : (oneStats ? oneStats.n : null);
      if (n != null) pushTip('N', fmt(n), 'Number of values used in the test.');
      if ('W' in result) pushTip('W statistic', fmt(result.W), 'Test statistic for Shapiro–Wilk; closer to 1 suggests more normal.');
      if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing data this non-normal if data were normal.');
      if ('normal' in result) pushTip('Normal?', fmtYesNo(result.normal), '“Yes” if no non-normality detected at α.');
    }
    addCommonAlpha();
  } else if (testKind === 'levene') {
    // N per lake
    const n1 = stats1 ? stats1.n : (Array.isArray(result.sample1_values) ? result.sample1_values.length : null);
    const n2 = stats2 ? stats2.n : (Array.isArray(result.sample2_values) ? result.sample2_values.length : null);
    if (n1 != null) pushTip(`N (${primaryLakeName})`, fmt(n1), `Number of values in ${primaryLakeName}.`);
    if (n2 != null) pushTip(`N (${secondaryLakeName})`, fmt(n2), `Number of values in ${secondaryLakeName}.`);
    if ('equal_variances' in result) pushTip('Variances equal?', fmtYesNo(result.equal_variances), '“Yes” if no variance difference detected at α.');
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing this variance difference if variances were equal.');
    // For two groups, show their variances if available
    const var1 = ('var1' in result) ? result.var1 : (Array.isArray(result.group_variances) && result.group_variances.length===2 ? result.group_variances[0] : null);
    const var2 = ('var2' in result) ? result.var2 : (Array.isArray(result.group_variances) && result.group_variances.length===2 ? result.group_variances[1] : null);
    if (var1 != null) pushTip(`Variance (${primaryLakeName})`, fmt(var1), `Estimated variance in ${primaryLakeName}.`);
    if (var2 != null) pushTip(`Variance (${secondaryLakeName})`, fmt(var2), `Estimated variance in ${secondaryLakeName}.`);
    addCommonAlpha();
  } else if (testKind === 't_one') {
    const n = ('n' in result) ? result.n : (oneStats ? oneStats.n : null);
    const meanVal = ('mean' in result) ? result.mean : (oneStats ? oneStats.mean : null);
    const sdVal = ('sd' in result) ? result.sd : (oneStats ? oneStats.sd : null);
    if (n != null) pushTip('N', fmt(n), 'Number of values used.');
    if (meanVal != null) pushTip('Sample mean', fmt(meanVal), 'Average of your sample.');
    if (sdVal != null) pushTip('Standard deviation', fmt(sdVal), 'Variability around the mean.');
    // Parameter guideline replacing threshold label
    pushGuidelineIfPresent(result.mu0);
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing a mean this far from μ0 if there were no real difference.');
    // Alternative hypothesis (direction)
    try {
      const altRaw = (result.alternative != null ? result.alternative : result.alt);
      const altNorm = (typeof altRaw === 'string' && altRaw.trim()) ? altRaw.trim().toLowerCase().replace('_','-') : 'two-sided';
      const altPretty = (altNorm === 'two sided') ? 'two-sided' : altNorm;
      const tipAlt = 'Direction of the hypothesis: greater (> guideline), less (< guideline), two-sided (≠ guideline).';
      pushTip('Alternative', altPretty, tipAlt);
    } catch {}
    addCommonAlpha();
  } else if (testKind === 't_two') {
    const n1 = ('n1' in result) ? result.n1 : (stats1 ? stats1.n : null);
    const n2 = ('n2' in result) ? result.n2 : (stats2 ? stats2.n : null);
    const m1 = ('mean1' in result) ? result.mean1 : (stats1 ? stats1.mean : null);
    const m2 = ('mean2' in result) ? result.mean2 : (stats2 ? stats2.mean : null);
    if (n1 != null) pushTip(`N (${primaryLakeName})`, fmt(n1), `Number of values in ${primaryLakeName}.`);
    if (n2 != null) pushTip(`N (${secondaryLakeName})`, fmt(n2), `Number of values in ${secondaryLakeName}.`);
    if (m1 != null) pushTip(`Mean (${primaryLakeName})`, fmt(m1), `Average in ${primaryLakeName}.`);
    if (m2 != null) pushTip(`Mean (${secondaryLakeName})`, fmt(m2), `Average in ${secondaryLakeName}.`);
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing a difference this large if the true means were equal.');
    addCommonAlpha();
  } else if (testKind === 'wilcoxon_one') {
    const n = ('n' in result) ? result.n : (oneStats ? oneStats.n : null);
    const med = ('median' in result) ? result.median : (oneStats ? oneStats.median : null);
    if (n != null) pushTip('N (effective)', fmt(n), 'Number of non-zero differences used in the test.');
    if (med != null) pushTip('Sample median', fmt(med), 'Middle value of your sample.');
    // Parameter guideline replacing threshold label
    pushGuidelineIfPresent(result.mu0);
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing ranks this extreme if the true median were μ0.');
    // Alternative hypothesis (direction)
    try {
      const altRaw = (result.alternative != null ? result.alternative : result.alt);
      const altNorm = (typeof altRaw === 'string' && altRaw.trim()) ? altRaw.trim().toLowerCase().replace('_','-') : 'two-sided';
      const altPretty = (altNorm === 'two sided') ? 'two-sided' : altNorm;
      const tipAlt = 'Direction of the hypothesis: greater (> guideline), less (< guideline), two-sided (≠ guideline).';
      pushTip('Alternative', altPretty, tipAlt);
    } catch {}
    addCommonAlpha();
  } else if (testKind === 'sign') {
    if ('n' in result) pushTip('N (effective)', fmt(result.n), 'Number of values not exactly equal to the threshold.');
    if ('k_positive' in result) pushTip('Above threshold', fmt(result.k_positive), 'Count of values above the threshold.');
    if ('k_negative' in result) pushTip('Below threshold', fmt(result.k_negative), 'Count of values below the threshold.');
    const med = ('median' in result) ? result.median : (oneStats ? oneStats.median : null);
    if (med != null) pushTip('Sample median', fmt(med), 'Middle value of your sample.');
    // Parameter guideline replacing threshold label
    pushGuidelineIfPresent(result.mu0);
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of this split if the true median were μ0.');
    // Alternative hypothesis (direction)
    try {
      const altRaw = (result.alternative != null ? result.alternative : result.alt);
      const altNorm = (typeof altRaw === 'string' && altRaw.trim()) ? altRaw.trim().toLowerCase().replace('_','-') : 'two-sided';
      const altPretty = (altNorm === 'two sided') ? 'two-sided' : altNorm;
      const tipAlt = 'Direction of the hypothesis: greater (> guideline), less (< guideline), two-sided (≠ guideline).';
      pushTip('Alternative', altPretty, tipAlt);
    } catch {}
    addCommonAlpha();
  } else if (testKind === 'mannwhitney') {
    const n1 = ('n1' in result) ? result.n1 : (stats1 ? stats1.n : null);
    const n2 = ('n2' in result) ? result.n2 : (stats2 ? stats2.n : null);
    const med1 = ('median1' in result) ? result.median1 : (stats1 ? stats1.median : null);
    const med2 = ('median2' in result) ? result.median2 : (stats2 ? stats2.median : null);
    if (n1 != null) pushTip(`N (${primaryLakeName})`, fmt(n1), `Number of values in ${primaryLakeName}.`);
    if (n2 != null) pushTip(`N (${secondaryLakeName})`, fmt(n2), `Number of values in ${secondaryLakeName}.`);
    if (med1 != null) pushTip(`Median (${primaryLakeName})`, fmt(med1), `Median in ${primaryLakeName}.`);
    if (med2 != null) pushTip(`Median (${secondaryLakeName})`, fmt(med2), `Median in ${secondaryLakeName}.`);
    if ('p_value' in result) pushTip('p-value', renderP(result.p_value), 'Probability of seeing rank differences this large if the two populations were the same.');
    addCommonAlpha();
  } else if (testKind === 'mood_median') {
    const n1 = stats1 ? stats1.n : (Array.isArray(result.sample1_values) ? result.sample1_values.length : null);
    const n2 = stats2 ? stats2.n : (Array.isArray(result.sample2_values) ? result.sample2_values.length : null);
    const med1 = stats1 ? stats1.median : null;
    const med2 = stats2 ? stats2.median : null;
    if (n1 != null) pushTip(`N (${primaryLakeName})`, fmt(n1), `Number of values in ${primaryLakeName}.`);
    if (n2 != null) pushTip(`N (${secondaryLakeName})`, fmt(n2), `Number of values in ${secondaryLakeName}.`);
    if (med1 != null) pushTip(`Median (${primaryLakeName})`, fmt(med1), `Median in ${primaryLakeName}.`);
    if (med2 != null) pushTip(`Median (${secondaryLakeName})`, fmt(med2), `Median in ${secondaryLakeName}.`);
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

  const finalInterpretation = buildInterpretation({ result, paramCode, paramOptions, classCode, lakes, cl, fmt, sci, lakeId, compareValue, stationId });
  // finalInterpretation may be a string or an object { text, suggestedTests }
  const interpObj = (finalInterpretation && typeof finalInterpretation === 'object') ? finalInterpretation : { text: finalInterpretation, suggestedTests: null };
  const ciLine = (r) => (r.ci_lower != null && r.ci_upper != null ? <div>CI ({Math.round((r.ci_level||0)*100)}%): [{fmt(r.ci_lower)}, {fmt(r.ci_upper)}]</div> : null);

  // Add universal summary lines: p vs alpha and statistical decision
  try {
    const alpha = (result.alpha != null && Number.isFinite(Number(result.alpha))) ? Number(result.alpha) : null;
    // Determine which p-value to use for comparison/decision
    let pForDecision = null;
    let pDisplayStr = null;
    let decisionContext = 'standard'; // 'standard' significance or 'tost' equivalence
    if (typeof result.p_value !== 'undefined' && result.p_value !== null) {
      const pv = Number(result.p_value);
      if (Number.isFinite(pv)) {
        pForDecision = pv;
        pDisplayStr = pv < 0.001 ? '<0.001' : sci(pv);
      } else if (alpha != null && typeof result.p_value === 'string') {
        // Handle strings like "<0.001" conservatively
        const m = result.p_value.trim().match(/^<\s*([0-9]*\.?[0-9]+)/);
        if (m) {
          const thr = Number(m[1]);
          if (Number.isFinite(thr) && thr <= alpha) {
            // Safe to conclude p < α even without the exact value
            pForDecision = alpha - Number.EPSILON; // sentinel just below α
            pDisplayStr = `<${fmt(thr)}`;
          }
        }
      }
    } else if (testKind === 'tost_t' || testKind === 'tost_wilcoxon') {
      // Prefer consolidated TOST p-value when available
      let pTOST = null;
      if (result.pTOST != null && Number.isFinite(Number(result.pTOST))) {
        pTOST = Number(result.pTOST);
      } else if (result.p1 != null && result.p2 != null) {
        const p1 = Number(result.p1), p2 = Number(result.p2);
        if (Number.isFinite(p1) && Number.isFinite(p2)) pTOST = Math.max(p1, p2);
      } else if (result.p_lower != null && result.p_upper != null) {
        const pl = Number(result.p_lower), pu = Number(result.p_upper);
        if (Number.isFinite(pl) && Number.isFinite(pu)) pTOST = Math.max(pl, pu);
      }
      if (pTOST != null) {
        pForDecision = pTOST;
        pDisplayStr = pTOST < 0.001 ? '<0.001' : sci(pTOST);
        decisionContext = 'tost';
      }
    }

    // p vs alpha comparison row
    if (alpha != null && pForDecision != null) {
      const symbol = pForDecision < alpha ? '<' : '≥';
      const label = decisionContext === 'tost' ? 'Equivalence (p vs α)' : 'Significance (p vs α)';
      const tip = decisionContext === 'tost'
        ? 'Compares the TOST p-value against α for equivalence.'
        : 'Compares the test p-value against α for significance.';
      const pShown = pDisplayStr ?? ((Number.isFinite(pForDecision) && pForDecision < 0.001) ? '<0.001' : sci(pForDecision));
      pushTip(label, `p ${symbol} α (${pShown} vs ${fmt(alpha)})`, tip);
    }

    // Statistical decision row
    let decision = null;
    let decisionTip = null;
    if (decisionContext === 'tost') {
      if (alpha != null && pForDecision != null) {
        const eq = pForDecision < alpha;
        decision = eq ? 'Conclude Equivalent (reject H0 of non-equivalence)' : 'Not Equivalent (fail to reject H0)';
        decisionTip = 'TOST decision based on pTOST < α.';
      } else if (typeof result.equivalent === 'boolean') {
        decision = result.equivalent ? 'Conclude Equivalent' : 'Not Equivalent';
        decisionTip = 'Reported by the test as overall equivalence.';
      }
    } else {
      if (typeof result.significant === 'boolean') {
        decision = result.significant ? 'Reject H0' : 'Fail to Reject H0';
        decisionTip = 'Reported by the test at the chosen α.';
      } else if (alpha != null && pForDecision != null) {
        decision = pForDecision < alpha ? 'Reject H0' : 'Fail to Reject H0';
        decisionTip = 'Decision derived from p-value compared with α.';
      }
    }
    if (decision) pushTip('Statistical Decision', decision, decisionTip);
  } catch (_) {
    // No-op: keep panel robust even if fields are missing
  }

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
        <div style={{ marginTop:6 }}>{interpObj.text}</div>
        {(String(stationId) === 'all' && ['t_one','wilcoxon_one','sign','tost_t','tost_wilcoxon'].includes(testKind)) ? (
          <div style={{ marginTop:8, fontSize:12, color:'#ddd' }}>
            <strong>Note:</strong> All measurements are treated as separate observations. For detailed assessment of specific sites, run the test per station.
          </div>
        ) : null}
        {(String(compareValue || '').startsWith('lake:') && ['t_two','mannwhitney','mood_median'].includes(testKind)) ? (
          <div style={{ marginTop:8, fontSize:12, color:'#ddd' }}>
            <strong>Disclaimer:</strong> This test pools all stations and sampling dates per lake; results are exploratory and not a substitute for station-level or regulatory compliance assessments.
          </div>
        ) : null}
        {/* Warn when sample size imbalance is large (e.g., >= 4x) */}
        {twoSample ? (()=>{
          const n1 = stats1 ? stats1.n : (Array.isArray(result.sample1_values) ? result.sample1_values.length : null);
          const n2 = stats2 ? stats2.n : (Array.isArray(result.sample2_values) ? result.sample2_values.length : null);
          if (n1 != null && n2 != null && n1 > 0 && n2 > 0) {
            const hi = Math.max(n1,n2); const lo = Math.min(n1,n2);
            if (hi / lo >= 4) {
              const primaryLabel = `${primaryLakeName} (N=${n1})`;
              const secondaryLabel = `${secondaryLakeName} (N=${n2})`;
              return (
                <div style={{ marginTop:8, fontSize:12, color:'#ffcf6a' }}>
                  <strong>Warning:</strong> Sample sizes differ substantially — {primaryLabel} vs {secondaryLabel}. Results may be sensitive to these differences; interpret the statistical conclusions cautiously and consider tests robust to unequal sample sizes or stratified analyses.
                </div>
              );
            }
          }
          return null;
        })() : null}
        {Array.isArray(interpObj.suggestedTests) && interpObj.suggestedTests.length ? (
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:13, marginBottom:6 }}>Suggested Test/s:</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {interpObj.suggestedTests.map((code)=> (
                <button
                  key={code}
                  type="button"
                  onClick={()=>onRunSuggested && onRunSuggested(code)}
                  style={{
                    padding: 0,
                    margin: 0,
                    border: 'none',
                    background: 'transparent',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    color: 'inherit',
                    fontSize: 13,
                    lineHeight: '20px'
                  }}
                >
                  {testLabelFromCode(code)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <ValuesTable result={result} lakes={lakes} lakeId={lakeId} compareValue={compareValue} showAllValues={showAllValues} setShowAllValues={setShowAllValues} fmt={fmt} />
    </div>
  );
}
