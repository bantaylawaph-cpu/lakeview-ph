// resources/js/layouts/DashboardLayout.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FiMap,
  FiLogOut,
  FiUser,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";
import { api, clearToken, getToken } from "../lib/api";
import { confirm, alertSuccess } from "../utils/alerts"; // ⬅️ SweetAlert2 helpers

export default function DashboardLayout({ links, user, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!getToken()) return; // gate
        const u = await api("/auth/me");
        if (mounted) setMe(u);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  // Find active link
  const activeLink = links.find(
    (l) => location.pathname === l.path || (l.exact && location.pathname === l.path)
  );

  // 🔔 SweetAlert2-powered signout
  async function handleSignOut() {
    const ok = await confirm(
      "Sign out?",
      "You will be logged out of LakeView PH.",
      "Yes, sign out"
    );
    if (!ok) return;

    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore API errors; we still clear local state
    }

    clearToken();

    // Show success toast BEFORE navigation so it’s visible
    await alertSuccess("Signed out", "You have been signed out successfully.");

    navigate("/");
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${collapsed ? "collapsed" : ""}`}>
        <div>
          {/* Logo Row */}
          <div className="dashboard-logo">
            <img src="/lakeview-logo-alt.png" alt="LakeView PH Logo" />
            <span className="dashboard-logo-text">LakeView PH</span>
          </div>

          {/* Navigation */}
          <ul className="dashboard-nav-links" role="navigation" aria-label="Dashboard">
            {links.map((link, i) => (
              <li key={i}>
                <NavLink to={link.path} end={link.exact || false} title={link.label}>
                  {link.icon}
                  <span className="link-text">{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* User Section */}
        <div className="dashboard-user-section">
          <div className="dashboard-user-info" title={me?.name || ""}>
            <FiUser size={18} />
            {me?.name ? <span className="user-name">{me.name}</span> : null}
          </div>
          <div
            className="dashboard-signout"
            role="button"
            tabIndex={0}
            onClick={handleSignOut}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleSignOut()}
          >
            <FiLogOut size={18} /> <span className="signout-text">Sign out</span>
          </div>
        </div>

        {/* Drawer toggle (stick to right side, vertically centered) */}
        <button
          className="sidebar-toggle drawer"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {activeLink && (
          <div className="dashboard-page-header">
            <div className="page-header-icon">{activeLink.icon}</div>
            <h1 className="page-header-title">{activeLink.label}</h1>
            <div className="page-header-actions">
              <NavLink to="/" className="btn-icon" title="View Public Map">
                <FiMap size={18} />
              </NavLink>
            </div>
          </div>
        )}
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
