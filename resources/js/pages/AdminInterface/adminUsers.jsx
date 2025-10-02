// resources/js/pages/AdminInterface/adminUsers.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { FiEdit, FiTrash } from 'react-icons/fi';
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";
import api from "../../lib/api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

import Modal from "../../components/Modal";
import AdminUsersForm from "../../components/adminUsersForm";
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

  // Persist advanced filter state
  const ADV_KEY = `${TABLE_ID}::filters_advanced`;

  // New state for name and email filters
  const [fName, setFName] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(ADV_KEY) || '{}'); return s.name || ""; } catch { return ""; }
  });
  const [fEmail, setFEmail] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(ADV_KEY) || '{}'); return s.email || ""; } catch { return ""; }
  });

  // Existing filters
  const [fRole, setFRole] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(ADV_KEY) || '{}'); return s.role || ""; } catch { return ""; }
  });
  const [fCreatedRange, setFCreatedRange] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(ADV_KEY) || '{}'); return Array.isArray(s.created_range) ? s.created_range : [null, null]; } catch { return [null, null]; }
  });
  const [fUpdatedRange, setFUpdatedRange] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(ADV_KEY) || '{}'); return Array.isArray(s.updated_range) ? s.updated_range : [null, null]; } catch { return [null, null]; }
  });

  // Persist advanced filters when they change
  useEffect(() => {
    try {
      const payload = {
        name: fName || "",
        email: fEmail || "",
        role: fRole || "",
        created_range: fCreatedRange,
        updated_range: fUpdatedRange,
      };
      localStorage.setItem(ADV_KEY, JSON.stringify(payload));
    } catch {}
  }, [fName, fEmail, fRole, fCreatedRange, fUpdatedRange]);

  // Column visibility persistence (like watercat)
  const defaultsVisible = useMemo(() => ({ name: true, email: true, role: true, created_at: true, updated_at: true }), []);
  const [visibleMap, setVisibleMap] = useState(() => {
    try { const raw = localStorage.getItem(VIS_KEY); return raw ? JSON.parse(raw) : defaultsVisible; } catch { return defaultsVisible; }
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

  // buildParams now includes name & email
  const buildParams = (overrides = {}) => {
    const params = { q, page, per_page: perPage, ...overrides };
    if (fName) params.name = fName;
    if (fEmail) params.email = fEmail;
    if (fRole) params.role = fRole;
    const [cFrom, cTo] = fCreatedRange;
    if (cFrom) params.created_from = cFrom;
    if (cTo) params.created_to = cTo;
    const [uFrom, uTo] = fUpdatedRange;
    if (uFrom) params.updated_from = uFrom;
    if (uTo) params.updated_to = uTo;
    return params;
  };

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

  useEffect(() => { fetchUsers(buildParams()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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
      setMode("edit"); setEditingId(user.id);
      setInitial({ name: user.name || "", email: user.email || "", password: "", role });
      setOpen(true);
    } catch (e) {
      console.error("Failed to load user", e);
      Swal.fire("Failed to load user", e?.response?.data?.message || "", "error");
    } finally { setSaving(false); }
  };

  const closeModal = () => { if (saving) return; setOpen(false); setInitial(emptyInitial); setEditingId(null); setMode("create"); };

  const submitForm = async (payload) => {
    if (payload.global_role) { payload.role = payload.global_role; delete payload.global_role; }
    const verb = mode === "edit" ? "Update" : "Create";
    const { isConfirmed } = await Swal.fire({ title: `${verb} user?`, text: mode === "edit" ? `Apply changes to ${payload.email}?` : `Create new user ${payload.email}?`, icon: "question", showCancelButton: true, confirmButtonText: verb, confirmButtonColor: "#2563eb" });
    if (!isConfirmed) return;
    setSaving(true);
    try {
      if (mode === "edit" && editingId) { await api.put(`/admin/users/${editingId}`, payload); toast("User updated"); }
      else { await api.post("/admin/users", payload); toast("User created"); }
      closeModal();
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
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      await fetchUsers(buildParams({ page: nextPage }));
    } catch (e) { console.error("Delete failed", e); Swal.fire("Delete failed", e?.response?.data?.message || "", "error"); }
  };

  // Actions for TableLayout
  const actions = useMemo(() => [
    { label: 'Edit', title: 'Edit', type: 'edit', icon: <FiEdit />, onClick: (raw) => openEdit(raw) },
    { label: 'Delete', title: 'Delete', type: 'delete', icon: <FiTrash />, onClick: (raw) => deleteUser(raw) },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  // Normalized & paged manually (server pagination) -> we let TableLayout paginate client-side too, but we show server pages separately.
  const normalized = useMemo(() => normalizeUsers(rows), [rows]);

  // Advanced filter fields
  const advancedFields = [
    { id: 'name', label: 'Name', type: 'text', value: fName, onChange: v => setFName(v) },
    { id: 'email', label: 'Email', type: 'text', value: fEmail, onChange: v => setFEmail(v) },
    {
      id: 'role',
      label: 'Role',
      type: 'select',
      value: fRole,
      onChange: (v) => setFRole(v),
      options: [{ value: '', label: 'All Roles' }, ...Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))]
    },
    {
      id: 'created-range',
      label: 'Created Date Range',
      type: 'date-range',
      value: fCreatedRange,
      onChange: (rng) => setFCreatedRange(rng)
    },
    {
      id: 'updated-range',
      label: 'Updated Date Range',
      type: 'date-range',
      value: fUpdatedRange,
      onChange: (rng) => setFUpdatedRange(rng)
    }
  ];

  const clearAdvanced = () => {
    setFName("");
    setFEmail("");
    setFRole("");
    setFCreatedRange([null, null]);
    setFUpdatedRange([null, null]);
    fetchUsers(buildParams({ page: 1 }));
  };

  const activeAdvCount = [
    fName ? 1 : 0,
    fEmail ? 1 : 0,
    fRole ? 1 : 0,
    fCreatedRange[0] ? 1 : 0,
    fCreatedRange[1] ? 1 : 0,
    fUpdatedRange[0] ? 1 : 0,
    fUpdatedRange[1] ? 1 : 0,
  ].reduce((a,b)=>a+b,0);

  // ColumnPicker adapter for TableToolbar (independent from TableLayout internal picker) - we keep existing TableToolbar pattern.
  const columnPickerAdapter = {
    columns: baseColumns.map(c => ({ id: c.id, header: c.header })),
    visibleMap: visibleMap,
    onVisibleChange: (map) => setVisibleMap(map),
  };

  // Debounce logic for auto-applying filters
  const debounceRef = useRef(null);
  useEffect(() => {
    // Auto-apply on advanced filter changes with debounce (always active, even when hidden)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(buildParams({ page: 1 }));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fName, fEmail, fRole, fCreatedRange, fUpdatedRange]);

  return (
    <div className="container" style={{ padding: 16 }}>
      <div className="flex-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Admin · Users</h2>
        <button className="pill-btn" onClick={openCreate}>+ New User</button>
      </div>

      <div className="card" style={{ padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <TableToolbar
          tableId={TABLE_ID}
          search={{ value: q, onChange: (val) => { setQ(val); fetchUsers(buildParams({ q: val, page: 1 })); }, placeholder: "Search (name / email)…" }}
          filters={[]} // no basic filters now
          columnPicker={columnPickerAdapter}
          onRefresh={() => fetchUsers(buildParams())}
          onToggleFilters={() => setShowAdvanced(s => !s)}
          filtersBadgeCount={activeAdvCount}
        />
        <FilterPanel open={showAdvanced} fields={advancedFields} onClearAll={clearAdvanced} />
      </div>

      <div className="card" style={{ padding: 12, borderRadius: 12 }}>
        {loading && <div className="lv-empty" style={{ padding: 16 }}>Loading…</div>}
        {!loading && (
          <TableLayout
            tableId={TABLE_ID}
            columns={visibleColumns}
            data={normalized}
            pageSize={perPage}
            actions={actions}
            resetSignal={0}
            columnPicker={false} // using external column picker (toolbar)
            hidePager={true} // hide internal pager; we use server pager below
          />
        )}
        {/* Server pagination controls (independent of TableLayout internal pagination) */}
        <div className="lv-table-pager" style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <button className="pill-btn ghost sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>&lt; Prev</button>
          <span className="pager-text">Page {page} of {meta.last_page} · {meta.total} total</span>
          <button className="pill-btn ghost sm" disabled={page >= meta.last_page} onClick={() => goPage(page + 1)}>Next &gt;</button>
        </div>
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

      {/* Removed diagnostic preview section */}
    </div>
  );
}
