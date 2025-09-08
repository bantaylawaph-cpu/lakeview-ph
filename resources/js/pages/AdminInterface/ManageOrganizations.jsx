import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Table from "../../layouts/TableLayout";

export default function ManageOrganizations() {
  const columns = [
    { header: "Organization Name", accessor: "name", width: "28%" },
    { header: "Lakes Assigned", accessor: "lakes", width: "22%" },
    { header: "Contact Person", accessor: "contact", width: "25%" },
    { header: "Date Created", accessor: "dateCreated", width: "25%" },
  ];

  const organizations = [
    {
      name: "Laguna Lake Development Authority (LLDA)",
      lakes: ["Laguna de Bay"],
      contact: "Engr. Maria Santos",
      dateCreated: "2023-09-01",
    },
    {
      name: "Philippine Fisheries Development Authority",
      lakes: ["Taal Lake", "Laguna de Bay"],
      contact: "Juan Dela Cruz",
      dateCreated: "2023-10-15",
    },
    {
      name: "Department of Environment and Natural Resources",
      lakes: ["Lake Bunot"],
      contact: "Cecilia Ramirez",
      dateCreated: "2023-12-05",
    },
    {
      name: "Haribon Foundation",
      lakes: ["Laguna de Bay"],
      contact: "Paolo Vergara",
      dateCreated: "2024-02-20",
    },
    {
      name: "WWF Philippines",
      lakes: ["Taal Lake", "Lake Bunot"],
      contact: "Andrea Lopez",
      dateCreated: "2024-03-18",
    },
  ];

  const actions = [
    { label: "Edit", type: "edit", icon: <FiEdit2 />, onClick: (row) => alert(`Edit ${row.name}`) },
    { label: "Delete", type: "delete", icon: <FiTrash2 />, onClick: (row) => alert(`Delete ${row.name}`) },
  ];

  return (
    <div className="dashboard-content">
      <h2 className="dashboard-title">Manage Organizations</h2>
      <p className="dashboard-subtitle">
        View and manage all registered organizations in LakeViewPH.
      </p>

      <Table columns={columns} data={organizations} pageSize={10} actions={actions} />
    </div>
  );
}