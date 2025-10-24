export function buildGraphExplanation(ctx) {
  const {
  chartType = 'time', // 'time' | 'depth' | 'bar'
    param = {},         // { code, name, unit }
    seriesMode = 'avg', // 'avg' | 'per-station'
    bucket = 'month',   // 'month' | 'quarter' | 'year'
    standards = [],     // [{ code, min, max }...] or with buckets info
    compareMode = false,
    lakeLabels = {},    // { a, b }
    inferredType = null // 'min' | 'max' | 'range'
  } = ctx || {};

  const title = `${param?.name || param?.code || 'Selected parameter'}${param?.unit ? ` (${param.unit})` : ''}`;

  const sections = [];
  // Short note: single lake vs compare mode
  if (compareMode) {
    sections.push({
      heading: 'Comparing two lakes',
      text: `You are comparing ${lakeLabels?.a || 'Lake A'} and ${lakeLabels?.b || 'Lake B'}. Each lake is shown with its own color so you can see differences side by side.`
    });
  } else {
    sections.push({
      heading: 'Single lake view',
      text: 'This view shows data for one lake or a single selection. Lines and bars represent that lake only.'
    });
  }

  // Chart-specific explanations in plain English
  if (chartType === 'depth') {
    sections.push({
      heading: 'Depth profile (what it shows)',
      bullets: [
        'Horizontal axis = the measured value of the parameter (for example, turbidity or temperature).',
        'Vertical axis = depth in meters. Depth increases downward (top is surface).',
        'Each line is a group (for example a month or year) showing how the value changes with depth.'
      ]
    });

    // Thresholds only apply to depth, bar, and time-series
    if (Array.isArray(standards) && standards.length) {
      const stdLabels = standards.map(s => s.code).filter(Boolean).join(', ') || 'the standard';
      sections.push({
        heading: 'Thresholds on the depth chart',
        text: `Where the standard applies, you may see lines showing minimums and maximums (${stdLabels}). These show the acceptable range.`
      });
    } else {
      sections.push({ heading: 'Thresholds on the depth chart', text: 'No threshold lines apply for this selection.' });
    }

    // Interpretation
    const hasAnyMin = standards.some(s => s.min != null);
    const hasAnyMax = standards.some(s => s.max != null);
    const type = inferredType || (hasAnyMin && hasAnyMax ? 'range' : hasAnyMin ? 'min' : hasAnyMax ? 'max' : null);
    let hint = null;
    if (type === 'min') hint = 'Higher is better. Values below the minimum may be a problem.';
    if (type === 'max') hint = 'Lower is better. Values above the maximum may be a problem.';
    if (type === 'range') hint = 'Best inside the range between the minimum and maximum. Outside that range indicates exceedance.';
    if (hint) sections.push({ heading: 'How to read a depth profile', text: hint });

  } else if (chartType === 'bar') {
    sections.push({
      heading: 'Bar chart (what it shows)',
      bullets: [
        seriesMode === 'per-station'
          ? 'Each bar represents a station (or category). Heights are the average or count for that station.'
          : 'Each bar represents the aggregated value across selected stations for the bucket shown.',
        compareMode ? 'In compare mode, bars for each lake appear side by side so you can compare them.' : 'In single-lake mode bars show values for the chosen lake.'
      ]
    });

    if (Array.isArray(standards) && standards.length) {
      const stdLabels = standards.map(s => s.code).filter(Boolean).join(', ') || 'the standard';
      sections.push({ heading: 'Thresholds on the bar chart', text: `Threshold lines or colored bands (${stdLabels}) show acceptable ranges. Compare bar heights to these lines.` });
    } else {
      sections.push({ heading: 'Thresholds on the bar chart', text: 'No thresholds found for this selection.' });
    }

    // Interpretation
    const hasMinBar = standards.some(s => s.min != null);
    const hasMaxBar = standards.some(s => s.max != null);
    const typeBar = inferredType || (hasMinBar && hasMaxBar ? 'range' : hasMinBar ? 'min' : hasMaxBar ? 'max' : null);
    let hintBar = null;
    if (typeBar === 'min') hintBar = 'Higher is better. Bars below the minimum may indicate poor conditions.';
    if (typeBar === 'max') hintBar = 'Lower is better. Bars above the maximum may indicate exceedance.';
    if (typeBar === 'range') hintBar = 'Best when bars fall inside the acceptable range.';
    if (hintBar) sections.push({ heading: 'How to read a bar chart', text: hintBar });

  } else { // default/time-series
    sections.push({
      heading: 'Time-series (what it shows)',
      bullets: [
        `This chart shows how ${param?.name || 'the parameter'} changes over time by ${bucket}.`,
        seriesMode === 'per-station'
          ? 'Each line is a station; points are averages for that station in each time bucket.'
          : 'The line is the average across stations for each time bucket.'
      ]
    });

    if (Array.isArray(standards) && standards.length) {
      const stdLabels = standards.map(s => s.code).filter(Boolean).join(', ') || 'the standard';
      sections.push({ heading: 'Thresholds on the time chart', text: `Where relevant, you will see minimum and maximum threshold lines (${stdLabels}). They only appear where the standard applies.` });
    } else {
      sections.push({ heading: 'Thresholds on the time chart', text: 'No thresholds found for this period or selection.' });
    }

    // Interpretation
    const hasAnyMinTime = standards.some(s => s.min != null);
    const hasAnyMaxTime = standards.some(s => s.max != null);
    const typeTime = inferredType || (hasAnyMinTime && hasAnyMaxTime ? 'range' : hasAnyMinTime ? 'min' : hasAnyMaxTime ? 'max' : null);
    let hintTime = null;
    if (typeTime === 'min') hintTime = 'Higher is better. Values below the minimum are of concern.';
    if (typeTime === 'max') hintTime = 'Lower is better. Values above the maximum are of concern.';
    if (typeTime === 'range') hintTime = 'Best when values are inside the acceptable range; outside means exceedance.';
    if (hintTime) sections.push({ heading: 'How to read a time-series', text: hintTime });
    // Trend analysis (simple user-facing phrasing)
    if (ctx && (ctx.trendEnabled || ctx.trend)) {
      sections.push({
        heading: 'Trend analysis',
        text: 'Shows whether the parameter is Increasing, Decreasing, or has No clear trend using the Seasonal Mann–Kendall test. Values are aggregated by Wet/Dry season (season medians). A dashed line (Sen’s slope) shows the change per year.'
      });

      // If a computed result was provided, explain it plainly for the end user
      const tr = ctx.trend || {};
      const mk = tr.mk || null;
      const sen = tr.sen || null;
      if (mk || sen) {
        const p = mk?.p_value;
        let pLabel = 'p unknown';
        if (typeof p === 'number' && Number.isFinite(p)) pLabel = (p < 0.01) ? 'p < 0.01' : `p = ${p.toFixed(3)}`;
        const slope = sen && typeof sen.slope === 'number' && Number.isFinite(sen.slope) ? Number(sen.slope).toPrecision(3) : null;
        const alpha = (ctx && ctx.alpha != null) ? ctx.alpha : 0.05;
        const status = tr.status || (mk ? (mk.p_value != null && mk.p_value < alpha ? (mk.Z > 0 ? 'Increasing' : (mk.Z < 0 ? 'Decreasing' : 'No clear trend')) : 'No clear trend') : 'No clear trend');
        const notes = (mk && mk.notes) ? mk.notes.join('; ') : (tr.notes || '');

        let text = '';
        if (status === 'Increasing') text += `Result: Increasing (${pLabel}). This means values show a statistically significant upward trend.`;
        else if (status === 'Decreasing') text += `Result: Decreasing (${pLabel}). This means values show a statistically significant downward trend.`;
        else text += `Result: No clear trend (${pLabel}). The test did not find a consistent increase or decrease.`;

        if (slope != null) text += ` Sen’s slope ≈ ${slope} per year (that is, the typical yearly change).`;
        if (notes) text += ` Note: ${notes}.`;

        sections.push({ heading: 'Trend result', text });
      }
    }
  }

  return { title, sections };
}
