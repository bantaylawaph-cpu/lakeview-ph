import React from 'react';
import Popover from '../../common/Popover';

export default function StationPicker({ anchorRef, open, onClose, stations = [], value = [], onChange, doneLabel = 'Done' }) {
  return (
    <Popover anchorRef={anchorRef} open={open} onClose={onClose} minWidth={220}>
      {stations.length ? (
        stations.map((s) => {
          const checked = value.includes(s);
          return (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer', color: '#fff' }}>
              <input type="checkbox" checked={checked} onChange={() => {
                const next = checked ? value.filter((x) => x !== s) : [...value, s];
                onChange(next);
              }} />
              <span style={{ color: '#fff' }}>{s}</span>
            </label>
          );
        })
      ) : (<div style={{ opacity: 0.8 }}>No locations…</div>)}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        <button type="button" className="pill-btn" onClick={() => onChange(stations.slice())}>Select All</button>
        <button type="button" className="pill-btn" onClick={() => onChange([])}>Clear</button>
        <button type="button" className="pill-btn liquid" onClick={onClose}>{doneLabel}</button>
      </div>
    </Popover>
  );
}
