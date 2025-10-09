// src/components/ScreenshotButton.jsx
import React from "react";
import { FiCamera } from "react-icons/fi";
import domtoimage from "dom-to-image";

function ScreenshotButton() {
  const handleScreenshot = () => {
    const mapContainer = document.querySelector(".leaflet-container");
    if (!mapContainer) return;

    // Hide all UI chrome except map tiles and overlays. Keep map layers and overlays intact.
    // Expanded list of selectors to hide temporarily for a clean map-only capture.
    const selectors = [
      '.search-bar',
      '.coordinates-scale',
      '.layer-control',
      '.map-controls',
      '.screenshot-btn',
      '.leaflet-control-container',
      '.lake-info-panel',
      '.heatmap-legend',
      '.back-to-dashboard',
      '.filter-tray',
      '.sidebar',
      '.glass-panel',
    ];
    const overlays = document.querySelectorAll(selectors.join(', '));
    const prior = [];
    overlays.forEach((el) => {
      prior.push({ el, display: el.style.display });
      el.style.display = 'none';
    });

    setTimeout(() => {
      domtoimage.toBlob(mapContainer).then((blob) => {
        // Download image
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'map-screenshot.png';
        link.click();

        // Restore overlays
        prior.forEach((p) => { try { p.el.style.display = p.display || ''; } catch {} });
      }).catch((err) => {
        // Restore on error
        prior.forEach((p) => { try { p.el.style.display = p.display || ''; } catch {} });
        console.error('Screenshot failed', err);
      });
    }, 60);
  };

  return (
    <div className="screenshot-btn">
      <button className="btn-floating" onClick={handleScreenshot}>
        <FiCamera className="icon-layer" />
      </button>
    </div>
  );
}

export default ScreenshotButton;