import React, { useEffect, useState } from "react";

/**
 * Props
 * - lake
 * - onToggleHeatmap?: (enabled:boolean, km:number) => void
 */
function HeatmapTab({ lake, onToggleHeatmap }) {
  const [distance, setDistance] = useState(2);
  const [estimatedPop, setEstimatedPop] = useState(0);

  // Enable heatmap on mount, disable on unmount; update when distance changes
  useEffect(() => {
    onToggleHeatmap?.(true, distance);
    return () => onToggleHeatmap?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // mock estimate
    const fakeEstimate = Math.round(15000 + distance * 20000);
    setEstimatedPop(fakeEstimate);
    onToggleHeatmap?.(true, distance);
  }, [distance, onToggleHeatmap]);

  return (
    <>
      <h3>Population Density Heatmap</h3>
      <p>Heatmap of population living around <strong>{lake?.name}</strong>.</p>

      <div
        className="slider-container"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <label htmlFor="distanceRange">Distance from shoreline: {distance} km</label>
        <input
          id="distanceRange"
          type="range"
          min="1"
          max="10"
          step="1"
          value={distance}
          onChange={(e) => setDistance(parseInt(e.target.value, 10))}
        />
      </div>

      <div className="insight-card">
        <h4>Estimated Population</h4>
        <p>
          ~ <strong>{estimatedPop.toLocaleString()}</strong> people within {distance} km of the shoreline
        </p>
      </div>
    </>
  );
}

export default HeatmapTab;
