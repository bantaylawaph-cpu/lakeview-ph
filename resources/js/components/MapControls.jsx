// src/components/MapControls.jsx
import React, { useState } from "react";
import { useMap, Marker, Tooltip } from "react-leaflet"; // use Tooltip instead of Popup
import { FiBarChart2, FiCrosshair, FiPlus, FiMinus } from "react-icons/fi";
import { FaLocationDot } from "react-icons/fa6"; // filled location dot
import L from "leaflet";
import { alertError, alertSuccess } from "../lib/alerts";
import ReactDOMServer from "react-dom/server";
import StatsModal from "./modals/StatsModal";


// Filled location icon
const locationIcon = new L.DivIcon({
  className: "custom-location-icon",
  html: ReactDOMServer.renderToString(
    <FaLocationDot size={30} color="#e53935" /> // Bright red for visibility
  ),
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

function MapControls({ defaultCenter = [12.8797, 121.7740], defaultZoom = 6, defaultBounds = null }) {
  const map = useMap();
  const [geolocated, setGeolocated] = useState(false);
  const [position, setPosition] = useState(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();

  const handleGeolocation = () => {
    if (!geolocated) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const userPos = [latitude, longitude];
            setPosition(userPos);
            map.setView(userPos, 14);
            setGeolocated(true);
          },
          () => alertError("Unable to fetch your location.")
        );
      }
    } else {
      // Reset to default view
      if (defaultBounds) map.fitBounds(defaultBounds);
      else map.setView(defaultCenter, defaultZoom);
      setPosition(null);
      setGeolocated(false);
    }
  };

  return (
    <>
      {/* Floating Controls */}
      <div className="map-controls">
        <button className="btn-floating" onClick={() => setStatsOpen(true)}>
          <FiBarChart2 className="icon-layer" />
        </button>
        <button className="btn-floating" onClick={handleGeolocation}>
          <FiCrosshair className="icon-layer" />
        </button>
        <button className="btn-floating" onClick={handleZoomIn}>
          <FiPlus className="icon-layer" />
        </button>
        <button className="btn-floating" onClick={handleZoomOut}>
          <FiMinus className="icon-layer" />
        </button>
      </div>

      {/* Location Marker with liquid-glass tooltip */}
      {position && (
        <Marker position={position} icon={locationIcon}>
          <Tooltip
            className="glass-panel"
            direction="top"
            offset={[0, -35]}
            permanent
          >
            <FaLocationDot
              className="popup-icon"
              style={{ marginRight: 4, color: "#e53935" }}
            />
            <span>You are here</span>
          </Tooltip>
        </Marker>
      )}

      {/* Stats Modal */}
      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
    </>
  );
}

export default MapControls;

