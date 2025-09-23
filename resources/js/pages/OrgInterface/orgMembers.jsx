// resources/js/pages/OrgInterface/OrgMembers.jsx
import React, { useMemo, useState } from "react";
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiUserPlus,
  FiRefreshCcw,
  FiEdit2,
  FiTrash2,
  FiMail,
  FiShield,
} from "react-icons/fi";

import TableLayout from "../../layouts/TableLayout";

export default function OrgMembers() {
  // -------------------- State (scaffold) --------------------
  const [members, setMembers] = useState([]); // TODO: GET /api/org/members
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");       // "", "member", "manager", "admin"
  const [status, setStatus] = useState("");   // "", "active", "invited", "suspended"

  // -------------------- Derived / Filters --------------------
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return members.filter((m) => {
      const matchesText =
        !term ||
        [m.name, m.email, m.affiliation]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      const matchesRole = !role || String(m.role || "").toLowerCase() === role;
      const matchesStatus =
        !status || String(m.status || "").toLowerCase() === status;
      return matchesText && matchesRole && matchesStatus;
    });
  }, [members, q, role, status]);

  // -------------------- Columns --------------------
  const columns = useMemo(
    () => [
      { header: "Name", accessor: "name" },
      { header: "Email", accessor: "email", width: 260 },
      { header: "Status", accessor: "status", width: 120 },
      { header: "Joined", accessor: "joined_at", width: 150 },
    ],
    []
  );

  // -------------------- Actions (row) --------------------
  const rowActions = useMemo(
    () => [
      {
        label: "Edit",
        type: "edit",
        icon: <FiEdit2 />,
        onClick: (row) => {
          // TODO: open edit member modal
          console.log("Edit member (scaffold):", row);
        },
      },
      {
        label: "Resend Invite",
        icon: <FiMail />,
        onClick: (row) => {
          // TODO: POST /api/org/members/:id/resend
          console.log("Resend invite (scaffold):", row);
        },
      },
      {
        label: "Change Role",
        icon: <FiShield />,
        onClick: (row) => {
          // TODO: open role change modal
          console.log("Change role (scaffold):", row);
        },
      },
      {
        label: "Remove",
        type: "delete",
        icon: <FiTrash2 />,
        onClick: (row) => {
          // TODO: DELETE /api/org/members/:id
          console.log("Remove member (scaffold):", row);
        },
      },
    ],
    []
  );

  // -------------------- Toolbar handlers --------------------
  const onInvite = () => {
    // TODO: open invite dialog (name, email, role)
    console.log("Invite member (scaffold)");
  };
  const onRefresh = () => {
    // TODO: re-fetch /api/org/members
    console.log("Refresh members (scaffold)");
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <FiUsers />
          <span>Members</span>
        </div>

        {/* Toolbar */}
        <div className="dashboard-toolbar" style={{ marginLeft: "auto", gap: 10 }}>
          {/* Search */}
          <div className="org-search" style={{ minWidth: 220 }}>
            <FiSearch className="toolbar-icon" />
            <input
              type="text"
              placeholder="Search members…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div className="org-filter">
            <FiFilter className="toolbar-icon" />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Right actions */}
          <div className="org-actions-right">
            <button type="button" className="pill-btn" onClick={onRefresh} title="Refresh">
              <FiRefreshCcw />
              <span className="hide-sm">Refresh</span>
            </button>
            <button
              type="button"
              className="pill-btn primary"
              onClick={onInvite}
              title="Invite Member"
            >
              <FiUserPlus />
              <span className="hide-sm">Invite</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-card-body">
        <div className="table-wrapper">
          <TableLayout
            columns={columns}
            data={filtered}
            pageSize={5}
            actions={rowActions}
          />
        </div>
      </div>
    </div>
  );
}
