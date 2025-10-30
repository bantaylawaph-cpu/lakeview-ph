import React from 'react';
import LoadingSpinner from '../../LoadingSpinner';

export default function OrgSelect({ options = [], value = '', onChange = () => {}, placeholder = 'Dataset Source', required = false, style = {}, loading = false, disabled = false }) {
  const isDisabled = disabled || loading;
  return (
    <div style={{ position: 'relative' }}>
      <select
        required={required}
        className="pill-btn"
        value={value}
        onChange={onChange}
        disabled={isDisabled}
        style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px', paddingRight: loading ? 44 : 12, ...style }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={`org-${o.id}`} value={o.id}>{o.name || o.id}</option>)}
      </select>
      {loading ? (
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
          <LoadingSpinner inline size={16} label="Loading" />
        </div>
      ) : null}
    </div>
  );
}
