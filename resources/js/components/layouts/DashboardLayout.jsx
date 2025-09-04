import React from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiDatabase,
  FiMap,
  FiActivity,
  FiSettings,
  FiLogOut,
  FiUser,
} from "react-icons/fi";

export default function DashboardLayout({ logo, links, user, children }) {
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div>
          <div className="dashboard-logo">
            {logo?.icon && <img src={logo.icon} alt="Logo" />}
            <span>{logo?.text || "LakeView PH"}</span>
          </div>

          <ul className="dashboard-nav-links">
            {links.map((link, i) => (
              <li key={i}>
                <NavLink to={link.path} end={link.exact || false}>
                  {link.icon} <span>{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* User Section */}
        <div className="dashboard-user-section">
          <div className="dashboard-user-info">
            <FiUser size={18} />
            <span>{user?.name || "User"}</span>
          </div>
          <div className="dashboard-signout">
            <FiLogOut size={18} /> <span>Sign out</span>
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
