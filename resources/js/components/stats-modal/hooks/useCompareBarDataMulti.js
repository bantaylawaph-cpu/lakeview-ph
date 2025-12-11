import { useEffect, useMemo, useState } from 'react';
import { parseIsoDate } from '../utils/dataUtils.js';
import { lakeName, lakeClass } from '../utils/shared.js';
import useCurrentStandard from './useCurrentStandard.js';
import { fetchParamThresholds } from './useParamThresholds.js';

export default function useCompareBarDataMulti({ lakes = [], bucket = 'year', selectedYears = [], depth = '', selectedParam = '', lakeOptions = [] }) {
  const { current } = useCurrentStandard();
  const [thrMap, setThrMap] = useState({}); // lakeId -> { min, max, code }
  const [thrLoading, setThrLoading] = useState(false);

  // Resolve parameter code from any lake's events (fallback to selectedParam)
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
    for (const lk of lakes || []) { const found = search(lk.events || []); if (found) return found; }
    return sel || null;
  }, [lakes, selectedParam]);

  // Fetch thresholds per lake class
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        if (!current?.id || !paramCode || !Array.isArray(lakes) || lakes.length === 0) { setThrMap({}); setThrLoading(false); return; }
        setThrLoading(true);
        const tasks = lakes.map((lk) => {
          const classCode = lakeClass(lakeOptions, lk.id) || undefined;
          return fetchParamThresholds({ paramCode, appliedStandardId: current.id, classCode }).then((res) => ({ lakeId: lk.id, thr: res || { min: null, max: null, code: current?.code || null } }));
        });
        const results = await Promise.all(tasks);
        if (abort) return;
        const next = {};
        results.forEach(({ lakeId, thr }) => { next[String(lakeId)] = thr || { min: null, max: null, code: current?.code || null }; });
        setThrMap(next);
        setThrLoading(false);
      } catch {
        if (abort) return;
        setThrMap({});
        setThrLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [current?.id, current?.code, paramCode, JSON.stringify(lakes), JSON.stringify(lakeOptions)]);

  const memo = useMemo(() => {
    const years = Array.isArray(selectedYears) ? selectedYears.map(String) : [];
    if (thrLoading) return { labels: [], datasets: [], meta: { thresholdsLoading: true } };
    if (!selectedParam || !years.length || !Array.isArray(lakes) || lakes.length === 0) return { labels: [], datasets: [], meta: { thresholdsLoading: false } };

    const parse = parseIsoDate;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const toPeriodKey = (d) => {
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1..12
      if (bucket === 'year') return String(y);
      if (bucket === 'quarter') { const q = Math.floor((m - 1) / 3) + 1; return `${y}-Q${q}`; }
      return `${y}-${String(m).padStart(2,'0')}`;
    };
    const humanLabelFor = (key) => {
      if (!key) return key;
      if (/^\d{4}$/.test(key)) return key;
      const m = key.match(/^(\d{4})-Q(\d)$/); if (m) return `${m[1]} Q${m[2]}`;
      const mm = key.match(/^(\d{4})-(\d{2})$/); if (mm) return `${monthNames[Number(mm[2]) - 1]} ${mm[1]}`;
      return key;
    };
    const meanForPeriod = (events = [], periodKey) => {
      let sum = 0, cnt = 0;
      for (const ev of events || []) {
        const d = parse(ev?.sampled_at); if (!d) continue;
        const pk = toPeriodKey(d); if (String(pk) !== String(periodKey)) continue;
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

    // period keys from selected years
    const rawKeys = [];
    if (bucket === 'year') { years.forEach((yr) => rawKeys.push(String(yr))); }
    else if (bucket === 'quarter') { years.forEach((yr) => { for (let q = 1; q <= 4; q++) rawKeys.push(`${yr}-Q${q}`); }); }
    else { years.forEach((yr) => { for (let m = 1; m <= 12; m++) rawKeys.push(`${yr}-${String(m).padStart(2,'0')}`); }); }
    const uniqueKeys = Array.from(new Set(rawKeys));
    const orderValue = (pk) => {
      if (/^\d{4}$/.test(pk)) return Number(pk) * 12;
      const mq = pk.match(/^(\d{4})-Q(\d)$/); if (mq) return Number(mq[1]) * 12 + (Number(mq[2]) - 1) * 3;
      const mm = pk.match(/^(\d{4})-(\d{2})$/); if (mm) return Number(mm[1]) * 12 + (Number(mm[2]) - 1);
      return 0;
    };
    uniqueKeys.sort((a, b) => orderValue(a) - orderValue(b));

    // filter out periods where all lakes have null/0
    const filteredKeys = uniqueKeys.filter((pk) => {
      try {
        for (const lk of lakes) {
          const v = meanForPeriod(lk.events, pk);
          const num = Number(v);
          if (Number.isFinite(num) && num > 0) return true;
        }
        return false;
      } catch { return true; }
    });

    const periodLabels = filteredKeys.map((pk) => humanLabelFor(pk));
    const datasets = [];
    const lakeHasDataMap = {};

    lakes.forEach((lk) => {
      const data = filteredKeys.map((pk) => {
        const v = meanForPeriod(lk.events, pk);
        const num = Number(v);
        return Number.isFinite(num) ? (num === 0 ? null : num) : null;
      });
      const hasAny = data.some((v) => Number.isFinite(v));
      lakeHasDataMap[String(lk.id)] = hasAny;
      if (!hasAny) return; // omit lake from chart if no data
      datasets.push({
        label: lakeName(lakeOptions, lk.id) || String(lk.id),
        data,
        borderWidth: 1,
      });
    });

    // Meta grouping for year label plugin
    const yearsFromKeys = Array.from(new Set(filteredKeys.map((pk) => {
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
    const periodInfo = filteredKeys.map((pk, i) => ({
      key: pk,
      year: yearFromPk(pk),
      month: withinCountForBucket === 12 ? withinIndexFromPk(pk) + 1 : null,
      quarter: withinCountForBucket === 4 ? withinIndexFromPk(pk) + 1 : null,
      index: i,
    }));

    // Threshold lines
    const makeLine = (label, value, color) => {
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
      const stdKey = stdInfo.code || (current?.code || 'std');
      const uniqueKey = `${stdKey}::${stdInfo.min ?? 'null'}::${stdInfo.max ?? 'null'}`;
      if (!combinedStandards.has(uniqueKey)) combinedStandards.set(uniqueKey, { stdLabel: stdKey, min: stdInfo.min ?? null, max: stdInfo.max ?? null, lakes: new Set([lakeKey]) });
      else combinedStandards.get(uniqueKey).lakes.add(lakeKey);
    };

    lakes.forEach((lk) => {
      const thr = thrMap[String(lk.id)] || { min: null, max: null, code: current?.code || null };
      addStdEntry(thr, String(lk.id));
    });
    // Only render thresholds if all compared lakes share the same classification
    const classSet = new Set((lakes || []).map((lk) => lakeClass(lakeOptions, lk.id)).filter(Boolean).map(String));
    const sameClass = classSet.size === 1 && (lakes || []).length > 0;

    if (sameClass) {
      combinedStandards.forEach((entry) => {
        if (entry.lakes.size > 1) {
          if (entry.min != null) datasets.push(makeLine('Min', entry.min, '#16a34a'));
          if (entry.max != null) datasets.push(makeLine('Max', entry.max, '#ef4444'));
        } else {
          const onlyLakeKey = Array.from(entry.lakes)[0];
          const lakeLabel = lakeName(lakeOptions, onlyLakeKey) || String(onlyLakeKey || '');
          if (entry.min != null) datasets.push(makeLine(`Min — ${lakeLabel}`, entry.min, '#16a34a'));
          if (entry.max != null) datasets.push(makeLine(`Max — ${lakeLabel}`, entry.max, '#ef4444'));
        }
      });
    }

    const standards = sameClass
      ? Array.from(combinedStandards.values()).map((entry) => ({ code: entry.stdLabel, min: entry.min != null ? entry.min : null, max: entry.max != null ? entry.max : null, lakes: Array.from(entry.lakes) }))
      : [];

    const yearIndexMap = new Map();
    periodInfo.forEach((p) => { const arr = yearIndexMap.get(p.year) || []; arr.push(p.index); yearIndexMap.set(p.year, arr); });
    const yearIndexObj = {}; Array.from(yearIndexMap.entries()).forEach(([y, idxs]) => { yearIndexObj[y] = idxs; });
    const yearColors = {}; yearsFromKeys.forEach((y) => { yearColors[String(y)] = '#9ca3af'; });

    return { labels: periodLabels, datasets, meta: { years, standards, bucket, periodInfo, yearIndexMap: yearIndexObj, yearColors, yearOrder: yearsFromKeys, thresholdsLoading: false, lakeHasDataMap, sameClass } };
  }, [lakes, bucket, selectedYears, depth, selectedParam, lakeOptions, thrMap, thrLoading]);

  return { barData: memo, loadingThresholds: thrLoading, lakeHasDataMap: memo?.meta?.lakeHasDataMap || {} };
}

// Pure helper for testing: compute datasets without thresholds
