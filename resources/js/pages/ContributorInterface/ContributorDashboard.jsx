// resources/js/pages/ContributorInterface/ContributorDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,          // Overview
  FiPlusCircle,    // Add Water Quality Tests
  FiClipboard,     // View Water Quality Tests
  FiSettings,      // Settings
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import ContribOverview from "./contribOverview.jsx";
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
    // Settings
    { path: "/contrib-dashboard/settings", label: "Settings", icon: <FiSettings /> },

  ];

  return (
    <DashboardLayout
      links={links}
    >
      <Routes>
        {/* Overview */}
        <Route index element={<ContribOverview />} />
        {/* Log Water Quality Tests */}
        <Route path="add-wq-tests" element={<ContribAddWQTest />} />
        {/* View Water Quality Tests */}
        <Route path="wq-tests" element={<ContribWQTests />} />
        {/* Profile */}
  {/* Settings */}
  <Route path="settings" element={<ContribSettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
}
