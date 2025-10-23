import React from 'react';

export default function LakeSelect({ lakes = [], value = '', onChange = () => {}, placeholder = 'Select a lake', style = {} }) {
  return (
    <select className="pill-btn" value={value} onChange={onChange} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px', ...style }}>
      <option value="">{placeholder}</option>
      {lakes.map(l => {
        const raw = l.class_code || l.classification || l.class || '';
        const code = raw ? String(raw).replace(/^class\s*/i, '') : '';
        const suffix = code ? ` (Class ${code})` : '';
        return <option key={l.id} value={l.id}>{(l.name || `Lake ${l.id}`) + suffix}</option>;
      })}
    </select>
  );
}
