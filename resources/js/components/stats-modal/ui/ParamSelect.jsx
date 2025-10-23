import React from 'react';

export default function ParamSelect({ options = [], value = '', onChange = () => {}, placeholder = 'Select parameter', style = {}, required = false }) {
  return (
    <select required={required} className="pill-btn" value={value} onChange={onChange} style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px', ...style }}>
      <option value="">{placeholder}</option>
      {Array.isArray(options) && options.length ? (
        options.map(p => (
          <option key={p.key || p.id || p.code} value={p.code}>
            {p.label || p.name || p.code}
          </option>
        ))
      ) : null}
    </select>
  );
}
