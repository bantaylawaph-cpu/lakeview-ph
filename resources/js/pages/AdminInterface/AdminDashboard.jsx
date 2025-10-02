// resources/js/pages/AdminInterface/AdminDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,
  FiBriefcase,   // Organizations
  FiUsers,       // Users & Roles
  FiMap,         // Lake Catalog
  FiLayers,      // Base Layers
  FiSliders,     // Parameters & Thresholds
  FiClipboard,   // Approvals & Publishing
  FiFileText,    // WQ Tests
  FiActivity,    // Audit Logs
  FiSettings,    // System Settings
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import AdminOverview from "./AdminOverview";
import AdminOrganizations from "./adminOrganizations";
import AdminUsers from "./adminUsers";
import AdminWaterCat from "./adminWaterCat";
import AdminLayers from "./adminLayers";
import AdminParameters from "./adminParams";
import AdminWQTests from "./adminWQTests";
import AdminSettingsPage from "./adminSettings.jsx";
import AdminFeedback from './AdminFeedback';
import AdminAuditLogsPage from './adminLogs';

const Page = ({ title }) => <h2>{title}</h2>;

export default function AdminDashboard() {
  const links = [
    // Overview (KPI Dashboard)
    { path: "/admin-dashboard", label: "Overview", icon: <FiHome />, exact: true },
    // Organizations
    { path: "/admin-dashboard/organizations", label: "Organizations", icon: <FiBriefcase /> },
    // Users
    { path: "/admin-dashboard/users", label: "Users", icon: <FiUsers /> },
    // Water Body Catalog
    { path: "/admin-dashboard/lakes", label: "Water Bodies", icon: <FiMap /> },
    // Base Layers
    { path: "/admin-dashboard/layers", label: "Base Layers", icon: <FiLayers /> },
    // Parameters
    { path: "/admin-dashboard/parameters", label: "Parameters", icon: <FiSliders /> },
  // Water Quality Tests
  { path: "/admin-dashboard/wq-tests", label: "WQ Tests", icon: <FiFileText /> },
    // System Feedback
    { path: "/admin-dashboard/feedback", label: "System Feedback", icon: <FiClipboard /> },
    // Audit Logs
    { path: "/admin-dashboard/audit", label: "Audit Logs", icon: <FiActivity /> },
    // System Settings
    { path: "/admin-dashboard/settings", label: "System Settings", icon: <FiSettings /> },
  ];

  return (
    <DashboardLayout links={links}>
      <Routes>
        {/* Overview */}
        <Route index element={<AdminOverview />} />

        {/* Organizations */}
        <Route path="organizations" element={<AdminOrganizations />} />

        {/* Users */}
        <Route path="users" element={<AdminUsers />} />

        {/* Water Body Catalog */}
        <Route path="lakes" element={<AdminWaterCat />} />

        {/* Base Layers */}
        <Route path="layers" element={<AdminLayers />} />

        {/* Parameters */}
        <Route path="parameters" element={<AdminParameters />} />

  {/* Water Quality Tests */}
  <Route path="wq-tests" element={<AdminWQTests />} />

        {/* Feedback */}
        <Route path="feedback" element={<AdminFeedback />} />

  {/* Audit Logs */}
  <Route path="audit" element={<AdminAuditLogsPage />} />

  {/* System Settings */}
  <Route path="settings" element={<AdminSettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
}
