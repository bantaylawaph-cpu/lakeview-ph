import React, { useEffect, useMemo, useState } from "react";
import { FiEye, FiDownload } from "react-icons/fi";
import { apiPublic, buildQuery } from "../../lib/api";
import { alertError } from "../../utils/alerts";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

/**
 * Props
 * - lake: { id, name, class_code? }
 */
function WaterQualityTab({ lake }) {
  const lakeId = lake?.id ?? null;
  const [orgs, setOrgs] = useState([]); // {id,name}
  const [orgId, setOrgId] = useState("");
  const [tests, setTests] = useState([]); // last 10 published tests for lake (optionally filtered by org)
  const [loading, setLoading] = useState(false);
  const [bucket, setBucket] = useState("month"); // 'year' | 'quarter' | 'month'

  // Load org options for this lake based on tests seen (client-side pass 1)
  const fetchTests = async (org = "") => {
    if (!lakeId) return;
    setLoading(true);
    try {
      const qs = buildQuery({ lake_id: lakeId, organization_id: org || undefined, limit: 10 });
      const res = await apiPublic(`/public/sample-events${qs}`);
      const rows = Array.isArray(res?.data) ? res.data : [];
      setTests(rows);
      // Derive orgs list from payload
      const uniq = new Map();
      rows.forEach((r) => {
        const oid = r.organization_id ?? r.organization?.id;
        const name = r.organization_name ?? r.organization?.name;
        if (oid && name && !uniq.has(String(oid))) uniq.set(String(oid), { id: oid, name });
      });
      setOrgs(Array.from(uniq.values()));

      // Dispatch markers for MapPage (persist while WQ tab active)
      const markers = rows
        .filter((r) => r && r.latitude != null && r.longitude != null)
        .map((r) => ({ lat: Number(r.latitude), lon: Number(r.longitude), label: (r.station?.name || null) }));
      try { window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } })); } catch {}
    } catch (e) {
      console.error("[WaterQualityTab] Failed to load tests", e);
      await alertError("Failed", e?.message || "Could not load water quality tests");
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setOrgId(""); setTests([]); setOrgs([]); if (lakeId) fetchTests(""); }, [lakeId]);
  useEffect(() => { if (lakeId != null) fetchTests(orgId); }, [orgId]);

  const handleViewStatic = () => {};
  const handleExport = () => {};

  const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "–");
  const hasAny = tests && tests.length > 0;

  // Helpers for time bucketing
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

  // Build per-parameter time series for primary group
  const seriesByParameter = useMemo(() => {
    if (!hasAny) return [];
    const byParam = new Map(); // paramId -> { code,name,unit, threshold:{min,max}, buckets: Map(key -> { sum, cnt, min, max }), points:[{date,value}] }

    for (const ev of tests) {
      const d = parseDate(ev.sampled_at);
      const key = bucketKey(d, bucket);
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
        if (!key) continue;
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
      out.push({
        ...entry,
        labels,
        avg,
        stats, // for tooltip: {sum,cnt,min,max}
      });
    }
    // Sort parameters by code
    out.sort((a,b) => String(a.code).localeCompare(String(b.code)));
    return out;
  }, [tests, bucket, hasAny]);

  const buildChart = (ev) => {
    const results = Array.isArray(ev?.results) ? ev.results : [];
    const filtered = results.filter((r) => r && r.parameter && String(r.parameter.group || r.parameter.param_group || "").toLowerCase() === "primary" && r.value != null);
    if (!filtered.length) return null;
    const labels = filtered.map((r) => r.parameter?.code || r.parameter?.name || String(r.parameter_id));
    const units = filtered.map((r) => r.parameter?.unit || "");

    const values = filtered.map((r) => (r.value == null ? null : Number(r.value)));
    const mins = filtered.map((r) => (r?.threshold?.min_value != null ? Number(r.threshold.min_value) : null));
    const maxs = filtered.map((r) => (r?.threshold?.max_value != null ? Number(r.threshold.max_value) : null));

    const data = {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Measured",
          data: values,
          backgroundColor: "rgba(59,130,246,0.6)",
          borderColor: "rgba(59,130,246,1)",
          borderWidth: 1,
          barThickness: 18,
        },
        {
          type: "line",
          label: "Threshold Min",
          data: mins,
          spanGaps: true,
          borderColor: "rgba(16,185,129,1)",
          backgroundColor: "rgba(16,185,129,0.2)",
          pointRadius: 2,
          pointHoverRadius: 3,
          borderDash: [4, 4],
          tension: 0,
        },
        {
          type: "line",
          label: "Threshold Max",
          data: maxs,
          spanGaps: true,
          borderColor: "rgba(239,68,68,1)",
          backgroundColor: "rgba(239,68,68,0.2)",
          pointRadius: 2,
          pointHoverRadius: 3,
          borderDash: [4, 4],
          tension: 0,
        },
      ],
    };

    const fmtTooltip = (ctx) => {
      const unit = units?.[ctx.dataIndex] || "";
      return `${ctx.dataset.label}: ${ctx.formattedValue}${unit ? ` ${unit}` : ""}`;
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: "#fff", boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: fmtTooltip,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#fff", maxRotation: 0, autoSkip: true },
          grid: { color: "rgba(255,255,255,0.2)" },
        },
        y: {
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.2)" },
        },
      },
    };
    return { data, options };
  };

  return (
    <>
      <h3 style={{ margin: '2px 0 8px 0', fontSize: 14, color: '#fff' }}>Primary Water Quality Parameters</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'end', gap: 6, marginBottom: 6, overflow: 'hidden' }}>
        <div className="form-group" style={{ minWidth: 0 }}>
          <label style={{ marginBottom: 2, fontSize: 11 }}>Organization</label>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ padding: '6px 8px' }}>
            <option value="">All</option>
            {orgs.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 90 }}>
          <label style={{ marginBottom: 2, fontSize: 11 }}>Bucket</label>
          <select value={bucket} onChange={(e) => setBucket(e.target.value)} style={{ padding: '6px 8px' }}>
            <option value="year">Year</option>
            <option value="quarter">Quarter</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={handleViewStatic} className="pill-btn liquid" title="Open static view" style={{ padding: '6px 10px' }}>
            <FiEye />
          </button>
          <button type="button" onClick={handleExport} className="pill-btn liquid" title="Export charts" style={{ padding: '6px 10px' }}>
              <FiDownload />
            </button>
        </div>
      </div>

      {!loading && !hasAny && (
        <div className="insight-card">
          <p style={{ margin: 0 }}><em>No published tests yet for this lake.</em></p>
        </div>
      )}

  <div style={{ display: "grid", gap: 6, overflowX: 'hidden' }}>
          {seriesByParameter.map((p) => {
            const title = `${p.code}${p.unit ? ` (${p.unit})` : ''}`;
            // Build chart config for this parameter
            const data = {
              labels: p.labels,
              datasets: [
                {
                  label: 'Avg',
                  data: p.avg,
                  borderColor: 'rgba(59,130,246,1)',
                  backgroundColor: 'rgba(59,130,246,0.2)',
                  pointRadius: 3,
                  pointHoverRadius: 4,
                  tension: 0.2,
                },
                p.threshold.min != null ? {
                  label: 'Min Threshold',
                  data: p.labels.map(() => Number(p.threshold.min)),
                  borderColor: 'rgba(16,185,129,1)',
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  pointRadius: 0,
                  borderDash: [4,4],
                } : null,
                p.threshold.max != null ? {
                  label: 'Max Threshold',
                  data: p.labels.map(() => Number(p.threshold.max)),
                  borderColor: 'rgba(239,68,68,1)',
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  pointRadius: 0,
                  borderDash: [4,4],
                } : null,
              ].filter(Boolean),
            };
            const options = {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      if (ctx.dataset.label !== 'Avg') return `${ctx.dataset.label}: ${ctx.formattedValue}${p.unit ? ` ${p.unit}` : ''}`;
                      const s = p.stats?.[ctx.dataIndex];
                      const v = ctx.formattedValue;
                      if (s && s.cnt) return `Avg: ${v}${p.unit ? ` ${p.unit}` : ''} (n=${s.cnt}, min=${s.min}, max=${s.max})`;
                      return `Avg: ${v}${p.unit ? ` ${p.unit}` : ''}`;
                    },
                  },
                },
              },
              scales: {
                x: { ticks: { color: '#fff', maxRotation: 0, autoSkip: true, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
                y: { ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
              },
            };
            return (
              <div key={p.id} className="insight-card" style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <h4 style={{ margin: 0 }}>{title}</h4>
                </div>
                <div className="wq-chart" style={{ height: 160 }}>
                  <Line data={data} options={options} />
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}

export default WaterQualityTab;
