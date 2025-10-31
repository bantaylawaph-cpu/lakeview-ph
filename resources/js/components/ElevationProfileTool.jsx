import React, { useEffect, useMemo, useRef, useState } from "react";
import { Polyline, Marker, Pane, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { Line } from "react-chartjs-2";
import LoadingSpinner from "./LoadingSpinner";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// A lightweight tool to draw a path and request an elevation profile from the backend
export default function ElevationProfileTool({ active, onClose }) {
  const map = useMap();
  const [animState, setAnimState] = useState(''); // '' | 'enter' | 'exit'
  const [points, setPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerCursor = useRef("");
  const [paused, setPaused] = useState(false);
  const [hoverPoint, setHoverPoint] = useState(null); // Leaflet LatLng
  const chartRef = useRef(null);
  const latestProfileRef = useRef(null);

  useEffect(() => { latestProfileRef.current = profile; }, [profile]);

  // Reset on toggle
  useEffect(() => {
    if (!active) {
      setPoints([]);
      setMousePos(null);
      setProfile(null);
      setError(null);
      setLoading(false);
      setPaused(false);
      // Ensure cursor returns to default when deactivated
      try {
        const container = map?.getContainer?.();
        if (container) container.style.cursor = "";
      } catch {}
      containerCursor.current = "";
    }
  }, [active]);

  // entrance animation when becoming active
  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setAnimState('enter'), 20);
      return () => clearTimeout(t);
    } else {
      setAnimState('');
    }
  }, [active]);

  // Capture clicks and move to draw a line
  useEffect(() => {
    if (!map || !active) return;
    const container = map.getContainer();
    if (!containerCursor.current) containerCursor.current = container.style.cursor || "";
    container.style.cursor = paused ? (containerCursor.current || "") : "crosshair";

    const onClick = (e) => {
      if (paused) return;
      setPoints((prev) => [...prev, e.latlng]);
    };
    const onMouseMove = (e) => {
      if (!paused) setMousePos(e.latlng);
    };
    const onKey = (e) => {
      const k = e.key?.toLowerCase?.();
      if (k === "escape") {
        e.preventDefault();
        if (!paused) {
          // First ESC: pause drawing and hide trailing line
          setPaused(true);
          setMousePos(null);
        } else {
          // Second ESC: close tool
          try {
            map.off("click", onClick);
            map.off("mousemove", onMouseMove);
            window.removeEventListener("keydown", onKey, true);
          } catch {}
          try { container.style.cursor = ""; } catch {}
          setPoints([]);
          setProfile(null);
          setError(null);
          onClose?.();
        }
      }
      if (k === "enter") {
        e.preventDefault();
        if (points.length >= 2) requestProfile();
      }
    };

    map.on("click", onClick);
    map.on("mousemove", onMouseMove);
    window.addEventListener("keydown", onKey, true);

    return () => {
      try { map.off("click", onClick); } catch {}
      try { map.off("mousemove", onMouseMove); } catch {}
      try { window.removeEventListener("keydown", onKey, true); } catch {}
      try { container.style.cursor = ""; } catch {}
    };
  }, [map, active, paused, points.length]);

  // Keep cursor in sync with paused state even when no listeners update
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    if (!containerCursor.current) containerCursor.current = container.style.cursor || "";
    if (active && !paused) container.style.cursor = "crosshair";
    else container.style.cursor = "";
    return () => {
      try { container.style.cursor = ""; } catch {}
    };
  }, [map, active, paused]);

  const requestProfile = async () => {
    if (!points || points.length < 2) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const gj = {
        type: "LineString",
        coordinates: points.map((p) => [p.lng, p.lat]),
      };
      const res = await fetch("/api/elevation/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Reduce sampling density to lower DB load in production
        body: JSON.stringify({ geometry: gj, sampleDistance: 80, maxSamples: 1000 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const js = await res.json();
      setProfile(js);
    } catch (e) {
      setError(e?.message || "Failed to get profile");
    } finally {
      setLoading(false);
    }
  };

  const line = useMemo(() => {
    if (!points.length) return null;
    const arr = [...points];
    if (!paused && mousePos) arr.push(mousePos);
    return arr;
  }, [points, mousePos, paused]);

  const chartData = useMemo(() => {
    if (!profile || !Array.isArray(profile.points)) return null;
    const labels = profile.points.map((p) => (p.distance_m / 1000).toFixed(2));
    const data = profile.points.map((p) => (p.elevation_m == null ? null : Number(p.elevation_m)));
    return {
      labels,
      datasets: [
        {
          label: "Elevation (m)",
          data,
          // Match WaterQualityTab primary series coloring
          borderColor: "rgba(59,130,246,1)",
          backgroundColor: "rgba(59,130,246,0.2)",
          spanGaps: false,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }, [profile]);

  const chartOptions = useMemo(() => ({
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { intersect: false, mode: "index" },
    },
    onHover: (event, elements, chart) => {
      try {
        const p = latestProfileRef.current;
        if (!p || !Array.isArray(p.points)) { setHoverPoint(null); return; }
        let idx = null;
        if (elements && elements.length > 0 && typeof elements[0].index === 'number') {
          idx = elements[0].index;
        } else if (chart && chart.tooltip && chart.tooltip.dataPoints && chart.tooltip.dataPoints.length > 0) {
          idx = chart.tooltip.dataPoints[0].dataIndex;
        }
        if (idx != null) {
          const pt = p.points[idx];
          if (pt && pt.lat != null && pt.lon != null) {
            setHoverPoint(L.latLng(Number(pt.lat), Number(pt.lon)));
            return;
          }
        }
        setHoverPoint(null);
      } catch { setHoverPoint(null); }
    },
    // Match WaterQualityTab dark theme axes
    scales: {
      x: {
        title: { display: true, text: "Distance (km)", color: "#fff" },
        ticks: { color: "#fff", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        grid: { color: "rgba(255,255,255,0.15)" },
      },
      y: {
        title: { display: true, text: "Elevation (m)", color: "#fff" },
        beginAtZero: false,
        ticks: { color: "#fff" },
        grid: { color: "rgba(255,255,255,0.15)" },
      },
    },
  }), []);

  // Container style to position the card over the map while using the same card look
  const cardWrap = {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 1200,
  };

  const handleClose = () => {
    try { const c = map?.getContainer?.(); if (c) c.style.cursor = ""; } catch {};
    // play exit animation then notify parent
    setAnimState('exit');
    setTimeout(() => {
      setPoints([]);
      setProfile(null);
      setPaused(false);
      setMousePos(null);
      onClose?.();
    }, 300);
  };

  return active ? (
    <>
      {line && line.length > 1 && (
        <Polyline positions={line} pathOptions={{ color: "#1976d2", weight: 3 }} />
      )}
      {points.map((p, i) => (
        <Marker
          key={i}
          position={p}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              setPoints((prev) => prev.map((pp, idx) => (idx === i ? ll : pp)));
            },
            contextmenu: () => {
              setPoints((prev) => prev.filter((_, idx) => idx !== i));
            },
          }}
          icon={new L.DivIcon({ className: "", html: '<div style="width:10px;height:10px;background:#1976d2;border:2px solid #fff;border-radius:50%"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })}
        >
          <LeafletTooltip direction="top" opacity={1} className="glass-panel">
            Drag to move • Right-click to delete • Esc to pause • Esc again to close
          </LeafletTooltip>
        </Marker>
      ))}
      {/* Bottom panel with actions and chart, matching WaterQualityTab/LakeInfoPanel styling */}
      <div className="elev-card-wrap" style={cardWrap}>
        <div className={`elev-card ${animState} insight-card`} style={{ backgroundColor: '#0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
            <h4 style={{ margin: 0, color: '#fff' }}>Elevation Profile</h4>
              <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPoints([])} className="pill-btn liquid" style={{ padding: '4px 6px' }}>Clear</button>
              <button onClick={() => requestProfile()} className="pill-btn liquid" style={{ padding: '4px 6px' }} disabled={points.length < 2 || loading}>
                {loading ? 'Sampling…' : 'Compute'}
              </button>
              <button onClick={handleClose} className="pill-btn liquid" style={{ padding: '4px 6px' }}>
                Close
              </button>
            </div>
          </div>
          {error && <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 6 }}>{error}</div>}
          {profile && (
            <div style={{ display: 'flex', gap: 12, fontSize: 12, marginBottom: 6, color: '#fff' }}>
              <div>Len: {(profile.summary.length_m/1000).toFixed(2)} km</div>
              <div>Min: {profile.summary.min_elev_m?.toFixed?.(1)} m</div>
              <div>Max: {profile.summary.max_elev_m?.toFixed?.(1)} m</div>
              <div>Asc: {profile.summary.total_ascent_m?.toFixed?.(0)} m</div>
              <div>Des: {profile.summary.total_descent_m?.toFixed?.(0)} m</div>
            </div>
          )}
          <div className="wq-chart" style={{ height: 160 }}>
            {chartData ? (
              <Line
                ref={chartRef}
                data={chartData}
                options={chartOptions}
                onMouseLeave={() => setHoverPoint(null)}
              />
            ) : (
              <div style={{ fontSize: 12, color: '#bbb', opacity: 0.9, display: 'grid', placeItems: 'center', height: '100%' }}>
                {points.length < 2
                  ? 'Click to add points on the map, then press Compute or Enter.'
                  : (loading
                      ? <LoadingSpinner label="Computing profile..." color="#fff" />
                      : 'Press Compute to get profile.')}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Hover marker synchronized with chart position */}
      {hoverPoint && (
        <Pane name="elev-hover" style={{ zIndex: 1300 }}>
          <Marker
            position={hoverPoint}
            interactive={false}
            icon={new L.DivIcon({
              className: "",
              html: '<div style="width:12px;height:12px;background:#f59e0b;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px 3px rgba(245,158,11,0.5)"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })}
          />
        </Pane>
      )}
    </>
  ) : null;
}
