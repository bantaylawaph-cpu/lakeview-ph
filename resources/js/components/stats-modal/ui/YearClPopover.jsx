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
  availableYears = [],
}) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#f0f6fb' }}>Year Range</div>
        <button aria-label="Close advanced options" title="Close" onClick={onClose} className="pill-btn" style={{ padding:'4px 8px', height:30, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
          <FiX size={14} />
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <select className="pill-btn" value={yearFrom} onChange={(e)=>onChangeYearFrom(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', height:36 }}>
          <option value="">Start year</option>
          {availableYears.map((y)=> (
            <option key={`yf-${y}`} value={y}>{y}</option>
          ))}
        </select>
        <select className="pill-btn" value={yearTo} onChange={(e)=>onChangeYearTo(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', height:36 }}>
          <option value="">End year</option>
          {availableYears.map((y)=> (
            <option key={`yt-${y}`} value={y}>{y}</option>
          ))}
        </select>
        {/* confidence level selector removed — using default CL from outer control */}
        {yearError ? <div style={{ gridColumn:'1 / span 2', fontSize:11, color:'#ffb3b3' }}>{yearError}</div> : null}
      </div>
    </div>
  );
}
