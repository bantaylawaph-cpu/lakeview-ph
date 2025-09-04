import "./pages/bootstrap";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 🌍 Public Pages
import MapPage from "./pages/MapPage";
import AboutPage from "./pages/AboutPage";
import UserManual from "./pages/UserManual";
import SubmitFeedback from "./pages/SubmitFeedback";
import AboutData from "./pages/AboutData";
import Settings from "./pages/Settings";
import Register from "./pages/Register";
import Login from "./pages/Login";

// 📊 Dashboards (Role-based)
import AdminDashboard from "./pages/admin/AdminDashboard";
import OrgDashboard from "./pages/org/OrgDashboard";
// import UserDashboard from "./pages/user/UserDashboard"; // add later if needed

// 🎨 Global Styles
import "../css/index.css";

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
        <Route path="/signin" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 📊 Dashboards */}
        <Route path="/admin-dashboard/*" element={<AdminDashboard />} />
        <Route path="/org-dashboard/*" element={<OrgDashboard />} />
        {/* <Route path="/user-dashboard/*" element={<UserDashboard />} /> */}
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
