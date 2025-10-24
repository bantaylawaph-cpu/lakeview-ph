import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 🌍 Public Pages
// AboutData is displayed as a modal from MapPage
// AboutPage is displayed as a modal from MapPage
import MapPage from "./pages/PublicInterface/MapPage";
import KycPage from "./pages/PublicInterface/KycPage";
// UserManual is displayed as a modal from MapPage
// DataPrivacyDisclaimer is now a modal inside MapPage
// KYC page is available as a dedicated route as well

// 📊 Dashboards (Role-based)
import AdminDashboard from "./pages/AdminInterface/AdminDashboard";
import OrgDashboard from "./pages/OrgInterface/OrgDashboard";
import ContributorDashboard from "./pages/ContributorInterface/ContributorDashboard.jsx";
import AdminOrgApplications from "./pages/AdminInterface/AdminOrgApplications.jsx";
// import UserDashboard from "./pages/user/UserDashboard"; // add later if needed

// 🎨 Global Styles
import "../css/app.css";
import "../css/components/modern-settings.css";
import "../css/util/scrollbars.css";

//Component
import RequireRole from "../js/components/RequireRole.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* 🌍 Public routes */}
        <Route path="/" element={<MapPage />} />
  <Route path="/about" element={<MapPage />} />
  <Route path="/manual" element={<MapPage />} />
  {/** /data now opens modal via MapPage; no standalone route */}
    {/* Visiting /data/privacy keeps user on MapPage; modal opens from MapPage by path */}
    <Route path="/data/privacy" element={<MapPage />} />
    <Route path="/login" element={<MapPage />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<MapPage />} />
  {/* Dedicated KYC page */}
  <Route path="/kyc" element={<KycPage embedded={false} />} />

        {/* 📊 Dashboards */}
        <Route path="/admin-dashboard/*" element={
          <RequireRole allowed={['superadmin']}><AdminDashboard /></RequireRole>
        } />
        <Route path="/admin-org-applications" element={
          <RequireRole allowed={['superadmin']}><AdminOrgApplications /></RequireRole>
        } />
        <Route path="/org-dashboard/*" element={
          <RequireRole allowed={['org_admin']}><OrgDashboard /></RequireRole>
        } />
        <Route path="/contrib-dashboard/*" element={
          <RequireRole allowed={['contributor']}><ContributorDashboard /></RequireRole>
        } />
      </Routes>
    </Router>
  );
}

// ✅ Mount App to the root div
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Suspense fallback={<div style={{display:'grid',placeItems:'center',height:'100vh',color:'#e5e7eb',background:'#0b1220'}}>Loading…</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);

// Signal to Blade boot screen that the app is ready to display
try { window.dispatchEvent(new Event('lv-app-mounted')); } catch {}
