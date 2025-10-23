import React from 'react';
import Popover from '../../common/Popover';

export default function StationPicker({ anchorRef, open, onClose, stations = [], value = [], onChange, doneLabel = 'Done', maxSelected = 3 }) {
  return (
    <Popover anchorRef={anchorRef} open={open} onClose={onClose} minWidth={220}>
      {stations.length ? (
        <>
          <div style={{ fontSize: 12, opacity: 0.75, padding: '0 6px 6px', color: '#fff' }}>Select up to {maxSelected} locations</div>
          {stations.map((s) => {
            const checked = value.includes(s);
            const atCap = !checked && Array.isArray(value) && value.length >= maxSelected;
            return (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: atCap ? 'not-allowed' : 'pointer', color: '#fff', opacity: atCap ? 0.7 : 1 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={atCap}
                  onChange={() => {
                    const next = checked ? value.filter((x) => x !== s) : [...value, s];
                    onChange(next);
                  }}
                />
                <span style={{ color: '#fff' }}>{s}</span>
              </label>
            );
          })}
        </>
      ) : (<div style={{ opacity: 0.8, color: '#fff' }}>No locations…</div>)}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button type="button" className="pill-btn" onClick={() => onChange([])}>Clear</button>
        <button type="button" className="pill-btn liquid" onClick={onClose}>{doneLabel}</button>
      </div>
    </Popover>
  );
}
