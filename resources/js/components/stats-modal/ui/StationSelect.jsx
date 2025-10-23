import React from 'react';

// Generic station dropdown with optional "All" entry and customizable allValue/allLabel.
export default function StationSelect({
  options = [],
  value = '',
  onChange = () => {},
  disabled = false,
  includeAllOption = true,
  allValue = 'all',
  allLabel = 'All Stations',
  placeholder = 'Select a station',
  style = {},
}) {
  return (
    <select
      className="pill-btn"
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px', ...style }}
    >
      <option value="">{placeholder}</option>
      {includeAllOption && <option value={allValue}>{allLabel}</option>}
      {options.map(s => (
        <option key={`station-${s.id}`} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}
