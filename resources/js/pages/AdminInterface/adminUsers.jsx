// resources/js/pages/AdminInterface/adminUsers.jsx
import React, { useEffect, useState, useMemo } from "react";
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";
import api from "../../lib/api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

import Modal from "../../components/Modal";
import AdminUsersForm from "../../components/adminUsersForm";
import { ROLE_LABEL } from "../../lib/roles";

const emptyInitial = { name: "", email: "", password: "", role: "" };

export default function AdminUsersPage() {
  // table state
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [q, setQ] = useState("");
  // removed tenant filter per new requirement
  const [loading, setLoading] = useState(false);
  // advanced filters panel state (currently no extra filters configured)
  const [showAdvanced, setShowAdvanced] = useState(false);
  // column visibility (simple in-memory, no persistence per revert Option A)
  const [colVisible, setColVisible] = useState({
    seq: true,
    id: true,
    name: true,
    email: true,
    role: true,
    role_id: true,
    tenant: true,
    verified: true,
    created: true,
    updated: true,
    actions: true,
  });

  // columns meta (used later when rendering + for ColumnPicker)
  const columns = useMemo(() => [
    { id: 'seq', header: '#', width: 60 },
    { id: 'id', header: 'User ID', width: 80 },
    { id: 'name', header: 'Name' },
    { id: 'email', header: 'Email' },
    { id: 'role', header: 'Role' },
    { id: 'role_id', header: 'Role ID' },
    { id: 'tenant', header: 'Tenant' },
    { id: 'verified', header: 'Verified' },
    { id: 'created', header: 'Created' },
    { id: 'updated', header: 'Updated' },
    { id: 'actions', header: 'Actions', width: 200 },
  ], []);

  // modal/form state
  const [open, setOpen] = useState(false);      // Modal expects `open` prop (not isOpen)
  const [mode, setMode] = useState("create");   // 'create' | 'edit'
  const [initial, setInitial] = useState(emptyInitial);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const page = meta.current_page ?? 1;
  const perPage = meta.per_page ?? 15;

  const unwrap = (res) => (res?.data ?? res);
  const toast = (title, icon = "success") =>
    Swal.fire({ toast: true, position: "top-end", timer: 1600, showConfirmButton: false, icon, title });

  // Load list
  const fetchUsers = async (params = {}) => {
    setLoading(true);
    try {
      const res = unwrap(await api.get("/admin/users", { params }));
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setRows(items);

      const m = res?.meta ?? {};
      setMeta({
        current_page: m.current_page ?? params.page ?? 1,
        last_page: m.last_page ?? 1,
        per_page: m.per_page ?? params.per_page ?? 15,
        total: m.total ?? items.length,
      });
    } catch (e) {
      console.error("Failed to load users", e);
      Swal.fire("Failed to load users", e?.response?.data?.message || "", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchUsers({ q, page, per_page: perPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPage = (p) => fetchUsers({ q, page: p, per_page: perPage });

  // —— Modal open/close
  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setInitial(emptyInitial);
    setOpen(true);
  };

  const openEdit = async (row) => {
    try {
      setSaving(true);
      const res = unwrap(await api.get(`/admin/users/${row.id}`));
      const user = res?.data ?? res;

      // Backend now returns a single role (flattened). Fallback logic retained defensively.
      let role = user?.role || user?.global_role || "";

      setMode("edit");
      setEditingId(user.id);
      setInitial({
        name: user.name || "",
        email: user.email || "",
        password: "",
        role: role,
      });
      setOpen(true);
    } catch (e) {
      console.error("Failed to load user", e);
      Swal.fire("Failed to load user", e?.response?.data?.message || "", "error");
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setInitial(emptyInitial);
    setEditingId(null);
    setMode("create");
  };

  // —— CRUD
  const submitForm = async (payload) => {
    // Ensure payload uses 'role' not 'global_role'
    if (payload.global_role) {
      payload.role = payload.global_role;
      delete payload.global_role;
    }
    // Convert tenant_id to number if present and not empty
    if (payload.tenant_id && typeof payload.tenant_id === 'string') {
      payload.tenant_id = Number(payload.tenant_id);
      if (isNaN(payload.tenant_id)) delete payload.tenant_id;
    }
    const verb = mode === "edit" ? "Update" : "Create";
    const { isConfirmed } = await Swal.fire({
      title: `${verb} user?`,
      text: mode === "edit" ? `Apply changes to ${payload.email}?` : `Create new user ${payload.email}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: verb,
      confirmButtonColor: "#2563eb",
    });
    if (!isConfirmed) return;

    setSaving(true);
    try {
      if (mode === "edit" && editingId) {
        await api.put(`/admin/users/${editingId}`, payload);
        toast("User updated");
      } else {
        await api.post("/admin/users", payload);
        toast("User created");
      }
      closeModal();
  await fetchUsers({ q, page: 1, per_page: perPage });
    } catch (e) {
      console.error("Save failed", e);
      const detail =
        e?.response?.data?.message ||
        Object.values(e?.response?.data?.errors ?? {})?.flat()?.join(", ") ||
        "";
      Swal.fire("Save failed", detail, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (row) => {
    const { isConfirmed } = await Swal.fire({
      title: "Delete user?",
      text: `This will permanently delete ${row.email}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;

    try {
      await api.delete(`/admin/users/${row.id}`);
      toast("User deleted");
  const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
  await fetchUsers({ q, page: nextPage, per_page: perPage });
    } catch (e) {
      console.error("Delete failed", e);
      Swal.fire("Delete failed", e?.response?.data?.message || "", "error");
    }
  };

  // —— UI
  return (
    <div className="container" style={{ padding: 16 }}>
      <div className="flex-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Admin · Users</h2>
        <button className="pill-btn" onClick={openCreate}>+ New User</button>
      </div>
      <div className="card" style={{ padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <TableToolbar
          tableId="admin-users"
          search={{
            value: q,
            onChange: (val) => { setQ(val); fetchUsers({ q: val, page: 1, per_page: perPage }); },
            placeholder: "Search (name / email)…"
          }}
          filters={[]}
          columnPicker={{
            columns,
            visibleMap: colVisible,
            onVisibleChange: (map) => setColVisible(map)
          }}
          onRefresh={() => fetchUsers({ q, page, per_page: perPage })}
          onToggleFilters={() => setShowAdvanced(s => !s)}
          filtersBadgeCount={0}
        />
        <FilterPanel
          open={showAdvanced}
          fields={[]}
          onClearAll={() => {/* placeholder for future advanced filters */}}
        />
      </div>
        <div className="table-wrapper">
          <div className="lv-table-wrap">
            <div className="lv-table-scroller">
              <table className="lv-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {colVisible.seq && <th style={{ width: 60, textAlign: 'left', padding: '8px 12px' }}>#</th>}
                  {colVisible.id && <th style={{ width: 80, textAlign: 'left', padding: '8px 12px' }}>User ID</th>}
                  {colVisible.name && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Name</th>}
                  {colVisible.email && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Email</th>}
                  {colVisible.role && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Role</th>}
                  {colVisible.role_id && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Role ID</th>}
                  {colVisible.tenant && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Tenant</th>}
                  {colVisible.verified && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Verified</th>}
                  {colVisible.created && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Created</th>}
                  {colVisible.updated && <th style={{ textAlign: 'left', padding: '8px 12px' }}>Updated</th>}
                  {colVisible.actions && <th style={{ width: 200, textAlign: 'right', padding: '8px 12px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: 16 }}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="8" className="lv-empty" style={{ textAlign: 'center', padding: 16 }}>No users found</td></tr>
                ) : (
                  rows.map((u, i) => {
                    const created = u.created_at ? new Date(u.created_at).toLocaleString() : '—';
                    const updated = u.updated_at ? new Date(u.updated_at).toLocaleString() : '—';
                    const verified = u.email_verified_at ? new Date(u.email_verified_at).toLocaleString() : '—';
                    const tenantLabel = u.tenant ? `${u.tenant.id} · ${u.tenant.name}` : (u.tenant_id ? u.tenant_id : '—');
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        {colVisible.seq && <td style={{ padding: '8px 12px' }}>{(page - 1) * perPage + i + 1}</td>}
                        {colVisible.id && <td style={{ padding: '8px 12px' }}>{u.id}</td>}
                        {colVisible.name && <td style={{ padding: '8px 12px' }}>{u.name}</td>}
                        {colVisible.email && <td style={{ padding: '8px 12px' }}>{u.email}</td>}
                        {colVisible.role && <td style={{ padding: '8px 12px' }}>{ROLE_LABEL[u.role] || u.role || '—'}</td>}
                        {colVisible.role_id && <td style={{ padding: '8px 12px' }}>{u.role_id ?? '—'}</td>}
                        {colVisible.tenant && <td style={{ padding: '8px 12px' }}>{tenantLabel}</td>}
                        {colVisible.verified && <td style={{ padding: '8px 12px' }}>{verified}</td>}
                        {colVisible.created && <td style={{ padding: '8px 12px' }}>{created}</td>}
                        {colVisible.updated && <td style={{ padding: '8px 12px' }}>{updated}</td>}
                        {colVisible.actions && (
                          <td style={{ padding: '8px 12px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="pill-btn ghost sm" onClick={() => openEdit(u)}>Edit</button>
                            <button className="pill-btn ghost sm red-text" onClick={() => deleteUser(u)}>Delete</button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div> {/* close .table-wrapper (was missing) */}
        {/* Pager */}
      <div className="lv-table-pager" style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <button className="pill-btn ghost sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>&lt; Prev</button>
        <span className="pager-text">Page {page} of {meta.last_page} · {meta.total} total</span>
        <button className="pill-btn ghost sm" disabled={page >= meta.last_page} onClick={() => goPage(page + 1)}>Next &gt;</button>
      </div>

      {/* Modal (uses `open`) */}
      <Modal
        open={open}
        onClose={closeModal}
        title={mode === "edit" ? "Edit User" : "Create User"}
        ariaLabel="User Form"
        width={600}
        footer={
          <div className="lv-modal-actions">
            <button type="button" className="pill-btn ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="pill-btn primary" form="lv-admin-user-form" disabled={saving}>
              {saving ? "Saving…" : (mode === "edit" ? "Update User" : "Create User")}
            </button>
          </div>
        }
      >
        <AdminUsersForm
          key={mode + (editingId ?? "new")}
          formId="lv-admin-user-form"
          initialValues={initial}
          mode={mode}
          saving={saving}
          onSubmit={submitForm}
          onCancel={closeModal}
        />
      </Modal>
  </div>
  );
}
