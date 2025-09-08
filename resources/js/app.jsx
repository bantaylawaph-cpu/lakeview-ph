import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 🌍 Public Pages
import AboutData from  "./pages/PublicInterface/AboutData";
import AboutPage from "./pages/PublicInterface/AboutPage";
import LoginPage from "./pages/PublicInterface/LoginPage";
import MapPage from "./pages/PublicInterface/MapPage";
import RegistrationPage from "./pages/PublicInterface/RegistrationPage";
import Settings from "./pages/PublicInterface/Settings.jsx";
import SubmitFeedback from "./pages/PublicInterface/SubmitFeedback.jsx";
import UserManual from "./pages/PublicInterface/UserManual";

// 📊 Dashboards (Role-based)
import AdminDashboard from "./pages/AdminInterface/AdminDashboard";
import OrgDashboard from "./pages/OrgInterface/OrgDashboard";
// import UserDashboard from "./pages/user/UserDashboard"; // add later if needed

// 🎨 Global Styles
import "../css/app.css";

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
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />

        {/* 📊 Dashboards */}
        <Route path="/admin-dashboard/*" element={<AdminDashboard />} />
        <Route path="/org-dashboard/*" element={<OrgDashboard />} />
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