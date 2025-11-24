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
  isPointLake = false,
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
  isLoadingWatershed = false,
  // Nominatim/OSM outline feature removed
  authUser = null,
  onToggleFlows,
  showFlows = false,
  isLoadingFlows = false,
  flows = [],            // pass through from MapPage
  onJumpToFlow,          // callback to focus map on a flow
  hasHeatLayer = false,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [closing, setClosing] = useState(false);
  const [hasSampling, setHasSampling] = useState(null); // null = unknown/loading, false = none, true = has
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

  // Check for presence of sampling events to decide if WQ/Tests tabs should be shown
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const id = lake?.id;
        if (!id) { setHasSampling(null); return; }
        // Lightweight presence probe (limit 1)
        const resp = await fetch(`/api/public/sample-events?lake_id=${id}&limit=1`);
        if (!resp.ok) { if (!abort) setHasSampling(null); return; }
        const js = await resp.json();
        if (!abort) setHasSampling(Array.isArray(js?.data) ? js.data.length > 0 : Array.isArray(js) ? js.length > 0 : false);
      } catch {
        if (!abort) setHasSampling(null);
      }
    })();
    return () => { abort = true; };
  }, [lake?.id]);

  // Ensure activeTab remains valid when visibility conditions change
  useEffect(() => {
    if ((activeTab === 'population' || activeTab === 'layers') && isPointLake) {
      setActiveTab('overview');
      return;
    }
    if ((activeTab === 'water' || activeTab === 'tests') && hasSampling === false) {
      setActiveTab('overview');
      return;
    }
  }, [activeTab, isPointLake, hasSampling]);

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

  // When switching to the Water/Tests tabs (or opening the panel while those
  // tabs are active) trigger a resize event so Chart.js-based charts recompute
  // their sizes. This is important when the panel transitions into view —
  // Chart.js may otherwise measure an incorrect size when being rendered hidden.
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'water' && activeTab !== 'tests') return;
    // schedule a couple of resize events: one after the panel transition starts
    // and another after it finishes to catch layout shifts.
    const t1 = setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    const t2 = setTimeout(() => window.dispatchEvent(new Event('resize')), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeTab, isOpen]);

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
        {/* small visual handle for bottom-sheet affordance on mobile */}
        <div className="panel-handle" aria-hidden="true" />
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
        {/* Hide WQ and Tests when lake has no sampling events (only when explicitly known to be none) */}
        {hasSampling !== false && (
          <button className={`lake-tab ${activeTab === "water" ? "active" : ""}`} onClick={() => setActiveTab("water")}>Water Quality</button>
        )}
        {hasSampling !== false && (
          <button className={`lake-tab ${activeTab === "tests" ? "active" : ""}`} onClick={() => setActiveTab("tests")}>Tests</button>
        )}
        {/* Hide Heatmap and Layers when selected lake is only a marker/point */}
        {!isPointLake && (
          <button className={`lake-tab ${activeTab === "population" ? "active" : ""}`} onClick={() => setActiveTab("population")}>Heatmap</button>
        )}
        {!isPointLake && (
          <button className={`lake-tab ${activeTab === "layers" ? "active" : ""}`} onClick={() => setActiveTab("layers")}>Layers</button>
        )}
      </div>

      {/* Content */}
      <div className="lake-info-content modern-scrollbar">
        {activeTab === "overview" && (
          <OverviewTab
            lake={lake}
            showWatershed={showWatershed}
            canToggleWatershed={canToggleWatershed}
            onToggleWatershed={onToggleWatershed}
            isLoadingWatershed={isLoadingWatershed}
            onOpenFeedback={() => setFeedbackOpen(true)}
            flows={flows}
            showFlows={showFlows}
            onToggleFlows={onToggleFlows}
            onJumpToFlow={onJumpToFlow}
            isLoadingFlows={isLoadingFlows}
          />
        )}
        {activeTab === "water" && hasSampling !== false && (
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
        {activeTab === "tests" && hasSampling !== false && (
          <TestsTab lake={lake} onJumpToStation={onJumpToStation} />
        )}

        {activeTab === "population" && !isPointLake && (
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

        {activeTab === "layers" && !isPointLake && (
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
