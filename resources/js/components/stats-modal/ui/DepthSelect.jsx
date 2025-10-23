import React from 'react';

export default function DepthSelect({
  availableDepths = [],
  inferredTest = 'one-sample',
  compareValue = '',
  paramCode = '',
  depthMode = 'all',
  depthValue = '',
  onChange = () => {},
  style = {},
}) {
  const disabled = !paramCode || !(inferredTest === 'one-sample' || (inferredTest === 'two-sample' && compareValue && String(compareValue).startsWith('lake:')));

  const handleChange = (e) => {
    const v = e.target.value;
    if (v === 'all') onChange({ mode: 'all', value: '' });
    else onChange({ mode: 'single', value: v });
  };

  return (
    <div style={{ width: 150, transition:'width 0.2s ease', overflow:'hidden', ...style }}>
      <select className="pill-btn" value={depthMode === 'all' ? 'all' : (depthValue || '')} onChange={handleChange} style={{ width:'100%', padding:'10px 12px', height:40 }} disabled={disabled}>
        <option value="all">All depths (mean)</option>
        {availableDepths.map(d => (<option key={`depth-${d}`} value={d}>{d} m</option>))}
      </select>
    </div>
  );
}
