import React, { useEffect, useState, useMemo, useRef } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";
import api, { me as fetchMe } from "../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../lib/httpCache";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

import Modal from "../../components/Modal";
import AdminUsersForm from "../../components/adminUsersForm";
import DashboardHeader from '../../components/DashboardHeader';
import { FiUsers as FiUsersIcon } from 'react-icons/fi';
import { ROLE_LABEL } from "../../lib/roles";
import TableLayout from "../../layouts/TableLayout";

const TABLE_ID = "admin-users";
const VIS_KEY = `${TABLE_ID}::visible`;

const emptyInitial = { name: "", email: "", password: "", role: "" };

const normalizeUsers = (rows = []) => rows.map(u => ({
  id: u.id,
  name: u.name ?? "",
  email: u.email ?? "",
  role: u.role ?? "",
  role_label: ROLE_LABEL[u.role] || u.role || "—",
  created_at: u.created_at ? new Date(u.created_at).toLocaleString() : "—",
  updated_at: u.updated_at ? new Date(u.updated_at).toLocaleString() : "—",
  _raw: u,
}));

export default function AdminUsersPage() {
  // raw user rows from API
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [myId, setMyId] = useState(null);

  // Persist advanced filter state
  const ADV_KEY = `${TABLE_ID}::filters_advanced`;

  // Other advanced filter inputs removed; only role is persisted/used.

  // Existing filters
  const [fRole, setFRole] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(ADV_KEY) || '{}'); return s.role || ""; } catch { return ""; }
  });
  // Status filter removed (created/updated range fields removed)

  useEffect(() => {
    try { localStorage.setItem(ADV_KEY, JSON.stringify({ role: fRole || "" })); } catch {}
  }, [fRole]);

  const defaultsVisible = useMemo(() => ({ name: true, email: true, role: true, created_at: false, updated_at: false }), []);
  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = localStorage.getItem(VIS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const final = {};
      for (const key of Object.keys(defaultsVisible)) {
        if (defaultsVisible[key] === false) final[key] = false;
        else if (Object.prototype.hasOwnProperty.call(parsed, key)) final[key] = parsed[key];
        else final[key] = defaultsVisible[key];
      }
      return final;
    } catch { return defaultsVisible; }
  });
  useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);

  // TableLayout columns
  const baseColumns = useMemo(() => [
    { id: 'name', header: 'Name', accessor: 'name' },
    { id: 'email', header: 'Email', accessor: 'email', width: 240 },
    { id: 'role', header: 'Role', accessor: 'role_label', width: 140 },
    { id: 'created_at', header: 'Created', accessor: 'created_at', width: 160, className: 'col-sm-hide' },
    { id: 'updated_at', header: 'Updated', accessor: 'updated_at', width: 160, className: 'col-sm-hide' },
  ], []);

  const visibleColumns = useMemo(() => baseColumns.filter(c => visibleMap[c.id] !== false), [baseColumns, visibleMap]);

  // modal/form state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [initial, setInitial] = useState(emptyInitial);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const page = meta.current_page ?? 1;
  const perPage = meta.per_page ?? 15;

  const unwrap = (res) => (res?.data ?? res);
  const toast = (title, icon = "success") => Swal.fire({ toast: true, position: "top-end", timer: 1600, showConfirmButton: false, icon, title });

  // buildParams uses only role as advanced filter
  const buildParams = (overrides = {}) => {
    const params = { q, page, per_page: perPage, ...overrides };
    if (fRole) params.role = fRole;
    return params;
  };

  const fetchUsers = async (params = {}) => {
    setLoading(true);
    try {
      const res = unwrap(await cachedGet("/admin/users", { params, ttlMs: 5 * 60 * 1000 }));
  const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const filtered = myId ? items.filter(u => u.id !== myId) : items;
  setRows(filtered);
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
    // Resolve current user, then fetch users
    (async () => {
      try {
        const me = await fetchMe({ maxAgeMs: 60 * 1000 });
        setMyId(me?.id);
      } catch { /* ignore */ }
      fetchUsers(buildParams());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPage = (p) => fetchUsers(buildParams({ page: p }));

  const openCreate = () => {
    setMode("create"); setEditingId(null); setInitial(emptyInitial); setOpen(true);
  };

  const openEdit = async (row) => {
    try {
      setSaving(true);
      const res = unwrap(await api.get(`/admin/users/${row.id}`));
      const user = res?.data ?? res;
      let role = user?.role || user?.global_role || "";
      const tenantId = user?.tenant_id || user?.tenant?.id || (Array.isArray(user?.tenants) ? user.tenants[0]?.id : undefined) || "";
      setMode("edit"); setEditingId(user.id);
      setInitial({ name: user.name || "", email: user.email || "", password: "", role, tenant_id: tenantId });
      setOpen(true);
    } catch (e) {
      console.error("Failed to load user", e);
      Swal.fire("Failed to load user", e?.response?.data?.message || "", "error");
    } finally { setSaving(false); }
  };

  const closeModal = () => { if (saving) return; setOpen(false); setInitial(emptyInitial); setEditingId(null); setMode("create"); };

  const submitForm = async (payload) => {
    if (payload.global_role) { payload.role = payload.global_role; delete payload.global_role; }
    if ('active' in payload) delete payload.active;
    if ('disabled' in payload) delete payload.disabled;
    if ('is_active' in payload) delete payload.is_active;
    const verb = mode === "edit" ? "Update" : "Create";
    const { isConfirmed } = await Swal.fire({ title: `${verb} user?`, text: mode === "edit" ? `Apply changes to ${payload.email}?` : `Create new user ${payload.email}?`, icon: "question", showCancelButton: true, confirmButtonText: verb, confirmButtonColor: "#2563eb" });
    if (!isConfirmed) return;
    setSaving(true);
    try {
      if (mode === "edit" && editingId) { await api.put(`/admin/users/${editingId}`, payload); toast("User updated"); }
      else { await api.post("/admin/users", payload); toast("User created"); }
      closeModal();
      invalidateHttpCache('/admin/users');
      await fetchUsers(buildParams({ page: 1 }));
    } catch (e) {
      console.error("Save failed", e);
      const detail = e?.response?.data?.message || Object.values(e?.response?.data?.errors ?? {})?.flat()?.join(", ") || "";
      Swal.fire("Save failed", detail, "error");
    } finally { setSaving(false); }
  };

  const deleteUser = async (row) => {
    const { isConfirmed } = await Swal.fire({ title: "Delete user?", text: `This will permanently delete ${row.email}.`, icon: "warning", showCancelButton: true, confirmButtonText: "Delete", confirmButtonColor: "#dc2626" });
    if (!isConfirmed) return;
    try {
      await api.delete(`/admin/users/${row.id}`); toast("User deleted");
      invalidateHttpCache('/admin/users');
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      await fetchUsers(buildParams({ page: nextPage }));
    } catch (e) { console.error("Delete failed", e); Swal.fire("Delete failed", e?.response?.data?.message || "", "error"); }
  };

  const actions = useMemo(() => [
    { label: 'Edit', title: 'Edit', type: 'edit', icon: <FiEdit2 />, onClick: (raw) => openEdit(raw) },
    { label: 'Delete', title: 'Delete', type: 'delete', icon: <FiTrash2 />, onClick: (raw) => deleteUser(raw) },
  ], [openEdit, deleteUser]);

  const normalized = useMemo(() => normalizeUsers(rows), [rows]);

  const advancedFields = [
    {
      id: 'role',
      label: 'Role',
      type: 'select',
      value: fRole,
      onChange: (v) => setFRole(v),
      options: [{ value: '', label: 'All Roles' }, ...Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))]
    },
  ];

  const clearAdvanced = () => { setFRole(""); fetchUsers(buildParams({ page: 1 })); };
  const activeAdvCount = [fRole].filter(Boolean).length;

  const columnPickerAdapter = {
    columns: baseColumns.map(c => ({ id: c.id, header: c.header })),
    visibleMap: visibleMap,
    onVisibleChange: (map) => setVisibleMap(map),
  };

  // Debounce logic for auto-applying filters (only role remains)
  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchUsers(buildParams({ page: 1 })); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fRole]);

  return (
    <div className="container" style={{ padding: 16 }}>
      <DashboardHeader
        icon={<FiUsersIcon />}
        title="Users"
        description="Manage user accounts, roles, and access for the system."
      />

      <div className="card" style={{ padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <TableToolbar
          tableId={TABLE_ID}
          search={{ value: q, onChange: (val) => { setQ(val); fetchUsers(buildParams({ q: val, page: 1 })); }, placeholder: "Search Users..." }}
          filters={[]} // no basic filters now
          columnPicker={columnPickerAdapter}
          onRefresh={() => fetchUsers(buildParams())}
          onAdd={openCreate}
          onToggleFilters={() => setShowAdvanced(s => !s)}
          filtersBadgeCount={activeAdvCount}
        />
        <FilterPanel open={showAdvanced} fields={advancedFields} onClearAll={clearAdvanced} />
      </div>

      <div className="card" style={{ padding: 12, borderRadius: 12 }}>
        <TableLayout
          tableId={TABLE_ID}
          columns={visibleColumns}
          data={normalized}
          pageSize={perPage}
          loading={loading}
          actions={actions}
          resetSignal={0}
          columnPicker={false} // using external column picker (toolbar)
          hidePager={false} // use internal pager
          serverSide={true}
          pagination={{ page: page, totalPages: meta.last_page }}
          onPageChange={goPage}
        />
      </div>

      <Modal
        open={open}
        onClose={closeModal}
        title={mode === "edit" ? "Edit User" : "Create User"}
        ariaLabel="User Form"
        width={600}
        footer={<div className="lv-modal-actions"><button type="button" className="pill-btn ghost" onClick={closeModal} disabled={saving}>Cancel</button><button type="submit" className="pill-btn primary" form="lv-admin-user-form" disabled={saving}>{saving ? "Saving…" : (mode === "edit" ? "Update User" : "Create User")}</button></div>}
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
