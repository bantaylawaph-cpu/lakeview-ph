import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { FaBuilding, FaUsers, FaDatabase, FaWater } from "react-icons/fa";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ✅ Import images directly (Vite-friendly)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// ✅ Fix leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DashboardPage = () => {
  // Mock KPI data
  const stats = [
    { label: "Organizations", value: 12, icon: <FaBuilding /> },
    { label: "Users", value: 245, icon: <FaUsers /> },
    { label: "Datasets (Tests)", value: 430, icon: <FaDatabase /> },
    { label: "Lakes Monitored", value: 5, icon: <FaWater /> },
  ];

  return (
    <div className="dashboard-content">
      <h2 className="dashboard-title">Admin Dashboard</h2>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="kpi-card">
            <div className="kpi-icon">{stat.icon}</div>
            <div className="kpi-info">
              <span className="kpi-title">{stat.label}</span>
              <span className="kpi-value">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Map Overview */}
      <div className="map-section">
        <h3 className="map-title">Lakes Overview</h3>
        <div className="map-container">
          <MapContainer
            center={[14.6, 121.0]} // Laguna de Bay
            zoom={9}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Example marker */}
            <Marker position={[14.33, 121.23]}>
              <Popup>Laguna de Bay (Example)</Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
