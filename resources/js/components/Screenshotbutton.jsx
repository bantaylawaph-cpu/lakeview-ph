// src/components/ScreenshotButton.jsx
import React from "react";
import { FiCamera } from "react-icons/fi";
import * as htmlToImage from "html-to-image";

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
      '.worldcover-legend',
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
      htmlToImage.toBlob(mapContainer).then((blob) => {
        if (!blob) return;
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
      <div className="map-control-tile glass-panel">
        <button className="btn-floating" onClick={handleScreenshot} aria-label="Take screenshot" title="Take screenshot">
          <FiCamera className="icon-layer" />
        </button>
        <span className="map-control-label">Screenshot</span>
      </div>
    </div>
  );
}

export default ScreenshotButton;