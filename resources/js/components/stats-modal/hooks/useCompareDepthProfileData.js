import { useMemo } from 'react';
import { eventStationName, parseIsoDate } from '../utils/dataUtils';
import { groupLabel as makeGroupLabel, monthNames } from '../utils/chartUtils';
import { lakeName, lakeClass, normalizeDepthDatasets } from '../utils/shared';

export default function useCompareDepthProfileData({
  eventsA = [],
  eventsB = [],
  lakeA,
  lakeB,
  selectedParam,
  selectedStationsA = [],
  selectedStationsB = [],
  selectedOrgA,
  selectedOrgB,
  bucket,
  lakeOptions = [],
}) {
  return useMemo(() => {
    if (!selectedParam) return { datasets: [], maxDepth: 0, unit: '', hasDepthA: false, hasDepthB: false };
    const parseDate = parseIsoDate;
    const groupLabel = (d) => makeGroupLabel(d, bucket);
    const depthKey = (raw) => { const n = Number(raw); if (!Number.isFinite(n)) return null; return (Math.round(n * 2) / 2).toFixed(1); };
    const colorFor = (idx) => `hsl(${(idx * 60) % 360} 80% 55%)`;

    const unitRef = { current: '' };
    const buildGroups = (arr, stationsSel, orgSel) => {
      const groups = new Map(); // label -> Map(depthKey -> {sum,cnt})
      for (const ev of arr || []) {
        const oidEv = ev.organization_id ?? ev.organization?.id ?? null;
        if (orgSel && oidEv && String(oidEv) !== String(orgSel)) continue;
        const sName = eventStationName(ev) || '';
        if (stationsSel && stationsSel.length && !stationsSel.includes(sName)) continue;
        const d = parseDate(ev.sampled_at); const gl = groupLabel(d); if (!gl) continue;
        const results = Array.isArray(ev?.results) ? ev.results : [];
        for (const r of results) {
          const p = r?.parameter; if (!p) continue;
          const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
          if (!match || r?.value == null || r?.depth_m == null) continue;
          if (!unitRef.current) unitRef.current = p.unit || '';
          if (!groups.has(gl)) groups.set(gl, new Map());
          const depths = groups.get(gl);
          const dk = depthKey(r.depth_m); if (!dk) continue;
          const v = Number(r.value); if (!Number.isFinite(v)) continue;
          const agg = depths.get(dk) || { sum: 0, cnt: 0 };
          agg.sum += v; agg.cnt += 1; depths.set(dk, agg);
        }
      }
      return groups;
    };
    const groupsA = buildGroups(eventsA, selectedStationsA, selectedOrgA);
    const groupsB = buildGroups(eventsB, selectedStationsB, selectedOrgB);

    const datasets = [];
    let maxDepth = 0; let i = 0;
    const monthNamesOrder = monthNames;
    const orderFor = (groups) => (
      bucket === 'month' ? monthNamesOrder.filter((m) => groups.has(m))
      : bucket === 'quarter' ? ['Q1','Q2','Q3','Q4'].filter((q) => groups.has(q))
      : Array.from(groups.keys()).sort((a,b) => Number(a) - Number(b))
    );
    const pushDatasets = (groups, lakeLabel) => {
      const ordered = orderFor(groups);
      ordered.forEach((gl) => {
        const depths = groups.get(gl);
        let points = Array.from(depths.entries()).map(([dk, agg]) => {
          const y = Number(dk);
          const x = (agg && Number.isFinite(agg.sum) && Number.isFinite(agg.cnt) && agg.cnt > 0) ? (agg.sum / agg.cnt) : NaN;
          return { y: Number.isFinite(y) ? y : NaN, x: Number.isFinite(x) ? x : NaN };
        }).filter((pt) => Number.isFinite(pt.y) && Number.isFinite(pt.x)).sort((a,b) => a.y - b.y);
        if (!points.length) return;
        maxDepth = Math.max(maxDepth, points[points.length - 1].y || 0);
        datasets.push({ label: `${lakeLabel} – ${gl}`, data: points, parsing: false, showLine: true, borderColor: colorFor(i++), backgroundColor: 'transparent', pointRadius: 3, pointHoverRadius: 4, tension: 0.1 });
      });
    };
    const labelForLake = (lk) => lakeName(lakeOptions, lk) || String(lk || '') || '';
    if (lakeA) pushDatasets(groupsA, labelForLake(lakeA));
    if (lakeB) pushDatasets(groupsB, labelForLake(lakeB));

    const hasDepthIn = (groups) => {
      for (const depths of groups.values()) { if (depths && depths.size) return true; }
      return false;
    };
    const hasDepthA = hasDepthIn(groupsA);
    const hasDepthB = hasDepthIn(groupsB);

    return { datasets: normalizeDepthDatasets(datasets), maxDepth, unit: unitRef.current || '', hasDepthA, hasDepthB };
  }, [eventsA, eventsB, selectedParam, JSON.stringify(selectedStationsA), JSON.stringify(selectedStationsB), bucket, lakeOptions, lakeA, lakeB, selectedOrgA, selectedOrgB]);
}
