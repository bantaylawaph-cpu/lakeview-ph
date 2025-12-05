import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useWindowSize } from "../hooks/useWindowSize";
import { FiCheck, FiAlertCircle, FiEye, FiEyeOff } from "react-icons/fi";

const ROLE_LABELS = {
  superadmin: 'Super Administrator',
  org_admin: 'Organization Administrator',
  contributor: 'Contributor',
  public: 'Public',
};


export default function AdminUsersForm({
  formId = "lv-admin-user-form",
  initialValues = { name: "", email: "", password: "", role: "", tenant_id: "", occupation: "", occupation_other: "" },
  mode = "create",          // 'create' | 'edit'
  saving = false,           // not used here, but handy if you want inline spinners
  onSubmit,
  onCancel,                 // called from parent footer
}) {
  const [form, setForm] = useState({ 
    ...initialValues, 
    tenant_id: initialValues.tenant_id || "",
    occupation: initialValues.occupation || "",
    occupation_other: initialValues.occupation_other || ""
  });
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [roleOptions, setRoleOptions] = useState([]);
  const [tenants, setTenants] = useState([]);
  const { width: windowW } = useWindowSize();
  const [showPwd, setShowPwd] = useState({ password: false, confirm: false });
  const [errors, setErrors] = useState({ name: null, email: null, password: null });

  // Validation functions (from AuthModal)
  const validateFullName = (name) => {
    if (!name || name.trim().length === 0) return "Full name is required.";
    if (name.trim().length < 2) return "Full name must be at least 2 characters.";
    if (name.length > 50) return "Full name must not exceed 50 characters.";
    if (!/^[a-zA-Z\s]+$/.test(name)) return "Full name must contain only letters and spaces.";
    return null;
  };

  const validateEmail = (email) => {
    if (!email || email.trim().length === 0) return "Email is required.";
    if (email.length > 254) return "Email must not exceed 254 characters.";
    if (/\s/.test(email)) return "Email must not contain spaces.";
    if (!/^[a-zA-Z0-9]/.test(email)) return "Email must start with a letter or number.";
    if (!/[a-zA-Z0-9]$/.test(email)) return "Email must end with a letter or number.";
    if (!email.includes('@')) return "Email must contain @.";
    const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";
    return null;
  };

  const validatePassword = (pwd) => {
    if (!pwd || pwd.length === 0) return "Password is required.";
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (pwd.length > 64) return "Password must not exceed 64 characters.";
    if (/\s/.test(pwd)) return "Password must not contain spaces.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least 1 uppercase letter.";
    if (!/\d/.test(pwd)) return "Password must contain at least 1 number.";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must contain at least 1 special character.";
    return null;
  };

  // Derived validation states
  const validFullName = validateFullName(form.name) === null;
  const validEmail = validateEmail(form.email) === null;
  const strongPassword = form.password ? validatePassword(form.password) === null : true;
  const passwordsMatch = (form.password?.length || 0) > 0 && form.password === passwordConfirmation;

  const passwordCriteria = [
    { label: 'At least 8 characters', ok: (form.password?.length || 0) >= 8 && (form.password?.length || 0) <= 64 },
    { label: '1 uppercase letter', ok: /[A-Z]/.test(form.password || '') },
    { label: '1 number', ok: /\d/.test(form.password || '') },
    { label: '1 special character', ok: /[^A-Za-z0-9]/.test(form.password || '') },
    { label: 'No spaces', ok: !/\s/.test(form.password || '') || (form.password?.length || 0) === 0 },
  ];

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
    setForm({ 
      ...initialValues, 
      tenant_id: initialValues.tenant_id || "",
      occupation: initialValues.occupation || "",
      occupation_other: initialValues.occupation_other || ""
    });
    setPasswordConfirmation("");
  }, [initialValues]);


  const submit = (e) => {
    e?.preventDefault?.();
    
    // Validate all fields
    const nameError = validateFullName(form.name);
    const emailError = validateEmail(form.email);
    let passwordError = null;
    
    if (mode === "create") {
      passwordError = validatePassword(form.password);
    }
    
    // Set errors if any
    if (nameError || emailError || passwordError) {
      setErrors({ name: nameError, email: emailError, password: passwordError });
      return;
    }
    
    // Check password confirmation match
    if (mode === "create" && form.password !== passwordConfirmation) {
      setErrors({ ...errors, password: "Passwords do not match." });
      return;
    }
    
    // Clear errors
    setErrors({ name: null, email: null, password: null });
    
    const payload = {
      name: form.name,
      email: form.email,
    };
    if (mode === "create") {
      payload.password = form.password || undefined;
      payload.password_confirmation = passwordConfirmation || undefined;
    }
    if (form.role !== "") {
      payload.role = form.role;
    }
    // Include occupation
    if (form.occupation) {
      payload.occupation = form.occupation;
      if (form.occupation === "other" && form.occupation_other) {
        payload.occupation_other = form.occupation_other;
      }
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
          maxLength={50}
        />
        {form.name.length > 0 && !validFullName && (
          <div className="auth-error" role="alert" style={{ marginTop: 4, fontSize: '0.875rem', color: '#dc2626' }}>
            {validateFullName(form.name)}
          </div>
        )}
      </label>

      <label className="lv-field">
        <span>Email*</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="user@example.com"
          maxLength={254}
        />
        {form.email.length > 0 && !validEmail && (
          <div className="auth-error" role="alert" style={{ marginTop: 4, fontSize: '0.875rem', color: '#dc2626' }}>
            {validateEmail(form.email)}
          </div>
        )}
      </label>

      {mode === 'create' && (
        <>
          <label className="lv-field">
            <span>Password*</span>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd.password ? "text" : "password"}
                required
                value={form.password || ''}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Minimum 8 characters"
                maxLength={64}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((p) => ({ ...p, password: !p.password }))}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                aria-label={showPwd.password ? "Hide password" : "Show password"}
              >
                {showPwd.password ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </label>

          <label className="lv-field">
            <span>Confirm Password*</span>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd.confirm ? "text" : "password"}
                required
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Retype password"
                maxLength={64}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((p) => ({ ...p, confirm: !p.confirm }))}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                aria-label={showPwd.confirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showPwd.confirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            {!passwordsMatch && passwordConfirmation.length > 0 && (form.password?.length || 0) > 0 && (
              <div className="auth-error" role="alert" style={{ marginTop: 4, fontSize: '0.875rem', color: '#dc2626' }}>
                Passwords do not match.
              </div>
            )}
          </label>

          {/* Password strength & criteria */}
          <div className="lv-field full" style={{ gridColumn: '1 / -1' }}>
            <div className="password-strength" aria-live="polite" style={{ marginTop: 8 }}>
              <div style={{
                height: '4px',
                borderRadius: '2px',
                background: strongPassword ? '#22c55e' : '#e5e7eb',
                marginBottom: '8px',
                transition: 'background 0.3s'
              }}></div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '4px',
                fontSize: '0.875rem'
              }}>
                {passwordCriteria.map(c => (
                  <li key={c.label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: c.ok ? '#22c55e' : '#94a3b8'
                  }}>
                    {c.ok ? <FiCheck size={14} /> : <FiAlertCircle size={14} />} {c.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

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

      <label className="lv-field full">
        <span>Occupation</span>
        <select
          value={form.occupation || ""}
          onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
        >
          <option value="">Select occupation</option>
          <option value="student">Student</option>
          <option value="researcher">Researcher</option>
          <option value="government">Government</option>
          <option value="ngo">NGO</option>
          <option value="fisherfolk">Fisherfolk / Coop</option>
          <option value="local_resident">Local resident</option>
          <option value="faculty">Academic / Faculty</option>
          <option value="consultant">Private sector / Consultant</option>
          <option value="tourist">Tourist / Visitor</option>
          <option value="other">Other (specify)</option>
        </select>
      </label>

      {form.occupation === "other" && (
        <label className="lv-field full">
          <span>Please specify your occupation</span>
          <input
            type="text"
            placeholder="Enter your occupation"
            value={form.occupation_other || ""}
            onChange={(e) => setForm((f) => ({ ...f, occupation_other: e.target.value }))}
          />
        </label>
      )}
    </form>
  );
}
