
import React, { useEffect, useState } from "react";
import api from "../lib/api";


export default function AdminUsersForm({
  formId = "lv-admin-user-form",
  initialValues = { name: "", email: "", password: "", role: "", tenant_id: "" },
  mode = "create",          // 'create' | 'edit'
  saving = false,           // not used here, but handy if you want inline spinners
  onSubmit,
  onCancel,                 // called from parent footer
}) {
  const [form, setForm] = useState({ ...initialValues, tenant_id: initialValues.tenant_id || "" });
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [roleOptions, setRoleOptions] = useState([""]);
  const [tenants, setTenants] = useState([]);
  // Fetch tenants for org-scoped roles (use /api/admin/tenants, handle pagination)
  useEffect(() => {
    api.get("/admin/tenants", { params: { per_page: 100 } }).then((res) => {
      // Handle paginated response: { data: [...], ...meta }
      const items = Array.isArray(res?.data) ? res.data : [];
      setTenants(items);
    }).catch(() => setTenants([]));
  }, []);

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
    setForm({ ...initialValues, tenant_id: initialValues.tenant_id || "" });
    setPasswordConfirmation("");
  }, [initialValues]);


  const submit = (e) => {
    e?.preventDefault?.();
    const payload = {
      name: form.name,
      email: form.email,
    };
    if (mode === "create") {
      payload.password = form.password || undefined;
      payload.password_confirmation = passwordConfirmation || undefined;
    } else if (form.password) {
      payload.password = form.password;
      payload.password_confirmation = passwordConfirmation || undefined;
    }
    if (form.role !== "") {
      payload.role = form.role;
    }
    // If org-scoped role, include tenant_id
    if (["org_admin", "contributor"].includes(form.role) && form.tenant_id) {
      payload.tenant_id = form.tenant_id;
    }
    onSubmit?.(payload);
  };

  return (
    <form id={formId} onSubmit={submit} style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
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
        <span>{mode === "edit" ? "Confirm New Password" : "Confirm Password *"}</span>
        <input
          type="password"
          required={mode !== "edit"}
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          placeholder={mode === "edit" ? "Retype new password" : "Retype password"}
        />
      </label>

      <label className="lv-field" style={{ gridColumn: '1/3' }}>
        <span>Role (required)</span>
        <select
          value={form.role}
          onChange={(e) => {
            const role = e.target.value;
            setForm((f) => ({ ...f, role, tenant_id: role === 'org_admin' || role === 'contributor' ? f.tenant_id : undefined }));
          }}
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

      {/* Tenant selection for org-scoped roles */}
      {["org_admin", "contributor"].includes(form.role) && (
        <label className="lv-field" style={{ gridColumn: '1/3' }}>
          <span>Organization (Tenant) *</span>
          <select
            value={form.tenant_id || ""}
            onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}
            required
          >
            <option value="">— Select organization —</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <small className="grey-text">Required for org_admin and contributor roles.</small>
        </label>
      )}
    </form>
  );
}
