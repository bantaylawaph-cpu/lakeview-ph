import React from 'react';

export default function OrgSelect({ options = [], value = '', onChange = () => {}, placeholder = 'Dataset Source', required = false, style = {} }) {
  return (
    <select required={required} className="pill-btn" value={value} onChange={onChange} style={{ width:'100%', minWidth:0, boxSizing:'border-box', padding:'10px 12px', height:40, lineHeight:'20px', ...style }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={`org-${o.id}`} value={o.id}>{o.name || o.id}</option>)}
    </select>
  );
}
