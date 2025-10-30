import React from 'react';
import LoadingSpinner from '../../LoadingSpinner';

export default function ParamSelect({ options = [], value = '', onChange = () => {}, placeholder = 'Select parameter', style = {}, required = false, loading = false, disabled = false }) {
  const isDisabled = disabled || loading;
  return (
    <div style={{ position: 'relative' }}>
      <select
        required={required}
        className="pill-btn"
        value={value}
        onChange={onChange}
        disabled={isDisabled}
        style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px', paddingRight: loading ? 44 : 12, ...style }}
      >
        <option value="">{placeholder}</option>
        {Array.isArray(options) && options.length ? (
          options.map(p => (
            <option key={p.key || p.id || p.code} value={p.code}>
              {p.label || p.name || p.code}
            </option>
          ))
        ) : null}
      </select>
      {loading ? (
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
          <LoadingSpinner inline size={16} label="Loading" />
        </div>
      ) : null}
    </div>
  );
}
