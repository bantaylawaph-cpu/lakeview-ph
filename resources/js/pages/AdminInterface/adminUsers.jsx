// resources/js/pages/AdminInterface/AdminUsers.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiUser,
  FiMail,
} from "react-icons/fi";

import TableLayout from "../../layouts/TableLayout"; // adjust the path if different

/**
 * AdminUsers
 * - List users with fields from Register page:
 *   full_name, email, occupation, affiliation, created_at
 * - Search + occupation filter
 * - Actions: View / Edit / Delete (placeholders)
 * - Responsive via TableLayout + table.css (no mock data)
 */
export default function AdminUsers() {
  // ---------- UI State ----------
  const [query, setQuery] = useState("");
  const [occupation, setOccupation] = useState(""); // '', 'Student', 'Researcher', 'Professional', 'Other'
  const [loading, setLoading] = useState(false);

  // ---------- Data State (empty by design) ----------
  const [users, setUsers] = useState([]); // [{ id, full_name, email, occupation, affiliation, created_at }]

  // ---------- Columns ----------
  const columns = useMemo(
    () => [
        { header: "", width: 32, className: "col-xs-hide",
        render: (row) => <input type="checkbox" aria-label={`Select ${row?.full_name ?? "row"}`} /> },

        {
        header: <span className="th-with-icon"><FiUser /> Name</span>,
        label: "Name",
        accessor: "full_name",
        },
        {
        header: <span className="th-with-icon"><FiMail /> Email</span>,
        label: "Email",
        accessor: "email",
        width: 240,
        className: "col-sm-hide",
        },
        { header: "Occupation", label: "Occupation", accessor: "occupation", width: 160 },
        { header: "Affiliation", label: "Affiliation", accessor: "affiliation", className: "col-md-hide" },
        { header: "Created", label: "Created", accessor: "created_at", width: 180, className: "col-md-hide" },
    ],
    []
    );


  // ---------- Row Actions ----------
  const actions = useMemo(
    () => [
      { label: "View", type: "default", icon: <FiEye />, onClick: (row) => { /* TODO: route to /admin-dashboard/users/:id */ } },
      { label: "Edit", type: "edit", icon: <FiEdit2 />, onClick: (row) => { /* TODO: open edit user */ } },
      { label: "Delete", type: "delete", icon: <FiTrash2 />, onClick: (row) => { /* TODO: confirm + delete */ } },
    ],
    []
  );

  // ---------- Fetch (replace with your API) ----------
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Example (replace with your backend):
      // const params = new URLSearchParams({ query, occupation });
      // const res = await fetch(`/api/admin/users?${params.toString()}`);
      // const data = await res.json();
      // setUsers(data.items ?? []);
      setUsers([]); // keep empty until wired
    } catch (e) {
      console.error("Failed to fetch users", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [query, occupation]);

  // ---------- Handlers ----------
  const handleAdd = () => {
    // TODO: navigate to user-create or open modal
  };

  return (
    <div className="dashboard-card">
      {/* Toolbar (reuses org-toolbar styles) */}
      <div className="dashboard-card-header org-toolbar">
        <div className="org-search">
          <FiSearch className="toolbar-icon" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
          />
        </div>

        <div className="org-filter">
          <FiFilter className="toolbar-icon" />
          <select
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            aria-label="Filter by occupation"
          >
            <option value="">All Occupations</option>
            <option value="Student">Student</option>
            <option value="Researcher">Researcher</option>
            <option value="Professional">Professional</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="org-actions-right">
          <button
            className="pill-btn ghost"
            onClick={fetchUsers}
            title="Refresh"
            aria-label="Refresh users list"
          >
            <FiRefreshCw />
          </button>
          <button
            className="pill-btn primary"
            onClick={handleAdd}
            title="Add user"
          >
            <FiPlus />
            <span className="hide-sm">Add</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {loading && <div className="no-data" style={{ paddingTop: 8 }}>Loading…</div>}

        <div className="table-wrapper">
          <TableLayout
            columns={columns}
            data={users}
            pageSize={5}
            actions={actions}
          />
        </div>
      </div>
    </div>
  );
}
