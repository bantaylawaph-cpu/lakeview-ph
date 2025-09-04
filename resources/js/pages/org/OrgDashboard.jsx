// resources/js/pages/org/OrgDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import { FaHome, FaUsers, FaVial } from "react-icons/fa";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import TestResults from "./TestResults"; // ✅ Import the component

const Page = ({ title }) => <h2>{title}</h2>;

export default function OrgDashboard() {
  const links = [
    { path: "/org-dashboard", label: "Dashboard", icon: <FaHome />, exact: true },
    { path: "/org-dashboard/members", label: "Members", icon: <FaUsers /> },
    { path: "/org-dashboard/test-results", label: "Test Results", icon: <FaVial /> },
  ];

  const user = { name: "Org Manager" };

  return (
    <DashboardLayout logo={{ icon: "/logo192.png", text: "OrgView" }} links={links} user={user}>
      <Routes>
        <Route index element={<Page title="Org Dashboard" />} />
        <Route path="members" element={<Page title="Manage Members" />} />
        {/* ✅ Use the imported component instead of a string */}
        <Route path="test-results" element={<TestResults />} />
      </Routes>
    </DashboardLayout>
  );
}
