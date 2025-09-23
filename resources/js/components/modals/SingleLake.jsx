import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

export default function SingleLake({
  lakeOptions,
  selectedLake,
  onLakeChange,
  orgOptions,
  selectedOrg,
  onOrgChange,
  stations,
  selectedStations,
  onStationsChange,
  paramOptions,
  selectedParam,
  onParamChange,
  thresholds,
  currentRecords,
  selectedClass,
  bucket,
  chartOptions,
  chartRef,
}) {
  const [stationsOpen, setStationsOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    // If upstream filters/data changed, require Apply again
    setApplied(false);
  }, [currentRecords]);

  const chartData = useMemo(() => {
    if (!selectedParam) return null;
    const bucketKey = (d, mode) => {
      if (!d) return null;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (mode === 'year') return `${y}`;
      if (mode === 'quarter') return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
      return `${y}-${String(m).padStart(2,'0')}`;
    };
    const labelSet = new Set();
    const bucketSortKeyLocal = (k) => {
      if (!k) return 0;
      const m = /^([0-9]{4})(?:-(?:Q([1-4])|([0-9]{2})))?$/.exec(k);
      if (!m) return 0;
      const y = Number(m[1]);
      const q = m[2] ? (Number(m[2]) * 3) : 0;
      const mo = m[3] ? Number(m[3]) : 0;
      return y * 12 + (q || mo);
    };
    const byStationMap = new Map();
    for (const r of currentRecords) {
      const key = r.area || r.stationCode || "";
      if (Array.isArray(selectedStations) && selectedStations.length && !selectedStations.includes(key)) continue;
      if (!r.date) continue;
      const bk = bucketKey(r.date, bucket);
      if (!bk) continue;
      labelSet.add(bk);
    }
    for (const r of currentRecords) {
      const key = r.area || r.stationCode || "";
      if (Array.isArray(selectedStations) && selectedStations.length && !selectedStations.includes(key)) continue;
      const val = r?.[selectedParam]?.value ?? null;
      if (val == null || !r.date) continue;
      const bk = bucketKey(r.date, bucket);
      if (!bk) continue;
      if (!byStationMap.has(key)) byStationMap.set(key, new Map());
      const m = byStationMap.get(key);
      if (!m.has(bk)) m.set(bk, []);
      m.get(bk).push(val);
    }
    const labels = Array.from(labelSet).sort((a,b) => bucketSortKeyLocal(a) - bucketSortKeyLocal(b));

    const staticDef = thresholds[selectedParam];
    const findServerThreshold = () => {
      for (const rec of currentRecords) {
        const t = rec?.[selectedParam]?.threshold;
        if (!t) continue;
        if (selectedParam === 'pH') {
          if (t.min != null && t.max != null) return { min: Number(t.min), max: Number(t.max) };
        } else {
          const typ = staticDef?.type || null;
          if (typ === 'max' && t.max != null) return { value: Number(t.max), kind: 'max' };
          if (typ === 'min' && t.min != null) return { value: Number(t.min), kind: 'min' };
          if (t.max != null) return { value: Number(t.max), kind: 'max' };
          if (t.min != null) return { value: Number(t.min), kind: 'min' };
        }
      }
      return null;
    };
    const serverTh = findServerThreshold();

    const datasets = Array.from(byStationMap.entries()).map(([label, seriesMap], i) => {
      const data = [];
      const pointBackgroundColor = [];
      const pointRadius = [];
      for (const l of labels) {
        const arr = seriesMap.get(l);
        if (!arr || !arr.length) {
          data.push(null);
          pointBackgroundColor.push(undefined);
          pointRadius.push(0);
          continue;
        }
        const sum = arr.reduce((a,b) => a + b, 0);
        const avg = sum / arr.length;
        data.push(avg);
        let isOut = false;
        if (selectedParam === 'pH') {
          const rng = (serverTh && serverTh.min != null && serverTh.max != null)
            ? [serverTh.min, serverTh.max]
            : (thresholds.pH.range[selectedClass] || null);
          if (rng) isOut = (avg < rng[0] || avg > rng[1]);
        } else {
          const thVal = (serverTh && typeof serverTh.value === 'number')
            ? { value: serverTh.value, kind: serverTh.kind }
            : (staticDef && (staticDef[selectedClass] != null) ? { value: Number(staticDef[selectedClass]), kind: (staticDef.type === 'min' ? 'min' : 'max') } : null);
          if (thVal) isOut = thVal.kind === 'max' ? (avg > thVal.value) : (avg < thVal.value);
        }
        if (isOut) {
          pointBackgroundColor.push('rgba(239,68,68,1)');
          pointRadius.push(5);
        } else {
          pointBackgroundColor.push(i === 0 ? 'rgba(59,130,246,1)' : `hsl(${(i * 70) % 360} 80% 60%)`);
          pointRadius.push(3);
        }
      }
      return {
        label,
        data,
        borderColor: i === 0 ? 'rgba(59,130,246,1)' : `hsl(${(i * 70) % 360} 80% 60%)`,
        backgroundColor: i === 0 ? 'rgba(59,130,246,0.2)' : `hsl(${(i * 70) % 360} 80% 60% / 0.2)`,
        pointBackgroundColor,
        pointRadius,
        tension: 0.2,
      };
    });

    // threshold overlay series
    if (selectedParam === 'pH') {
      if (serverTh && serverTh.min != null && serverTh.max != null) {
        datasets.push(
          { label: `Min Threshold`, data: labels.map(() => serverTh.min), borderColor: 'rgba(16,185,129,1)', backgroundColor: 'rgba(16,185,129,0.15)', borderDash: [4, 4], pointRadius: 0, tension: 0 },
          { label: `Max Threshold`, data: labels.map(() => serverTh.max), borderColor: 'rgba(239,68,68,1)', backgroundColor: 'rgba(239,68,68,0.15)', borderDash: [4, 4], pointRadius: 0, tension: 0 }
        );
      } else {
        const rng = thresholds.pH.range[selectedClass];
        if (rng) {
          datasets.push(
            { label: `Min Threshold`, data: labels.map(() => rng[0]), borderColor: 'rgba(16,185,129,1)', backgroundColor: 'rgba(16,185,129,0.15)', borderDash: [4, 4], pointRadius: 0, tension: 0 },
            { label: `Max Threshold`, data: labels.map(() => rng[1]), borderColor: 'rgba(239,68,68,1)', backgroundColor: 'rgba(239,68,68,0.15)', borderDash: [4, 4], pointRadius: 0, tension: 0 }
          );
        }
      }
    } else {
      const thStatic = staticDef ? (staticDef[selectedClass] ?? null) : null;
      const thObj = thStatic != null ? { value: Number(thStatic), kind: (staticDef?.type === 'min' ? 'min' : 'max') } : null;
      if (thObj && thObj.value != null) {
        const isMin = thObj.kind === 'min';
        const color = isMin ? 'rgba(16,185,129,1)' : 'rgba(239,68,68,1)';
        const bg = isMin ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
        const lbl = isMin ? 'Min Threshold' : 'Max Threshold';
        datasets.push({ label: lbl, data: labels.map(() => thObj.value), borderColor: color, backgroundColor: bg, borderDash: [4, 4], pointRadius: 0, tension: 0 });
      }
    }

    return { labels, datasets };
  }, [currentRecords, selectedParam, selectedStations, selectedClass, bucket, thresholds]);

  const singleChartOptions = useMemo(() => {
    if (!chartData) return chartOptions;
    const ys = [];
    for (const ds of chartData.datasets || []) {
      for (const v of ds.data || []) if (v != null && Number.isFinite(Number(v))) ys.push(Number(v));
    }
    if (!ys.length) return chartOptions;
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const span = max - min;
    const pad = span > 0 ? span * 0.08 : Math.max(1, Math.abs(max) * 0.08 || 1);
    return {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: { ...chartOptions.scales.y, suggestedMin: min - pad, suggestedMax: max + pad },
      },
    };
  }, [chartData, chartOptions]);

  const isComplete = Boolean(
    selectedLake && (selectedStations && selectedStations.length) && selectedParam
  );

  return (
    <div className="insight-card">
      <h4>Single Lake</h4>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <select className="pill-btn" value={selectedLake} onChange={(e) => { onLakeChange(e.target.value); setApplied(false); }}>
          <option value="">Select lake</option>
          {lakeOptions.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select className="pill-btn" value={selectedOrg} onChange={(e) => { onOrgChange(e.target.value); setApplied(false); }} disabled={!selectedLake}>
          <option value="">All orgs</option>
          {orgOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {/* Stations checkbox dropdown */}
        <div style={{ position: 'relative' }}>
          <button type="button" className="pill-btn" disabled={!selectedLake} onClick={() => setStationsOpen((v) => !v)}>
            {selectedStations.length ? `${selectedStations.length} selected` : 'Select locations'}
          </button>
          {stationsOpen && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 1000, minWidth: 220, maxHeight: 200, overflowY: 'auto', background: 'rgba(20,40,80,0.95)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: 8 }}>
              {stations.length ? stations.map((s) => {
                const checked = selectedStations.includes(s);
                return (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checked} onChange={() => {
                      const next = checked ? selectedStations.filter((x) => x !== s) : [...selectedStations, s];
                      onStationsChange(next);
                      onParamChange("");
                      setApplied(false);
                    }} />
                    <span>{s}</span>
                  </label>
                );
              }) : (
                <div style={{ opacity: 0.8 }}>No locations…</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <button type="button" className="pill-btn" onClick={() => { onStationsChange(stations.slice()); setApplied(false); }}>Select All</button>
                <button type="button" className="pill-btn" onClick={() => { onStationsChange([]); setApplied(false); }}>Clear</button>
                <button type="button" className="pill-btn liquid" onClick={() => setStationsOpen(false)}>Done</button>
              </div>
            </div>
          )}
        </div>
        <select className="pill-btn" value={selectedParam} onChange={(e) => { onParamChange(e.target.value); setApplied(false); }} disabled={!(selectedStations && selectedStations.length)}>
          <option value="">Select parameter</option>
          {paramOptions.map((p) => (
            <option key={p.key || p.id || p.code} value={p.key || p.id || p.code}>{p.label || p.name || p.code}</option>
          ))}
        </select>
        <button type="button" className="pill-btn liquid" disabled={!isComplete} onClick={() => setApplied(true)}>Apply</button>
      </div>
      <div className="wq-chart" style={{ height: 300, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", padding: 8 }}>
        {applied && chartData && chartData.datasets.length ? (
          <Line ref={chartRef} data={chartData} options={singleChartOptions} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ opacity: 0.9 }}>{isComplete ? 'Click Apply to generate the chart.' : 'Fill all fields to enable Apply.'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
