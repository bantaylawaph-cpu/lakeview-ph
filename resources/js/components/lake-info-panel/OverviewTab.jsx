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

  const locationStr = useMemo(() => {
    if (!lake) return "–";
    const parts = [lake.municipality, lake.province, lake.region].filter(Boolean);
    return parts.length ? parts.join(", ") : "–";
  }, [lake]);

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
        <div>{lake?.region || "–"}</div>

        <div><strong>Province:</strong></div>
        <div>{lake?.province || "–"}</div>

        <div><strong>Municipality/City:</strong></div>
        <div>{lake?.municipality || "–"}</div>

        <div><strong>Surface Area:</strong></div>
        <div>{areaStr}</div>

        <div><strong>Elevation:</strong></div>
        <div>{elevationStr}</div>

        <div><strong>Mean Depth:</strong></div>
        <div>{meanDepthStr}</div>

        <div><strong>Location (full):</strong></div>
        <div>{locationStr}</div>
      </div>
    </>
  );
}

export default OverviewTab;
