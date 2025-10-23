import React from 'react';

export default function CompareSelect({ lakes = [], classes = [], lakeId = '', value = '', onChange = () => {}, style = {} }) {
  return (
    <select className="pill-btn" value={value} onChange={onChange} style={{ width:'100%', padding:'10px 12px', height:40, lineHeight:'20px', ...style }}>
      <option value="">Compare to: Lake or Class Threshold</option>
      {classes.map(c => <option key={`class-${c.code}`} value={`class:${c.code}`}>{`Class ${c.code} Thresholds`}</option>)}
      <optgroup label="Lakes">
        {lakes.filter(l => String(l.id) !== String(lakeId)).map(l => {
          const raw = l.class_code || l.classification || l.class || '';
          const code = raw ? String(raw).replace(/^class\s*/i, '') : '';
          const suffix = code ? ` (Class ${code})` : '';
          return <option key={`lake-${l.id}`} value={`lake:${l.id}`}>{(l.name || `Lake ${l.id}`) + suffix}</option>;
        })}
      </optgroup>
    </select>
  );
}
