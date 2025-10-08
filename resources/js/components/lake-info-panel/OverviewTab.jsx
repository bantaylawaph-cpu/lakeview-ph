import React, { useMemo } from "react";
import { FiMap } from 'react-icons/fi';

const fmtNum = (v, suffix = "", digits = 2) => {
  if (v === null || v === undefined || v === "") return "–";
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return `${n.toFixed(digits)}${suffix}`;
};


function OverviewTab({ lake, showWatershed = false, canToggleWatershed = false, onToggleWatershed }) {
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

        {/* Removed Location (full) row as requested; arrays are shown inline above */}
      </div>
    </>
  );
}

export default OverviewTab;
