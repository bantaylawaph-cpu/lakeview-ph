import React, { useMemo, useEffect, useState } from "react";
import { FiMap, FiInfo } from 'react-icons/fi';
import LoadingSpinner from "../LoadingSpinner";
import { api } from "../../lib/api";
import cache from "../../lib/storageCache";
import { normalizeNumStr, shiftDecimalStr } from "../../utils/conversions";

const fmtNum = (v, suffix = "", digits = 2) => {
  if (v === null || v === undefined || v === "") return "–";
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return `${n.toFixed(digits)}${suffix}`;
};

// No-rounding formatter for cases where we want the full precision as stored
const fmtNumFull = (v, suffix = "") => {
  if (v === null || v === undefined || v === "") return "–";
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return `${v}${suffix}`;
};


function OverviewTab({
  lake,
  showWatershed = false,
  canToggleWatershed = false,
  onToggleWatershed,
  onOpenFeedback,
  // New flows integration
  flows = [],              // array of flow objects with { id, flow_type, name, source, is_primary, latitude, longitude }
  showFlows = false,       // whether markers are shown on map
  onToggleFlows,           // (checked:boolean) => void
  onJumpToFlow,            // (flow) => void (fly map to flow)
}) {
  const [initialLoading, setInitialLoading] = useState(true);

  // Consider the tab 'loaded' once we have a lake id (or when called with no lake)
  useEffect(() => {
    if (!lake || !lake.id) { setInitialLoading(false); return; }
    setInitialLoading(flows === null);
  }, [lake?.id, flows]);
  const watershedName = useMemo(() => {
    if (!lake) return "–";
    // Watershed is either present (relation) or unknown (no relation). Show explicit unknown text.
    return lake?.watershed?.name || lake?.watershed_name || 'Not yet recorded';
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

  // Surface Area: display as km² with ha in parentheses, deriving missing unit if needed (no rounding)
  const areaStr      = useMemo(() => {
    const km2Src = lake?.surface_area_km2 ?? lake?.area_km2;
    const haSrc  = lake?.surface_area_ha ?? lake?.area_ha;
    let km2Str = km2Src != null ? normalizeNumStr(km2Src) : '';
    let haStr  = haSrc  != null ? normalizeNumStr(haSrc)  : '';
    if (!km2Str && haStr) km2Str = shiftDecimalStr(haStr, -2);
    if (!haStr && km2Str) haStr  = shiftDecimalStr(km2Str, +2);
    if (!km2Str) return '–';
    return `${km2Str} km²${haStr ? ` (${haStr} ha)` : ''}`;
  }, [lake?.surface_area_km2, lake?.area_km2, lake?.surface_area_ha, lake?.area_ha]);
  const elevationStr = useMemo(() => fmtNum(lake?.elevation_m, " m", 1), [lake]);
  const meanDepthStr = useMemo(() => fmtNum(lake?.mean_depth_m, " m", 1), [lake]);

  const [denrClassLabel, setDenrClassLabel] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!lake || !lake.class_code) { setDenrClassLabel(null); return () => { mounted = false; } };

    (async () => {
      try {
        // If the lake already includes the relation, use the class name
        if (lake?.water_quality_class?.name) {
          if (mounted) setDenrClassLabel(lake.water_quality_class.name);
          return;
        }

        const key = 'options:wq-classes';
        const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
        let list = cache.get(key, { maxAgeMs: TTL });
        if (!list) {
          const res = await api('/options/water-quality-classes');
          list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          if (Array.isArray(list)) cache.set(key, list, { ttlMs: TTL });
        }
        const found = (list || []).find((c) => String(c.code) === String(lake.class_code) || String(c.id) === String(lake.class_code));
        if (!mounted) return;
  if (found) setDenrClassLabel(found.name);
  else setDenrClassLabel(lake.class_code || null);
      } catch (e) {
        if (mounted) setDenrClassLabel(lake.class_code || null);
      }
    })();

    return () => { mounted = false; };
  }, [lake?.class_code, lake?.water_quality_class]);

  // Flows/Tributaries tri-state status from API: 'unknown' | 'none' | 'present'
  const flowsStatus = lake?.flows_status || 'unknown';
  // Separate inflows / outflows, keep stable references (only meaningful when present)
  const inflows = useMemo(() => (flows || []).filter(f => f.flow_type === 'inflow'), [flows]);
  const outflows = useMemo(() => (flows || []).filter(f => f.flow_type === 'outflow'), [flows]);

  const renderFlowList = (list) => {
    if (!list || list.length === 0) return <span style={{opacity:0.8}}>None</span>;
    return (
      <span style={{display:'inline-flex',flexWrap:'wrap',gap:6}}>
        {list.map(f => {
          const label = f.name || f.source || (f.flow_type === 'inflow' ? 'Inlet' : 'Outlet');
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
  const showFlowToggle = flowsStatus === 'present' && (flows && flows.length > 0) && typeof onToggleFlows === 'function';

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner label={"Loading overview…"} color="#fff" />
      </div>
    );
  }

  return (
    <>
      {lake?.image && (
        <div className="lake-info-image">
          <img src={lake.image} alt={lake.name} />
        </div>
      )}

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
        <div title={regionDisplay || ''}>{regionDisplay || '–'}</div>

  <div><strong>Province:</strong></div>
        <div title={provinceDisplay || ''}>{provinceDisplay || '–'}</div>

  <div><strong>Municipality/City:</strong></div>
        <div title={municipalityDisplay || ''}>{municipalityDisplay || '–'}</div>

        <div><strong>Lake DENR Classification:</strong></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div title={denrClassLabel || lake?.denr_classification || ''} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{denrClassLabel || lake?.denr_classification || '–'}</div>
          <a
            href="https://water.emb.gov.ph/?page_id=849"
            target="_blank"
            rel="noopener noreferrer"
            title="What is Lake Classification?"
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
              textDecoration: 'none'
            }}
          >
            <FiInfo size={16} />
          </a>
        </div>

        <div><strong>Surface Area:</strong></div>
        <div>{areaStr}</div>

        <div><strong>Surface Elevation:</strong></div>
        <div>{elevationStr}</div>

        <div><strong>Average Depth:</strong></div>
        <div>{meanDepthStr}</div>

        <div><strong>Tributaries:</strong></div>
        {flowsStatus === 'present' ? (
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {renderFlowList([...(inflows||[]), ...(outflows||[])])}
              </div>
              {showFlowToggle && (
                <button
                  type="button"
                  aria-pressed={showFlows}
                  title={showFlows ? 'Hide tributary markers' : 'Show tributary markers'}
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
              )}
            </div>

            <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#ddd', marginTop: 4 }}>
              <em>Tributaries are known inlets and outlets for this lake. 'Primary', denoted by a "★", marks the main channel.</em>
            </div>
          </>
        ) : flowsStatus === 'none' ? (
          <div style={{opacity:0.8}}>None</div>
        ) : (
          <div style={{opacity:0.8}}>Not yet recorded</div>
        )}
      </div>
      {typeof onOpenFeedback === 'function' && (
        <div style={{ gridColumn: '1 / -1', textAlign:'center', margin:'28px 0 8px' }}>
          <div style={{ fontSize:12, opacity:0.95, fontStyle:'italic' }}>Do you see any missing information or want to submit information regarding this lake?</div>
          <button
            type="button"
            onClick={() => onOpenFeedback?.()}
            title="Submit feedback about this lake"
            style={{
              background:'transparent',
              border:'none',
              padding:0,
              marginTop:6,
              color:'#cfe3ff',
              textDecoration:'underline',
              cursor:'pointer',
              fontWeight:600,
              fontSize:12,
              fontStyle:'italic',
            }}
          >
            Click Here
          </button>
        </div>
      )}
    </>
  );
}

export default OverviewTab;
