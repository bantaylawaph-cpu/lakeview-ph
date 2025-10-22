import { useMemo } from 'react';

// Build array of time-series chart data for all primary parameters in events
// Returns [{ id, code, name, unit, threshold: {min, max}, labels, avg, stats, chartData: {labels, datasets} }, ...]
export default function useMultiParamTimeSeriesData({ events, bucket }) {
  const seriesByParameter = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) return [];

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

    const byParam = new Map(); // paramId -> { code,name,unit, threshold:{min,max}, buckets: Map(timeKey -> { sum, cnt, min, max }) }

    for (const ev of events) {
      const d = parseDate(ev.sampled_at);
      const key = bucketKey(d, bucket);
      if (!key) continue;
      const results = Array.isArray(ev?.results) ? ev.results : [];
      for (const r of results) {
        const p = r?.parameter;
        if (!p) continue;
        const group = String(p.group || p.param_group || '').toLowerCase();
        if (group !== 'primary') continue;
        if (r.value == null) continue;
        const pid = r.parameter_id || p.id;
        if (!byParam.has(pid)) {
          byParam.set(pid, {
            id: pid,
            code: p.code || String(pid),
            name: p.name || p.code || String(pid),
            unit: p.unit || '',
            threshold: { min: r?.threshold?.min_value ?? null, max: r?.threshold?.max_value ?? null },
            buckets: new Map(),
          });
        }
        const entry = byParam.get(pid);
        if (entry && entry.threshold) {
          // Prefer a non-null threshold if earlier was null
          if (entry.threshold.min == null && r?.threshold?.min_value != null) entry.threshold.min = r.threshold.min_value;
          if (entry.threshold.max == null && r?.threshold?.max_value != null) entry.threshold.max = r.threshold.max_value;
        }
        const v = Number(r.value);
        if (!Number.isFinite(v)) continue;
        const b = entry.buckets.get(key) || { sum: 0, cnt: 0, min: v, max: v };
        b.sum += v; b.cnt += 1; b.min = Math.min(b.min, v); b.max = Math.max(b.max, v);
        entry.buckets.set(key, b);
      }
    }

    // Convert to array and sort buckets chronologically
    const out = [];
    for (const entry of byParam.values()) {
      const labels = Array.from(entry.buckets.keys()).sort((a,b) => bucketSortKey(a) - bucketSortKey(b));
      const stats = labels.map((k) => entry.buckets.get(k));
      const avg = stats.map((s) => (s && s.cnt ? s.sum / s.cnt : null));

      // Build Chart.js datasets
      const datasets = [
        {
          label: 'Avg',
          data: avg,
          borderColor: 'rgba(59,130,246,1)',
          backgroundColor: 'rgba(59,130,246,0.2)',
          pointRadius: 3,
          pointHoverRadius: 4,
          tension: 0.2,
        },
        entry.threshold.min != null ? {
          label: 'Min Threshold (time)',
          data: labels.map(() => Number(entry.threshold.min)),
          borderColor: 'rgba(16,185,129,1)',
          backgroundColor: 'rgba(16,185,129,0.15)',
          pointRadius: 0,
          borderDash: [4,4],
        } : null,
        entry.threshold.max != null ? {
          label: 'Max Threshold (time)',
          data: labels.map(() => Number(entry.threshold.max)),
          borderColor: 'rgba(239,68,68,1)',
          backgroundColor: 'rgba(239,68,68,0.15)',
          pointRadius: 0,
          borderDash: [4,4],
        } : null,
      ].filter(Boolean);

      out.push({
        ...entry,
        labels,
        avg,
        stats,
        chartData: { labels, datasets },
      });
    }
    // Sort parameters by name (fallback to code)
    out.sort((a,b) => String(a.name || a.code).localeCompare(String(b.name || b.code)));
    return out;
  }, [events, bucket]);

  return seriesByParameter;
}