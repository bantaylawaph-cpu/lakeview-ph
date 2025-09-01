import React, { useEffect, useMemo, useRef, useState } from "react";
import { Polyline, Polygon, Marker, Pane, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-geometryutil";
import * as turf from "@turf/turf";

export default function MeasureTool({ active, mode = "distance", onFinish }) {
  const map = useMap();

  const [points, setPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [unitSystem, setUnitSystem] = useState("metric");
  const [paused, setPaused] = useState(false);
  const [closed, setClosed] = useState(false);

  const initialCursorRef = useRef("");

  useEffect(() => {
    if (!active) {
      setPoints([]);
      setMousePos(null);
      setPaused(false);
      setClosed(false);
    } else {
      setPoints([]);
      setMousePos(null);
      setPaused(false);
      setClosed(false);
    }
  }, [active, mode]);

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();

    if (active && initialCursorRef.current === "") {
      initialCursorRef.current = container.style.cursor || "";
    }

    if (active && !paused) {
      container.style.cursor = "crosshair";
    } else {
      container.style.cursor = initialCursorRef.current || "";
    }

    return () => {
      container.style.cursor = initialCursorRef.current || "";
    };
  }, [map, active, paused]);

  const formatDistance = (meters) => {
    if (unitSystem === "metric") {
      return meters >= 1000
        ? `${(meters / 1000).toFixed(2)} km`
        : `${meters.toFixed(1)} m`;
    } else {
      const feet = meters * 3.28084;
      return feet >= 5280
        ? `${(feet / 5280).toFixed(2)} mi`
        : `${feet.toFixed(1)} ft`;
    }
  };

  const formatArea = (m2) => {
    if (unitSystem === "metric") {
      return m2 >= 1_000_000
        ? `${(m2 / 1_000_000).toFixed(3)} km²`
        : `${m2.toFixed(1)} m²`;
    } else {
      const ft2 = m2 * 10.7639;
      const acres = ft2 / 43560;
      const mi2 = m2 / 2_589_988.110336;
      if (mi2 >= 0.1) return `${mi2.toFixed(3)} mi²`;
      if (acres >= 0.1) return `${acres.toFixed(2)} acres`;
      return `${ft2.toFixed(1)} ft²`;
    }
  };

  const totalDistance = useMemo(() => {
    if (points.length < 2) return 0;
    return points.reduce((sum, p, i) => {
      if (i === 0) return 0;
      return sum + p.distanceTo(points[i - 1]);
    }, 0);
  }, [points]);

  const polygonAreaM2 = useMemo(() => {
    if (mode !== "area" || points.length < 3) return 0;
    const coords = points.map((p) => [p.lng, p.lat]);
    coords.push(coords[0]);
    try {
      const polygon = turf.polygon([coords]);
      return turf.area(polygon);
    } catch {
      return 0;
    }
  }, [mode, points]);

  const centroid = useMemo(() => {
    if (points.length === 0) return null;
    try {
      return L.polygon(points).getBounds().getCenter();
    } catch {
      return points[points.length - 1];
    }
  }, [points]);

  useEffect(() => {
    if (!map || !active) return;

    const handleClick = (e) => {
      if (paused) return;
      if (mode === "area" && points.length >= 3) {
        const first = points[0];
        const clickPt = map.latLngToLayerPoint(e.latlng);
        const firstPt = map.latLngToLayerPoint(first);
        if (clickPt.distanceTo(firstPt) <= 10) {
          setClosed(true);
          setPaused(true);
          setMousePos(null);
          return;
        }
      }
      setPoints((prev) => [...prev, e.latlng]);
    };

    const handleMouseMove = (e) => {
      if (!paused) setMousePos(e.latlng);
    };

    map.on("click", handleClick);
    map.on("mousemove", handleMouseMove);

    const keyHandler = (e) => {
      const k = e.key?.toLowerCase?.();
      if (k === "escape") {
        e.preventDefault();
        e.stopPropagation();
        if (!paused) {
          setPaused(true);
          setMousePos(null);
        } else {
          setPoints([]);
          setMousePos(null);
          setClosed(false);
          onFinish?.();
        }
      } else if (k === "u") {
        setUnitSystem((u) => (u === "metric" ? "imperial" : "metric"));
      }
    };
    window.addEventListener("keydown", keyHandler, true);

    return () => {
      map.off("click", handleClick);
      map.off("mousemove", handleMouseMove);
      window.removeEventListener("keydown", keyHandler, true);
    };
  }, [map, active, mode, paused, points]);

  if (!active && points.length === 0) return null;

  let renderPoints = points;
  if (!paused && mousePos && points.length > 0) {
    if (mode === "distance") renderPoints = [...points, mousePos];
    else if (mode === "area" && !closed) renderPoints = [...points, mousePos];
  }

  const makeGlassIcon = (text) =>
    L.divIcon({
      className: "measure-label glass-panel",
      html: `<div>${text}</div>`,
      iconSize: "auto",
    });

  const vertexIcon = new L.DivIcon({
    className: "",
    html: `<div style="
      width:12px;height:12px;
      background:#1976d2;
      border:2px solid #fff;
      border-radius:50%;
      box-shadow:0 0 6px 3px rgba(25,118,210,0.6);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return (
    <>
      {mode === "distance" && renderPoints.length > 1 && (
        <Polyline positions={renderPoints} pathOptions={{ color: "#1976d2", weight: 3 }} />
      )}
      {mode === "area" && renderPoints.length > 2 && (
        <Polygon positions={renderPoints} pathOptions={{ color: "#1976d2", weight: 2, fillOpacity: 0.15 }} />
      )}

      {points.map((p, i) => (
        <Marker
          key={i}
          position={p}
          icon={vertexIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const newLatLng = e.target.getLatLng();
              setPoints((prev) => {
                const updated = [...prev];
                updated[i] = newLatLng;
                return updated;
              });
            },
            contextmenu: () => {
              setPoints((prev) => prev.filter((_, idx) => idx !== i));
            },
          }}
        >
          <Tooltip direction="top" opacity={1} className="glass-panel">
            Drag to move • Right-click to delete
          </Tooltip>
        </Marker>
      ))}

      {mode === "distance" && points.length > 1 && (
        <Pane name="measure-labels" style={{ zIndex: 1000 }}>
          <Marker
            position={points[points.length - 1]}
            icon={makeGlassIcon(`Total: ${formatDistance(totalDistance)}`)}
            interactive={false}
          />
        </Pane>
      )}

      {mode === "area" && points.length > 2 && centroid && (
        <Pane name="measure-labels" style={{ zIndex: 1000 }}>
          <Marker
            position={centroid}
            icon={makeGlassIcon(`Area: ${formatArea(polygonAreaM2)}`)}
            interactive={false}
          />
        </Pane>
      )}
    </>
  );
}
