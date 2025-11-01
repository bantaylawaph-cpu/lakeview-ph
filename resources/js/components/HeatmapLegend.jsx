import React from 'react';

// Legend / explanation panel for the population heatmap layer
export default function HeatmapLegend({  }) {
  return (
    <div style={{ position: 'absolute', bottom: 90, left: 12, zIndex: 900, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: 11, maxWidth: 240, boxShadow: '0 2px 10px rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Population Density</div>
      {/* Bar with left/right labels to match expectation: low → high */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
          <span style={{ opacity: 0.85 }}>low</span>
          <span style={{ opacity: 0.85 }}>high</span>
        </div>
        <div style={{
          position: 'relative',
          height: 10,
          borderRadius: 5,
          overflow: 'hidden',
          background: 'linear-gradient(90deg, #2563eb, #10b981, #fbbf24, #ef4444)'
        }}>
          {/* Add a subtle inner outline to improve contrast over any basemap */}
          <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }} />
        </div>
      </div>
      <div style={{ marginTop: 6, lineHeight: 1.3, opacity: 0.85 }}>
        Relative density (not exact counts). Brighter colors indicate more people compared with nearby areas.
      </div>
    </div>
  );
}
