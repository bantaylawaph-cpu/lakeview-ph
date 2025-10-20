import { eventStationName, parseIsoDate, depthBandKeyInt } from './dataUtils';
import { bucketKey, bucketSortKey, groupLabel } from './chartUtils';

export const paramMatcher = (selected) => (r) => {
  const p = r?.parameter; if (!p) return false;
  return (String(p.code) === String(selected)) || (String(p.id) === String(selected)) || (String(r.parameter_id) === String(selected));
};

export function thresholdsFromEvents(events = [], selected, bucket) {
  const match = paramMatcher(selected);
  const thByStd = new Map(); // stdKey -> { stdLabel, min, max, buckets:Set }
  const ensure = (stdKey, stdLabel) => { if (!thByStd.has(stdKey)) thByStd.set(stdKey, { stdLabel, min: null, max: null, buckets: new Set() }); return thByStd.get(stdKey); };
  for (const ev of events) {
    const d = parseIsoDate(ev?.sampled_at); const bk = bucketKey(d, bucket); if (!bk) continue;
    const results = Array.isArray(ev?.results) ? ev.results : [];
    for (const r of results) {
      if (!match(r)) continue;
      const stdId = r?.threshold?.standard_id ?? ev?.applied_standard_id ?? null;
      const stdKey = r?.threshold?.standard?.code || r?.threshold?.standard?.name || (stdId != null ? String(stdId) : null);
      const stdLabel = stdKey;
      if (stdKey != null && (r?.threshold?.min_value != null || r?.threshold?.max_value != null)) {
        const e = ensure(String(stdKey), stdLabel);
        if (r?.threshold?.min_value != null) e.min = Number(r.threshold.min_value);
        if (r?.threshold?.max_value != null) e.max = Number(r.threshold.max_value);
        e.buckets.add(bk);
      }
    }
  }
  return thByStd;
}

export function combineStandardsAcrossLakes(thByLakeAndStd, lakes) {
  const combined = new Map(); // uniqueKey -> { stdLabel, min, max, buckets:Set, lakes:Set<string>, stdKey }
  lakes.forEach((lk) => {
    const lkKey = String(lk);
    const inner = thByLakeAndStd.get(lkKey);
    if (!inner) return;
    inner.forEach((entry, stdKey) => {
      const minVal = entry.min != null ? Number(entry.min) : null;
      const maxVal = entry.max != null ? Number(entry.max) : null;
      const uniqueKey = `${stdKey}::${minVal ?? 'null'}::${maxVal ?? 'null'}`;
      if (!combined.has(uniqueKey)) combined.set(uniqueKey, { stdLabel: entry.stdLabel, min: minVal, max: maxVal, buckets: new Set(entry.buckets), lakes: new Set([lkKey]), stdKey });
      else {
        const e = combined.get(uniqueKey);
        entry.buckets.forEach((b) => e.buckets.add(b));
        e.lakes.add(lkKey);
      }
    });
  });
  return combined;
}

export function buildTimeSeriesDatasets({ events = [], selected, stations = [], orgId, bucket = 'month', seriesMode = 'avg', lakeLabel }) {
  const match = paramMatcher(selected);
  const seriesMap = new Map(); // bucket -> {sum,cnt}
  const perStation = new Map(); // stationName -> Map(bucket -> {sum,cnt})
  const labelsSet = new Set();
  const thByStd = thresholdsFromEvents(events, selected, bucket);
  for (const ev of events) {
    const oidEv = ev.organization_id ?? ev.organization?.id ?? null;
    if (orgId && oidEv && String(oidEv) !== String(orgId)) continue;
    const sName = eventStationName(ev) || '';
    if (Array.isArray(stations) && stations.length && !stations.includes(sName)) continue;
    const d = parseIsoDate(ev?.sampled_at); const bk = bucketKey(d, bucket); if (!bk) continue;
    const results = Array.isArray(ev?.results) ? ev.results : [];
    for (const r of results) {
      if (!match(r)) continue;
      const v = Number(r.value); if (!Number.isFinite(v)) continue;
      // overall
      const agg = seriesMap.get(bk) || { sum: 0, cnt: 0 }; agg.sum += v; agg.cnt += 1; seriesMap.set(bk, agg);
      // per station
      const stMap = perStation.get(sName) || new Map();
      const aggS = stMap.get(bk) || { sum: 0, cnt: 0 }; aggS.sum += v; aggS.cnt += 1; stMap.set(bk, aggS); perStation.set(sName, stMap);
      labelsSet.add(bk);
    }
  }
  const labels = Array.from(labelsSet).sort((a,b) => bucketSortKey(a) - bucketSortKey(b));
  const datasets = [];
  if (seriesMode === 'per-station') {
    let i = 0; const colorFor = (idx) => `hsl(${(idx * 40) % 360} 80% 60%)`;
    for (const [st, map] of perStation.entries()) {
      const data = labels.map((lb) => { const agg = map.get(lb); return agg && agg.cnt ? (agg.sum / agg.cnt) : null; });
      datasets.push({ label: `${lakeLabel ? `${lakeLabel} — ` : ''}${st}`.trim(), data, borderColor: colorFor(i++), backgroundColor: 'transparent', pointRadius:2, pointHoverRadius:4, tension:0.15, spanGaps: true });
    }
  } else {
    const data = labels.map((lb) => { const agg = seriesMap.get(lb); return agg && agg.cnt ? (agg.sum / agg.cnt) : null; });
    datasets.push({ label: lakeLabel || 'Avg', data, borderColor: 'rgba(59,130,246,1)', backgroundColor: 'rgba(59,130,246,0.2)', pointRadius:3, pointHoverRadius:4, tension:0.2, spanGaps: true });
  }
  return { labels, datasets, thByStd, perStation };
}

export function buildDepthProfile({ events = [], selected, stations = [], bucket = 'month' }) {
  const match = paramMatcher(selected);
  const unitRef = { current: '' };
  const groups = new Map(); // label -> Map(depthKey -> {sum,cnt})
  for (const ev of events) {
    const sName = eventStationName(ev) || '';
    if (Array.isArray(stations) && stations.length && !stations.includes(sName)) continue;
    const d = parseIsoDate(ev?.sampled_at); const gl = groupLabel(d, bucket); if (!gl) continue;
    const results = Array.isArray(ev?.results) ? ev.results : [];
    for (const r of results) {
      if (!match(r) || r?.value == null || r?.depth_m == null) continue;
      if (!unitRef.current && r?.parameter?.unit) unitRef.current = r.parameter.unit;
      if (!groups.has(gl)) groups.set(gl, new Map());
      const depths = groups.get(gl);
      const dk = depthBandKeyInt(r.depth_m); if (!dk) continue;
      const v = Number(r.value); if (!Number.isFinite(v)) continue;
      const agg = depths.get(dk) || { sum: 0, cnt: 0 };
      agg.sum += v; agg.cnt += 1; depths.set(dk, agg);
    }
  }
  const datasets = [];
  const colorFor = (idx) => `hsl(${(idx * 60) % 360} 80% 55%)`;
  let maxDepth = 0; let i = 0;
  const monthNamesOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const orderFor = (groupsMap) => (
    bucket === 'month' ? monthNamesOrder.filter((m) => groupsMap.has(m))
    : bucket === 'quarter' ? ['Q1','Q2','Q3','Q4'].filter((q) => groupsMap.has(q))
    : Array.from(groupsMap.keys()).sort((a,b) => Number(a) - Number(b))
  );
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
    datasets.push({ label: gl, data: points, parsing: false, showLine: true, borderColor: colorFor(i++), backgroundColor: 'transparent', pointRadius: 3, pointHoverRadius: 4, tension: 0.1 });
  });
  // presence
  let hasDepth = false; for (const m of groups.values()) { if (m && m.size) { hasDepth = true; break; } }
  return { datasets, unit: unitRef.current || '', maxDepth, hasDepth };
}
