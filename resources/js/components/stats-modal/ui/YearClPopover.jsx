import React from 'react';
import { FiX } from 'react-icons/fi';

// Compact popover content for Year range and Confidence Level
export default function YearClPopover({
  yearFrom,
  yearTo,
  cl,
  yearError,
  onChangeYearFrom,
  onChangeYearTo,
  onChangeCl,
  onClose,
}) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#f0f6fb' }}>Year Range & Confidence Level</div>
        <button aria-label="Close advanced options" title="Close" onClick={onClose} className="pill-btn" style={{ padding:'4px 8px', height:30, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
          <FiX size={14} />
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <input className="pill-btn" type="number" placeholder="Year from" value={yearFrom} onChange={(e)=>onChangeYearFrom(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', height:36 }} />
        <input className="pill-btn" type="number" placeholder="Year to" value={yearTo} onChange={(e)=>onChangeYearTo(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', height:36 }} />
        <select className="pill-btn" value={cl} onChange={(e)=>onChangeCl(e.target.value)} style={{ gridColumn: '1 / span 2', width:'100%', boxSizing:'border-box', padding:'8px 10px', height:36 }}>
          <option value="0.9">90% CL</option>
          <option value="0.95">95% CL</option>
          <option value="0.99">99% CL</option>
        </select>
        {yearError ? <div style={{ gridColumn:'1 / span 2', fontSize:11, color:'#ffb3b3' }}>{yearError}</div> : null}
      </div>
    </div>
  );
}
