import React from 'react';

// Indeterminate loading indicator for the population heatmap (extracted from MapPage)
export default function HeatmapLoadingIndicator() {
  return (
    <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1200, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '8px 10px', borderRadius: 6, fontSize: 12, minWidth: 180 }}>
      <div style={{ marginBottom: 6 }}>Loading heatmap…</div>
      <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', height: '100%', width: '40%', left: 0, background: 'linear-gradient(90deg,#3b82f6,#93c5fd)', borderRadius: 999, animation: 'lvHeatInd 1.1s infinite' }} />
      </div>
      <style>{`@keyframes lvHeatInd {0%{left:-40%}100%{left:100%}}`}</style>
    </div>
  );
}
