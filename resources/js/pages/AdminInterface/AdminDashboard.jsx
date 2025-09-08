// resources/js/pages/AdminInterface/AdminDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,
  FiBriefcase,   // Organizations
  FiUsers,       // Users & Roles
  FiMap,         // Lake Catalog
  FiLayers,      // System Default Layers
  FiUploadCloud, // Data Ingestion & Jobs
  FiSliders,     // Parameters & Thresholds
  FiGlobe,       // Population/External Data Config
  FiClipboard,   // Approvals & Publishing
  FiActivity,    // Audit Logs
  FiSettings,    // System Settings
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import DashboardPage from "./DashboardPage";
import ManageOrganizations from "./ManageOrganizations";
import LakeCatalog from "./LakeCatalog";


const Page = ({ title }) => <h2>{title}</h2>;

export default function AdminDashboard() {
  const links = [
    // Overview (KPI Dashboard)
    { path: "/admin-dashboard", label: "Overview", icon: <FiHome />, exact: true },

    // Organizations
    { path: "/admin-dashboard/organizations", label: "Organizations", icon: <FiBriefcase /> },

    // Users & Roles
    { path: "/admin-dashboard/users", label: "Users & Roles", icon: <FiUsers /> },

    // Lake Catalog
    { path: "/admin-dashboard/lakes", label: "Lakes", icon: <FiMap /> },

    // System Default Layers
    { path: "/admin-dashboard/layers", label: "System Default Layers", icon: <FiLayers /> },

    // Data Ingestion & Jobs
    { path: "/admin-dashboard/ingestion", label: "Data Ingestion & Jobs", icon: <FiUploadCloud /> },

    // Parameters & Thresholds
    { path: "/admin-dashboard/parameters", label: "Parameters & Thresholds", icon: <FiSliders /> },

    // Population/External Data Config
    { path: "/admin-dashboard/external-data", label: "External Data Config", icon: <FiGlobe /> },

    // Approvals & Publishing
    { path: "/admin-dashboard/approvals", label: "Approvals & Publishing", icon: <FiClipboard /> },

    // Audit Logs
    { path: "/admin-dashboard/audit", label: "Audit Logs", icon: <FiActivity /> },

    // System Settings
    { path: "/admin-dashboard/settings", label: "System Settings", icon: <FiSettings /> },
  ];

  const user = { name: "Rodrigo Giongco" };

  return (
    <DashboardLayout logo={{ icon: "/logo192.png", text: "LakeView PH" }} links={links} user={user}>
      <Routes>
        {/* Overview */}
        <Route index element={<DashboardPage />} />

        {/* Organizations */}
        <Route path="organizations" element={<ManageOrganizations />} />

        {/* Users & Roles */}
        <Route path="users" element={<Page title="Users & Roles" />} />

        {/* Lake Catalog */}
        <Route path="lakes" element={<LakeCatalog />} />

        {/* System Default Layers */}
        <Route path="layers" element={<Page title="System Default Layers" />} />

        {/* Data Ingestion & Jobs */}
        <Route path="ingestion" element={<Page title="Data Ingestion & Jobs" />} />

        {/* Parameters & Thresholds */}
        <Route path="parameters" element={<Page title="Parameters & Thresholds" />} />

        {/* Population/External Data Config */}
        <Route path="external-data" element={<Page title="Population / External Data Config" />} />

        {/* Approvals & Publishing */}
        <Route path="approvals" element={<Page title="Approvals & Publishing" />} />

        {/* Audit Logs */}
        <Route path="audit" element={<Page title="Audit Logs" />} />

        {/* System Settings */}
        <Route path="settings" element={<Page title="System Settings" />} />
      </Routes>
    </DashboardLayout>
  );
}
