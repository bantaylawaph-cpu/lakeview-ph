// resources/js/pages/OrgInterface/OrgOverview.jsx
import React, { useMemo } from "react";
import {
  FiUsers,          // Active Members
  FiDatabase,       // Tests Logged
  FiClipboard,      // Pending Approvals
  FiFlag,           // Alerts/Flagged
  FiActivity,       // Recent Activity header icon
  FiPlus,           // Log Test
  FiUserPlus,       // Invite Member
  FiList,           // View Test Results
  FiUploadCloud,    // Uploads
} from "react-icons/fi";

import { Link } from "react-router-dom";
import AppMap from "../../components/AppMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* --- Leaflet default marker fix (keeps OSM markers visible) --- */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ============================================================
   KPI Grid (4 stats; empty values for now)
   ============================================================ */
function KPIGrid() {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-icon"><FiUsers /></div>
        <div className="kpi-info">
          <span className="kpi-title">Active Members</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiDatabase /></div>
        <div className="kpi-info">
          <span className="kpi-title">Tests Logged</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiClipboard /></div>
        <div className="kpi-info">
          <span className="kpi-title">Pending Approvals</span>
          <span className="kpi-value"></span>
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-icon"><FiFlag /></div>
        <div className="kpi-info">
          <span className="kpi-title">Alerts / Flagged</span>
          <span className="kpi-value"></span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Quick Actions (shortcuts)
   ============================================================ */
function QuickActions() {
  return (
    <div className="dashboard-card" style={{ marginBottom: 16 }}>
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          {/* No icon here to keep it minimal */}
          <span>Quick Actions</span>
        </div>
      </div>
      <div className="dashboard-card-body">
        <div className="dashboard-toolbar" style={{ gap: 10 }}>
          <Link to="/org-dashboard/test-results" className="pill-btn primary" title="Log Test">
            <FiPlus /><span className="hide-sm">Log Test</span>
          </Link>
          <Link to="/org-dashboard/test-results" className="pill-btn" title="View Test Results">
            <FiList /><span className="hide-sm">View Tests</span>
          </Link>
          <Link to="/org-dashboard/members" className="pill-btn" title="Invite Member">
            <FiUserPlus /><span className="hide-sm">View Members</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Tests Map
   - Shows only logged test locations (none yet)
   ============================================================ */
function TestsMap() {
  return (
    <div className="map-container" style={{ marginBottom: 16 }}>
      <AppMap view="osm" style={{ height: "100%", width: "100%" }}>
        {/*
          TODO: Once data exists, place markers for this org's logged tests here.
          e.g. tests.map(t => <Marker position={[t.lat,t.lng]} />)
        */}
      </AppMap>
    </div>
  );
}

/* ============================================================
   Recent Activity (Water Quality Logs only)
   - Empty list for now
   ============================================================ */
function RecentLogs() {
  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <FiActivity /><span>Recent Activity (Water Quality Logs)</span>
        </div>
      </div>
      <div className="dashboard-card-body">
        <ul className="recent-logs-list">
          {/* Intentionally empty. Map over this org's recent WQ logs here. */}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   Page: OrgOverview
   - Mirrors AdminOverview’s structure (KPIs → Map → Logs)
   - Adds a Quick Actions card at top
   ============================================================ */
export default function OrgOverview() {
  return (
    <>
      <QuickActions />
      <KPIGrid />
      <TestsMap />
      <RecentLogs />
    </>
  );
}
