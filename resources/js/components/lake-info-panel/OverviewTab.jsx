import React, { useMemo } from "react";
import { FiMap } from 'react-icons/fi';

const fmtNum = (v, suffix = "", digits = 2) => {
  if (v === null || v === undefined || v === "") return "–";
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return `${n.toFixed(digits)}${suffix}`;
};


function OverviewTab({
  lake,
  showWatershed = false,
  canToggleWatershed = false,
  onToggleWatershed,
  // New flows integration
  flows = [],              // array of flow objects with { id, flow_type, name, source, is_primary, latitude, longitude }
  showFlows = false,       // whether markers are shown on map
  onToggleFlows,           // (checked:boolean) => void
  onJumpToFlow,            // (flow) => void (fly map to flow)
}) {
  const watershedName = useMemo(() => {
    if (!lake) return "–";
    return lake?.watershed?.name || lake?.watershed_name || "–";
  }, [lake]);

  const fmtList = (val) => {
    if (val === null || val === undefined || val === '') return '–';

    // Already an array
    if (Array.isArray(val)) return val.filter(v => v !== null && v !== undefined && v !== '').join(', ');

    // If it's a string that looks like a JSON array, attempt to parse once.
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.filter(v => v !== null && v !== undefined && v !== '').join(', ');
          }
        } catch (e) {
          // fall through to returning original string
        }
      }
      return trimmed;
    }

    // Fallback: coerce to string
    return String(val);
  };

  const regionDisplay = useMemo(() => fmtList(lake?.region_list || lake?.region), [lake]);
  const provinceDisplay = useMemo(() => fmtList(lake?.province_list || lake?.province), [lake]);
  const municipalityDisplay = useMemo(() => fmtList(lake?.municipality_list || lake?.municipality), [lake]);

  const areaStr      = useMemo(() => fmtNum(lake?.surface_area_km2, " km²", 2), [lake]);
  const elevationStr = useMemo(() => fmtNum(lake?.elevation_m, " m", 1), [lake]);
  const meanDepthStr = useMemo(() => fmtNum(lake?.mean_depth_m, " m", 1), [lake]);

  // Separate inflows / outflows, keep stable references
  const inflows = useMemo(() => (flows || []).filter(f => f.flow_type === 'inflow'), [flows]);
  const outflows = useMemo(() => (flows || []).filter(f => f.flow_type === 'outflow'), [flows]);

  const renderFlowList = (list) => {
    if (!list || list.length === 0) return <span style={{opacity:0.6}}>None</span>;
    return (
      <span style={{display:'inline-flex',flexWrap:'wrap',gap:6}}>
        {list.map(f => {
          const label = f.name || f.source || (f.flow_type === 'inflow' ? 'Inflow' : 'Outflow');
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onJumpToFlow?.(f)}
              title={`Jump to ${label}`}
              style={{
                background:'rgba(255,255,255,0.08)',
                border:'1px solid rgba(255,255,255,0.15)',
                color:'#fff',
                padding:'2px 6px',
                borderRadius:4,
                cursor:'pointer',
                fontSize:11,
                lineHeight:1.2,
                display:'flex',
                alignItems:'center',
                gap:4,
              }}
            >
              <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</span>
              {f.is_primary ? <span style={{color:'#fbbf24',fontSize:12}} title="Primary">★</span> : null}
            </button>
          );
        })}
      </span>
    );
  };


  const showToggle = canToggleWatershed && typeof onToggleWatershed === 'function';

  return (
    <>
      {lake?.image && (
        <div className="lake-info-image">
          <img src={lake.image} alt={lake.name} />
        </div>
      )}

      {/* checkbox toggle removed; control is the icon button beside the watershed name */}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
        <div><strong>Watershed:</strong></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{watershedName}</span>
          {showToggle && (
            <button
              type="button"
              aria-pressed={showWatershed}
              title={showWatershed ? 'Hide watershed outline' : 'Show watershed outline'}
              onClick={() => onToggleWatershed?.(!showWatershed)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#fff',
                padding: 6,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: 6,
              }}
            >
              <FiMap size={16} />
            </button>
          )}
        </div>

        <div><strong>Region:</strong></div>
        <div>{regionDisplay || '–'}</div>

        <div><strong>Province:</strong></div>
        <div>{provinceDisplay || '–'}</div>

        <div><strong>Municipality/City:</strong></div>
        <div>{municipalityDisplay || '–'}</div>

        <div><strong>Surface Area:</strong></div>
        <div>{areaStr}</div>

        <div><strong>Elevation:</strong></div>
        <div>{elevationStr}</div>

        <div><strong>Mean Depth:</strong></div>
        <div>{meanDepthStr}</div>

        {/* Flows section */}
        <div><strong>Flows:</strong></div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
          <span style={{fontSize:12,opacity:0.8}}>{flows?.length || 0} point{(flows?.length||0)===1?'':'s'}</span>
          <button
            type="button"
            aria-pressed={showFlows}
            title={showFlows ? 'Hide flow markers' : 'Show flow markers'}
            onClick={() => onToggleFlows?.(!showFlows)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#fff',
              padding: 6,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: 6,
            }}
          >
            <FiMap size={16} />
          </button>
        </div>

        <div><strong>Inflows:</strong></div>
        <div>{renderFlowList(inflows)}</div>
        <div><strong>Outflows:</strong></div>
        <div>{renderFlowList(outflows)}</div>

        {/* Removed Location (full) row as requested; arrays are shown inline above */}
      </div>
    </>
  );
}

export default OverviewTab;
