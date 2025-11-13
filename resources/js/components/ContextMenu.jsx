import React, { useEffect, useState, useRef } from "react";
import { Marker, Tooltip } from "react-leaflet";
import { FaRuler, FaDrawPolygon, FaMapMarkerAlt, FaCopy, FaMountain } from "react-icons/fa";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import { alertError, alertSuccess } from "../lib/alerts";

// Blue pin icon
const bluePinIcon = new L.DivIcon({
  className: "custom-pin-icon",
  html: ReactDOMServer.renderToString(
    <FaMapMarkerAlt size={28} color="#1e88e5" />
  ),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -25],
});

const ContextMenu = ({ map, onMeasureDistance, onMeasureArea, onElevationProfile }) => {
  const [position, setPosition] = useState(null);
  const [latlng, setLatlng] = useState(null);
  const [pins, setPins] = useState([]);
  const menuRef = useRef();

  useEffect(() => {
    if (!map) return;

    const handleContextMenu = (e) => {
      e.originalEvent.preventDefault();
      // compute clamped position so menu doesn't overflow the window
      const menuW = 220; // conservative estimate
      const menuH = 160;
      let x = e.originalEvent.clientX;
      let y = e.originalEvent.clientY;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (x + menuW > vw) x = Math.max(8, vw - menuW - 8);
      if (y + menuH > vh) y = Math.max(8, vh - menuH - 8);
      setPosition({ x, y });
      setLatlng(e.latlng);
    };

    const handleClose = () => setPosition(null);

    map.on("contextmenu", handleContextMenu);
    map.on("dragstart", handleClose);
    // Close context menu on left click as well
    map.on("click", handleClose);

    return () => {
      map.off("contextmenu", handleContextMenu);
      map.off("dragstart", handleClose);
      map.off("click", handleClose);
    };
  }, [map]);

  // When the menu is shown, prevent clicks/scrolls inside it from reaching the map.
  useEffect(() => {
    const node = menuRef.current;
    if (!node) return;
    try {
      // Stop Leaflet from receiving click/scroll events from the menu
      L.DomEvent.disableClickPropagation(node);
      L.DomEvent.disableScrollPropagation(node);
    } catch {}
  }, [position]);

  const handleCopyCoords = () => {
    if (latlng) {
      (async () => {
        const coords = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
        let copied = false;
        // Try async Clipboard API first
        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(coords);
            copied = true;
          }
        } catch (e) {
          copied = false;
        }

        if (!copied) {
          // Robust textarea fallback
          try {
            const ta = document.createElement('textarea');
            ta.value = coords;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            copied = document.execCommand && document.execCommand('copy');
            document.body.removeChild(ta);
          } catch (err) {
            copied = false;
          }
        }

        if (copied) {
          await alertSuccess('Copied coordinates', coords);
          setPosition(null);
        } else {
          await alertError('Clipboard copy failed', 'Unable to copy coordinates to clipboard.');
        }
      })();
    }
  };

  const handlePlacePin = () => {
    if (latlng) {
      setPins((prev) => [...prev, latlng]);
      setPosition(null);
    }
  };

  // Remove pin by index
  const handleRemovePin = (idx) => {
    setPins((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <>
      {/* Context Menu */}
      {position && (
        <ul
          className="context-menu glass-panel"
          style={{ top: position.y, left: position.x, position: "absolute" }}
          ref={menuRef}
          // Ensure interactions within the menu don't bubble to the map
          onMouseDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); }}
          onContextMenu={(e) => { e.stopPropagation(); }}
        >
          <li
            className="context-item"
            onClick={() => {
              onMeasureDistance();
              setPosition(null);
            }}
          >
            <FaRuler className="context-icon" /> Measure Distance
          </li>
          <li
            className="context-item"
            onClick={() => {
              onMeasureArea();
              setPosition(null);
            }}
          >
            <FaDrawPolygon className="context-icon" /> Measure Area
          </li>
          
          <li
            className="context-item"
            onClick={() => {
              onElevationProfile && onElevationProfile();
              setPosition(null);
            }}
          >
            <FaMountain className="context-icon" /> Elevation Profile
          </li>
          <li className="context-item" onClick={handlePlacePin}>
            <FaMapMarkerAlt className="context-icon" /> Place pin here
          </li>
          <li className="context-item" onClick={handleCopyCoords}>
            <FaCopy className="context-icon" /> Copy Coordinates
          </li>
        </ul>
      )}

      {/* Pins with liquid-glass tooltip */}
      {pins.map((pin, idx) => (
        <Marker
          key={idx}
          position={pin}
          icon={bluePinIcon}
          eventHandlers={{
            contextmenu: () => handleRemovePin(idx), // ✅ Right click to remove
          }}
        >
          <Tooltip
            className="glass-panel"
            direction="top"
            offset={[0, -30]}
            permanent
          >
            <FaMapMarkerAlt style={{ marginRight: 4, color: "#90caf9" }} />
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
            <div style={{ fontSize: 10, opacity: 0.8, marginTop: 6 }}>Right‑click to remove</div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
};

export default ContextMenu;