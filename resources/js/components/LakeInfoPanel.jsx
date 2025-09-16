import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import OverviewTab from "./lake-info-panel/OverviewTab";
import WaterQualityTab from "./lake-info-panel/WaterQualityTab";
import HeatmapTab from "./lake-info-panel/HeatmapTab";
import LayersTab from "./lake-info-panel/LayersTab";

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
 */
function LakeInfoPanel({
  isOpen,
  onClose,
  lake,
  onToggleHeatmap,
  layers = [],
  activeLayerId = null,
  onSelectLayer,
  onResetToActive,
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
        <button className={`lake-tab ${activeTab === "population" ? "active" : ""}`} onClick={() => setActiveTab("population")}>Population Density</button>
        <button className={`lake-tab ${activeTab === "layers" ? "active" : ""}`} onClick={() => setActiveTab("layers")}>Layers</button>
      </div>

      {/* Content */}
      <div className="lake-info-content">
        {activeTab === "overview" && <OverviewTab lake={lake} />}
        {activeTab === "water" && <WaterQualityTab />}

        {activeTab === "population" && (
          <HeatmapTab lake={lake} onToggleHeatmap={onToggleHeatmap} />
        )}

        {activeTab === "layers" && (
          <LayersTab
            layers={layers}
            activeLayerId={activeLayerId}
            selectedLayerId={selectedLayerId}
            onChooseLayer={handleChooseLayer}
            onResetToActive={handleResetToActive}
          />
        )}
      </div>
    </div>
  );
}

export default LakeInfoPanel;
