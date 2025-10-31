// Minimal utility to open a print window with provided HTML
export function openPrintWindow(html, title = 'Export') {
  const w = window.open('', '_blank');
  if (!w) throw new Error('Popup blocked');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch(e) {} }, 250);
  return w;
}

// Helper to inject a <style> before printing
export function openPrintWindowWithStyle({ title = 'Export', css = '', bodyHtml = '' }) {
  const w = window.open('', '_blank');
  if (!w) throw new Error('Popup blocked');
  w.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"><title>${title}</title><style>${css}</style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch(e) {} }, 250);
  return w;
}

// Build AdvancedStat report HTML (mirrors ResultPanel grid, without Notes column)
import { fmt, sci } from '../formatters';
import { lakeName } from './shared';
import { testLabelFromResult, testLabelFromCode } from './testLabels';
import { buildInterpretation } from '../interpretation';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtPAlwaysCompact(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return '';
  if (n > 0 && n < 0.001) return '&lt;0.001';
  return sci(n);
}

export function buildAdvancedStatReport({ result, paramCode = '', paramOptions = [], lakes = [], lakeId = '', compareValue = '', cl = '0.95', title = '' }) {
  // Print CSS: A4 portrait, white background
  const style = `
    @page { size: A4 portrait; margin: 16mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; padding: 0; }
    .container { padding: 18px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    h3 { margin: 18px 0 8px; }
    table { border-collapse: collapse; width: 100%; }
    table.summary { table-layout: fixed; }
    th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
    th { text-align: left; width: 35%; }
    .muted { opacity: 0.8; }
    .ci { margin: 8px 0 0; font-size: 12px; }
    .interp { margin-top: 8px; padding: 8px; background: #f6f6f6; border-radius: 6px; }
  `;

  const findParamName = (code) => {
    if (!code) return '';
    const e = (paramOptions || []).find(x => x.code === code || x.key === code || String(x.id) === String(code));
    return e ? (e.label || e.name || e.code) : code;
  };
  const primaryLakeName = lakeName(lakes, lakeId) || (lakeId ? `Lake ${lakeId}` : 'Primary Lake');
  const compareLakeId = (compareValue && String(compareValue).startsWith('lake:')) ? Number(String(compareValue).split(':')[1]) : null;
  const secondaryLakeName = compareLakeId ? (lakeName(lakes, compareLakeId) || `Lake ${compareLakeId}`) : 'Comparison Lake';

  // Build grid items using the same logic as ResultPanel (without Notes column)
  const items = [];
  const push = (k, v) => { items.push({ k, v: v == null ? '' : String(v) }); };
  const pushFmt = (k, v) => { if (v != null) push(k, fmt(v)); };
  const fmtYesNo = (b) => b == null ? '' : (b ? 'Yes' : 'No');
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
  const one = Array.isArray(result?.sample_values) ? result.sample_values : null;
  const two1 = Array.isArray(result?.sample1_values) ? result.sample1_values : null;
  const two2 = Array.isArray(result?.sample2_values) ? result.sample2_values : null;
  const oneStats = one ? basicStats(one) : null;
  const stats1 = two1 ? basicStats(two1) : null;
  const stats2 = two2 ? basicStats(two2) : null;

  const testKind = (()=>{
    const t = String(result?.test_used || result?.type || '').toLowerCase();
    if (t.includes('shapiro')) return 'shapiro';
    if (t.includes('levene')) return 'levene';
    if (t === 'tost' || t.includes('tost_t') || (('p1' in (result||{})) && ('p2' in (result||{})))) return 'tost_t';
    if (t.includes('tost_wilcoxon') || t.includes('wilcoxon-tost') || ('p_lower' in (result||{}) && 'p_upper' in (result||{}))) return 'tost_wilcoxon';
    if ('U' in (result||{}) || 'u' in (result||{})) return 'mannwhitney';
    if ('chi2' in (result||{}) && 'table' in (result||{})) return 'mood_median';
    if ('k_positive' in (result||{}) || 'k_negative' in (result||{})) return 'sign';
    if ('W' in (result||{}) && ('normal' in (result||{}))) return 'shapiro';
    if ('F' in (result||{}) && ('equal_variances' in (result||{}))) return 'levene';
    if (('t' in (result||{})) && ('df' in (result||{})) && ('n1' in (result||{}) || 'n2' in (result||{}))) return 't_two';
    if (('t' in (result||{})) && ('df' in (result||{}))) return 't_one';
    if (('statistic' in (result||{})) && !('U' in (result||{})) && !('chi2' in (result||{})) && !('p_lower' in (result||{}))) return 'wilcoxon_one';
    return 'generic';
  })();

  const testLabel = testLabelFromResult(result) || testLabelFromCode(result?.test_used || result?.type);
  if (testLabel) push('Test Selected', testLabel);

  const addCommonAlpha = () => { if (result?.alpha != null) push('Alpha (α)', fmt(result.alpha)); };
  const pushGuidelineIfPresent = (muLabelSource = null) => {
    const evalType = result?.evaluation_type || result?.evalType || null;
    const thrMin = result?.threshold_min != null ? result.threshold_min : null;
    const thrMax = result?.threshold_max != null ? result.threshold_max : null;
    const mu0 = muLabelSource != null ? muLabelSource : (result?.mu0 != null ? result.mu0 : null);
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
    if (value != null) push('Parameter Guideline', value);
  };

  // Test-specific rows mirroring ResultPanel
  if (testKind === 'shapiro') {
    const n = ('n' in (result||{})) ? result.n : (oneStats ? oneStats.n : null);
    if (n != null) pushFmt('N', n);
    if ('W' in (result||{})) pushFmt('W statistic', result.W);
    if ('p_value' in (result||{})) push('p-value', fmtPAlwaysCompact(result.p_value));
    if ('normal' in (result||{})) push('Normal?', fmtYesNo(result.normal));
    addCommonAlpha();
  } else if (testKind === 'levene') {
    const n1 = stats1 ? stats1.n : (Array.isArray(result?.sample1_values) ? result.sample1_values.length : null);
    const n2 = stats2 ? stats2.n : (Array.isArray(result?.sample2_values) ? result.sample2_values.length : null);
    if (n1 != null) pushFmt(`N (${primaryLakeName})`, n1);
    if (n2 != null) pushFmt(`N (${secondaryLakeName})`, n2);
    if ('equal_variances' in (result||{})) push('Variances equal?', fmtYesNo(result.equal_variances));
    if ('p_value' in (result||{})) push('p-value', fmtPAlwaysCompact(result.p_value));
    const var1 = ('var1' in (result||{})) ? result.var1 : (Array.isArray(result?.group_variances) && result.group_variances.length===2 ? result.group_variances[0] : null);
    const var2 = ('var2' in (result||{})) ? result.var2 : (Array.isArray(result?.group_variances) && result.group_variances.length===2 ? result.group_variances[1] : null);
    if (var1 != null) pushFmt(`Variance (${primaryLakeName})`, var1);
    if (var2 != null) pushFmt(`Variance (${secondaryLakeName})`, var2);
    addCommonAlpha();
  } else if (testKind === 't_one') {
    const n = ('n' in (result||{})) ? result.n : (oneStats ? oneStats.n : null);
    const meanVal = ('mean' in (result||{})) ? result.mean : (oneStats ? oneStats.mean : null);
    const sdVal = ('sd' in (result||{})) ? result.sd : (oneStats ? oneStats.sd : null);
    if (n != null) pushFmt('N', n);
    if (meanVal != null) pushFmt('Sample mean', meanVal);
    if (sdVal != null) pushFmt('Standard deviation', sdVal);
    pushGuidelineIfPresent(result?.mu0);
    if ('p_value' in (result||{})) push('p-value', fmtPAlwaysCompact(result.p_value));
    addCommonAlpha();
  } else if (testKind === 't_two') {
    const n1 = ('n1' in (result||{})) ? result.n1 : (stats1 ? stats1.n : null);
    const n2 = ('n2' in (result||{})) ? result.n2 : (stats2 ? stats2.n : null);
    const m1 = ('mean1' in (result||{})) ? result.mean1 : (stats1 ? stats1.mean : null);
    const m2 = ('mean2' in (result||{})) ? result.mean2 : (stats2 ? stats2.mean : null);
    if (n1 != null) pushFmt(`N (${primaryLakeName})`, n1);
    if (n2 != null) pushFmt(`N (${secondaryLakeName})`, n2);
    if (m1 != null) pushFmt(`Mean (${primaryLakeName})`, m1);
    if (m2 != null) pushFmt(`Mean (${secondaryLakeName})`, m2);
    if ('p_value' in (result||{})) push('p-value', fmtPAlwaysCompact(result.p_value));
    addCommonAlpha();
  } else if (testKind === 'wilcoxon_one') {
    const n = ('n' in (result||{})) ? result.n : (oneStats ? oneStats.n : null);
    const med = ('median' in (result||{})) ? result.median : (oneStats ? oneStats.median : null);
    if (n != null) pushFmt('N (effective)', n);
    if (med != null) pushFmt('Sample median', med);
    pushGuidelineIfPresent(result?.mu0);
    if ('p_value' in (result||{})) push('p-value', fmtPAlwaysCompact(result.p_value));
    addCommonAlpha();
  } else if (testKind === 'sign') {
    if ('n' in (result||{})) pushFmt('N (effective)', result.n);
    if ('k_positive' in (result||{})) pushFmt('Above threshold', result.k_positive);
    if ('k_negative' in (result||{})) pushFmt('Below threshold', result.k_negative);
    const med = ('median' in (result||{})) ? result.median : (oneStats ? oneStats.median : null);
    if (med != null) pushFmt('Sample median', med);
    pushGuidelineIfPresent(result?.mu0);
    if ('p_value' in (result||{})) push('p-value', fmtPAlwaysCompact(result.p_value));
    addCommonAlpha();
  } else if (testKind === 'mannwhitney') {
    const n1 = ('n1' in (result||{})) ? result.n1 : (stats1 ? stats1.n : null);
    const n2 = ('n2' in (result||{})) ? result.n2 : (stats2 ? stats2.n : null);
    const med1 = ('median1' in (result||{})) ? result.median1 : (stats1 ? stats1.median : null);
    const med2 = ('median2' in (result||{})) ? result.median2 : (stats2 ? stats2.median : null);
    if (n1 != null) pushFmt(`N (${primaryLakeName})`, n1);
    if (n2 != null) pushFmt(`N (${secondaryLakeName})`, n2);
    if (med1 != null) pushFmt(`Median (${primaryLakeName})`, med1);
    if (med2 != null) pushFmt(`Median (${secondaryLakeName})`, med2);
    if ('p_value' in (result||{})) push('p-value', fmtPAlwaysCompact(result.p_value));
    addCommonAlpha();
  } else if (testKind === 'mood_median') {
    const n1 = stats1 ? stats1.n : (Array.isArray(result?.sample1_values) ? result.sample1_values.length : null);
    const n2 = stats2 ? stats2.n : (Array.isArray(result?.sample2_values) ? result.sample2_values.length : null);
    const med1 = stats1 ? stats1.median : null;
    const med2 = stats2 ? stats2.median : null;
    if (n1 != null) pushFmt(`N (${primaryLakeName})`, n1);
    if (n2 != null) pushFmt(`N (${secondaryLakeName})`, n2);
    if (med1 != null) pushFmt(`Median (${primaryLakeName})`, med1);
    if (med2 != null) pushFmt(`Median (${secondaryLakeName})`, med2);
    if ('p_value' in (result||{})) push('p-value', fmtPAlwaysCompact(result.p_value));
    addCommonAlpha();
  } else if (testKind === 'tost_t') {
    const n = ('n' in (result||{})) ? result.n : (oneStats ? oneStats.n : null);
    const meanVal = ('mean' in (result||{})) ? result.mean : (oneStats ? oneStats.mean : null);
    const lower = (result?.threshold_min != null) ? result.threshold_min : (result?.lower != null ? result.lower : null);
    const upper = (result?.threshold_max != null) ? result.threshold_max : (result?.upper != null ? result.upper : null);
    const pTOST = ('pTOST' in (result||{})) ? result.pTOST : ((('p1' in (result||{})) && ('p2' in (result||{}))) ? Math.max(Number(result.p1), Number(result.p2)) : null);
    if (n != null) pushFmt('N', n);
    if (meanVal != null) pushFmt('Sample mean', meanVal);
    if (lower != null && upper != null) push('Acceptable range', `[${fmt(lower)}, ${fmt(upper)}]`);
    if (pTOST != null) push('TOST p-value', fmtPAlwaysCompact(pTOST));
    if ('equivalent' in (result||{})) push('Equivalent?', fmtYesNo(result.equivalent));
    addCommonAlpha();
  } else if (testKind === 'tost_wilcoxon') {
    const n = ('n' in (result||{})) ? result.n : (oneStats ? oneStats.n : null);
    const med = ('median' in (result||{})) ? result.median : (oneStats ? oneStats.median : null);
    const lower = (result?.lower != null) ? result.lower : (result?.threshold_min != null ? result.threshold_min : null);
    const upper = (result?.upper != null) ? result.upper : (result?.threshold_max != null ? result.threshold_max : null);
    const pTOST = ('pTOST' in (result||{})) ? result.pTOST : ((('p_lower' in (result||{})) && ('p_upper' in (result||{}))) ? Math.max(Number(result.p_lower), Number(result.p_upper)) : null);
    if (n != null) pushFmt('N (raw)', n);
    if (med != null) pushFmt('Sample median', med);
    if (lower != null && upper != null) push('Acceptable range', `[${fmt(lower)}, ${fmt(upper)}]`);
    if (pTOST != null) push('TOST p-value', fmtPAlwaysCompact(pTOST));
    if ('equivalent' in (result||{})) push('Equivalent?', fmtYesNo(result.equivalent));
    addCommonAlpha();
  } else {
    if ('p_value' in (result||{})) push('p-value', fmtPAlwaysCompact(result.p_value));
    addCommonAlpha();
  }

  // Add p vs α and decision rows (same logic as UI, but compact p)
  try {
    const alpha = (result?.alpha != null && Number.isFinite(Number(result.alpha))) ? Number(result.alpha) : null;
    let pForDecision = null;
    let pDisplayStr = null;
    let decisionContext = 'standard';
    if (typeof result?.p_value !== 'undefined' && result?.p_value !== null) {
      const pv = Number(result.p_value);
      if (Number.isFinite(pv)) {
        pForDecision = pv;
        pDisplayStr = pv < 0.001 ? '<0.001' : sci(pv);
      } else if (alpha != null && typeof result.p_value === 'string') {
        const m = result.p_value.trim().match(/^<\s*([0-9]*\.?[0-9]+)/);
        if (m) {
          const thr = Number(m[1]);
          if (Number.isFinite(thr) && thr <= alpha) {
            pForDecision = alpha - Number.EPSILON;
            pDisplayStr = `<${fmt(thr)}`;
          }
        }
      }
    } else if (testKind === 'tost_t' || testKind === 'tost_wilcoxon') {
      let pTOST = null;
      if (result?.pTOST != null && Number.isFinite(Number(result.pTOST))) {
        pTOST = Number(result.pTOST);
      } else if (result?.p1 != null && result?.p2 != null) {
        const p1 = Number(result.p1), p2 = Number(result.p2);
        if (Number.isFinite(p1) && Number.isFinite(p2)) pTOST = Math.max(p1, p2);
      } else if (result?.p_lower != null && result?.p_upper != null) {
        const pl = Number(result.p_lower), pu = Number(result.p_upper);
        if (Number.isFinite(pl) && Number.isFinite(pu)) pTOST = Math.max(pl, pu);
      }
      if (pTOST != null) {
        pForDecision = pTOST;
        pDisplayStr = pTOST < 0.001 ? '<0.001' : sci(pTOST);
        decisionContext = 'tost';
      }
    }
    if (alpha != null && pForDecision != null) {
      const symbol = pForDecision < alpha ? '<' : '≥';
      const label = decisionContext === 'tost' ? 'Equivalence (p vs α)' : 'Significance (p vs α)';
      const pShown = pDisplayStr ?? ((Number.isFinite(pForDecision) && pForDecision < 0.001) ? '<0.001' : sci(pForDecision));
      push(label, `p ${symbol} α (${pShown} vs ${fmt(alpha)})`);
    }
    let decision = null;
    if (decisionContext === 'tost') {
      if (alpha != null && pForDecision != null) {
        const eq = pForDecision < alpha;
        decision = eq ? 'Conclude Equivalent (reject H0 of non-equivalence)' : 'Not Equivalent (fail to reject H0)';
      } else if (typeof result?.equivalent === 'boolean') {
        decision = result.equivalent ? 'Conclude Equivalent' : 'Not Equivalent';
      }
    } else {
      if (typeof result?.significant === 'boolean') {
        decision = result.significant ? 'Reject H0' : 'Fail to Reject H0';
      } else if (alpha != null && pForDecision != null) {
        decision = pForDecision < alpha ? 'Reject H0' : 'Fail to Reject H0';
      }
    }
    if (decision) push('Statistical Decision', decision);
  } catch {}

  // Confidence Level row (explicitly requested)
  const clNum = Number(cl);
  if (Number.isFinite(clNum) && clNum > 0 && clNum < 1) {
    push('Confidence Level (CL)', `${Math.round(clNum*100)}%`);
  }

  // Summary table HTML (Field/Value only; no Notes column)
  const summaryRowsHtml = items.map(it => `<tr><th>${escapeHtml(it.k)}</th><td>${escapeHtml(it.v)}</td></tr>`).join('');

  // CI line
  const ciHtml = (result?.ci_lower != null && result?.ci_upper != null)
    ? `<div class=\"ci\">CI (${Math.round(Number(result?.ci_level||0)*100)}%): [${escapeHtml(fmt(result.ci_lower))}, ${escapeHtml(fmt(result.ci_upper))}]</div>`
    : '';

  // Interpretation (reuse same builder)
  const interpretation = buildInterpretation({ result, paramCode, paramOptions, lakes, cl, fmt, sci, lakeId, compareValue }) || '';

  // Data used section — always show all values
  let valuesSection = '';
  const findLakeName = (id) => lakeName(lakes, id);
  if (Array.isArray(result?.events) && result.events.length) {
    const findStationName = (ev) => ev.station_name || ev.station_label || ev.station_id || '';
    const rowsHtml = result.events.map(ev => (
      `<tr>`+
      `<td>${escapeHtml(ev.sampled_at || '')}</td>`+
      `<td>${escapeHtml(findLakeName(ev.lake_id) || '')}</td>`+
      `<td>${escapeHtml(findStationName(ev) || '')}</td>`+
      `<td>${escapeHtml(ev.value != null ? fmt(ev.value) : '')}</td>`+
      `</tr>`
    )).join('');
    valuesSection = `<h3>Data Used</h3><table><thead><tr><th>Sampled at</th><th>Lake</th><th>Station</th><th>Value</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
  } else if (Array.isArray(result?.sample_values) && result.sample_values.length) {
    const rowsHtml = result.sample_values.map(v => `<tr><td>${escapeHtml(fmt(v))}</td></tr>`).join('');
    const header = String(lakeId) === 'custom' ? 'Custom dataset values' : 'Value';
    valuesSection = `<h3>Data Used</h3><table><thead><tr><th>${escapeHtml(header)}</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
  } else if (Array.isArray(result?.sample1_values) || Array.isArray(result?.sample2_values)) {
    const a = Array.isArray(result?.sample1_values) ? result.sample1_values : [];
    const b = Array.isArray(result?.sample2_values) ? result.sample2_values : [];
    const maxLen = Math.max(a.length, b.length);
    const group1 = (()=>{
      if (!Array.isArray(a) || !Array.isArray(b)) return 'Group 1';
      if (String(lakeId) === 'custom') return 'Custom dataset';
      const lk = lakes.find(l => String(l.id) === String(lakeId));
      return lk?.name || 'Group 1';
    })();
    const group2 = (()=>{
      if (compareValue && String(compareValue).startsWith('lake:')){
        const otherId = String(compareValue).split(':')[1];
        const lake2 = lakes.find(l => String(l.id) === String(otherId));
        return lake2?.name || 'Group 2';
      }
      return 'Group 2';
    })();
    const rowsHtml = Array.from({ length: maxLen }).map((_, i) => {
      const va = i < a.length ? fmt(a[i]) : '';
      const vb = i < b.length ? fmt(b[i]) : '';
      return `<tr><td>${escapeHtml(va)}</td><td>${escapeHtml(vb)}</td></tr>`;
    }).join('');
    valuesSection = `<h3>Data Used</h3><table><thead><tr><th>${escapeHtml(group1)}</th><th>${escapeHtml(group2)}</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
  }

  // Title/filename pattern
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const paramLabel = findParamName(paramCode) || paramCode || 'param';
  const lakePart = compareLakeId ? `${primaryLakeName}-vs-${secondaryLakeName}` : `${primaryLakeName || 'lake'}`;
  const toSlug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const computedTitle = `advanced-stats_${toSlug(paramLabel)}_${toSlug(lakePart)}_${yyyy}-${mm}-${dd}`;
  const finalTitle = title || computedTitle;

  const bodyHtml = `
    <div class=\"container\">
      <h1>${escapeHtml(findParamName(paramCode) ? `${findParamName(paramCode)} – Advanced Statistics` : 'Advanced Statistics')}</h1>
      <table class=\"summary\"><tbody>${summaryRowsHtml}</tbody></table>
      ${ciHtml}
      <div class=\"interp\"><strong>Interpretation:</strong><div class=\"muted\" style=\"margin-top:6px\">${escapeHtml(interpretation)}</div></div>
      ${valuesSection}
    </div>
  `;

  return { css: style, bodyHtml, title: finalTitle };
}

export default { openPrintWindow, openPrintWindowWithStyle, buildAdvancedStatReport };
