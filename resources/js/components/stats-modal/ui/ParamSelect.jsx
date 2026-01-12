import React from 'react';
import LoadingSpinner from '../../LoadingSpinner';

export default function ParamSelect({ options = [], value = '', onChange = () => {}, placeholder = 'Select parameter', style = {}, required = false, loading = false, disabled = false, multiple = false }) {
  const isDisabled = disabled || loading;
  const normalizedValue = multiple ? (Array.isArray(value) ? value : (value ? [String(value)] : [])) : (Array.isArray(value) ? (value[0] || '') : value);
  return (
    // Ensure the wrapper fills the available column width so the inner <select>
    // (which already uses width: '100%') matches other selectors placed in the
    // same grid layout (e.g. `LakeSelect`). Without this the wrapper can
    // shrink-to-fit and make the select appear shorter.
    <div style={{ position: 'relative', width: '100%' }}>
      <select
        required={required}
        className="pill-btn"
        value={normalizedValue}
        onChange={onChange}
        disabled={isDisabled}
        multiple={!!multiple}
        style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height: multiple ? 120 : 40, lineHeight:'20px', paddingRight: loading ? 44 : 12, ...style }}
      >
        {!multiple ? <option value="">{placeholder}</option> : null}
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
          <LoadingSpinner inline size={16} label="" />
        </div>
      ) : null}
    </div>
  );
}
