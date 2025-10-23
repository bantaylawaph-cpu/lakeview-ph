import { useMemo } from 'react';
import { parseIsoDate } from '../utils/dataUtils';
import { lakeName, lakeClass } from '../utils/shared';

export default function useCompareBarData({ eventsA = [], eventsB = [], bucket = 'year', selectedYears = [], depth = '', selectedParam = '', lakeA = '', lakeB = '', lakeOptions = [] }) {
  return useMemo(() => {
    const years = Array.isArray(selectedYears) ? selectedYears.map(String) : [];
    const lakes = [];
    if (lakeA) lakes.push({ id: lakeA, events: eventsA });
    if (lakeB) lakes.push({ id: lakeB, events: eventsB });
    const lakeLabels = lakes.map((lk) => lakeName(lakeOptions, lk.id) || String(lk.id));

    if (!selectedParam || !years.length || lakes.length === 0) return { labels: lakeLabels, datasets: [] };

    const parse = parseIsoDate;

    // helpers to compute period matching based on bucket
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const toPeriodKey = (d) => {
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1..12
      if (bucket === 'year') return String(y);
      if (bucket === 'quarter') {
        const q = Math.floor((m - 1) / 3) + 1; return `${y}-Q${q}`;
      }
      // month
      return `${y}-${String(m).padStart(2,'0')}`;
    };

    const humanLabelFor = (key) => {
      if (!key) return key;
      if (/^\d{4}$/.test(key)) return key;
      const m = key.match(/^(\d{4})-Q(\d)$/);
      if (m) return `${m[1]} Q${m[2]}`;
      const mm = key.match(/^(\d{4})-(\d{2})$/);
      if (mm) return `${monthNames[Number(mm[2]) - 1]} ${mm[1]}`;
      return key;
    };

    const meanForPeriod = (events = [], periodKey) => {
      let sum = 0, cnt = 0;
      for (const ev of events || []) {
        const d = parse(ev?.sampled_at);
        if (!d) continue;
        const pk = toPeriodKey(d);
        if (String(pk) !== String(periodKey)) continue;
        const results = Array.isArray(ev?.results) ? ev.results : [];
        for (const r of results) {
          const p = r?.parameter;
          const match = (p && (String(p.code) === String(selectedParam) || String(p.id) === String(selectedParam))) || (String(r.parameter_id) === String(selectedParam)) || (String(r.parameter_code) === String(selectedParam)) || (String(r.parameter_key) === String(selectedParam));
          if (!match) continue;
          if (depth !== '' && String(r.depth_m || '0') !== String(depth)) continue;
          const v = Number(r.value); if (!Number.isFinite(v)) continue;
          sum += v; cnt += 1;
        }
      }
      return cnt ? (sum / cnt) : null;
    };

  const datasets = [];
  // Year-based palette (group legend by year); months/quarters vary by lightness
  const baseHues = [210, 0, 160, 120, 28, 280, 190, 340, 45, 200];

    // build list of period keys depending on bucket
    const rawKeys = [];
    if (bucket === 'year') {
      years.forEach((yr) => rawKeys.push(String(yr)));
    } else if (bucket === 'quarter') {
      years.forEach((yr) => { for (let q = 1; q <= 4; q++) rawKeys.push(`${yr}-Q${q}`); });
    } else { // month
      years.forEach((yr) => { for (let m = 1; m <= 12; m++) rawKeys.push(`${yr}-${String(m).padStart(2,'0')}`); });
    }

    // unique and sort chronologically (oldest -> newest)
    const uniqueKeys = Array.from(new Set(rawKeys));
    const orderValue = (pk) => {
      if (/^\d{4}$/.test(pk)) return Number(pk) * 12; // use months scale
      const mq = pk.match(/^(\d{4})-Q(\d)$/);
      if (mq) return Number(mq[1]) * 12 + (Number(mq[2]) - 1) * 3;
      const mm = pk.match(/^(\d{4})-(\d{2})$/);
      if (mm) return Number(mm[1]) * 12 + (Number(mm[2]) - 1);
      return 0;
    };
    uniqueKeys.sort((a, b) => orderValue(a) - orderValue(b));

    const yearsFromKeys = Array.from(new Set(uniqueKeys.map((pk) => {
      if (/^\d{4}$/.test(pk)) return pk;
      const mq = pk.match(/^(\d{4})-Q(\d)$/); if (mq) return mq[1];
      const mm = pk.match(/^(\d{4})-(\d{2})$/); if (mm) return mm[1];
      return '0000';
    })));
    yearsFromKeys.sort((a, b) => Number(a) - Number(b));
    const yearHue = new Map(yearsFromKeys.map((y, i) => [String(y), baseHues[i % baseHues.length]]));
    const withinCountForBucket = bucket === 'year' ? 1 : (bucket === 'quarter' ? 4 : 12);
    const withinIndexFromPk = (pk) => {
      if (bucket === 'year') return 0;
      const mq = pk.match(/^(\d{4})-Q(\d)$/); if (mq) return Number(mq[2]) - 1;
      const mm = pk.match(/^(\d{4})-(\d{2})$/); if (mm) return Number(mm[2]) - 1;
      return 0;
    };
    const yearFromPk = (pk) => {
      if (/^\d{4}$/.test(pk)) return String(pk);
      const mq = pk.match(/^(\d{4})-Q(\d)$/); if (mq) return mq[1];
      const mm = pk.match(/^(\d{4})-(\d{2})$/); if (mm) return mm[1];
      return '0000';
    };
    const colorFor = (pk) => {
      const y = yearFromPk(pk);
      const hue = yearHue.get(String(y)) ?? 200;
      const idx = withinIndexFromPk(pk);
      const t = withinCountForBucket > 1 ? (idx / (withinCountForBucket - 1)) : 0.5;
      const light = 45 + Math.round(t * 25);
      const borderLight = Math.max(30, light - 10);
      return { bg: `hsla(${hue}, 70%, ${light}%, 0.85)`, stroke: `hsla(${hue}, 70%, ${borderLight}%, 1)`, year: String(y) };
    };

    const periodInfo = [];
    const yearIndexMap = new Map();

    uniqueKeys.forEach((pk) => {
      const data = lakes.map((lk) => meanForPeriod(lk.events, pk));
      const c = colorFor(pk);
      datasets.push({ label: humanLabelFor(pk), data, backgroundColor: c.bg, borderColor: c.stroke, borderWidth: 1 });
      periodInfo.push({ key: pk, year: c.year, month: withinCountForBucket === 12 ? withinIndexFromPk(pk) + 1 : null, quarter: withinCountForBucket === 4 ? withinIndexFromPk(pk) + 1 : null, index: datasets.length - 1 });
      const arr = yearIndexMap.get(c.year) || []; arr.push(datasets.length - 1); yearIndexMap.set(c.year, arr);
    });

    // Thresholds: collect per-lake min/max/stdLabel
    const collectStd = (events = []) => {
      // return { stdKey, min, max, stdLabel }
      let min = null, max = null, stdLabel = null, stdKey = null;
      for (const ev of events || []) {
        const evStdCode = ev?.applied_standard_code ?? ev?.applied_standard_name ?? ev?.applied_standard?.code ?? ev?.applied_standard?.name ?? null;
        const results = Array.isArray(ev?.results) ? ev.results : [];
        for (const r of results) {
          const p = r?.parameter; if (!p) continue;
          const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
          if (!match) continue;
          const stdId = r?.threshold?.standard_id ?? ev?.applied_standard_id ?? null;
          const maybeKey = r?.threshold?.standard?.code || r?.threshold?.standard?.name || (stdId != null ? String(stdId) : null) || evStdCode;
          if (maybeKey) stdKey = maybeKey;
          if (r?.threshold?.min_value != null) min = Number(r.threshold.min_value);
          if (r?.threshold?.max_value != null) max = Number(r.threshold.max_value);
          stdLabel = r?.threshold?.standard?.code || r?.threshold?.standard?.name || stdLabel || evStdCode;
          if (min != null || max != null) break;
        }
        if (min != null || max != null) break;
      }
      return { stdKey, min, max, stdLabel };
    };

    const stdA = collectStd(eventsA);
    const stdB = collectStd(eventsB);

    // If both lakes share identical min/max/stdKey, emit unified lines, else per-lake similar to timeseries
    const makeLine = (label, value, color) => {
      // span full width by emitting two points across the category axis and disabling parsing
      const left = -0.5;
      const right = Math.max(0, lakeLabels.length - 0.5);
      return {
        label,
        data: [{ x: left, y: value }, { x: right, y: value }],
        parsing: false,
        type: 'line',
        borderColor: color,
        backgroundColor: `${color}33`,
        borderDash: [4,4],
        pointRadius: 0,
        tension: 0,
        fill: false,
        spanGaps: true,
        borderWidth: 2,
        order: 100,
      };
    };

    const combinedStandards = new Map();
    const addStdEntry = (stdInfo, lakeKey) => {
      if (!stdInfo || (stdInfo.min == null && stdInfo.max == null)) return;
      const stdKey = stdInfo.stdKey || stdInfo.stdLabel || 'std';
      const uniqueKey = `${stdKey}::${stdInfo.min ?? 'null'}::${stdInfo.max ?? 'null'}`;
      if (!combinedStandards.has(uniqueKey)) combinedStandards.set(uniqueKey, { stdLabel: stdInfo.stdLabel || stdKey, min: stdInfo.min ?? null, max: stdInfo.max ?? null, lakes: new Set([lakeKey]) });
      else combinedStandards.get(uniqueKey).lakes.add(lakeKey);
    };

    addStdEntry(stdA, String(lakeA));
    addStdEntry(stdB, String(lakeB));

    combinedStandards.forEach((entry) => {
      if (entry.lakes.size > 1) {
        const lakesMeta = Array.from(entry.lakes).map((lkKey) => lakeName(lakeOptions, lkKey) || String(lkKey)).join(', ');
        if (entry.min != null) datasets.push(makeLine(`${entry.stdLabel} – Min (${lakesMeta})`, entry.min, '#16a34a'));
        if (entry.max != null) datasets.push(makeLine(`${entry.stdLabel} – Max (${lakesMeta})`, entry.max, '#ef4444'));
      } else {
        const onlyLakeKey = Array.from(entry.lakes)[0];
        const lakeLabel = lakeName(lakeOptions, onlyLakeKey) || String(onlyLakeKey || '');
        if (entry.min != null) datasets.push(makeLine(`${lakeLabel} – ${entry.stdLabel} – Min`, entry.min, '#16a34a'));
        if (entry.max != null) datasets.push(makeLine(`${lakeLabel} – ${entry.stdLabel} – Max`, entry.max, '#ef4444'));
      }
    });

    // expose detected standard info for callers (map of combined standards)
    const standards = Array.from(combinedStandards.values()).map((entry) => ({ code: entry.stdLabel, min: entry.min != null ? entry.min : null, max: entry.max != null ? entry.max : null, lakes: Array.from(entry.lakes) }));

    const yearColors = {};
    yearsFromKeys.forEach((y) => { const hue = yearHue.get(String(y)) ?? 200; yearColors[String(y)] = `hsla(${hue}, 70%, 55%, 0.9)`; });
    const yearIndexObj = {}; Array.from(yearIndexMap.entries()).forEach(([y, idxs]) => { yearIndexObj[y] = idxs; });

    return { labels: lakeLabels, datasets, meta: { years, standards, bucket, periodInfo, yearIndexMap: yearIndexObj, yearColors, yearOrder: yearsFromKeys } };
  }, [eventsA, eventsB, bucket, selectedYears, depth, selectedParam, lakeA, lakeB, lakeOptions]);
}
