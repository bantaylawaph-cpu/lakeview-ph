import { useMemo } from 'react';
import { eventStationName, parseIsoDate, depthBandKeyInt } from '../utils/dataUtils';
import { bucketKey as makeBucketKey, bucketSortKey as sortBucketKey } from '../utils/chartUtils';
import { lakeName, lakeClass } from '../utils/shared';

export default function useCompareTimeSeriesData({
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
  seriesMode = 'avg',
}) {
  return useMemo(() => {
    const selected = selectedParam;
    const lakesToRender = [lakeA, lakeB].filter(Boolean);
    if (!selected || lakesToRender.length === 0) return null;
    const parseDate = parseIsoDate;
    const bucketKey = makeBucketKey;
    const bucketSortKey = sortBucketKey;

    const lakeMaps = new Map();
    const perStationMaps = {}; // lakeKey -> Map(stationName -> Map(bucket -> agg))
    const thByLakeAndStandard = new Map(); // lakeId -> Map(stdKey -> { stdLabel, min, max, buckets:Set })
    const ensureStdEntry = (lkKey, stdKey, stdLabel) => {
      if (!thByLakeAndStandard.has(lkKey)) thByLakeAndStandard.set(lkKey, new Map());
      const inner = thByLakeAndStandard.get(lkKey);
      if (!inner.has(stdKey)) inner.set(stdKey, { stdLabel: stdLabel || `Standard ${stdKey}`, min: null, max: null, buckets: new Set() });
      return inner.get(stdKey);
    };
    const process = (lakeId, arr, stationsSel, orgSel) => {
      for (const ev of arr||[]) {
        const oidEv = ev.organization_id ?? ev.organization?.id ?? null;
        if (orgSel && oidEv && String(oidEv) !== String(orgSel)) continue;
        if (stationsSel && stationsSel.length) { const nm = eventStationName(ev) || ''; if (!stationsSel.includes(nm)) continue; }
        const d = parseDate(ev.sampled_at); const bk=bucketKey(d,bucket); if(!bk) continue;
        const results = Array.isArray(ev?.results)?ev.results:[];
        for (const r of results) {
          const p=r?.parameter; if(!p) continue;
          const match=(String(p.code)===String(selected))||(String(p.id)===String(selected))||(String(r.parameter_id)===String(selected));
          if(!match) continue;
          const v=Number(r.value); if(!Number.isFinite(v)) continue;
          const key=String(lakeId); if(!lakeMaps.has(key)) lakeMaps.set(key,new Map());
          const m=lakeMaps.get(key); const agg=m.get(bk)||{sum:0,cnt:0}; agg.sum+=v; agg.cnt+=1; m.set(bk,agg);
          try {
            const nm = eventStationName(ev) || '';
            if (!perStationMaps[key]) perStationMaps[key] = new Map();
            const lakeMap = perStationMaps[key];
            const stMap = lakeMap.get(nm) || new Map();
            const aggS = stMap.get(bk) || { sum:0, cnt:0 };
            aggS.sum += v; aggS.cnt += 1; stMap.set(bk, aggS); lakeMap.set(nm, stMap);
          } catch (e) { /* noop */ }
          const stdId = r?.threshold?.standard_id ?? ev?.applied_standard_id ?? null;
          const stdKey = r?.threshold?.standard?.code || r?.threshold?.standard?.name || (stdId != null ? String(stdId) : null);
          const stdLabel = stdKey;
          if (stdKey != null && (r?.threshold?.min_value != null || r?.threshold?.max_value != null)) {
            const entry = ensureStdEntry(key, String(stdKey), stdLabel);
            if (r?.threshold?.min_value != null) entry.min = Number(r.threshold.min_value);
            if (r?.threshold?.max_value != null) entry.max = Number(r.threshold.max_value);
            entry.buckets.add(bk);
          }
        }
      }
    };

    // We expect caller to pre-filter arrays by time range anchoring
    process(lakeA, eventsA, selectedStationsA, selectedOrgA);
    process(lakeB, eventsB, selectedStationsB, selectedOrgB);

    const labelSet=new Set(); for(const m of lakeMaps.values()) for(const k of m.keys()) labelSet.add(k);
    const labels=Array.from(labelSet).sort((a,b)=>bucketSortKey(a)-bucketSortKey(b));
    const datasets=[];

    const depthBandsByLake = new Map();
    const collectDepthsFor = (lakeId, arr, stationsSel, orgSel) => {
      if (!lakeId) return;
      const lkKey = String(lakeId);
      if (!depthBandsByLake.has(lkKey)) depthBandsByLake.set(lkKey, new Map());
      const mapForLake = depthBandsByLake.get(lkKey);
      for (const ev of arr||[]) {
        const oidEv = ev.organization_id ?? ev.organization?.id ?? null;
        if (orgSel && oidEv && String(oidEv) !== String(orgSel)) continue;
        const sName = eventStationName(ev) || '';
        if (stationsSel && stationsSel.length && !stationsSel.includes(sName)) continue;
        const d = parseDate(ev.sampled_at); const bk=bucketKey(d,bucket); if(!bk) continue;
        const results = Array.isArray(ev?.results)?ev.results:[];
        for (const r of results) {
          const p = r?.parameter; if(!p) continue;
          const match = (String(p.code)===String(selected))||(String(p.id)===String(selected))||(String(r.parameter_id)===String(selected));
          if(!match) continue;
          if (r?.depth_m == null) continue;
          const dk = depthBandKeyInt(r.depth_m);
          if (!mapForLake.has(dk)) mapForLake.set(dk, new Map());
          const band = mapForLake.get(dk);
          const agg = band.get(bk) || { sum:0, cnt:0 };
          const v = Number(r.value); if (!Number.isFinite(v)) continue;
          agg.sum += v; agg.cnt += 1; band.set(bk, agg);
        }
      }
    };
    collectDepthsFor(lakeA, eventsA, selectedStationsA, selectedOrgA);
    collectDepthsFor(lakeB, eventsB, selectedStationsB, selectedOrgB);
    const ensureZeroDepthIfMissing = (lk) => {
      if (!lk) return;
      const lkKey = String(lk);
      const depthMap = depthBandsByLake.get(lkKey) || new Map();
      const seriesMap = lakeMaps.get(lkKey) || new Map();
      if (depthMap.size === 0 && seriesMap.size > 0) {
        const band = new Map();
        for (const [lb, agg] of seriesMap.entries()) band.set(lb, { sum: agg.sum, cnt: agg.cnt });
        depthMap.set('0', band);
        depthBandsByLake.set(lkKey, depthMap);
      }
    };
    ensureZeroDepthIfMissing(lakeA);
    ensureZeroDepthIfMissing(lakeB);

    const hasDepthSeries = Array.from(depthBandsByLake.values()).some((m) => (m && m.size > 0));
    const depthColorsA = ['#2563EB', '#059669', '#14B8A6', '#10B981', '#06B6D4', '#0EA5E9', '#22C55E', '#2DD4BF'];
    const depthColorsB = ['#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#EC4899', '#A855F7', '#FB7185', '#EAB308'];
    const nameForLake = (lk) => lakeName(lakeOptions, lk) || String(lk || '') || '';
    const classForLake = (lk) => lakeClass(lakeOptions, lk) || '';

    if (seriesMode === 'avg' && hasDepthSeries) {
      lakesToRender.forEach((lk, li) => {
        const lakeKey = String(lk);
        const lakeDepthMap = depthBandsByLake.get(lakeKey) || new Map();
        const depthKeys = Array.from(lakeDepthMap.keys()).filter((k) => k !== 'NA').sort((a,b) => Number(a) - Number(b));
        let di = 0;
        for (const dk of depthKeys) {
          const bandMap = lakeDepthMap.get(dk) || new Map();
          const data = labels.map((lb) => { const agg = bandMap.get(lb); return agg && agg.cnt ? (agg.sum/agg.cnt) : null; });
          const palette = li === 0 ? depthColorsA : depthColorsB;
          const pointStyle = li === 0 ? 'circle' : 'triangle';
          datasets.push({ label: `${nameForLake(lk) || String(lk)} — ${dk} m`, data, borderColor: palette[di % palette.length], backgroundColor: 'transparent', pointRadius: 3, pointStyle, pointHoverRadius: 4, borderWidth: 2.5, tension: 0.2, spanGaps: true });
          di++;
        }
      });
    } else {
      lakesToRender.forEach((lk,i)=>{
        if (seriesMode === 'per-station') {
          const lakeKey = String(lk);
          const lakeStationMap = perStationMaps[lakeKey] || new Map();
          let si = 0;
          for (const [stationName, map] of lakeStationMap.entries()) {
            const data = labels.map((lb)=>{ const agg=map.get(lb); return agg&&agg.cnt?(agg.sum/agg.cnt):null; });
            datasets.push({ label: `${nameForLake(lk)} — ${stationName}`, data, borderColor: `hsl(${(si*50)%360} 80% 60%)`, backgroundColor: 'transparent', pointRadius:2, pointHoverRadius:4, tension:0.15, spanGaps: true });
            si++;
          }
        } else {
          const seriesMap = lakeMaps.get(String(lk)) || new Map();
          const data = labels.map((lb)=>{ const agg=seriesMap.get(lb); return agg&&agg.cnt?(agg.sum/agg.cnt):null; });
          datasets.push({ label: nameForLake(lk), data, borderColor: i===0?'rgba(59,130,246,1)':`hsl(${(i*70)%360} 80% 60%)`, backgroundColor: i===0?'rgba(59,130,246,0.2)':`hsl(${(i*70)%360} 80% 60% / 0.2)`, pointRadius:3, pointHoverRadius:4, tension:0.2, spanGaps: true });
        }
      });
    }

    const combinedStandards = new Map(); // uniqueKey -> { stdLabel, min, max, buckets:Set, lakes:Set, stdKey }
    lakesToRender.forEach((lk) => {
      const lkKey = String(lk);
      const inner = thByLakeAndStandard.get(lkKey);
      if (!inner) return;
      inner.forEach((entry, stdKey) => {
        const minVal = entry.min != null ? Number(entry.min) : null;
        const maxVal = entry.max != null ? Number(entry.max) : null;
        const uniqueKey = `${stdKey}::${minVal ?? 'null'}::${maxVal ?? 'null'}`;
        if (!combinedStandards.has(uniqueKey)) combinedStandards.set(uniqueKey, { stdLabel: entry.stdLabel, min: minVal, max: maxVal, buckets: new Set(entry.buckets), lakes: new Set([lkKey]), stdKey });
        else {
          const e = combinedStandards.get(uniqueKey);
          entry.buckets.forEach((b) => e.buckets.add(b));
          e.lakes.add(lkKey);
        }
      });
    });

    const minColorUnified = '#16a34a';
    const maxColorUnified = '#ef4444';
    const lakeMinColors = ['#16a34a', '#f59e0b'];
    const lakeMaxColors = ['#ef4444', '#f97316'];

    combinedStandards.forEach((entry) => {
      if (entry.lakes.size > 1) {
        const lakesMeta = Array.from(entry.lakes).map((lkKey) => {
          const nm = nameForLake(lkKey);
          const cls = classForLake(lkKey);
          return `${nm}${cls ? `: Class ${cls}` : ''}`;
        }).join(', ');
        if (entry.min != null) {
          const data = labels.map((lb) => entry.buckets.has(lb) ? entry.min : null);
          datasets.push({ label: `${entry.stdLabel} – Min (${lakesMeta})`, data, borderColor: minColorUnified, backgroundColor: `${minColorUnified}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true });
        }
        if (entry.max != null) {
          const data = labels.map((lb) => entry.buckets.has(lb) ? entry.max : null);
          datasets.push({ label: `${entry.stdLabel} – Max (${lakesMeta})`, data, borderColor: maxColorUnified, backgroundColor: `${maxColorUnified}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true });
        }
      } else {
        const onlyLakeKey = Array.from(entry.lakes)[0];
        const li = lakesToRender.findIndex((lk) => String(lk) === onlyLakeKey);
        const minColor = lakeMinColors[li % lakeMinColors.length];
        const maxColor = lakeMaxColors[li % lakeMaxColors.length];
        const lakeLabel = nameForLake(onlyLakeKey);
        const cls = classForLake(onlyLakeKey);
        if (entry.min != null) {
          const data = labels.map((lb) => entry.buckets.has(lb) ? entry.min : null);
          datasets.push({ label: `${lakeLabel}${cls ? ` – Class ${cls}` : ''} – ${entry.stdLabel} – Min`, data, borderColor: minColor, backgroundColor: `${minColor}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true });
        }
        if (entry.max != null) {
          const data = labels.map((lb) => entry.buckets.has(lb) ? entry.max : null);
          datasets.push({ label: `${lakeLabel}${cls ? ` – Class ${cls}` : ''} – ${entry.stdLabel} – Max`, data, borderColor: maxColor, backgroundColor: `${maxColor}33`, borderDash: [4,4], pointRadius: 0, tension: 0, spanGaps: true });
        }
      }
    });

    return { labels, datasets };
  }, [eventsA, eventsB, lakeA, lakeB, selectedStationsA, selectedStationsB, selectedOrgA, selectedOrgB, selectedParam, bucket, lakeOptions, seriesMode]);
}
