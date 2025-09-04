// resources/js/pages/admin/ManageOrganizations.jsx
import React from "react";
import Table from "../../components/Table";

export default function ManageOrganizations() {
  const columns = [
    { header: "Organization Name", accessor: "name" },
    { header: "Lakes Assigned", accessor: "lakes" },
    { header: "Contact Person", accessor: "contact" },
    { header: "Date Created", accessor: "dateCreated" },
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
    { label: "Edit", type: "edit", onClick: (row) => alert(`Edit ${row.name}`) },
    { label: "Delete", type: "delete", onClick: (row) => alert(`Delete ${row.name}`) },
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
