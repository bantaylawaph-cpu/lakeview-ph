import { useEffect, useMemo, useState } from 'react';
import { parseIsoDate } from '../utils/dataUtils';
import { lakeName, lakeClass } from '../utils/shared';
import useCurrentStandard from './useCurrentStandard';
import { fetchParamThresholds } from './useParamThresholds';

export default function useCompareBarData({ eventsA = [], eventsB = [], bucket = 'year', selectedYears = [], depth = '', selectedParam = '', lakeA = '', lakeB = '', lakeOptions = [] }) {
  const { current } = useCurrentStandard();
  const [thrA, setThrA] = useState({ min: null, max: null, code: null });
  const [thrB, setThrB] = useState({ min: null, max: null, code: null });
  const [thrLoading, setThrLoading] = useState(false);

  // Try to resolve a parameter code from either events list (fallback to selectedParam as-is)
  const paramCode = useMemo(() => {
    const sel = String(selectedParam || '');
    const search = (events = []) => {
      for (const ev of events) {
        const results = Array.isArray(ev?.results) ? ev.results : [];
        for (const r of results) {
          const p = r?.parameter; if (!p) continue;
          const match = (String(p.code) === sel) || (String(p.id) === sel) || (String(r.parameter_id) === sel) || (String(r.parameter_code) === sel) || (String(r.parameter_key) === sel);
          if (match && p.code) return String(p.code);
        }
      }
      return null;
    };
    return search(eventsA) || search(eventsB) || (sel || null);
  }, [eventsA, eventsB, selectedParam]);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        if (!current?.id || !paramCode) { setThrA({ min: null, max: null, code: null }); setThrB({ min: null, max: null, code: null }); setThrLoading(false); return; }
        setThrLoading(true);
        const classA = lakeA ? lakeClass(lakeOptions, lakeA) : null;
        const classB = lakeB ? lakeClass(lakeOptions, lakeB) : null;
        const [a, b] = await Promise.all([
          lakeA ? fetchParamThresholds({ paramCode, appliedStandardId: current.id, classCode: classA || undefined }) : Promise.resolve({ min: null, max: null, code: current?.code || null }),
          lakeB ? fetchParamThresholds({ paramCode, appliedStandardId: current.id, classCode: classB || undefined }) : Promise.resolve({ min: null, max: null, code: current?.code || null }),
        ]);
        if (abort) return;
        setThrA(a || { min: null, max: null, code: current?.code || null });
        setThrB(b || { min: null, max: null, code: current?.code || null });
        setThrLoading(false);
      } catch {
        if (abort) return;
        setThrA({ min: null, max: null, code: current?.code || null });
        setThrB({ min: null, max: null, code: current?.code || null });
        setThrLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [current?.id, current?.code, paramCode, lakeA, lakeB, JSON.stringify(lakeOptions)]);

  const memo = useMemo(() => {
    const years = Array.isArray(selectedYears) ? selectedYears.map(String) : [];
    const lakes = [];
    if (lakeA) lakes.push({ id: lakeA, events: eventsA });
    if (lakeB) lakes.push({ id: lakeB, events: eventsB });
    const lakeLabels = lakes.map((lk) => lakeName(lakeOptions, lk.id) || String(lk.id));
    if (thrLoading) return { labels: [], datasets: [], meta: { thresholdsLoading: true } };
    if (!selectedParam || !years.length || lakes.length === 0) return { labels: [], datasets: [], meta: { thresholdsLoading: false } };

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

    // We will output grouped bars per bucket (x-axis = period), bars = lakes
    // Define stable colors per lake
    const lakeColors = [
      { bg: 'hsla(210, 70%, 55%, 0.85)', stroke: 'hsla(210, 70%, 45%, 1)' },
      { bg: 'hsla(0, 70%, 60%, 0.85)', stroke: 'hsla(0, 70%, 50%, 1)' },
      { bg: 'hsla(160, 70%, 55%, 0.85)', stroke: 'hsla(160, 70%, 45%, 1)' },
      { bg: 'hsla(28, 70%, 60%, 0.85)', stroke: 'hsla(28, 70%, 50%, 1)' },
    ];

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

    // Build labels for periods on x-axis
    const periodLabels = uniqueKeys.map((pk) => humanLabelFor(pk));
    // Build datasets per lake with values per period
    const datasets = lakes.map((lk, idx) => {
      const color = lakeColors[idx % lakeColors.length];
      const data = uniqueKeys.map((pk) => meanForPeriod(lk.events, pk));
      return {
        label: lakeName(lakeOptions, lk.id) || String(lk.id),
        data,
        backgroundColor: color.bg,
        borderColor: color.stroke,
        borderWidth: 1,
      };
    });

    // Meta for year grouping (used by yearLabelPlugin)
    const yearsFromKeys = Array.from(new Set(uniqueKeys.map((pk) => {
      if (/^\d{4}$/.test(pk)) return pk;
      const mq = pk.match(/^(\d{4})-Q(\d)$/); if (mq) return mq[1];
      const mm = pk.match(/^(\d{4})-(\d{2})$/); if (mm) return mm[1];
      return '0000';
    })));
    yearsFromKeys.sort((a, b) => Number(a) - Number(b));
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
    const periodInfo = uniqueKeys.map((pk, i) => ({
      key: pk,
      year: yearFromPk(pk),
      month: withinCountForBucket === 12 ? withinIndexFromPk(pk) + 1 : null,
      quarter: withinCountForBucket === 4 ? withinIndexFromPk(pk) + 1 : null,
      index: i,
    }));

    // Enforced current-standard thresholds per lake (using pre-fetched thrA/thrB)
    const stdA = thrA || { min: null, max: null, code: current?.code || null };
    const stdB = thrB || { min: null, max: null, code: current?.code || null };

    // If both lakes share identical min/max/stdKey, emit unified lines, else per-lake similar to timeseries
    const makeLine = (label, value, color) => {
      // span full width by emitting two points across the category axis and disabling parsing
      const left = -0.5;
      const right = Math.max(0, periodLabels.length - 0.5);
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
      const stdKey = stdInfo.code || 'std';
      const uniqueKey = `${stdKey}::${stdInfo.min ?? 'null'}::${stdInfo.max ?? 'null'}`;
      if (!combinedStandards.has(uniqueKey)) combinedStandards.set(uniqueKey, { stdLabel: stdKey, min: stdInfo.min ?? null, max: stdInfo.max ?? null, lakes: new Set([lakeKey]) });
      else combinedStandards.get(uniqueKey).lakes.add(lakeKey);
    };

  addStdEntry(stdA, String(lakeA));
  addStdEntry(stdB, String(lakeB));

    combinedStandards.forEach((entry) => {
      if (entry.lakes.size > 1) {
        // Unified threshold across both lakes: keep labels concise
        if (entry.min != null) datasets.push(makeLine('Min', entry.min, '#16a34a'));
        if (entry.max != null) datasets.push(makeLine('Max', entry.max, '#ef4444'));
      } else {
        // Per-lake threshold line: append the lake name for clarity, but omit guideline name
        const onlyLakeKey = Array.from(entry.lakes)[0];
        const lakeLabel = lakeName(lakeOptions, onlyLakeKey) || String(onlyLakeKey || '');
        if (entry.min != null) datasets.push(makeLine(`Min — ${lakeLabel}`, entry.min, '#16a34a'));
        if (entry.max != null) datasets.push(makeLine(`Max — ${lakeLabel}`, entry.max, '#ef4444'));
      }
    });

    // expose detected standard info for callers (map of combined standards)
    const standards = Array.from(combinedStandards.values()).map((entry) => ({ code: entry.stdLabel, min: entry.min != null ? entry.min : null, max: entry.max != null ? entry.max : null, lakes: Array.from(entry.lakes) }));

    // yearIndexMap for plugin: indices of periods per year
    const yearIndexMap = new Map();
    periodInfo.forEach((p) => { const arr = yearIndexMap.get(p.year) || []; arr.push(p.index); yearIndexMap.set(p.year, arr); });
    const yearIndexObj = {}; Array.from(yearIndexMap.entries()).forEach(([y, idxs]) => { yearIndexObj[y] = idxs; });
    const yearColors = {}; yearsFromKeys.forEach((y) => { yearColors[String(y)] = '#9ca3af'; });

    return { labels: periodLabels, datasets, meta: { years, standards, bucket, periodInfo, yearIndexMap: yearIndexObj, yearColors, yearOrder: yearsFromKeys, thresholdsLoading: false } };
  }, [eventsA, eventsB, bucket, selectedYears, depth, selectedParam, lakeA, lakeB, lakeOptions, thrA?.min, thrA?.max, thrB?.min, thrB?.max, thrA?.code, thrB?.code, thrLoading]);

  return { barData: memo, loadingThresholds: thrLoading };
}
