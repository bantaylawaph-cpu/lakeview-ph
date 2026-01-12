import { useMemo } from 'react';
import { eventStationName, parseIsoDate, depthBandKeyInt } from '../utils/dataUtils';
import { bucketKey as makeBucketKey, bucketSortKey as sortBucketKey } from '../utils/chartUtils';

const DEFAULT_COLORS = [
  '#0ea5e9', // sky-500
  '#22c55e', // green-500
  '#f97316', // orange-500
  '#ef4444', // red-500
  '#a78bfa', // violet-400
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#94a3b8', // slate-400
  '#e879f9', // pink-400
  '#10b981', // emerald-500
  '#eab308', // yellow-500
  '#60a5fa', // blue-400
];

function resolveParamMeta(paramOptions, code) {
  const sel = String(code || '');
  if (!sel) return { code: '', label: '', unit: '' };
  const opt = (paramOptions || []).find((p) => String(p?.code || p?.key || p?.id) === sel);
  return {
    code: sel,
    label: opt?.label || opt?.name || opt?.code || sel,
    unit: opt?.unit || '',
  };
}

// Build Chart.js datasets for a "single chart" that renders all parameter lines.
// Intentional behavior:
// - No threshold lines
// - Averages values per bucket (across selected stations; across depths unless a specific depth band is chosen)
export default function useAllParamsTimeSeriesData({
  events,
  paramOptions,
  selectedParamCodes = null,
  selectedStations = [],
  bucket,
  timeRange,
  dateFrom,
  dateTo,
  depthSelection = 'all',
}) {
  const chartData = useMemo(() => {
    const evs0 = Array.isArray(events) ? events : [];
    if (!evs0.length) return null;

    const selectedSet = (() => {
      if (!Array.isArray(selectedParamCodes)) return null;
      const s = new Set(selectedParamCodes.map((c) => String(c || '')).filter(Boolean));
      return s.size ? s : null;
    })();

    const parseDate = parseIsoDate;
    const bucketKey = makeBucketKey;
    const bucketSortKey = sortBucketKey;

    let evs = evs0;
    if (timeRange !== 'all') {
      const allDates = evs.map((e) => parseDate(e?.sampled_at)).filter((d) => d && !isNaN(d));
      const latest = allDates.length ? new Date(Math.max(...allDates)) : null;
      if (timeRange === 'custom') {
        const f = dateFrom ? new Date(dateFrom) : null;
        const t = dateTo ? new Date(dateTo) : null;
        evs = evs.filter((e) => {
          const d = parseDate(e?.sampled_at);
          if (!d) return false;
          if (f && d < f) return false;
          if (t && d > t) return false;
          return true;
        });
      } else if (latest) {
        const from = new Date(latest);
        if (timeRange === '5y') from.setFullYear(from.getFullYear() - 5);
        else if (timeRange === '3y') from.setFullYear(from.getFullYear() - 3);
        else if (timeRange === '1y') from.setFullYear(from.getFullYear() - 1);
        else if (timeRange === '6mo') from.setMonth(from.getMonth() - 6);
        evs = evs.filter((e) => {
          const d = parseDate(e?.sampled_at);
          return d && d >= from && d <= latest;
        });
      }
    }

    // paramCode -> Map(bucket -> {sum,cnt})
    const byParam = new Map();
    const depthBandKey = depthBandKeyInt;

    for (const ev of evs) {
      const sName = eventStationName(ev) || '';
      if (Array.isArray(selectedStations) && selectedStations.length && !selectedStations.includes(sName)) continue;

      const d = parseDate(ev?.sampled_at);
      const bk = bucketKey(d, bucket);
      if (!bk) continue;

      const results = Array.isArray(ev?.results) ? ev.results : [];
      for (const r of results) {
        const p = r?.parameter;
        const code = String(p?.code || r?.parameter_code || r?.parameter_key || '');
        if (!code) continue;
        if (selectedSet && !selectedSet.has(code)) continue;

        const v = Number(r?.value);
        if (!Number.isFinite(v)) continue;

        // Optional depth filter (uses the same depth-band key convention as time series)
        if (depthSelection && String(depthSelection) !== 'all') {
          const dkForResult = (r?.depth_m != null) ? String(depthBandKey(r.depth_m)) : 'NA';
          if (String(depthSelection) !== dkForResult) continue;
        }

        const byBucket = byParam.get(code) || new Map();
        const agg = byBucket.get(bk) || { sum: 0, cnt: 0 };
        agg.sum += v;
        agg.cnt += 1;
        byBucket.set(bk, agg);
        byParam.set(code, byBucket);
      }
    }

    if (!byParam.size) return null;

    // Union buckets across parameters
    const allLabels = new Set();
    for (const m of byParam.values()) {
      for (const k of m.keys()) allLabels.add(k);
    }
    const labels = Array.from(allLabels).sort((a, b) => bucketSortKey(a) - bucketSortKey(b));

    // Deterministic ordering by label
    const codes = Array.from(byParam.keys()).sort((a, b) => {
      const ma = resolveParamMeta(paramOptions, a);
      const mb = resolveParamMeta(paramOptions, b);
      return String(ma.label || ma.code).localeCompare(String(mb.label || mb.code));
    });

    const datasets = codes.map((code, idx) => {
      const meta = resolveParamMeta(paramOptions, code);
      const m = byParam.get(code) || new Map();
      const data = labels.map((lb) => {
        const agg = m.get(lb);
        return agg && agg.cnt ? (agg.sum / agg.cnt) : null;
      });
      const color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
      return {
        label: `${meta.label}${meta.unit ? ` (${meta.unit})` : ''}`,
        data,
        borderColor: color,
        backgroundColor: 'transparent',
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.15,
        spanGaps: true,
        meta: { paramCode: meta.code, unit: meta.unit, label: meta.label },
      };
    });

    return {
      labels,
      datasets,
      meta: { allParameters: true },
    };
  }, [events, JSON.stringify(paramOptions || []), JSON.stringify(selectedParamCodes || []), JSON.stringify(selectedStations), bucket, timeRange, dateFrom, dateTo, depthSelection]);

  return { chartData };
}
