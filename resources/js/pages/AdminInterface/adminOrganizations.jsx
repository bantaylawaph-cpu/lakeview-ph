import React, { useEffect, useState } from "react";
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

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/tenants");
      setRows(res.data || []);
    } catch (e) {
      Swal.fire("Failed to load organizations", "", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

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
    <div className="dashboard-card">
      <div className="dashboard-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="dashboard-card-title">Admin · Organizations</div>
        <div className="org-actions-right">
          <button className="pill-btn primary" onClick={openCreate}>+ New Organization</button>
        </div>
      </div>
      <div className="dashboard-card-body">
        <div className="table-wrapper">
          <div className="lv-table-wrap">
            <div className="lv-table-scroller">
              <table className="lv-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: 56, textAlign: 'left', padding: '8px 12px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Domain</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Contact</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Active</th>
                    <th style={{ width: 220, textAlign: 'right', padding: '8px 12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: 16 }}>Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan="7" className="lv-empty" style={{ textAlign: 'center', padding: 16 }}>No organizations found</td></tr>
                  ) : (
                    rows.map((org, i) => (
                      <tr key={org.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                        <td style={{ padding: '8px 12px' }}>{org.name}</td>
                        <td style={{ padding: '8px 12px' }}>{org.type}</td>
                        <td style={{ padding: '8px 12px' }}>{org.domain}</td>
                        <td style={{ padding: '8px 12px' }}>{org.contact_email}</td>
                        <td style={{ padding: '8px 12px' }}>{org.active ? 'Yes' : 'No'}</td>
                        <td style={{ padding: '8px 12px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="pill-btn ghost sm" onClick={() => openEdit(org)}>Edit</button>
                          <button className="pill-btn ghost sm" onClick={() => openOrgManage(org)}>Manage</button>
                          <button className="pill-btn ghost sm red-text" onClick={() => handleDelete(org)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
