// src/components/LayerControl.jsx
import React, { useEffect, useState } from "react";
import { FiLayers } from "react-icons/fi";

function LayerControl({ selectedView, setSelectedView, showContours, setShowContours, showContourLabels, setShowContourLabels }) {
  const [open, setOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  // Initialize from global default if parent hasn't set one yet
  useEffect(() => {
    if (!selectedView && typeof setSelectedView === 'function') {
      let def = 'topographic';
      try { def = localStorage.getItem('lv.defaultBasemap') || def; } catch {}
      setSelectedView(def);
    }
  }, [selectedView, setSelectedView]);

  // React to global basemap changes from Admin Settings
  useEffect(() => {
    const onDefaultBasemap = (e) => {
      const value = e.detail;
      if (typeof setSelectedView === 'function') setSelectedView(value);
    };
    window.addEventListener('lv-default-basemap', onDefaultBasemap);
    return () => window.removeEventListener('lv-default-basemap', onDefaultBasemap);
  }, [setSelectedView]);

  // Clear overlays when global erase event is dispatched
  useEffect(() => {
    const onErase = () => {
      try { setShowContours && setShowContours(false); } catch {}
      try { setShowContourLabels && setShowContourLabels(false); } catch {}
    };
    window.addEventListener('lv-erase-overlays', onErase);
    return () => window.removeEventListener('lv-erase-overlays', onErase);
  }, [setShowContours, setShowContourLabels]);

  useEffect(() => {
    let t;
    if (open) {
      setShowPanel(true);
    } else {
      // Delay unmount until fade-out completes
      t = setTimeout(() => setShowPanel(false), 220);
    }
    return () => t && clearTimeout(t);
  }, [open]);

  return (
    <div className="layer-control">
      {/* Floating Button in liquid-glass tile with label */}
      <div className="map-control-tile glass-panel">
        <button
          className="btn-floating"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close layer controls" : "Open layer controls"}
        >
          <FiLayers className="icon-layer" />
        </button>
        <span className="map-control-label">Basemap</span>
      </div>

      {/* Dropdown Panel */}
      {showPanel && (
        <div className={"layer-panel " + (open ? 'fade-in' : 'fade-out')}>
          <h6 className="layer-title">Basemap style</h6>
          <label>
            <input
              type="radio"
              name="map-view"
              value="osm"
              checked={selectedView === "osm"}
              onChange={() => setSelectedView("osm")}
            />
            <span>OpenStreetMap</span>
          </label>
          <label>
            <input
              type="radio"
              name="map-view"
              value="satellite"
              checked={selectedView === "satellite"}
              onChange={() => setSelectedView("satellite")}
            />
            <span>Esri World Imagery</span>
          </label>
          <label>
            <input
              type="radio"
              name="map-view"
              value="topographic"
              checked={selectedView === "topographic"}
              onChange={() => setSelectedView("topographic")}
            />
            <span>Esri Topographic</span>
          </label>
          <label>
            <input
              type="radio"
              name="map-view"
              value="street"
              checked={selectedView === "street"}
              onChange={() => setSelectedView("street")}
            />
            <span>Esri Streets</span>
          </label>
          <label>
            <input
              type="radio"
              name="map-view"
              value="stamen_terrain"
              checked={selectedView === "stamen_terrain"}
              onChange={() => setSelectedView("stamen_terrain")}
            />
            <span>Stamen Terrain</span>
          </label>
          <label>
            <input
              type="radio"
              name="map-view"
              value="worldcover_2021"
              checked={selectedView === "worldcover_2021"}
              onChange={() => setSelectedView("worldcover_2021")}
            />
            <span>ESA WorldCover 2021</span>
          </label>
          <div style={{ borderTop: '1px solid #eee', margin: '8px 0' }} />
          <h6 className="layer-title">Overlays</h6>
          <label>
            <input
              type="checkbox"
              checked={!!showContours}
              onChange={(e) => setShowContours && setShowContours(e.target.checked)}
            />
            <span>Elevation Contours</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default LayerControl;