import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import OverviewTab from "./lake-info-panel/OverviewTab";
import WaterQualityTab from "./lake-info-panel/WaterQualityTab";
import HeatmapTab from "./lake-info-panel/HeatmapTab";
import LayersTab from "./lake-info-panel/LayersTab";
import TestsTab from "./lake-info-panel/TestsTab";

/**
 * Props
 * - isOpen: boolean
 * - onClose: () => void
 * - lake: { id, name, ... }
 * - onToggleHeatmap?: (enabled:boolean, km:number) => void
 * - layers?: Array<{ id, name, notes?, uploaded_by_org?, is_active? }>
 * - activeLayerId?: number|string|null
 * - onSelectLayer?: (layer: object) => void
 * - onResetToActive?: () => void
 * - onToggleWatershed?: (checked: boolean) => void
 * - showWatershed?: boolean
 * - canToggleWatershed?: boolean
 */
function LakeInfoPanel({
  isOpen,
  onClose,
  lake,
  onJumpToStation,
  onToggleHeatmap,
  layers = [],
  activeLayerId = null,
  onSelectLayer,
  onResetToActive,
  onToggleWatershed,
  showWatershed = false,
  canToggleWatershed = false,
  authUser = null,
  onToggleFlows,
  showFlows = false,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [closing, setClosing] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState(activeLayerId ?? null);

  useEffect(() => { if (isOpen) setClosing(false); }, [isOpen]);

  // Sync selection when the lake or its active layer changes
  useEffect(() => {
    if (lake) setActiveTab("overview");
    setSelectedLayerId(activeLayerId ?? null);
  }, [lake?.id, activeLayerId]);

  // Emit WQ active state so MapPage can clear/persist markers (active when either Water or Tests tab is active)
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('lv-wq-active', { detail: { active: activeTab === 'water' || activeTab === 'tests' } }));
      // If tests tab is now active, request that TestsTab immediately emit markers
      if (activeTab === 'tests') {
        try { window.dispatchEvent(new CustomEvent('lv-request-wq-markers', {})); } catch {}
      }
    } catch {}
  }, [activeTab]);

  if (!lake && !isOpen) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { onClose?.(); }, 350);
  };

  const handleChooseLayer = (id) => {
    setSelectedLayerId(id);
    const found = layers.find((l) => String(l.id) === String(id));
    if (found) onSelectLayer?.(found);
  };

  const handleResetToActive = () => {
    setSelectedLayerId(activeLayerId ?? null);
    onResetToActive?.();
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
        <button className={`lake-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
  <button className={`lake-tab ${activeTab === "water" ? "active" : ""}`} onClick={() => setActiveTab("water")}>Water Quality</button>
  <button className={`lake-tab ${activeTab === "tests" ? "active" : ""}`} onClick={() => setActiveTab("tests")}>Tests</button>
        <button className={`lake-tab ${activeTab === "population" ? "active" : ""}`} onClick={() => setActiveTab("population")}>Population Density</button>
        <button className={`lake-tab ${activeTab === "layers" ? "active" : ""}`} onClick={() => setActiveTab("layers")}>Layers</button>
        <button className={`lake-tab ${activeTab === "flows" ? "active" : ""}`} onClick={() => setActiveTab("flows")}>Flows</button>
      </div>

      {/* Content */}
      <div className="lake-info-content">
        {activeTab === "overview" && (
          <OverviewTab
            lake={lake}
            showWatershed={showWatershed}
            canToggleWatershed={canToggleWatershed}
            onToggleWatershed={onToggleWatershed}
          />
        )}
        {activeTab === "water" && (
          <WaterQualityTab
            lake={lake}
            onSelectTestStation={(lat, lon) => {
              if (typeof onJumpToStation === 'function') {
                onJumpToStation(lat, lon);
              } else {
                try { window.dispatchEvent(new CustomEvent('lv-jump-to-station', { detail: { lat, lon } })); } catch {}
              }
            }}
          />
        )}
        {activeTab === "tests" && (
          <TestsTab lake={lake} onJumpToStation={onJumpToStation} />
        )}

        {activeTab === "population" && (
          <HeatmapTab
            lake={lake}
            onToggleHeatmap={onToggleHeatmap}
            currentLayerId={
              selectedLayerId != null && String(selectedLayerId) !== String(activeLayerId ?? '')
                ? selectedLayerId
                : null
            }
          />
        )}

        {activeTab === "layers" && (
          <LayersTab
            layers={layers}
            activeLayerId={activeLayerId}
            selectedLayerId={selectedLayerId}
            onChooseLayer={handleChooseLayer}
            onResetToActive={handleResetToActive}
            isAuthenticated={!!authUser}
          />
        )}
        {activeTab === "flows" && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <p style={{fontSize:13,lineHeight:1.4}}>Show inflow / outflow points for this lake. These markers appear on the map in distinct colors.</p>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}>
              <input type="checkbox" checked={showFlows} onChange={e=>onToggleFlows?.(e.target.checked)} /> Show Inflows / Outflows
            </label>
            <p style={{fontSize:11,opacity:.7}}>Inflow markers use teal; Outflow markers use purple.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LakeInfoPanel;
