import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useWindowSize } from "../hooks/useWindowSize";

const ROLE_LABELS = {
  superadmin: 'Super Administrator',
  org_admin: 'Organization Administrator',
  contributor: 'Contributor',
  public: 'Public',
};


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
  const [roleOptions, setRoleOptions] = useState([]);
  const [tenants, setTenants] = useState([]);
  const { width: windowW } = useWindowSize();

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
        // roles expected as array of role keys, e.g. ['superadmin','org_admin']
        setRoleOptions(Array.isArray(roles) ? roles : []);
      })
      .catch(() => {
        setRoleOptions(["superadmin", "org_admin", "contributor", "public"]); // fallback
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
    // Status removed: do not include active/is_active
    // If org-scoped role, include tenant_id
    if (["org_admin", "contributor"].includes(form.role) && form.tenant_id) {
      payload.tenant_id = form.tenant_id;
    }
    onSubmit?.(payload);
  };

  const computeModalWidth = (w) => {
    if (!w) return 640;
    if (w >= 2561) return 1400; // 4k
    if (w >= 1441) return 1080; // Laptop L
    if (w >= 1025) return 860;  // Laptop
    if (w >= 769) return 720;   // Tablet
    // mobile: keep it responsive to viewport rather than fixed pixels
    if (w <= 420) return '92vw';
    return '94vw';
  };

  return (
    <form id={formId} onSubmit={submit} className="lv-grid-2 admin-users-form" style={{ gap: 20, maxWidth: 640 }}>
      <label className="lv-field">
        <span>Name*</span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Full name"
        />
      </label>

      <label className="lv-field">
        <span>Email*</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="user@example.com"
        />
      </label>

      <label className="lv-field">
        <span>{mode === "edit" ? "New Password (optional)" : "Password*"}</span>
        <input
          type="password"
          required={mode !== "edit"}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={mode === "edit" ? "Leave blank to keep current" : "Minimum 8 characters"}
        />
      </label>

      <label className="lv-field">
        <span>{mode === "edit" ? "Confirm New Password" : "Confirm Password*"}</span>
        <input
          type="password"
          required={mode !== "edit"}
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          placeholder={mode === "edit" ? "Retype new password" : "Retype password"}
        />
      </label>

      <label className="lv-field full">
        <span>Role*</span>
        <select
          value={form.role}
          onChange={(e) => {
            const role = e.target.value;
            setForm((f) => ({ ...f, role, tenant_id: role === 'org_admin' || role === 'contributor' ? f.tenant_id : undefined }));
          }}
          required
        >
          <option value="" disabled>Select role</option>
          {roleOptions.map((opt) => (
            <option key={opt} value={opt}>{ROLE_LABELS[opt] || opt}</option>
          ))}
        </select>
      </label>

      {"org_admin" === form.role || "contributor" === form.role ? (
        <label className="lv-field full">
          <span>Organization*</span>
          <select
            value={form.tenant_id || ""}
            onChange={(e) => setForm((f) => ({ ...f, tenant_id: e.target.value }))}
            required
          >
            <option value="" disabled>Select Organization</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
      ) : null}
    </form>
  );
}
