// resources/js/pages/AdminInterface/AdminOrganizations.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiPlus, FiSearch, FiFilter, FiRefreshCw,
  FiEdit2, FiTrash2, FiEye,
} from "react-icons/fi";

import TableLayout from "../../layouts/TableLayout"; // adjust path if needed

export default function AdminOrganizations() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState([]); // [{ id, name, code, created_at }]

  const columns = useMemo(
    () => [
      {
        header: "", label: "", width: 32, className: "col-xs-hide",
        render: (row) => <input type="checkbox" aria-label={`Select ${row?.name ?? "row"}`} />
      },
      { header: "Name", label: "Name", accessor: "name" },
      { header: "Code", label: "Code", accessor: "code", width: 140, className: "col-sm-hide" },
      { header: "Created", label: "Created", accessor: "created_at", width: 180, className: "col-md-hide" },
    ],
    []
  );

  const actions = useMemo(
    () => [
      { label: "View", type: "default", icon: <FiEye />, onClick: (row) => {} },
      { label: "Edit", type: "edit", icon: <FiEdit2 />, onClick: (row) => {} },
      { label: "Delete", type: "delete", icon: <FiTrash2 />, onClick: (row) => {} },
    ],
    []
  );

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      // const res = await fetch(`/api/admin/organizations?query=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`);
      // const data = await res.json();
      // setOrgs(data.items ?? []);
      setOrgs([]);
    } catch (e) {
      console.error("Failed to fetch organizations", e);
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, [query, status]);

  return (
    <div className="dashboard-card">
      {/* Toolbar */}
      <div className="dashboard-card-header org-toolbar">
        <div className="org-search">
          <FiSearch className="toolbar-icon" />
          <input
            type="text"
            placeholder="Search by name or code…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="org-filter">
          <FiFilter className="toolbar-icon" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="org-actions-right">
          <button className="pill-btn ghost" onClick={fetchOrgs} title="Refresh">
            <FiRefreshCw />
          </button>
          <button className="pill-btn primary" onClick={() => {}} title="Add organization">
            <FiPlus />
            <span className="hide-sm">Add</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {loading && <div className="no-data" style={{ paddingTop: 8 }}>Loading…</div>}

        <div className="table-wrapper">
          <TableLayout
            columns={columns}
            data={orgs}
            pageSize={5}
            actions={actions}
          />
        </div>
      </div>
    </div>
  );
}
