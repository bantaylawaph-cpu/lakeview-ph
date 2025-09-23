import React, { useMemo } from "react";

const fmtNum = (v, suffix = "", digits = 2) => {
  if (v === null || v === undefined || v === "") return "–";
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return `${n.toFixed(digits)}${suffix}`;
};
const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "–");

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

      {showToggle && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={showWatershed}
              onChange={(e) => onToggleWatershed?.(e.target.checked)}
            />
            <span>Show watershed outline</span>
          </label>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
        <div><strong>Watershed:</strong></div>
        <div>{watershedName}</div>

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
