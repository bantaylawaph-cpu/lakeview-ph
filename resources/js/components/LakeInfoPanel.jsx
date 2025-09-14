// src/components/LakeInfoPanel.jsx
import React, { useState, useEffect, useMemo } from "react";
import { FiX } from "react-icons/fi";

function LakeInfoPanel({ isOpen, onClose, lake, onToggleHeatmap }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [distance, setDistance] = useState(2); // km filter
  const [estimatedPop, setEstimatedPop] = useState(0);
  const [closing, setClosing] = useState(false);

  // Reset closing when panel re-opens
  useEffect(() => {
    if (isOpen) setClosing(false);
  }, [isOpen]);

  // Whenever a new lake is selected, return to Overview tab
  useEffect(() => {
    if (lake) setActiveTab("overview");
  }, [lake?.id]);

  // Mock population estimate (placeholder)
  useEffect(() => {
    if (activeTab === "population") {
      const fakeEstimate = Math.round(15000 + distance * 20000);
      setEstimatedPop(fakeEstimate);
    }
  }, [distance, activeTab]);

  // ---------- Formatting helpers ----------
  const fmtNum = (v, suffix = "", digits = 2) => {
    if (v === null || v === undefined || v === "") return "–";
    const n = Number(v);
    if (!Number.isFinite(n)) return "–";
    return `${n.toFixed(digits)}${suffix}`;
  };
  const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "–");

  // ---------- Derived display strings ----------
  const watershedName = useMemo(() => {
    if (!lake) return "–";
    // support either nested relation or flattened property
    return lake?.watershed?.name || lake?.watershed_name || "–";
  }, [lake]);

  const locationStr = useMemo(() => {
    if (!lake) return "–";
    const parts = [lake.municipality, lake.province, lake.region].filter(Boolean);
    return parts.length ? parts.join(", ") : "–";
  }, [lake]);

  const areaStr       = useMemo(() => fmtNum(lake?.surface_area_km2, " km²", 2), [lake]);
  const elevationStr  = useMemo(() => fmtNum(lake?.elevation_m, " m", 1), [lake]);
  const meanDepthStr  = useMemo(() => fmtNum(lake?.mean_depth_m, " m", 1), [lake]);
  const createdAtStr  = useMemo(() => fmtDate(lake?.created_at), [lake]);
  const updatedAtStr  = useMemo(() => fmtDate(lake?.updated_at), [lake]);

  // Prevent render if nothing to show
  if (!lake && !isOpen) return null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "population") onToggleHeatmap?.(true, distance);
    else onToggleHeatmap?.(false);
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { onClose?.(); }, 350); // match CSS transition
  };

  return (
    <div className={`lake-info-panel ${isOpen && !closing ? "open" : "closing"}`}>
      {/* Header */}
      <div className="lake-info-header">
        <div>
          <h2 className="lake-info-title" style={{ marginBottom: 2 }}>
            {lake?.name || "Lake"}
          </h2>
          {lake?.alt_name ? (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Also known as <em>{lake.alt_name}</em>
            </div>
          ) : null}
        </div>
        <button className="close-btn" onClick={handleClose} aria-label="Close lake panel">
          <FiX size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="lake-info-tabs">
        <button
          className={`lake-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => handleTabChange("overview")}
        >
          Overview
        </button>
        <button
          className={`lake-tab ${activeTab === "water" ? "active" : ""}`}
          onClick={() => handleTabChange("water")}
        >
          Water Quality
        </button>
        <button
          className={`lake-tab ${activeTab === "population" ? "active" : ""}`}
          onClick={() => handleTabChange("population")}
        >
          Population Density
        </button>
      </div>

      {/* Image (only on overview tab, only if provided) */}
      {activeTab === "overview" && lake?.image && (
        <div className="lake-info-image">
          <img src={lake.image} alt={lake.name} />
        </div>
      )}

      {/* Content */}
      <div className="lake-info-content">
        {activeTab === "overview" && (
          <>
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
        )}

        {activeTab === "water" && (
          <p><em>Water quality reports will appear here.</em></p>
        )}

        {activeTab === "population" && (
          <>
            <h3>Population Density Heatmap</h3>
            <p>
              Heatmap of population living around <strong>{lake?.name}</strong>.
            </p>

            {/* Distance filter slider */}
            <div
              className="slider-container"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
            >
              <label htmlFor="distanceRange">
                Distance from shoreline: {distance} km
              </label>
              <input
                id="distanceRange"
                type="range"
                min="1"
                max="10"
                step="1"
                value={distance}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setDistance(val);
                  onToggleHeatmap?.(true, val);
                }}
              />
            </div>

            {/* Estimated population insight */}
            <div className="insight-card">
              <h4>Estimated Population</h4>
              <p>
                ~ <strong>{estimatedPop.toLocaleString()}</strong> people
                within {distance} km of the shoreline
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LakeInfoPanel;
