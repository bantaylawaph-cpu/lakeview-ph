import { useMemo } from 'react';
import { eventStationName, parseIsoDate, depthBandKeyInt } from '../utils/dataUtils';
import { bucketKey as makeBucketKey, bucketSortKey as sortBucketKey } from '../utils/chartUtils';

// Build Chart.js line datasets for single-lake time series
// Props: { events, selectedParam, selectedStations, bucket, timeRange, dateFrom, dateTo, seriesMode, classForSelectedLake }
// depthSelection: 'all' (default) or a depth band key (string) to filter results to a single depth
export default function useTimeSeriesData({ events, selectedParam, selectedStations = [], bucket, timeRange, dateFrom, dateTo, seriesMode = 'avg', classForSelectedLake, depthSelection = 'all' }) {
  const chartData = useMemo(() => {
    if (!selectedParam) return null;
    const parseDate = parseIsoDate;
    const bucketKey = makeBucketKey;
    const bucketSortKey = sortBucketKey;
    let evs = Array.isArray(events) ? events : [];
    if (timeRange !== 'all') {
      const allDates = evs.map((e) => parseDate(e?.sampled_at)).filter((d) => d && !isNaN(d));
      const latest = allDates.length ? new Date(Math.max(...allDates)) : null;
      if (timeRange === 'custom') {
        const f = dateFrom ? new Date(dateFrom) : null;
        const t = dateTo ? new Date(dateTo) : null;
        evs = evs.filter((e) => { const d = parseDate(e?.sampled_at); if (!d) return false; if (f && d < f) return false; if (t && d > t) return false; return true; });
      } else if (latest) {
        const from = new Date(latest);
        if (timeRange === '5y') from.setFullYear(from.getFullYear() - 5);
        else if (timeRange === '3y') from.setFullYear(from.getFullYear() - 3);
        else if (timeRange === '1y') from.setFullYear(from.getFullYear() - 1);
        else if (timeRange === '6mo') from.setMonth(from.getMonth() - 6);
        evs = evs.filter((e) => { const d = parseDate(e?.sampled_at); return d && d >= from && d <= latest; });
      }
    }

    const overall = new Map(); // bucket -> {sum,cnt}
    const stationMaps = new Map(); // stationName -> Map(bucket -> {sum,cnt})
  const perStationDepthBands = new Map(); // stationName -> Map(depthKey -> Map(bucket -> {sum,cnt}))
    const depthBands = new Map(); // depthKey -> Map(bucket -> {sum,cnt})
    const depthBandKey = depthBandKeyInt;
    const thByStandard = new Map(); // stdKey -> { stdLabel, min, max, buckets: Set<string> }
    const ensureStdEntry = (stdKey, stdLabel) => {
      if (!thByStandard.has(stdKey)) thByStandard.set(stdKey, { stdLabel: stdLabel || `Standard ${stdKey}`, min: null, max: null, buckets: new Set() });
      return thByStandard.get(stdKey);
    };

    for (const ev of evs) {
      const sName = eventStationName(ev) || '';
      if (Array.isArray(selectedStations) && selectedStations.length && !selectedStations.includes(sName)) continue;
      const d = parseDate(ev.sampled_at);
      const bk = bucketKey(d, bucket);
      if (!bk) continue;
      const results = Array.isArray(ev?.results) ? ev.results : [];
      for (const r of results) {
        const p = r?.parameter;
        if (!p) continue;
        const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
        if (!match) continue;
        const v = Number(r.value);
        if (!Number.isFinite(v)) continue;
        // If a specific depth is selected, only include results matching that depth band
        const dkForResult = (r?.depth_m != null) ? String(depthBandKey(r.depth_m)) : 'NA';
        if (depthSelection && String(depthSelection) !== 'all' && String(depthSelection) !== dkForResult) {
          // skip this result because it doesn't match the user's selected depth
          continue;
        }
        const aggO = overall.get(bk) || { sum: 0, cnt: 0 };
        aggO.sum += v; aggO.cnt += 1; overall.set(bk, aggO);
        const st = stationMaps.get(sName) || new Map();
        const aggS = st.get(bk) || { sum: 0, cnt: 0 };
        aggS.sum += v; aggS.cnt += 1; st.set(bk, aggS); stationMaps.set(sName, st);
        // still collect depth-bands for the "all" option (and for display when depthSelection==='all')
        if (r?.depth_m != null) {
          const dk = depthBandKey(r.depth_m);
          const band = depthBands.get(dk) || new Map();
          const agg = band.get(bk) || { sum: 0, cnt: 0 };
          agg.sum += v; agg.cnt += 1; band.set(bk, agg); depthBands.set(dk, band);

          // also collect per-station per-depth aggregates so we can emit separate series
          try {
            const byStation = perStationDepthBands.get(sName) || new Map();
            const bandForStation = byStation.get(dk) || new Map();
            const aggPS = bandForStation.get(bk) || { sum: 0, cnt: 0 };
            aggPS.sum += v; aggPS.cnt += 1; bandForStation.set(bk, aggPS); byStation.set(dk, bandForStation); perStationDepthBands.set(sName, byStation);
          } catch (e) {
            // noop - defensive
          }
        }
        const stdId = r?.threshold?.standard_id ?? ev?.applied_standard_id ?? null;
        const stdKey = r?.threshold?.standard?.code || r?.threshold?.standard?.name || (stdId != null ? String(stdId) : null);
        const stdLabel = stdKey;
        if (stdKey != null && (r?.threshold?.min_value != null || r?.threshold?.max_value != null)) {
          const entry = ensureStdEntry(String(stdKey), stdLabel);
          if (r?.threshold?.min_value != null) entry.min = Number(r.threshold.min_value);
          if (r?.threshold?.max_value != null) entry.max = Number(r.threshold.max_value);
          entry.buckets.add(bk);
        }
      }
    }

    const allLabels = new Set();
    for (const k of overall.keys()) allLabels.add(k);
    for (const m of depthBands.values()) for (const k of m.keys()) allLabels.add(k);
    const labels = Array.from(allLabels).sort((a,b) => bucketSortKey(a) - bucketSortKey(b));
    const datasets = [];
    const depthKeys = Array.from(depthBands.keys()).filter((k)=>k!=='NA').sort((a,b)=>Number(a)-Number(b));
    if (depthKeys.length && seriesMode === 'avg') {
      const depthColors = ['#0ea5e9','#22c55e','#f97316','#ef4444','#a78bfa','#14b8a6','#f59e0b','#94a3b8','#e879f9','#10b981','#eab308','#60a5fa'];
      depthKeys.forEach((dk, idx) => {
        const m = depthBands.get(dk) || new Map();
        const data = labels.map((lb) => { const agg=m.get(lb); return agg && agg.cnt ? (agg.sum/agg.cnt) : null; });
        datasets.push({ label: `${dk} m`, data, borderColor: depthColors[idx % depthColors.length], backgroundColor: 'transparent', pointRadius: 3, pointHoverRadius: 4, tension: 0.2, spanGaps: true });
      });
    } else {
      if (seriesMode === 'per-station') {
        const colorFor = (i) => `hsl(${(i*40)%360} 80% 60%)`;
        let i = 0;
        // If depth bands exist and the user requested 'all' depths, emit a series per station per depth band
        if (depthKeys.length && String(depthSelection) === 'all') {
          for (const s of selectedStations) {
            const byStation = perStationDepthBands.get(s) || new Map();
            let si = 0;
            for (const dk of depthKeys) {
              const bandMap = byStation.get(dk) || new Map();
              const data = labels.map((lb) => { const agg = bandMap.get(lb); return agg && agg.cnt ? (agg.sum/agg.cnt) : null; });
              datasets.push({ label: `${s} — ${dk} m`, data, borderColor: colorFor(i++), backgroundColor: 'transparent', pointRadius: 2, pointHoverRadius: 4, tension: 0.15, spanGaps: true });
              si++;
            }
          }
        } else {
          // single series per station (aggregated across depths unless depthSelection is a specific band)
          for (const s of selectedStations) {
            const map = stationMaps.get(s) || new Map();
            const data = labels.map((lb) => { const agg = map.get(lb); return agg && agg.cnt ? (agg.sum/agg.cnt) : null; });
            datasets.push({ label: s, data, borderColor: colorFor(i++), backgroundColor: 'transparent', pointRadius: 2, pointHoverRadius: 4, tension: 0.15, spanGaps: true });
          }
        }
      } else {
        const data = labels.map((lb) => { const agg=overall.get(lb); return agg && agg.cnt ? (agg.sum/agg.cnt) : null; });
        datasets.push({ label: 'Avg', data, borderColor: 'rgba(59,130,246,1)', backgroundColor: 'rgba(59,130,246,0.2)', pointRadius: 3, pointHoverRadius: 4, tension: 0.2, spanGaps: true });
      }
    }

    const minColor = '#16a34a';
    const maxColor = '#ef4444';
    Array.from(thByStandard.entries()).forEach(([stdKey, entry]) => {
      if (entry.min != null) {
        const data = labels.map((lb) => entry.buckets.has(lb) ? entry.min : null);
        const clsLbl = classForSelectedLake ? ` (Class ${classForSelectedLake})` : '';
        datasets.push({ label: `${entry.stdLabel}${clsLbl} – Min`, data, borderColor: minColor, backgroundColor: `${minColor}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true });
      }
      if (entry.max != null) {
        const data = labels.map((lb) => entry.buckets.has(lb) ? entry.max : null);
        const clsLbl = classForSelectedLake ? ` (Class ${classForSelectedLake})` : '';
        datasets.push({ label: `${entry.stdLabel}${clsLbl} – Max`, data, borderColor: maxColor, backgroundColor: `${maxColor}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true });
      }
    });

    return { labels, datasets };
  }, [events, selectedParam, JSON.stringify(selectedStations), bucket, timeRange, dateFrom, dateTo, seriesMode, classForSelectedLake, depthSelection]);

  return chartData;
}
