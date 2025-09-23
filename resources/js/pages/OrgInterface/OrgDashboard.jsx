// resources/js/pages/OrgInterface/OrgDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiPlusCircle,
  FiClipboard,
  FiLayers,
  FiActivity,
  FiSettings,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import OrgOverview from "./orgOverview";
import OrgMembers from "./orgMembers";
import OrgLayers from "./orgLayers";
import OrgAddWQTest from "./orgAddWQTest";
import OrgWQTests from "./orgWQTests";

const Page = ({ title }) => <h2>{title}</h2>;

export default function OrgDashboard() {
  const links = [
    // Overview
    { path: "/org-dashboard", label: "Overview", icon: <FiHome />, exact: true },
    // Organization Members
    { path: "/org-dashboard/members", label: "Members", icon: <FiUsers /> },
    // Log Water Quality Tests
    { path: "/org-dashboard/add-wq-tests", label: "Add Water Quality Test", icon: <FiPlusCircle /> },
    // View Water Quality Tests
    { path: "/org-dashboard/wq-tests", label: "View Water Quality Tests", icon: <FiClipboard /> },
    // Add Organization-created Layers
    { path: "/org-dashboard/layers", label: "Base Layers", icon: <FiLayers /> },
    // Organization-wide Audit Logs
    { path: "/org-dashboard/org-audit", label: "Audit Logs", icon: <FiActivity /> },
    // Settings
    { path: "/org-dashboard/settings", label: "Settings", icon: <FiSettings /> },
  ];

  return (
    <DashboardLayout links={links}>
      <Routes>
        <Route index element={<OrgOverview />} />
        <Route path="members" element={<OrgMembers />} />
        <Route path="add-wq-tests" element={<OrgAddWQTest  />} />
        <Route path="wq-tests" element={<OrgWQTests  />} />
        <Route path="layers" element={<OrgLayers />} />
        <Route path="settings" element={<Page title="Settings" />} />
      </Routes>
    </DashboardLayout>
  );
}
