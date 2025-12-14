// resources/js/pages/OrgInterface/OrgDashboard.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiPlusCircle,
  FiClipboard,
  FiActivity,
  FiSettings,
  FiDatabase,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import OrgOverview from "./orgOverview";
import OrgMembers from "./orgMembers";
import OrgAddWQTest from "./orgAddWQTest";
import OrgWQTests from "./orgWQTests";
import OrgBulkDatasetImport from "./OrgBulkDatasetImport";
import OrgSettingsPage from "./orgSettings.jsx";
import OrgAuditLogsPage from "./orgLogs"; // Added: route component for audit logs
import OrgApplications from "./OrgApplications";

const Page = ({ title }) => <h2>{title}</h2>;

export default function OrgDashboard() {
  const links = [
    // Overview
    { path: "/org-dashboard", label: "Overview", icon: <FiHome />, exact: true },
    // Organization Members
    { path: "/org-dashboard/members", label: "Members", icon: <FiUsers /> },
    // Applications (review join requests)
    { path: "/org-dashboard/applications", label: "Applicants", icon: <FiClipboard /> },
    // Log Water Quality Tests
    { path: "/org-dashboard/add-wq-tests", label: "Add Water Quality Data", icon: <FiPlusCircle /> },
    // View Water Quality Tests
    { path: "/org-dashboard/wq-tests", label: "Water Quality Records", icon: <FiClipboard /> },
    // Bulk Dataset Import
    { path: "/org-dashboard/bulk-dataset-import", label: "Bulk Dataset Import", icon: <FiDatabase /> },
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
        <Route path="bulk-dataset-import" element={<OrgBulkDatasetImport />} />
        <Route path="org-audit" element={<OrgAuditLogsPage />} />
        <Route path="settings" element={<OrgSettingsPage />} />
        <Route path="applications" element={<OrgApplications />} />
      </Routes>
    </DashboardLayout>
  );
}
