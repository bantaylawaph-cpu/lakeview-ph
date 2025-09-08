// resources/js/pages/OrgInterface/OrgDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiDatabase,
  FiUpload,
  FiClipboard,
  FiFlag,
  FiSettings,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import TestResults from "./TestResults"; // ✅ already implemented

const Page = ({ title }) => <h2>{title}</h2>;

export default function OrgDashboard() {
  const links = [
    { path: "/org-dashboard", label: "Dashboard", icon: <FiHome />, exact: true },
    { path: "/org-dashboard/members", label: "Members", icon: <FiUsers /> },
    { path: "/org-dashboard/test-results", label: "Test Results", icon: <FiDatabase /> },
    { path: "/org-dashboard/uploads", label: "Uploads", icon: <FiUpload /> },
    { path: "/org-dashboard/approvals", label: "Approvals", icon: <FiClipboard /> },
    { path: "/org-dashboard/alerts", label: "Alerts", icon: <FiFlag /> },
    { path: "/org-dashboard/settings", label: "Settings", icon: <FiSettings /> },
  ];

  const user = { name: "Org Manager" };

  return (
    <DashboardLayout logo={{ icon: "/logo192.png", text: "OrgView" }} links={links} user={user}>
      <Routes>
        <Route index element={<Page title="Org Dashboard" />} />
        <Route path="members" element={<Page title="Manage Members" />} />
        <Route path="test-results" element={<TestResults />} />
        <Route path="uploads" element={<Page title="Manage Uploads" />} />
        <Route path="approvals" element={<Page title="Approvals & Reviews" />} />
        <Route path="alerts" element={<Page title="Org Alerts" />} />
        <Route path="settings" element={<Page title="Settings" />} />
      </Routes>
    </DashboardLayout>
  );
}