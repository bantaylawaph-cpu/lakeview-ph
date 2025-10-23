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
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch(e) {} }, 250);
  return w;
}

// Build AdvancedStat report HTML sections (summary + values) for export
import { fmt, sci } from '../formatters';
import { lakeName } from './shared';
import { testLabelFromResult, testLabelFromCode } from './testLabels';

export function buildAdvancedStatReport({ result, advisories = [], paramCode = '', paramOptions = [], lakes = [], lakeId = '', compareValue = '', title = '' }) {
  const style = `body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 18px; } h1 { font-size: 18px; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 6px; } h3 { margin-top: 16px; }`;

  const fmtP = (p) => {
    if (p == null || Number.isNaN(Number(p))) return '';
    const n = Number(p);
    if (isFinite(n) && n > 0 && n < 0.001) return '&lt;0.001';
    return sci(n);
  };
  const findParamName = (code) => {
    if (!code) return '';
    const e = (paramOptions || []).find(x => x.code === code || x.key === code || String(x.id) === String(code));
    return e ? (e.label || e.name || e.code) : code;
  };
  const findLakeName = (id) => lakeName(lakes, id);

  const summaryRows = [];
  if (result) {
    const label = testLabelFromResult(result) || testLabelFromCode(result?.test_used || result?.type);
    if (label) summaryRows.push(`<tr><th>Test</th><td>${label}</td></tr>`);
    if (result.alternative) summaryRows.push(`<tr><th>Alternative</th><td>${result.alternative}</td></tr>`);
    if (result.p_value != null) summaryRows.push(`<tr><th>p-value</th><td>${fmtP(result.p_value)}</td></tr>`);
    if (result.p_lower != null && result.p_upper != null) summaryRows.push(`<tr><th>TOST p (lower/upper)</th><td>${fmtP(result.p_lower)} / ${fmtP(result.p_upper)}</td></tr>`);
    if (result.pTOST != null) summaryRows.push(`<tr><th>TOST max p</th><td>${fmtP(result.pTOST)}</td></tr>`);
    if (result.mean != null) summaryRows.push(`<tr><th>Mean</th><td>${fmt(result.mean)}</td></tr>`);
    if (result.median != null) summaryRows.push(`<tr><th>Median</th><td>${fmt(result.median)}</td></tr>`);
    if (result.sd != null) summaryRows.push(`<tr><th>SD</th><td>${fmt(result.sd)}</td></tr>`);
    if (result.n != null) summaryRows.push(`<tr><th>N</th><td>${fmt(result.n)}</td></tr>`);
    if (paramCode) summaryRows.push(`<tr><th>Parameter</th><td>${findParamName(paramCode)}</td></tr>`);
    if (lakeId) summaryRows.push(`<tr><th>Lake</th><td>${findLakeName(lakeId)}</td></tr>`);
    if (compareValue && String(compareValue).startsWith('lake:')) {
      const otherId = String(compareValue).split(':')[1];
      summaryRows.push(`<tr><th>Compare (lake)</th><td>${findLakeName(otherId)}</td></tr>`);
    } else if (compareValue && String(compareValue).startsWith('class:')) {
      summaryRows.push(`<tr><th>Compare (class)</th><td>${String(compareValue).split(':')[1] || ''}</td></tr>`);
    }
    if (result.mean1 != null) summaryRows.push(`<tr><th>Group 1 mean</th><td>${fmt(result.mean1)}</td></tr>`);
    if (result.mean2 != null) summaryRows.push(`<tr><th>Group 2 mean</th><td>${fmt(result.mean2)}</td></tr>`);
    if (result.sd1 != null) summaryRows.push(`<tr><th>Group 1 SD</th><td>${fmt(result.sd1)}</td></tr>`);
    if (result.sd2 != null) summaryRows.push(`<tr><th>Group 2 SD</th><td>${fmt(result.sd2)}</td></tr>`);
    if (result.n1 != null) summaryRows.push(`<tr><th>Group 1 N</th><td>${fmt(result.n1)}</td></tr>`);
    if (result.n2 != null) summaryRows.push(`<tr><th>Group 2 N</th><td>${fmt(result.n2)}</td></tr>`);
    if (result.var1 != null) summaryRows.push(`<tr><th>Variance (Group 1)</th><td>${fmt(result.var1)}</td></tr>`);
    if (result.var2 != null) summaryRows.push(`<tr><th>Variance (Group 2)</th><td>${fmt(result.var2)}</td></tr>`);
    if (!result.var1 && Array.isArray(result.group_variances)) summaryRows.push(`<tr><th>Group variances</th><td>${result.group_variances.map(v=>fmt(v)).join(', ')}</td></tr>`);
    if (result.threshold_min != null || result.threshold_max != null) summaryRows.push(`<tr><th>Threshold(s)</th><td>${result.threshold_min ?? ''}${(result.threshold_min!=null && result.threshold_max!=null)?' - ':''}${result.threshold_max ?? ''}</td></tr>`);
    if (result.range_distance != null) summaryRows.push(`<tr><th>Distance to bound/range</th><td>${fmt(result.range_distance)}</td></tr>`);
    if (result.range_distance1 != null || result.range_distance2 != null) summaryRows.push(`<tr><th>Range distance (group 1 / 2)</th><td>${result.range_distance1 != null ? fmt(result.range_distance1) : ''} / ${result.range_distance2 != null ? fmt(result.range_distance2) : ''}</td></tr>`);
    if (result.mu0 != null) summaryRows.push(`<tr><th>Reference (mu0)</th><td>${fmt(result.mu0)}</td></tr>`);
    if (advisories.length) summaryRows.push(`<tr><th>Advisories</th><td>${advisories.map(a=>a.replace(/</g,'&lt;')).join('<br/>')}</td></tr>`);
  }

  let valuesSection = '';
  if (Array.isArray(result?.events) && result.events.length) {
    const findStationName = (ev) => ev.station_name || ev.station_label || ev.station_id || '';
    const rowsHtml = result.events.slice(0, 1000).map(ev => `<tr><td>${ev.sampled_at || ''}</td><td>${findLakeName(ev.lake_id) || ''}</td><td>${findStationName(ev) || ''}</td><td>${ev.value ?? ''}</td></tr>`).join('');
    valuesSection = `<h3>Events (first ${Math.min(result.events.length, 1000)})</h3><table><thead><tr><th>Sampled at</th><th>Lake</th><th>Station</th><th>Value</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
  } else if (Array.isArray(result?.sample_values) && result.sample_values.length) {
    valuesSection = `<h3>Values</h3><div>${(result.sample_values || []).slice(0,1000).join(', ')}</div>`;
  } else if (Array.isArray(result?.sample1_values) || Array.isArray(result?.sample2_values)) {
    const a = (result.sample1_values || []).slice(0,1000).join(', ');
    const b = (result.sample2_values || []).slice(0,1000).join(', ');
    valuesSection = `<h3>Group values</h3><div>x: ${a}</div><div style="margin-top:8px">y: ${b}</div>`;
  }

  const bodyHtml = `<h1>${title}</h1><table>${summaryRows.join('')}</table>${valuesSection}`;
  return { css: style, bodyHtml };
}

export default { openPrintWindow, openPrintWindowWithStyle, buildAdvancedStatReport };
