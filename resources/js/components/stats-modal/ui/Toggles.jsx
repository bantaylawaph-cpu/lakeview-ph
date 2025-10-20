import React from 'react';

export function SeriesModeToggle({ mode, onChange }) {
  return (
    <div style={{ display:'inline-flex', gap:6 }} role="tablist" aria-label="Series mode">
      <button type="button" aria-pressed={mode==='avg'} title="Show aggregated average series" className={`pill-btn ${mode==='avg' ? 'active liquid' : ''}`} onClick={() => onChange('avg')} style={{ padding:'6px 8px' }}>Average</button>
      <button type="button" aria-pressed={mode==='per-station'} title="Show one line per selected station" className={`pill-btn ${mode==='per-station' ? 'active liquid' : ''}`} onClick={() => onChange('per-station')} style={{ padding:'6px 8px' }}>Per-station</button>
    </div>
  );
}

export function TimeDepthToggle({ viewMode, setViewMode }) {
  return (
    <button
      type="button"
      className="pill-btn"
      onClick={() => setViewMode((m) => (m === 'time' ? 'depth' : 'time'))}
      title={viewMode === 'time' ? 'Show depth profile' : 'Show time series'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {viewMode === 'time' ? 'Depth profile' : 'Time series'}
    </button>
  );
}

export function SummaryPanel({ title, n, meanLabel='Mean', mean, medianLabel='Median', median }) {
  const fmt = (v) => (Number.isFinite(v) ? Number(v).toFixed(2) : 'N/A');
  return (
    <div style={{ opacity: 0.9 }}>
      {title ? <strong>{title}</strong> : null}
      <div>Samples: {n || 0}</div>
      <div>{meanLabel}: {fmt(mean)}</div>
      <div>{medianLabel}: {fmt(median)}</div>
    </div>
  );
}
