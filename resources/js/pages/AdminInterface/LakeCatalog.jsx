// resources/js/pages/AdminInterface/LakeCatalog.jsx
import React from "react";
import Table from "../../layouts/TableLayout";
import { FaMapMarkedAlt, FaEdit, FaTrash } from "react-icons/fa";

export default function LakeCatalog() {
  // Table column definitions
  const columns = [
    { header: "Lake Name", accessor: "name" },
    { header: "Location", accessor: "location" },
    { header: "Area (km²)", accessor: "area" },
    { header: "Avg Depth (m)", accessor: "depth" },
    { header: "Organizations Assigned", accessor: "organizations" },
  ];

  // Example dataset (replace with DB fetch later)
  const lakes = [
    {
      name: "Laguna de Bay",
      location: "Luzon, Philippines",
      area: "911",
      depth: "2.8",
      organizations: ["LLDA", "WWF Philippines"],
    },
    {
      name: "Taal Lake",
      location: "Batangas, Philippines",
      area: "234",
      depth: "100",
      organizations: ["PFDA", "WWF Philippines"],
    },
    {
      name: "Lake Bunot",
      location: "San Pablo, Laguna",
      area: "30",
      depth: "23",
      organizations: ["DENR"],
    },
    {
      name: "Sampaloc Lake",
      location: "San Pablo, Laguna",
      area: "104",
      depth: "27",
      organizations: ["Haribon Foundation"],
    },
  ];

  // Table row actions
  const actions = [
    {
      label: <><FaEdit /> Edit</>,
      type: "edit",
      onClick: (row) => alert(`Edit ${row.name}`),
    },
    {
      label: <><FaTrash /> Delete</>,
      type: "delete",
      onClick: (row) => alert(`Delete ${row.name}`),
    },
    {
      label: <><FaMapMarkedAlt /> View on Map</>,
      type: "view",
      onClick: (row) => alert(`Viewing ${row.name} on map`),
    },
  ];

  return (
    <div className="dashboard-content">
      <h2 className="dashboard-title">Lake Catalog</h2>
      <p className="dashboard-subtitle">
        Central registry of lakes managed in LakeView PH. Super Admins can view,
        assign organizations, and manage metadata.
      </p>

      <Table columns={columns} data={lakes} pageSize={8} actions={actions} />
    </div>
  );
}
