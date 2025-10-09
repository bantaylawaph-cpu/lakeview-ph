import React from 'react';

// Legend / explanation panel for the population heatmap layer
export default function HeatmapLegend({ resolution }) {
  return (
    <div style={{ position: 'absolute', bottom: 90, left: 12, zIndex: 900, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: 11, maxWidth: 220 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Population Density</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 10, background: 'linear-gradient(90deg, rgba(0,0,255,0), #2563eb, #10b981, #fbbf24, #ef4444)', borderRadius: 4 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ opacity: 0.8 }}>low</span>
          <span style={{ opacity: 0.8 }}>high</span>
        </div>
      </div>
      <div style={{ marginTop: 6, lineHeight: 1.3, opacity: 0.85 }}>
        Relative density (not exact counts). Brighter colors indicate more people compared with nearby areas.
      </div>
      {resolution === 'preview' && (
        <div style={{ marginTop: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 }}>Preview sample… refining</div>
      )}
      {resolution === 'final' && (
        <div style={{ marginTop: 4, fontSize: 10, opacity: 0.55 }}>Final resolution</div>
      )}
    </div>
  );
}
