import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 🌍 Public Pages
import AboutData from  "./pages/PublicInterface/AboutData";
import AboutPage from "./pages/PublicInterface/AboutPage";
import MapPage from "./pages/PublicInterface/MapPage";
import Settings from "./pages/PublicInterface/Settings.jsx";
import SubmitFeedback from "./pages/PublicInterface/SubmitFeedback.jsx";
import UserManual from "./pages/PublicInterface/UserManual";

// 📊 Dashboards (Role-based)
import AdminDashboard from "./pages/AdminInterface/AdminDashboard";
import OrgDashboard from "./pages/OrgInterface/OrgDashboard";
import ContributorDashboard from "./pages/ContributorInterface/ContributorDashboard.jsx";
// import UserDashboard from "./pages/user/UserDashboard"; // add later if needed

// 🎨 Global Styles
import "../css/app.css";

//Component
import RequireRole from "../js/components/RequireRole.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* 🌍 Public routes */}
        <Route path="/" element={<MapPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/manual" element={<UserManual />} />
        <Route path="/feedback" element={<SubmitFeedback />} />
        <Route path="/data" element={<AboutData />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<MapPage />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<MapPage />} />

        {/* 📊 Dashboards */}
        <Route path="/admin-dashboard/*" element={
          <RequireRole allowed={['superadmin']}><AdminDashboard /></RequireRole>
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
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
