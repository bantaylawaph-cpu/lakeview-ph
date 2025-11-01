import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import OverviewTab from "./lake-info-panel/OverviewTab";
import WaterQualityTab from "./lake-info-panel/WaterQualityTab";
import HeatmapTab from "./lake-info-panel/HeatmapTab";
import LayersTab from "./lake-info-panel/LayersTab";
import TestsTab from "./lake-info-panel/TestsTab";
import LoadingSpinner from "./LoadingSpinner";
import LakeFeedbackModal from "./lake-info-panel/LakeFeedbackModal";

function LakeInfoPanel({
  isOpen,
  onClose,
  lake,
  onJumpToStation,
  onToggleHeatmap,
  onClearHeatmap,
  heatEnabled = false,
  heatLoading = false,
  layers = [],
  activeLayerId = null,
  onSelectLayer,
  onResetToActive,
  onToggleWatershed,
  showWatershed = false,
  canToggleWatershed = false,
  // Nominatim/OSM outline feature removed
  authUser = null,
  onToggleFlows,
  showFlows = false,
  flows = [],            // pass through from MapPage
  onJumpToFlow,          // callback to focus map on a flow
  hasHeatLayer = false,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [closing, setClosing] = useState(false);
  // When the panel is first opened we want to add the "open" class after a
  // tick so the CSS transition runs. If we mount with `open` already set the
  // browser doesn't animate.
  const [animateOpen, setAnimateOpen] = useState(false);
  useEffect(() => {
    let t = null;
    if (isOpen) {
      // ensure we're not in a closing state and schedule the entrance
      setClosing(false);
      // small delay to allow the initial render to apply base styles
      t = setTimeout(() => setAnimateOpen(true), 20);
    } else {
      // hide immediately (closing handled by handleClose)
      setAnimateOpen(false);
    }
    return () => { if (t) clearTimeout(t); };
  }, [isOpen]);
  const [selectedLayerId, setSelectedLayerId] = useState(activeLayerId ?? null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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

  // Compute panel class so we can defer adding `open` until animateOpen is true.
  const panelClass = (() => {
    if (isOpen) {
      if (closing) return 'lake-info-panel closing';
      return `lake-info-panel ${animateOpen ? 'open' : ''}`;
    }
    return `lake-info-panel ${closing ? 'closing' : ''}`;
  })();

  return (
    <div className={panelClass}>
      {/* Header */}
      <div className="lake-info-header">
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h2 className="lake-info-title" style={{ marginBottom: 2 }}>
              {lake?.name || "Lake"}
            </h2>
            {/* OSM outline feature removed */}
          </div>
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
        <button className={`lake-tab ${activeTab === "population" ? "active" : ""}`} onClick={() => setActiveTab("population")}>Heatmap</button>
        <button className={`lake-tab ${activeTab === "layers" ? "active" : ""}`} onClick={() => setActiveTab("layers")}>Layers</button>
      </div>

      {/* Content */}
      <div className="lake-info-content modern-scrollbar">
        {activeTab === "overview" && (
          <OverviewTab
            lake={lake}
            showWatershed={showWatershed}
            canToggleWatershed={canToggleWatershed}
            onToggleWatershed={onToggleWatershed}
            onOpenFeedback={() => setFeedbackOpen(true)}
            flows={flows}
            showFlows={showFlows}
            onToggleFlows={onToggleFlows}
            onJumpToFlow={onJumpToFlow}
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
            onClearHeatmap={onClearHeatmap}
            currentLayerId={
              selectedLayerId != null && String(selectedLayerId) !== String(activeLayerId ?? '')
                ? selectedLayerId
                : null
            }
            hasHeatLayer={hasHeatLayer}
            heatEnabled={heatEnabled}
            heatLoading={heatLoading}
          />
        )}

        {activeTab === "layers" && (
          <LayersTab
            lake={lake}
            layers={layers}
            activeLayerId={activeLayerId}
            selectedLayerId={selectedLayerId}
            onChooseLayer={handleChooseLayer}
            onResetToActive={handleResetToActive}
            isAuthenticated={!!authUser}
          />
        )}
      </div>
      <LakeFeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} lake={lake} />
    </div>
  );
}

export default LakeInfoPanel;
