// resources/js/pages/ContributorInterface/ContributorDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,          // Overview
  FiPlusCircle,    // Add Water Quality Tests
  FiClipboard,     // View Water Quality Tests
  FiUser,          // Profile
  FiSettings,      // Settings
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import ContribAddWQTest from "./ContribAddWQTest";
import ContribWQTests from "./contribWQTests";
import ContribSettingsPage from "./contribSettings.jsx";

const Page = ({ title }) => <h2>{title}</h2>;

export default function ContributorDashboard() {
  const links = [
    // Overview
    { path: "/contrib-dashboard", label: "Overview", icon: <FiHome />, exact: true },
    // Log Water Quality Tests
    { path: "/contrib-dashboard/add-wq-tests", label: "Add Water Quality Test", icon: <FiPlusCircle /> },
    // View Water Quality Tests
    { path: "/contrib-dashboard/wq-tests", label: "View Water Quality Tests", icon: <FiClipboard /> },
    // Profile
    { path: "/contrib-dashboard/profile", label: "Profile", icon: <FiUser /> },
    // Settings
    { path: "/contrib-dashboard/settings", label: "Settings", icon: <FiSettings /> },

  ];

  return (
    <DashboardLayout
      links={links}
    >
      <Routes>
        {/* Overview */}
        <Route index element={<Page title="Overview" />} />
        {/* Log Water Quality Tests */}
        <Route path="add-wq-tests" element={<ContribAddWQTest />} />
        {/* View Water Quality Tests */}
        <Route path="wq-tests" element={<ContribWQTests />} />
        {/* Profile */}
        <Route path="profile" element={<Page title="Profile" />} />
  {/* Settings */}
  <Route path="settings" element={<ContribSettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
}
