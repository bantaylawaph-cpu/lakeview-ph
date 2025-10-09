import React, { useEffect, useState, useRef } from "react";
import { useMap } from "react-leaflet";
import { FaCrosshairs, FaMapMarkerAlt } from "react-icons/fa"; // two icons


const CoordinatesScale = () => {
  const map = useMap();
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const [mode, setMode] = useState("hover");
  const [scale, setScale] = useState({ width: 100, label: "100 m" });

  // --- Coordinate tracking ---
  useEffect(() => {
    if (!map) return;

    const updateCoordsHover = (e) => {
      if (mode === "hover") setCoords(e.latlng);
    };
    const updateCoordsClick = (e) => {
      if (mode === "click") setCoords(e.latlng);
    };

    map.on("mousemove", updateCoordsHover);
    map.on("click", updateCoordsClick);

    return () => {
      map.off("mousemove", updateCoordsHover);
      map.off("click", updateCoordsClick);
    };
  }, [map, mode]);

  // --- Dynamic Scale Bar ---
  useEffect(() => {
    if (!map) return;

    const updateScale = () => {
      const maxWidth = 100;
      const y = map.getSize().y / 2;
      const left = map.containerPointToLatLng([0, y]);
      const right = map.containerPointToLatLng([maxWidth, y]);

      const distance = left.distanceTo(right);
      const niceDistance = getRoundNum(distance);
      const ratio = niceDistance / distance;
      const width = Math.round(maxWidth * ratio);

      setScale({
        width,
        label:
          niceDistance >= 1000
            ? `${(niceDistance / 1000).toFixed(1)} km`
            : niceDistance < 1
              ? `<1 m`
              : `${niceDistance} m`,
      });
    };

    // Use lower-frequency events to avoid frequent reflows during interaction
    map.on("zoomend", updateScale);
    map.on("moveend", updateScale);
    updateScale();

    return () => {
      map.off("zoomend", updateScale);
      map.off("moveend", updateScale);
    };
  }, [map]);

  const getRoundNum = (num) => {
    const pow10 = Math.pow(10, Math.floor(num).toString().length - 1);
    let d = num / pow10;

    if (d >= 10) d = 10;
    else if (d >= 5) d = 5;
    else if (d >= 3) d = 3;
    else if (d >= 2) d = 2;
    else d = 1;

    return pow10 * d;
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "hover" ? "click" : "hover"));
  };

  return (
  <div className="coordinates-scale glass-panel" onClick={toggleMode}>
    {/* Coordinates with Dynamic Icon */}
    <div className="coords-display">
      {mode === "hover" ? (
        <FaCrosshairs className="coords-icon" />
      ) : (
        <FaMapMarkerAlt className="coords-icon" />
      )}
      <span>
        {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
      </span>
    </div>

    {/* Scale Bar */}
    <div className="scale-bar">
      <div className="scale-line" style={{ width: `${scale.width}px` }} />
      <div className="scale-label">{scale.label}</div>
    </div>
  </div>
);
};

export default CoordinatesScale;
