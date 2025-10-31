import React from 'react';
import LoadingSpinner from '../../LoadingSpinner';

export default function LakeSelect({ lakes = [], value = '', onChange = () => {}, placeholder = 'Select a lake', style = {}, loading = false, includeCustom = false, customValue = 'custom', customLabel = 'Custom dataset' }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        className="pill-btn"
        value={value}
        onChange={onChange}
        disabled={loading}
        style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px', paddingRight: loading ? 44 : 12, ...style }}
      >
        <option value="">{placeholder}</option>
        {includeCustom ? (
          <option value={customValue}>{customLabel}</option>
        ) : null}
        {lakes.map(l => {
          const raw = l.class_code || l.classification || l.class || '';
          const code = raw ? String(raw).replace(/^class\s*/i, '') : '';
          const suffix = code ? ` (Class ${code})` : '';
          return <option key={l.id} value={l.id}>{(l.name || `Lake ${l.id}`) + suffix}</option>;
        })}
      </select>
      {loading ? (
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
          <LoadingSpinner inline size={16} label="Loading" />
        </div>
      ) : null}
    </div>
  );
}
