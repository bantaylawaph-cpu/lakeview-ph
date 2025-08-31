// src/components/LakeInfoPanel.jsx
import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";

function LakeInfoPanel({ isOpen, onClose, lake, onToggleHeatmap }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [distance, setDistance] = useState(2); // km filter
  const [estimatedPop, setEstimatedPop] = useState(0); // new state
  const [closing, setClosing] = useState(false);

  // Reset closing when panel re-opens
  useEffect(() => {
    if (isOpen) setClosing(false);
  }, [isOpen]);

  // Mock population estimate (replace with real dataset later)
  useEffect(() => {
    if (activeTab === "population") {
      // Example formula: base 15,000 + (distance * 20,000)
      const fakeEstimate = Math.round(15000 + distance * 20000);
      setEstimatedPop(fakeEstimate);
    }
  }, [distance, activeTab]);

  // Prevent render if nothing to show
  if (!lake && !isOpen) return null;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "population") {
      onToggleHeatmap?.(true, distance);
    } else {
      onToggleHeatmap?.(false);
    }
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose(); // trigger parent close after animation
    }, 350); // must match CSS transition
  };

  return (
    <div
      className={`lake-info-panel ${
        isOpen && !closing ? "open" : "closing"
      }`}
    >
      {/* Header */}
      <div className="lake-info-header">
        <h2 className="lake-info-title">{lake?.name}</h2>
        <button className="close-btn" onClick={handleClose}>
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

      {/* Image (only on overview tab) */}
      {activeTab === "overview" && (
        <div className="lake-info-image">
          <img src={lake?.image} alt={lake?.name} />
        </div>
      )}

      {/* Content */}
      <div className="lake-info-content">
        {activeTab === "overview" && (
          <>
            <p><strong>Location:</strong> {lake?.location}</p>
            <p><strong>Area:</strong> {lake?.area}</p>
            <p><strong>Depth:</strong> {lake?.depth}</p>
            <p><strong>Description:</strong> {lake?.description}</p>
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
                  const val = parseInt(e.target.value);
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
