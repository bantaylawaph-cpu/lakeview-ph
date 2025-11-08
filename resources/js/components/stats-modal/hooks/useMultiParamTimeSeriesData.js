import { useEffect, useMemo, useState } from 'react';
import useCurrentStandard from './useCurrentStandard';
import { fetchParamThresholds } from './useParamThresholds';

// Build array of time-series chart data for all parameters in events
// Each chart's lines represent distinct depths; thresholds are overlaid as guides.
// Returns [{ id, code, name, unit, threshold: {min, max}, labels, statsByDepth, chartData }, ...]
export default function useMultiParamTimeSeriesData({ events, bucket, classCode }) {
  const { current } = useCurrentStandard();
  const [thrByCode, setThrByCode] = useState({});
  const [thrLoading, setThrLoading] = useState(false);

  // Derive unique parameter codes present in events to prefetch thresholds
  const paramCodes = useMemo(() => {
    const codes = new Set();
    (Array.isArray(events) ? events : []).forEach((ev) => {
      const results = Array.isArray(ev?.results) ? ev.results : [];
      results.forEach((r) => {
        const p = r?.parameter; if (p?.code) codes.add(String(p.code));
      });
    });
    return Array.from(codes);
  }, [events]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!current?.id || !paramCodes.length) { setThrByCode({}); setThrLoading(false); return; }
      setThrLoading(true);
      const pairs = await Promise.all(paramCodes.map(async (code) => {
        const thr = await fetchParamThresholds({ paramCode: code, appliedStandardId: current.id, classCode: classCode || undefined });
        return [code, thr];
      }));
      if (abort) return;
      const next = {};
      pairs.forEach(([code, thr]) => { next[String(code)] = thr || { min: null, max: null, code: current?.code || null }; });
      setThrByCode(next);
      setThrLoading(false);
    })();
    return () => { abort = true; };
  }, [current?.id, current?.code, JSON.stringify(paramCodes), classCode]);
  const seriesByParameter = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) return [];
    // Wait until thresholds loaded so initial render includes overlay lines (eliminates flash)
    if (thrLoading) return [];

    const parseDate = (iso) => { try { return new Date(iso); } catch { return null; } };
    const bucketKey = (d, mode) => {
      if (!d) return null;
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1..12
      const q = Math.floor((m - 1) / 3) + 1;
      if (mode === 'year') return `${y}`;
      if (mode === 'quarter') return `${y}-Q${q}`;
      return `${y}-${String(m).padStart(2,'0')}`; // month
    };
    const bucketSortKey = (k) => {
      // keys like YYYY, YYYY-Qn, YYYY-MM
      if (!k) return 0;
      const m = /^([0-9]{4})(?:-(?:Q([1-4])|([0-9]{2})))?$/.exec(k);
      if (!m) return 0;
      const y = Number(m[1]);
      const q = m[2] ? (Number(m[2]) * 3) : 0;
      const mo = m[3] ? Number(m[3]) : 0;
      return y * 12 + (q || mo);
    };

  const extractDepth = (r, ev) => {
      let d = r?.depth_m;
      if (d == null) d = r?.depth;
      if (d == null) d = r?.sample_depth_m;
      if (d == null) d = r?.sample_depth;
      if (d == null) d = r?.metadata?.depth_m;
      if (d == null) d = r?.metadata?.depth;
      if (d == null) d = ev?.depth_m ?? ev?.depth ?? ev?.sample_depth ?? null;
      let num = Number(d);
      if (!Number.isFinite(num)) num = 0; // default to 0m if not provided
      // floor to integer for consistency with other charts
      return Math.floor(num);
    };

    const depthColors = [
      { border: '#0ea5e9', fill: '#0ea5e933' }, // sky-500
      { border: '#22c55e', fill: '#22c55e33' }, // green-500
      { border: '#f97316', fill: '#f9731633' }, // orange-500
      { border: '#ef4444', fill: '#ef444433' }, // red-500
      { border: '#a78bfa', fill: '#a78bfa33' }, // violet-500
      { border: '#14b8a6', fill: '#14b8a633' }, // teal-500
      { border: '#f59e0b', fill: '#f59e0b33' }, // amber-500
      { border: '#94a3b8', fill: '#94a3b833' }, // slate-400
      { border: '#e879f9', fill: '#e879f933' }, // pink-500
      { border: '#10b981', fill: '#10b98133' }, // emerald-500
      { border: '#eab308', fill: '#eab30833' }, // yellow-500
      { border: '#60a5fa', fill: '#60a5fa33' }, // blue-500
    ];

    const colorForIndex = (i) => depthColors[i % depthColors.length];

  // paramId -> { id, code, name, unit, threshold, depths: Map(depthNum -> { label, buckets: Map(timeKey -> { sum,cnt,min,max }) }) }
    const byParam = new Map();

    for (const ev of events) {
      const d = parseDate(ev.sampled_at);
      const tKey = bucketKey(d, bucket);
      if (!tKey) continue;
      const results = Array.isArray(ev?.results) ? ev.results : [];
      for (const r of results) {
  const p = r?.parameter;
  if (!p) continue;
        const v = Number(r?.value);
        if (!Number.isFinite(v)) continue;
        const pid = r.parameter_id || p.id;
        if (!byParam.has(pid)) {
          byParam.set(pid, {
            id: pid,
            code: p.code || String(pid),
            name: p.name || p.code || String(pid),
            unit: p.unit || '',
            desc: p.desc || '',
            threshold: { min: null, max: null },
            depths: new Map(),
          });
        }
        const entry = byParam.get(pid);
        // Do not read thresholds from events; thresholds will be overlaid from current-standard fetch.
        const depthNum = extractDepth(r, ev);
        const depthLabel = `${depthNum} m`;
        if (!entry.depths.has(depthNum)) {
          entry.depths.set(depthNum, { label: depthLabel, buckets: new Map() });
        }
        const dep = entry.depths.get(depthNum);
        const b = dep.buckets.get(tKey) || { sum: 0, cnt: 0, min: v, max: v };
        b.sum += v; b.cnt += 1; b.min = Math.min(b.min, v); b.max = Math.max(b.max, v);
        dep.buckets.set(tKey, b);
      }
    }

    // Convert to array and build datasets per depth
    const out = [];
    for (const entry of byParam.values()) {
      // Union of all time keys across depths
      const timeKeySet = new Set();
      for (const dep of entry.depths.values()) {
        for (const k of dep.buckets.keys()) timeKeySet.add(k);
      }
      const labels = Array.from(timeKeySet.values()).sort((a,b) => bucketSortKey(a) - bucketSortKey(b));

      const datasets = [];
      const statsByDepth = new Map();
      const depthNums = Array.from(entry.depths.keys()).sort((a,b) => a - b); // shallow to deep
      depthNums.forEach((depthNum, idx) => {
        const dep = entry.depths.get(depthNum);
        const stats = labels.map((k) => dep.buckets.get(k) || null);
        const data = stats.map((s) => (s && s.cnt ? s.sum / s.cnt : null));
        statsByDepth.set(dep.label, stats);
        const { border, fill } = colorForIndex(idx);
        datasets.push({
          label: dep.label,
          data,
          borderColor: border,
          backgroundColor: fill,
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.2,
          // attach stats per point for tooltips
          metaStats: stats,
        });
      });

      // Threshold overlays from current standard (if available per parameter code)
      const thr = thrByCode?.[String(entry.code)] || null;
      if (thr && thr.min != null) {
        datasets.push({
          label: 'Min',
          data: labels.map(() => Number(thr.min)),
          borderColor: 'rgba(16,185,129,1)',
          backgroundColor: 'rgba(16,185,129,0.15)',
          pointRadius: 0,
          borderDash: [4,4],
        });
      }
      if (thr && thr.max != null) {
        datasets.push({
          label: 'Max',
          data: labels.map(() => Number(thr.max)),
          borderColor: 'rgba(239,68,68,1)',
          backgroundColor: 'rgba(239,68,68,0.15)',
          pointRadius: 0,
          borderDash: [4,4],
        });
      }

      out.push({
        id: entry.id,
        code: entry.code,
        name: entry.name,
        unit: entry.unit,
        desc: entry.desc || '',
        threshold: { min: (thrByCode?.[String(entry.code)]?.min ?? null), max: (thrByCode?.[String(entry.code)]?.max ?? null) },
        labels,
        statsByDepth, // Map depthLabel -> [{sum,cnt,min,max}|null]
        chartData: { labels, datasets },
      });
    }

    // Sort parameters by name (fallback to code)
    out.sort((a,b) => String(a.name || a.code).localeCompare(String(b.name || b.code)));
    return out;
  }, [events, bucket, thrByCode, thrLoading]);

  return { seriesByParameter, loadingThresholds: thrLoading };
}