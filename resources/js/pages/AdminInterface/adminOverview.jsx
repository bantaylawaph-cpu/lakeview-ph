// resources/js/pages/AdminInterface/AdminOverview.jsx
import React, { useMemo } from "react";
import {
  FiBriefcase,    // Organizations
  FiUsers,        // Registered Users
  FiMap,          // Lakes in Database
  FiDroplet,      // Water Quality Reports in Database
  FiActivity,     // Recent Activity header icon
} from "react-icons/fi";

import AppMap from "../../components/AppMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

/* KPI Grid */
function KPIGrid() {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-icon"><FiBriefcase /></div>
        <div className="kpi-info">
          <span className="kpi-title">Organizations</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiUsers /></div>
        <div className="kpi-info">
          <span className="kpi-title">Registered Users</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiMap /></div>
        <div className="kpi-info">
          <span className="kpi-title">Lakes in Database</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiDroplet /></div>
        <div className="kpi-info">
          <span className="kpi-title">Water Quality Reports in Database</span>
          <span className="kpi-value"></span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Overview Map
   (Basemap only; no markers/features preloaded.)
   ============================================================ */
function OverviewMap() {
  return (
    <div className="map-container">
      <AppMap view="osm" style={{ height: "100%", width: "100%" }}>
        {/* Add GeoJSON layers or markers once data is available */}
      </AppMap>
    </div>
  );
}

/* ============================================================
   Recent Logs
   (Empty list; render items when you have data.)
   ============================================================ */
function RecentLogs() {
  return (
    <div className="dashboard-card" style={{ marginTop: 24 }}>
      <div className="dashboard-card-title">
        <FiActivity style={{ marginRight: 8 }} />
        <span>Recent Activity</span>
      </div>
      <div className="dashboard-card-body">
        <ul className="recent-logs-list">
          {/* Intentionally empty. Map over recent logs here. */}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   Page: AdminOverview
   ============================================================ */
export default function AdminOverview() {
  return (
    <>
      <KPIGrid />
      <OverviewMap />
      <RecentLogs />
    </>
  );
}
