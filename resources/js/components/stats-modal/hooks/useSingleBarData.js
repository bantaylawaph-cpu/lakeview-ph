import { useMemo } from 'react';
import { parseIsoDate, eventStationName } from '../utils/dataUtils';
import { lakeName } from '../utils/shared';

export default function useSingleBarData({ events = [], bucket = 'year', selectedYears = [], depth = '', selectedParam = '', lake = '', lakeOptions = [], seriesMode = 'avg', selectedStations = [] }) {
  return useMemo(() => {
    const years = Array.isArray(selectedYears) ? selectedYears.map(String) : [];
    const labelForLake = lakeName(lakeOptions, lake) || String(lake || '');

    if (!selectedParam || !years.length || !lake) return { labels: [], datasets: [] };

    const parse = parseIsoDate;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const toPeriodKey = (d) => {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (bucket === 'year') return String(y);
      if (bucket === 'quarter') {
        const q = Math.floor((m - 1) / 3) + 1; return `${y}-Q${q}`;
      }
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

    // Aggregate events similarly to useTimeSeriesData for consistency
    const overall = new Map(); // periodKey -> { sum, cnt }
    const stationMaps = new Map(); // stationName -> Map(periodKey -> { sum, cnt })

    for (const ev of Array.isArray(events) ? events : []) {
      const d = parse(ev?.sampled_at);
      if (!d) continue;
      const pk = toPeriodKey(d);
      const sName = eventStationName(ev) || '';
      const results = Array.isArray(ev?.results) ? ev.results : [];
      for (const r of results) {
        const p = r?.parameter;
        const match = (p && (String(p.code) === String(selectedParam) || String(p.id) === String(selectedParam))) || (String(r.parameter_id) === String(selectedParam)) || (String(r.parameter_code) === String(selectedParam)) || (String(r.parameter_key) === String(selectedParam));
        if (!match) continue;
        if (depth !== '' && String(r.depth_m || '0') !== String(depth)) continue;
        const v = Number(r.value); if (!Number.isFinite(v)) continue;
        const aggO = overall.get(pk) || { sum: 0, cnt: 0 };
        aggO.sum += v; aggO.cnt += 1; overall.set(pk, aggO);
        const stMap = stationMaps.get(sName) || new Map();
        const aggS = stMap.get(pk) || { sum: 0, cnt: 0 };
        aggS.sum += v; aggS.cnt += 1; stMap.set(pk, aggS); stationMaps.set(sName, stMap);
      }
    }

    const meanForPeriod = (periodKey, stationName = null) => {
      if (stationName == null) {
        const agg = overall.get(periodKey); return agg && agg.cnt ? (agg.sum / agg.cnt) : null;
      }
      const sm = stationMaps.get(String(stationName)) || new Map();
      const agg = sm.get(periodKey); return agg && agg.cnt ? (agg.sum / agg.cnt) : null;
    };

    // build raw keys for the selected years
    const rawKeys = [];
    if (bucket === 'year') {
      years.forEach(y => rawKeys.push(String(y)));
    } else if (bucket === 'quarter') {
      years.forEach((yr) => { for (let q = 1; q <= 4; q++) rawKeys.push(`${yr}-Q${q}`); });
    } else {
      years.forEach((yr) => { for (let m = 1; m <= 12; m++) rawKeys.push(`${yr}-${String(m).padStart(2,'0')}`); });
    }

    const uniqueKeys = Array.from(new Set(rawKeys));
    const orderValue = (pk) => {
      if (/^\d{4}$/.test(pk)) return Number(pk) * 12;
      const mq = pk.match(/^(\d{4})-Q(\d)$/);
      if (mq) return Number(mq[1]) * 12 + (Number(mq[2]) - 1) * 3;
      const mm = pk.match(/^(\d{4})-(\d{2})$/);
      if (mm) return Number(mm[1]) * 12 + (Number(mm[2]) - 1);
      return 0;
    };
    uniqueKeys.sort((a, b) => orderValue(a) - orderValue(b));

    // Year-based palette: assign one hue per year; months/quarters vary by lightness
    const baseHues = [210, 0, 160, 120, 28, 280, 190, 340, 45, 200]; // blues, reds, purples, greens, ambers
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
      const t = withinCountForBucket > 1 ? (idx / (withinCountForBucket - 1)) : 0.5; // 0..1
      const light = 45 + Math.round(t * 25); // 45%..70%
      const borderLight = Math.max(30, light - 10);
      return {
        bg: `hsla(${hue}, 70%, ${light}%, 0.85)`,
        stroke: `hsla(${hue}, 70%, ${borderLight}%, 1)`,
        year: String(y),
      };
    };

    const datasets = [];
    let labels = [];
    const periodInfo = [];
    const yearIndexMap = new Map(); // year -> [datasetIndex]

    if (seriesMode === 'avg') {
      // labels is single lake label; datasets per period (periods -> values for lake)
      labels = [labelForLake];
      uniqueKeys.forEach((pk, idx) => {
        const val = meanForPeriod(pk);
        const c = colorFor(pk);
        datasets.push({ label: humanLabelFor(pk), data: [val], backgroundColor: c.bg, borderColor: c.stroke, borderWidth: 1 });
        periodInfo.push({ key: pk, year: c.year, month: withinCountForBucket === 12 ? withinIndexFromPk(pk) + 1 : null, quarter: withinCountForBucket === 4 ? withinIndexFromPk(pk) + 1 : null, index: datasets.length - 1 });
        const arr = yearIndexMap.get(c.year) || []; arr.push(datasets.length - 1); yearIndexMap.set(c.year, arr);
      });
    } else {
      // per-station: labels are station names (selectedStations), datasets per period with value per station
      const requested = Array.isArray(selectedStations) ? selectedStations.map(String) : [];
      labels = requested.slice();

      // Build a list of actual station keys we collected from events
      const actualKeys = Array.from(stationMaps.keys());
      const normalize = (s) => (String(s || '').trim().toLowerCase());

      // map requested label -> actual key (fallback to exact or substring match)
      const stationKeyFor = {};
      requested.forEach((req) => {
        const nreq = normalize(req);
        let found = actualKeys.find((k) => normalize(k) === nreq);
        if (!found) found = actualKeys.find((k) => normalize(k).includes(nreq) || nreq.includes(normalize(k)));
        stationKeyFor[req] = found || null;
      });

      uniqueKeys.forEach((pk, idx) => {
        const data = requested.map((st) => {
          const actual = stationKeyFor[st];
          return actual ? meanForPeriod(pk, actual) : null;
        });
        const c = colorFor(pk);
        datasets.push({ label: humanLabelFor(pk), data, backgroundColor: c.bg, borderColor: c.stroke, borderWidth: 1 });
        periodInfo.push({ key: pk, year: c.year, month: withinCountForBucket === 12 ? withinIndexFromPk(pk) + 1 : null, quarter: withinCountForBucket === 4 ? withinIndexFromPk(pk) + 1 : null, index: datasets.length - 1 });
        const arr = yearIndexMap.get(c.year) || []; arr.push(datasets.length - 1); yearIndexMap.set(c.year, arr);
      });
    }

    // thresholds (single lake): reuse same collector logic as compare to be robust
    const collectStd = (eventsList = []) => {
      let min = null, max = null, stdLabel = null, stdKey = null;
      for (const ev of eventsList || []) {
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

    const std = collectStd(events);
    const makeLine = (label, value, color) => {
      // emit two coordinate points that span the chart area using category indices; disable parsing so Chart.js uses numeric x positions
      const left = -0.5;
      const right = Math.max(0, labels.length - 0.5);
      return { label, data: [{ x: left, y: value }, { x: right, y: value }], parsing: false, type: 'line', borderColor: color, backgroundColor: `${color}33`, borderDash: [4,4], pointRadius: 0, tension: 0, fill: false, spanGaps: true, borderWidth: 2, order: 100 };
    };
  if (std.min != null) datasets.push(makeLine(`${std.stdLabel || std.stdKey || 'Standard'} – Min (${labelForLake})`, std.min, '#16a34a'));
  if (std.max != null) datasets.push(makeLine(`${std.stdLabel || std.stdKey || 'Standard'} – Max (${labelForLake})`, std.max, '#ef4444'));

    // Local-only debug logs to help diagnose empty per-station datasets
    try {
      if (typeof window !== 'undefined' && window.location && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')) {
        console.debug('[useSingleBarData] requestedStations:', selectedStations);
        console.debug('[useSingleBarData] actual station keys:', Array.from(stationMaps.keys()));
        // show mapping from requested -> actual
        if (typeof stationKeyFor !== 'undefined') console.debug('[useSingleBarData] stationKeyFor:', stationKeyFor);
        console.debug('[useSingleBarData] labels:', labels);
        console.debug('[useSingleBarData] datasets sample:', datasets.slice(0,5).map(d => ({ label: d.label, data: d.data })));
      }
    } catch (e) { /* ignore */ }

    // expose detected standard info in meta for callers to use (code, min, max)
    const standards = [];
    if (std.stdLabel || std.stdKey) {
      standards.push({ code: std.stdLabel || std.stdKey, min: std.min != null ? std.min : null, max: std.max != null ? std.max : null });
    }

    // Build simple color map for years (use middle lightness for swatch)
    const yearColors = {};
    yearsFromKeys.forEach((y) => {
      const hue = yearHue.get(String(y)) ?? 200;
      yearColors[String(y)] = `hsla(${hue}, 70%, 55%, 0.9)`;
    });

    // expose grouping info to consumers for custom legends
    const yearIndexObj = {};
    Array.from(yearIndexMap.entries()).forEach(([y, idxs]) => { yearIndexObj[y] = idxs; });

    return { labels: labels.map(humanLabelFor), datasets, meta: { years, standards, bucket, periodInfo, yearIndexMap: yearIndexObj, yearColors, yearOrder: yearsFromKeys } };
  }, [events, bucket, selectedYears, depth, selectedParam, lake, lakeOptions, seriesMode, selectedStations]);
}
