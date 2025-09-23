
import React, { useEffect, useState } from "react";
import api from "../lib/api";

export default function AdminUsersForm({
  formId = "lv-admin-user-form",
  initialValues = { name: "", email: "", password: "", role: "" },
  mode = "create",          // 'create' | 'edit'
  saving = false,           // not used here, but handy if you want inline spinners
  onSubmit,
  onCancel,                 // called from parent footer
}) {
  const [form, setForm] = useState(initialValues);
  const [roleOptions, setRoleOptions] = useState([""]);

  useEffect(() => {
    // Fetch roles from backend
    api.get("/options/roles")
      .then((roles) => {
        setRoleOptions(["", ...roles]);
      })
      .catch(() => {
        setRoleOptions(["", "superadmin", "org_admin", "contributor", "public"]); // fallback
      });
  }, []);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const submit = (e) => {
    e?.preventDefault?.();
    const payload = {
      name: form.name,
      email: form.email,
    };
    if (mode === "create") {
      payload.password = form.password || undefined;
    } else if (form.password) {
      payload.password = form.password;
    }
    if (form.role !== "") {
      payload.role = form.role;
    }
    onSubmit?.(payload);
  };

  return (
    <form id={formId} onSubmit={submit} style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
      width: '100%',
      maxWidth: 600,
      margin: '0 auto',
    }}>
      <label className="lv-field" style={{ gridColumn: '1/2' }}>
        <span>Name *</span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Full name"
        />
      </label>

      <label className="lv-field" style={{ gridColumn: '2/3' }}>
        <span>Email *</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="user@example.com"
        />
      </label>

      <label className="lv-field" style={{ gridColumn: '1/2' }}>
        <span>{mode === "edit" ? "New Password (optional)" : "Password *"}</span>
        <input
          type="password"
          required={mode !== "edit"}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={mode === "edit" ? "Leave blank to keep current" : "Minimum 8 characters"}
        />
      </label>

      <label className="lv-field" style={{ gridColumn: '2/3' }}>
        <span>Role (required)</span>
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          required
        >
          {roleOptions.map((opt) => (
            <option key={opt} value={opt}>{opt || "— none —"}</option>
          ))}
        </select>
        <small className="grey-text">
          Sets a <em>global</em> role (tenant_id = null). Per-tenant roles are managed on the organization screens.
        </small>
      </label>
    </form>
  );
}
