import { useMemo } from 'react';
import { eventStationName, parseIsoDate } from '../utils/dataUtils';
import { groupLabel as makeGroupLabel, monthNames } from '../utils/chartUtils';

// Build depth profile datasets for a single lake selection
export default function useDepthProfileData({ events, selectedParam, selectedStations = [], bucket }) {
  return useMemo(() => {
    if (!selectedParam || !selectedStations || !selectedStations.length) return { datasets: [], unit: '', maxDepth: 0, hasMultipleDepths: false, onlySurface: false };
    const parseDate = parseIsoDate;
    const groupLabel = (d) => makeGroupLabel(d, bucket);
    const depthKey = (raw) => { const n = Number(raw); if (!Number.isFinite(n)) return null; return (Math.round(n * 2) / 2).toFixed(1); };

    const unitRef = { current: '' };
    const groups = new Map(); // label -> Map(depthKey -> {sum,cnt})
    for (const ev of events) {
      const sName = eventStationName(ev) || '';
      if (!selectedStations.includes(sName)) continue;
      const d = parseDate(ev.sampled_at); const gLabel = groupLabel(d); if (!gLabel) continue;
      const results = Array.isArray(ev?.results) ? ev.results : [];
      for (const r of results) {
        const p = r?.parameter; if (!p) continue;
        const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
        if (!match || r?.value == null || r?.depth_m == null) continue;
        if (!unitRef.current) unitRef.current = p.unit || '';
        if (!groups.has(gLabel)) groups.set(gLabel, new Map());
        const depths = groups.get(gLabel);
        const dKey = depthKey(r.depth_m); if (!dKey) continue;
        const v = Number(r.value); if (!Number.isFinite(v)) continue;
        const agg = depths.get(dKey) || { sum: 0, cnt: 0 };
        agg.sum += v; agg.cnt += 1; depths.set(dKey, agg);
      }
    }

    const datasets = [];
    const colorFor = (idx) => `hsl(${(idx * 60) % 360} 80% 55%)`;
    let maxDepth = 0; let i = 0;
    const allDepthKeys = new Set();
    const orderedLabels = bucket === 'month'
      ? monthNames.filter((m) => groups.has(m))
      : bucket === 'quarter'
        ? ['Q1','Q2','Q3','Q4'].filter((q) => groups.has(q))
        : Array.from(groups.keys()).sort((a,b) => Number(a) - Number(b));
    orderedLabels.forEach((gLabel) => {
      const depths = groups.get(gLabel);
      const points = Array.from(depths.entries()).map(([dk, agg]) => {
        const y = Number(dk);
        const x = (agg && Number.isFinite(agg.sum) && Number.isFinite(agg.cnt) && agg.cnt > 0) ? (agg.sum / agg.cnt) : NaN;
        if (!Number.isFinite(y) || !Number.isFinite(x)) return null;
        allDepthKeys.add(dk);
        return { y, x };
      }).filter(Boolean).sort((a,b) => a.y - b.y);
      if (!points.length) return;
      maxDepth = Math.max(maxDepth, points[points.length - 1].y || 0);
      datasets.push({ label: gLabel, data: points, parsing: false, showLine: true, borderColor: colorFor(i++), backgroundColor: 'transparent', pointRadius: 3, pointHoverRadius: 4, tension: 0.1 });
    });
    const uniqueDepths = Array.from(allDepthKeys).map((d) => Number(d)).filter((n) => Number.isFinite(n));
    const distinct = new Set(uniqueDepths.map((n) => n.toFixed(1)));
    const hasMultipleDepths = distinct.size >= 2;
    const onlySurface = distinct.size === 1 && (distinct.has('0.0') || distinct.has('0'));
    return { datasets, unit: unitRef.current || '', maxDepth, hasMultipleDepths, onlySurface };
  }, [events, selectedParam, JSON.stringify(selectedStations), bucket]);
}
