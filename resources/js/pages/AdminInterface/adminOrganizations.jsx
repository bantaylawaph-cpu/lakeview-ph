import React, { useEffect, useState, useMemo } from "react";
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";
import api from "../../lib/api";
import Swal from "sweetalert2";
import OrganizationForm from "../../components/OrganizationForm";
import OrganizationManageModal from "../../components/OrganizationManageModal";

const emptyOrg = { name: "", type: "", domain: "", contact_email: "", phone: "", address: "", metadata: "", active: true };

export default function AdminOrganizationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [openManage, setOpenManage] = useState(false);
  const [manageOrg, setManageOrg] = useState(null);
  const [q, setQ] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simple in-memory column visibility (no persistence per Option A revert)
  const [colVisible, setColVisible] = useState({
    seq: true,
    id: true,
    name: true,
    type: true,
    domain: true,
    contact: true,
    active: true,
    actions: true,
  });

  const columns = useMemo(() => [
    { id: 'seq', header: '#', width: 56 },
    { id: 'id', header: 'ID', width: 80 },
    { id: 'name', header: 'Name' },
    { id: 'type', header: 'Type' },
    { id: 'domain', header: 'Domain' },
    { id: 'contact', header: 'Contact' },
    { id: 'active', header: 'Active' },
    { id: 'actions', header: 'Actions', width: 220 },
  ], []);

  const fetchOrgs = async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/tenants", { params });
      setRows(res.data || []);
    } catch (e) {
      Swal.fire("Failed to load organizations", "", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs({ q }); }, []);

  const openCreate = () => {
    setEditingOrg(null);
    setOpenForm(true);
  };

  const openEdit = (org) => {
    setEditingOrg(org);
    setOpenForm(true);
  };

  const openOrgManage = (org) => {
    setManageOrg(org);
    setOpenManage(true);
  };

  const handleFormSubmit = async (payload) => {
    try {
      if (editingOrg) {
        await api.put(`/admin/tenants/${editingOrg.id}`, payload);
        Swal.fire("Organization updated", "", "success");
      } else {
        await api.post("/admin/tenants", payload);
        Swal.fire("Organization created", "", "success");
      }
      setOpenForm(false);
      fetchOrgs();
    } catch (e) {
      Swal.fire("Save failed", e?.response?.data?.message || "", "error");
    }
  };

  const handleDelete = async (org) => {
    const { isConfirmed } = await Swal.fire({
      title: "Delete organization?",
      text: `This will permanently delete ${org.name}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/admin/tenants/${org.id}`);
      Swal.fire("Organization deleted", "", "success");
      fetchOrgs();
    } catch (e) {
      Swal.fire("Delete failed", e?.response?.data?.message || "", "error");
    }
  };

  return (
    <div className="container" style={{ padding: 16 }}>
      <div className="flex-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Admin · Organizations</h2>
        <button className="pill-btn" onClick={openCreate}>+ New Organization</button>
      </div>
      <div className="card" style={{ padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <TableToolbar
          tableId="admin-organizations"
          search={{
            value: q,
            onChange: (val) => { setQ(val); fetchOrgs({ q: val }); },
            placeholder: 'Search organizations…'
          }}
          filters={[]}
          columnPicker={{
            columns,
            visibleMap: colVisible,
            onVisibleChange: (m) => setColVisible(m)
          }}
          onRefresh={() => fetchOrgs({ q })}
          onToggleFilters={() => setShowAdvanced(s => !s)}
          filtersBadgeCount={0}
        />
        <FilterPanel
          open={showAdvanced}
          fields={[]}
          onClearAll={() => {/* future advanced filters clear */}}
        />
      </div>
      <div className="table-wrapper">
        <div className="lv-table-wrap">
          <div className="lv-table-scroller">
            <table className="lv-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {colVisible.seq && <th style={{ width: 56, textAlign: 'left', padding: '8px 12px' }}>#</th>}
                  {colVisible.id && <th style={{ width: 80, textAlign: 'left', padding: '8px 12px' }}>ID</th>}
                  {colVisible.name && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Name</th>}
                  {colVisible.type && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Type</th>}
                  {colVisible.domain && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Domain</th>}
                  {colVisible.contact && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Contact</th>}
                  {colVisible.active && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Active</th>}
                  {colVisible.actions && <th style={{ width: 220, textAlign: 'right', padding: '8px 12px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: 16 }}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="8" className="lv-empty" style={{ textAlign: 'center', padding: 16 }}>No organizations found</td></tr>
                ) : (
                  rows.map((org, i) => (
                    <tr key={org.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      {colVisible.seq && <td style={{ padding: '8px 12px' }}>{i + 1}</td>}
                      {colVisible.id && <td style={{ padding: '8px 12px' }}>{org.id}</td>}
                      {colVisible.name && <td style={{ padding: '8px 12px' }}>{org.name}</td>}
                      {colVisible.type && <td style={{ padding: '8px 12px' }}>{org.type}</td>}
                      {colVisible.domain && <td style={{ padding: '8px 12px' }}>{org.domain}</td>}
                      {colVisible.contact && <td style={{ padding: '8px 12px' }}>{org.contact_email}</td>}
                      {colVisible.active && <td style={{ padding: '8px 12px' }}>{org.active ? 'Yes' : 'No'}</td>}
                      {colVisible.actions && (
                        <td style={{ padding: '8px 12px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="pill-btn ghost sm" onClick={() => openEdit(org)}>Edit</button>
                          <button className="pill-btn ghost sm" onClick={() => openOrgManage(org)}>Manage</button>
                          <button className="pill-btn ghost sm red-text" onClick={() => handleDelete(org)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <OrganizationForm
        initialData={editingOrg || emptyOrg}
        onSubmit={handleFormSubmit}
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={editingOrg ? "Edit Organization" : "New Organization"}
      />
      {openManage && manageOrg && (
        <OrganizationManageModal
          org={manageOrg}
          open={openManage}
          onClose={() => setOpenManage(false)}
        />
      )}
    </div>
  );
}
