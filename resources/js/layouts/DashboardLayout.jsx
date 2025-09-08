// resources/js/layouts/DashboardLayout.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FiLogOut, FiUser, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";

export default function DashboardLayout({ logo, links, user, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${collapsed ? "collapsed" : ""}`}>
        <div>
          <div className="dashboard-logo">
            {logo?.icon && <img src={logo.icon} alt="Logo" />}
            <span className="dashboard-logo-text">{logo?.text || "LakeView PH"}</span>

            {/* Collapse/Expand */}
            <button
              className="sidebar-toggle"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}
            </button>
          </div>

          {/* Scrollable nav */}
          <ul className="dashboard-nav-links" role="navigation" aria-label="Dashboard">
            {links.map((link, i) => (
              <li key={i}>
                <NavLink to={link.path} end={link.exact || false} title={link.label}>
                  {link.icon} <span className="link-text">{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* User Section (sticky bottom) */}
        <div className="dashboard-user-section">
          <div className="dashboard-user-info" title={user?.name || "User"}>
            <FiUser size={18} />
            <span className="user-name">{user?.name || "User"}</span>
          </div>
          <div className="dashboard-signout" role="button" tabIndex={0}>
            <FiLogOut size={18} /> <span className="signout-text">Sign out</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
