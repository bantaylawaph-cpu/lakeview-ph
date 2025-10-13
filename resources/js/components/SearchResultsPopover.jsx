import React from 'react';

export default function SearchResultsPopover({ open, results, loading, error, onClose, onSelect }) {
  if (!open) return null;
  return (
    <div className="modern-scrollbar" style={{ position: 'absolute', top: 56, left: 56, zIndex: 1300, background: '#fff', color: '#000', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.18)', minWidth: 320, maxWidth: 420, maxHeight: 360, overflowY: 'auto' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong>Search results</strong>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
      </div>
      {loading && <div style={{ padding: 12, fontSize: 13 }}>Searching…</div>}
  {error && !loading && <div style={{ padding: 12, fontSize: 13, color: '#b91c1c' }}>{String(error)}</div>}
      {!loading && !error && Array.isArray(results) && results.length === 0 && (
        <div style={{ padding: 12, fontSize: 13 }}>No results.</div>
      )}
      <div>
        {(results || []).map((r, idx) => {
          const name = r.name || r.alt_name || r.lake_name || `Result ${idx+1}`;
          const klass = r.class_code ? `Class ${r.class_code}` : '';
          const area = typeof r.surface_area_km2 === 'number' ? `${r.surface_area_km2.toFixed(2)} km²` : '';
          return (
            <button key={idx}
              onClick={() => onSelect && onSelect(r)}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: '10px 12px', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: 12, color: '#555' }}>{[klass, area].filter(Boolean).join(' • ')}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
