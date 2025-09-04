import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FaHome,
  FaBuilding,
  FaUsers,
  FaDatabase,
  FaMap,
  FaChartLine,
  FaCommentDots,
  FaCog,
} from "react-icons/fa";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import DashboardPage from "./DashboardPage"; // ✅ Import the real dashboard page
import ManageOrganizations from "./ManageOrganizations";


const Page = ({ title }) => <h2>{title}</h2>;

export default function AdminDashboard() {
  const links = [
    { path: "/admin-dashboard", label: "Dashboard", icon: <FaHome />, exact: true },
    { path: "/admin-dashboard/organizations", label: "Organizations", icon: <FaBuilding /> },
    { path: "/admin-dashboard/users", label: "Users", icon: <FaUsers /> },
    { path: "/admin-dashboard/settings", label: "Settings", icon: <FaCog /> },
  ];

  const user = { name: "Rodrigo Giongco" };

  return (
    <DashboardLayout logo={{ icon: "/logo192.png", text: "LakeView PH" }} links={links} user={user}>
      <Routes>
        {/* ✅ Default route now loads DashboardPage */}
        <Route index element={<DashboardPage />} />

        <Route path="organizations" element={<ManageOrganizations />} />
        <Route path="users" element={<Page title="Manage Users" />} />
        <Route path="datasets" element={<Page title="Datasets" />} />
        <Route path="settings" element={<Page title="Settings" />} />
      </Routes>
    </DashboardLayout>
  );
}
