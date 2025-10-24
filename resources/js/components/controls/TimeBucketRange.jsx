import React from 'react';
import Popover from '../common/Popover';

export default function TimeBucketRange({
  bucket = 'month',
  setBucket = () => {},
  timeRange = 'all',
  setTimeRange = () => {},
  dateFrom = '',
  setDateFrom = () => {},
  dateTo = '',
  setDateTo = () => {},
  referenceDate = null, // optional Date used for presets (e.g., latestTestDate)
  // New: restrict bucket options (e.g., ['month','quarter'])
  allowedBuckets = null,
  // New: switch range UI to a specific year dropdown fed by availableYears
  rangeMode = 'presets', // 'presets' | 'year-list'
  availableYears = [], // e.g., [2024, 2023, 2022]
  // For multi-year selection (bar chart): selectedYears and setter
  selectedYears = [],
  setSelectedYears = () => {},
}) {
  const fmtIso = (d) => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const today = referenceDate ? new Date(referenceDate) : new Date();

  const handleRangeChange = (key) => {
    let from = '';
    let to = fmtIso(today);
    if (key === 'all') {
      from = '';
      to = '';
    } else if (key === 'custom') {
      from = dateFrom || '';
      to = dateTo || '';
    } else if (key === '5y') {
      const d = new Date(today); d.setFullYear(d.getFullYear() - 5); from = fmtIso(d);
    } else if (key === '3y') {
      const d = new Date(today); d.setFullYear(d.getFullYear() - 3); from = fmtIso(d);
    } else if (key === '1y') {
      const d = new Date(today); d.setFullYear(d.getFullYear() - 1); from = fmtIso(d);
    } else if (key === '6mo') {
      const d = new Date(today); d.setMonth(d.getMonth() - 6); from = fmtIso(d);
    }
    setDateFrom(from);
    setDateTo(to === '' ? '' : to);
    setTimeRange(key);
  };

  // For custom, we show year-only inputs but we surface full ISO start/end-of-year
  const yearFrom = dateFrom ? String(dateFrom).slice(0,4) : '';
  const yearTo = dateTo ? String(dateTo).slice(0,4) : '';

  const handleCustomYearFrom = (y) => {
    // Allow clearing
    if (!y) {
      setDateFrom('');
      setTimeRange('custom');
      return;
    }
    const yf = String(y).slice(0, 4).padStart(4, '0');
    const toY = dateTo ? String(dateTo).slice(0, 4) : '';
    // Enforce Start <= End: if selecting a start after the current end, snap end to start
    if (toY && Number(yf) > Number(toY)) {
      setDateTo(`${yf}-12-31`);
    } else if (!dateTo) {
      setDateTo(`${yf}-12-31`);
    }
    setDateFrom(`${yf}-01-01`);
    setTimeRange('custom');
  };
  const handleCustomYearTo = (y) => {
    // Allow clearing
    if (!y) {
      setDateTo('');
      setTimeRange('custom');
      return;
    }
    const yt = String(y).slice(0, 4).padStart(4, '0');
    const fromY = dateFrom ? String(dateFrom).slice(0, 4) : '';
    // Enforce Start <= End: if selecting an end before the current start, snap start to end
    if (fromY && Number(fromY) > Number(yt)) {
      setDateFrom(`${yt}-01-01`);
    } else if (!dateFrom) {
      setDateFrom(`${yt}-01-01`);
    }
    setDateTo(`${yt}-12-31`);
    setTimeRange('custom');
  };

  const currentYear = (referenceDate ? new Date(referenceDate) : new Date()).getFullYear();
  const yearBtnRef = React.useRef(null);
  const [showYearPopover, setShowYearPopover] = React.useState(false);

  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Bucket</div>
      <select className="pill-btn" value={bucket} onChange={(e) => setBucket(e.target.value)} style={{ width: '100%' }}>
        {(() => {
          const opts = Array.isArray(allowedBuckets) && allowedBuckets.length
            ? allowedBuckets
            : ['year', 'quarter', 'month'];
          // Preserve original order preference: year, quarter, month
          const order = ['year', 'quarter', 'month'];
          const final = order.filter((k) => opts.includes(k));
          return final.map((k) => (
            <option key={k} value={k}>
              {k === 'year' ? 'Year' : (k === 'quarter' ? 'Quarter' : 'Month')}
            </option>
          ));
        })()}
      </select>

      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, marginBottom: 4 }}>{rangeMode === 'year-list' ? 'Year' : 'Range'}</div>
      {rangeMode === 'year-list' ? (
        <select
          className="pill-btn"
          value={(() => {
            if (timeRange === 'custom' && dateFrom && dateTo && String(dateFrom).length >= 4) {
              return String(dateFrom).slice(0, 4);
            }
            return '';
          })()}
          onChange={(e) => {
            const y = e.target.value;
            if (!y) {
              setTimeRange('all'); setDateFrom(''); setDateTo('');
            } else {
              const yf = String(y).padStart(4, '0'); setDateFrom(`${yf}-01-01`); setDateTo(`${yf}-12-31`); setTimeRange('custom');
            }
          }}
          style={{ width: '100%', marginBottom: 6 }}
        >
          <option value="">All Years</option>
          {Array.isArray(availableYears) && availableYears.length ? availableYears.map((y) => (
            <option key={String(y)} value={String(y)}>{String(y)}</option>
          )) : null}
        </select>
      ) : rangeMode === 'year-multi' ? (
        <div>
          <button ref={yearBtnRef} type="button" className="pill-btn" onClick={() => setShowYearPopover((s) => !s)} style={{ width: '100%', display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedYears && selectedYears.length ? `${selectedYears.length} selected` : 'Select years'}
            <span style={{ opacity: 0.7 }}>{selectedYears && selectedYears.length ? selectedYears.join(', ') : ''}</span>
          </button>
          <Popover anchorRef={yearBtnRef} open={showYearPopover} onClose={() => setShowYearPopover(false)} minWidth={220}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#fff' }}>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Choose up to 3 years</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {(Array.isArray(availableYears) ? availableYears : []).map((y) => {
                  const selected = (selectedYears || []).includes(String(y));
                  return (
                    <label key={y} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const next = new Set(selectedYears || []);
                          if (e.target.checked) {
                            if ((next.size || 0) >= 3) return; // guard to 3
                            next.add(String(y));
                          } else next.delete(String(y));
                          setSelectedYears(Array.from(next).sort((a,b)=>b-a));
                        }}
                      />
                      <span>{String(y)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </Popover>
        </div>
      ) : (
        <select className="pill-btn" value={timeRange} onChange={(e) => handleRangeChange(e.target.value)} style={{ width: '100%', marginBottom: 6 }}>
          <option value="all">All Time</option>
          <option value="5y">5 Yr</option>
          <option value="3y">3 Yr</option>
          <option value="1y">1 Yr</option>
          <option value="6mo">6 Mo</option>
          <option value="custom">Custom (year)</option>
        </select>
      )}

      {rangeMode !== 'year-list' && timeRange === 'custom' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            className="pill-btn"
            value={yearFrom}
            onChange={(e) => handleCustomYearFrom(e.target.value)}
            style={{ flex: '1 1 auto' }}
          >
            <option value="">Start year</option>
            {(Array.isArray(availableYears) ? availableYears : []).map((y) => (
              <option key={`yf-${String(y)}`} value={String(y)}>{String(y)}</option>
            ))}
          </select>
          <span>to</span>
          <select
            className="pill-btn"
            value={yearTo}
            onChange={(e) => handleCustomYearTo(e.target.value)}
            style={{ flex: '1 1 auto' }}
          >
            <option value="">End year</option>
            {(Array.isArray(availableYears) ? availableYears : []).map((y) => (
              <option key={`yt-${String(y)}`} value={String(y)}>{String(y)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
