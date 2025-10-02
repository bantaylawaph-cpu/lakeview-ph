import React from 'react';

export default function LoadingSpinner({ label = 'Loading…', size = 18, color = '#6b7280', inline = false }) {
  const style = inline ? { display: 'inline-flex', alignItems: 'center', gap: 8 } : { display: 'flex', alignItems: 'center', gap: 8, padding: 12, justifyContent: 'center' };
  return (
    <div style={style} role="status" aria-live="polite">
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
        <g>
          <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" fill="none" opacity="0.2" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke={color} strokeWidth="3" fill="none">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
          </path>
        </g>
      </svg>
      <span style={{ fontSize: 13, color }}>{label}</span>
    </div>
  );
}
