import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import OverviewTab from "./lake-info-panel/OverviewTab";
import WaterQualityTab from "./lake-info-panel/WaterQualityTab";
import HeatmapTab from "./lake-info-panel/HeatmapTab";
import LayersTab from "./lake-info-panel/LayersTab";
import TestsTab from "./lake-info-panel/TestsTab";
import LoadingSpinner from "./LoadingSpinner";
import LakeFeedbackModal from "./lake-info-panel/LakeFeedbackModal";

/**
 * Props
 * - isOpen: boolean
 * - onClose: () => void
 * - lake: { id, name, ... }
 * - onToggleHeatmap?: (enabled:boolean, km:number) => void
 * - onClearHeatmap?: () => void
 * - heatEnabled?: boolean
 * - heatLoading?: boolean
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
  // Nominatim toggle (visible only when no active geometry; base is a marker)
  canToggleNominatim = false,
  nominatimEnabled = false,
  nominatimLoading = false,
  onToggleNominatim,
  authUser = null,
  onToggleFlows,
  showFlows = false,
  flows = [],            // pass through from MapPage
  onJumpToFlow,          // callback to focus map on a flow
  hasHeatLayer = false,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [closing, setClosing] = useState(false);
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

  return (
    <div className={`lake-info-panel ${isOpen && !closing ? "open" : "closing"}`}>
      {/* Header */}
      <div className="lake-info-header">
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h2 className="lake-info-title" style={{ marginBottom: 2 }}>
              {lake?.name || "Lake"}
            </h2>
            {canToggleNominatim && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  aria-pressed={nominatimEnabled}
                  onClick={() => onToggleNominatim?.(!nominatimEnabled)}
                  title={nominatimEnabled ? 'Hide map outline from OpenStreetMap' : 'Show map outline from OpenStreetMap'}
                  disabled={nominatimLoading}
                  style={{
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: nominatimEnabled ? 'rgba(124,58,237,0.25)' : 'rgba(0,0,0,0.2)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 6,
                    cursor: nominatimLoading ? 'wait' : 'pointer',
                    fontSize: 12,
                    lineHeight: 1.1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {nominatimLoading ? <LoadingSpinner label={nominatimEnabled ? 'Hiding…' : 'Loading…'} size={14} color="#fff" inline={true} /> : (nominatimEnabled ? 'Hide OSM Outline' : 'Show OSM Outline')}
                </button>
                {nominatimEnabled && (
                  <div style={{ fontSize: 11, color: '#d1c4ff', opacity: 0.95 }}>
                    Outline source: OpenStreetMap (Nominatim)
                  </div>
                )}
              </div>
            )}
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
        {/* <button className={`lake-tab ${activeTab === "population" ? "active" : ""}`} onClick={() => setActiveTab("population")}>Population Density</button> */}
        <button className={`lake-tab ${activeTab === "layers" ? "active" : ""}`} onClick={() => setActiveTab("layers")}>Layers</button>
        {/* Flows tab removed; flows now in Overview */}
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
            // Nominatim toggle
            canToggleNominatim={canToggleNominatim}
            nominatimEnabled={nominatimEnabled}
            onToggleNominatim={onToggleNominatim}
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
            layers={layers}
            activeLayerId={activeLayerId}
            selectedLayerId={selectedLayerId}
            onChooseLayer={handleChooseLayer}
            onResetToActive={handleResetToActive}
            isAuthenticated={!!authUser}
          />
        )}
        {/* Flows content removed */}
      </div>
      <LakeFeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} lake={lake} />
    </div>
  );
}

export default LakeInfoPanel;
