// Refactored version aligned with adminUsers.jsx UI/UX but scoped to contributors
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useLocation } from 'react-router-dom';
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FiEdit, FiTrash, FiUsers, FiCheck, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import DashboardHeader from '../../components/DashboardHeader';
import api, { me as fetchMe } from "../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../lib/httpCache";
import Modal from "../../components/Modal";
import { useWindowSize } from '../../hooks/useWindowSize';
import TableToolbar from "../../components/table/TableToolbar";
import TableLayout from "../../layouts/TableLayout";

// Constants
const CONTRIBUTOR_ROLE_ID = 3; // legacy constant for contributor filtering
const ORG_ADMIN_ROLE_NAME = 'org_admin';
const FIXED_ROLE = 'contributor';
const TABLE_ID = 'org-contributors';
const VIS_KEY = `${TABLE_ID}::visible`;

// Role labels for display
const ROLE_LABELS = {
  org_admin: 'Organization Admin',
  contributor: 'Contributor',
};

// Initial form values
const emptyContributor = { name: '', email: '', password: '', role: FIXED_ROLE, occupation: '', occupation_other: '' };

// Normalize API users -> table rows (include role for display)
const normalizeMembers = (rows = []) => rows.map(u => {
  // u.role already set in fetchMembers, just need to format for display
  const roleKey = u.role || '';
  return {
    id: u.id,
    name: u.name || '',
    email: u.email || '',
    role: ROLE_LABELS[roleKey] || roleKey || '—',
    role_key: roleKey, // preserve original key for filtering/logic
    _raw: u,
  };
});

export default function OrgMembers() {
  const { width: windowW } = useWindowSize();
  // Core state
  const location = useLocation();
  const qp = new URLSearchParams(location.search);
  // Prefer explicit tenant_id from query params; fallback to user context later
  const initialTenantFromQuery = qp.get('tenant_id') || null;
  const [tenantId, setTenantId] = useState(initialTenantFromQuery);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search
  const [q, setQ] = useState('');

  // Unified pagination state (mirrors adminUsers logic)
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0, lastPage: 1 });

  // Sorting state (persisted) similar to adminUsers
  const SORT_KEY = `${TABLE_ID}::sort`;
  const [sort, setSort] = useState(() => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.id === 'string' && (parsed.dir === 'asc' || parsed.dir === 'desc')) return parsed;
      }
    } catch {}
    return { id: 'name', dir: 'asc' }; // default alphabetical by name
  });
  useEffect(() => { try { localStorage.setItem(SORT_KEY, JSON.stringify(sort)); } catch {} }, [sort]);

  // Column visibility
  const defaultsVisible = useMemo(() => ({ name: true, email: true, role: true }), []);
  const [visibleMap, setVisibleMap] = useState(() => { try { const raw = localStorage.getItem(VIS_KEY); return raw ? JSON.parse(raw) : defaultsVisible; } catch { return defaultsVisible; } });
  useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);

  // Modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [initial, setInitial] = useState(emptyContributor);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState({ password: false, confirm: false });

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
  const validFullName = validateFullName(initial.name) === null;
  const validEmail = validateEmail(initial.email) === null;
  const strongPassword = initial.password ? validatePassword(initial.password) === null : true;
  const passwordsMatch = initial.password && initial.password === initial.password_confirmation;

  const passwordCriteria = [
    { label: 'At least 8 characters', ok: (initial.password?.length || 0) >= 8 && (initial.password?.length || 0) <= 64 },
    { label: '1 uppercase letter', ok: /[A-Z]/.test(initial.password || '') },
    { label: '1 number', ok: /\d/.test(initial.password || '') },
    { label: '1 special character', ok: /[^A-Za-z0-9]/.test(initial.password || '') },
    { label: 'No spaces', ok: !/\s/.test(initial.password || '') || !initial.password },
  ];

  // Build base columns
  const baseColumns = useMemo(() => [
    { id: 'name', header: 'Name', accessor: 'name' },
    { id: 'email', header: 'Email', accessor: 'email', width: 240 },
    { id: 'role', header: 'Role', accessor: 'role', width: 140 },
  ], []);
  const visibleColumns = useMemo(() => baseColumns.filter(c => visibleMap[c.id] !== false), [baseColumns, visibleMap]);

  const page = pagination.page;
  const perPage = pagination.perPage;

  const toast = (title, icon='success') => Swal.fire({ toast:true, position:'top-end', timer:1600, showConfirmButton:false, icon, title });
  const unwrap = (res) => (res?.data ?? res);

  // buildParams helper for constructing API parameters consistently (mirrors adminUsers)
  const buildParams = (overrides = {}) => {
    const params = { q, page, per_page: perPage, ...overrides };
    if (sort && sort.id) {
      params.sort_by = sort.id;
      params.sort_dir = sort.dir === 'asc' ? 'asc' : 'desc';
    }
    return params;
  };

  // Fetch contributors with server-side pagination, sorting, and search (mirrors adminUsers)
  const fetchMembers = async (tid, params = {}) => {
    if (!tid) return;
    setLoading(true); setError(null);
    try {
      // Use api.get directly to bypass cache completely (mirrors adminUsers approach)
      const raw = await api.get(`/org/${tid}/users`, { params });
      const payload = raw; // keep full paginator object
      const items = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      // Safely derive role name for each user (role is now loaded as relationship)
      const members = items.map(u => {
        const roleName = u.role?.name || u.role_name || u.role || (u.role_id === CONTRIBUTOR_ROLE_ID ? 'contributor' : undefined);
        return { ...u, role: roleName };
      });
      setRows(members);

      // Parse pagination (supports Laravel paginator or generic shapes)
      const m = payload?.meta ?? payload?.pagination ?? payload;
      const totalRaw = m.total ?? payload?.total;
      const perRaw = m.per_page ?? m.perPage ?? payload?.per_page ?? payload?.perPage ?? params.per_page ?? pagination.perPage;
      const cpRaw = m.current_page ?? m.currentPage ?? payload?.current_page ?? payload?.currentPage ?? params.page ?? 1;
      let lpRaw = m.last_page ?? m.lastPage ?? payload?.last_page ?? payload?.lastPage;

      const perNum = Number(perRaw) > 0 ? Number(perRaw) : pagination.perPage;
      const totalNum = totalRaw != null ? Number(totalRaw) : items.length;
      const cpNum = Number(cpRaw) > 0 ? Number(cpRaw) : 1;
      if (lpRaw == null) {
        lpRaw = Math.max(1, Math.ceil(totalNum / perNum));
      }
      const lpNum = Number(lpRaw) > 0 ? Number(lpRaw) : 1;

      setPagination({ page: cpNum, perPage: perNum, total: totalNum, lastPage: lpNum });
    } catch (e) {
      console.error('Failed to load contributors', e);
      setError(e?.response?.data?.message || 'Failed to load members');
    } finally { setLoading(false); }
  };

  // Watch for query param changes (e.g., navigation between tenants)
  useEffect(() => {
    const currentQueryTenant = qp.get('tenant_id') || null;
    if (currentQueryTenant && currentQueryTenant !== tenantId) {
      setTenantId(currentQueryTenant);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Resolve tenant from user profile only if not already set by query param
  useEffect(() => { (async () => {
    if (tenantId) return; // already have a tenant from query param
    try {
      const me = await fetchMe({ maxAgeMs: 60 * 1000 });
      const tid = me?.tenant_id || me?.tenant?.id || me?.tenants?.[0]?.id || null;
      setTenantId(tid);
    } catch { setError('Unable to resolve tenant context'); }
  })(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Fetch contributors whenever tenantId becomes available / changes
  useEffect(() => {
    if (tenantId) fetchMembers(tenantId, buildParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const reload = () => { if (tenantId) { try { invalidateHttpCache(`/org/${tenantId}/users`); } catch {} fetchMembers(tenantId, buildParams()); } };

  const goPage = (p) => {
    setPagination((prev) => ({ ...prev, page: p }));
    if (tenantId) fetchMembers(tenantId, buildParams({ page: p }));
  };

  // Enhanced sort handler: first click preference based on data type (mirrors adminUsers)
  // Numeric/date columns default to desc, text columns to asc
  const handleSortChange = (colId) => {
    if (!colId || !tenantId) return;
    let nextDir;
    if (sort.id !== colId) {
      // heuristic: id / *_at treated as numeric/date => default desc else asc
      if (colId === 'id' || /_at$/.test(colId)) nextDir = 'desc'; else nextDir = 'asc';
    } else {
      nextDir = sort.dir === 'asc' ? 'desc' : 'asc';
    }
    const next = { id: colId, dir: nextDir };
    setSort(next);
    fetchMembers(tenantId, buildParams({ page: 1, sort_by: next.id, sort_dir: next.dir }));
  };

  // Open / Edit
  const openCreate = () => { setMode('create'); setEditingId(null); setInitial(emptyContributor); setOpen(true); };
  const openEdit = useCallback(async (row) => {
    if (!tenantId) {
      Swal.fire('Tenant not ready', 'Please wait a moment and try again.', 'info');
      return;
    }
    setSaving(true);
    try {
      const res = unwrap(await api.get(`/org/${tenantId}/users/${row.id}`));
      const u = res?.data ?? res;
      
      // Extract occupation, handling potential nested structures
      const occupation = u.occupation || u.profile?.occupation || '';
      const occupationOther = u.occupation_other || u.profile?.occupation_other || '';
      
      setMode('edit');
      setEditingId(u.id);
      setInitial({ 
        name: u.name || '', 
        email: u.email || '', 
        role: FIXED_ROLE,
        occupation: occupation,
        occupation_other: occupationOther
      });
      setOpen(true);
    } catch (e) {
      Swal.fire('Failed to load contributor', e?.response?.data?.message || '', 'error');
    } finally {
      setSaving(false);
    }
  }, [tenantId]);
  const closeModal = () => { 
    if (saving) return; 
    setOpen(false); 
    // Delay state reset to avoid flashing password fields during modal close animation
    setTimeout(() => {
      setInitial(emptyContributor); 
      setEditingId(null); 
      setMode('create');
    }, 250);
  };

  // Submit
  const submitForm = async (payload) => {
    if (!tenantId) return;
    
    // Validate all fields
    const nameError = validateFullName(payload.name);
    const emailError = validateEmail(payload.email);
    let passwordError = null;
    
    if (mode === 'create') {
      passwordError = validatePassword(payload.password);
    }
    
    // Show validation errors
    if (nameError) {
      Swal.fire('Invalid Name', nameError, 'error');
      return;
    }
    if (emailError) {
      Swal.fire('Invalid Email', emailError, 'error');
      return;
    }
    if (passwordError) {
      Swal.fire('Invalid Password', passwordError, 'error');
      return;
    }
    
    // Check password confirmation match
    if (mode === 'create' && payload.password !== payload.password_confirmation) {
      Swal.fire('Password Mismatch', 'Passwords do not match.', 'error');
      return;
    }
    
    const verb = mode === 'edit' ? 'Update' : 'Create';
    const body = { name: payload.name, email: payload.email };
    if (mode === 'create' && payload.password) {
      body.password = payload.password;
      if (payload.password_confirmation) body.password_confirmation = payload.password_confirmation;
    }
    // Include occupation
    if (payload.occupation) {
      body.occupation = payload.occupation;
      if (payload.occupation === "other" && payload.occupation_other) {
        body.occupation_other = payload.occupation_other;
      }
    }

    const { isConfirmed } = await Swal.fire({ title: `${verb} contributor?`, text: payload.email, icon:'question', showCancelButton:true, confirmButtonText: verb, confirmButtonColor:'#2563eb' });
    if (!isConfirmed) return;
    setSaving(true);
    try {
      if (mode === 'edit' && editingId) { await api.put(`/org/${tenantId}/users/${editingId}`, body); toast('Contributor updated'); }
      else { await api.post(`/org/${tenantId}/users`, body); toast('Contributor created'); }
      closeModal(); reload();
      try { invalidateHttpCache(`/org/${tenantId}/users`); } catch {}
    } catch (e) {
      console.error('Save failed', e);
      const detail = e?.response?.data?.message || Object.values(e?.response?.data?.errors || {})?.flat()?.join(', ') || '';
      Swal.fire('Save failed', detail, 'error');
    } finally { setSaving(false); }
  };

  // Remove from organization
  const deleteContributor = useCallback(async (row) => {
    if (!tenantId) {
      Swal.fire('Tenant not ready', 'Please wait a moment and try again.', 'info');
      return;
    }
    const { isConfirmed } = await Swal.fire({ 
      title:'Remove from organization?', 
      html:`<p>Remove <strong>${row.email}</strong> from this organization?</p><p style="font-size: 0.9em; color: #64748b; margin-top: 8px;">Their account will be preserved along with all water quality records and feedback they created. They will be demoted to a public user.</p>`, 
      icon:'warning', 
      showCancelButton:true, 
      confirmButtonText:'Remove from Org', 
      confirmButtonColor:'#dc2626' 
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/org/${tenantId}/users/${row.id}`);
      toast('User removed from organization');
      try { invalidateHttpCache(`/org/${tenantId}/users`); } catch {}
      reload();
    } catch(e) {
      console.error('Remove failed', e);
      Swal.fire('Remove failed', e?.response?.data?.message || '', 'error');
    }
  }, [tenantId]);

  // Actions (same style as adminUsers)
  const actions = useMemo(() => [
    { label:'Edit', title:'Edit', type:'edit', icon:<FiEdit />, onClick:(raw)=>openEdit(raw) },
    { label:'Remove from Org', title:'Remove from Organization', type:'delete', icon:<FiTrash />, onClick:(raw)=>deleteContributor(raw) },
  ], [openEdit, deleteContributor]);

  // Normalized rows (for TableLayout)
  const normalized = useMemo(() => normalizeMembers(rows), [rows]);

  // Debounce search input and trigger server-side fetch (mirrors adminUsers)
  const debounceRef = useRef(null);
  useEffect(() => {
    if (!tenantId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMembers(tenantId, buildParams({ page: 1 }));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tenantId]);

  // Column picker adapter
  const columnPickerAdapter = {
    columns: baseColumns.map(c => ({ id: c.id, header: c.header })),
    visibleMap,
    onVisibleChange: map => setVisibleMap(map),
  };

  // Responsive modal width across breakpoints
  const modalWidth = (() => {
    if (windowW <= 480) return '94vw';        // Mobile S
    if (windowW <= 640) return '92vw';        // Mobile M/L
    if (windowW <= 768) return 560;           // Tablet portrait
    if (windowW <= 1024) return 620;          // Tablet landscape / small laptop
    if (windowW <= 1280) return 660;          // Laptop
    if (windowW <= 1536) return 700;          // Laptop L
    if (windowW <= 1920) return 740;          // 1080p
    return 780;                               // 4K & ultra-wide default cap
  })();

  const isMobileStack = windowW <= 640; // Mobile S/M/L threshold for vertical stacking

  return (
    <div style={{ padding: 16 }}>
      <DashboardHeader
        icon={<FiUsers />}
        title="Members"
        description="View and manage all organization members (admins & contributors)."
      />

      <div className="card" style={{ padding:12, borderRadius:12, marginBottom:12 }}>
        <TableToolbar
          tableId={TABLE_ID}
          search={{ value: q, onChange: (val) => setQ(val), placeholder: 'Search Members...' }}
          filters={[]}
          columnPicker={columnPickerAdapter}
          onRefresh={reload}
          onAdd={openCreate}
        />
        {error && <div className="lv-error" style={{ marginTop:8, color:'#b91c1c' }}>{error}</div>}
      </div>

      <div className="card" style={{ padding:12, borderRadius:12 }}>
        <TableLayout
          tableId={TABLE_ID}
          columns={visibleColumns}
          data={normalized}
          pageSize={perPage}
          loading={loading}
          actions={actions}
          resetSignal={0}
          columnPicker={false}
          hidePager={false}
          serverSide={true}
          pagination={{ page: pagination.page, totalPages: pagination.lastPage }}
          onPageChange={goPage}
          sort={sort}
          onSortChange={handleSortChange}
        />
      </div>

      <Modal
        open={open}
        onClose={closeModal}
        title={mode === 'edit' ? 'Edit Contributor' : 'Create Contributor'}
        ariaLabel="Contributor Form"
        width={modalWidth}
        bodyClassName="modern-scrollbar"
        footer={<div className="lv-modal-actions"><button type="button" className="pill-btn ghost" onClick={closeModal} disabled={saving}>Cancel</button><button type="submit" form="org-contributor-form" className="pill-btn primary" disabled={saving}>{saving ? 'Saving…' : (mode==='edit' ? 'Update Contributor' : 'Create Contributor')}</button></div>}
      >
        <form
          id="org-contributor-form"
          onSubmit={(e)=>{ e.preventDefault(); submitForm(initial); }}
          style={{
            display:'grid',
            gridTemplateColumns: isMobileStack ? '1fr' : '1fr 1fr',
            gap: isMobileStack ? 16 : 20,
            alignItems:'start'
          }}
        >
          <label className="lv-field" style={{ gridColumn: isMobileStack ? '1/-1' : '1/2' }}>
            <span>Name *</span>
            <input 
              required 
              value={initial.name} 
              onChange={(e)=>setInitial(i=>({...i,name:e.target.value}))} 
              maxLength={50}
            />
            {initial.name.length > 0 && !validFullName && (
              <div className="auth-error" role="alert" style={{ marginTop: 4, fontSize: '0.875rem', color: '#dc2626' }}>
                {validateFullName(initial.name)}
              </div>
            )}
          </label>
          <label className="lv-field" style={{ gridColumn: isMobileStack ? '1/-1' : '2/3' }}>
            <span>Email *</span>
            <input 
              required 
              type="email" 
              value={initial.email} 
              onChange={(e)=>setInitial(i=>({...i,email:e.target.value}))} 
              maxLength={254}
            />
            {initial.email.length > 0 && !validEmail && (
              <div className="auth-error" role="alert" style={{ marginTop: 4, fontSize: '0.875rem', color: '#dc2626' }}>
                {validateEmail(initial.email)}
              </div>
            )}
          </label>
          {mode === 'create' && (
            <>
              <label className="lv-field" style={{ gridColumn: isMobileStack ? '1/-1' : '1/2' }}>
                <span>Password *</span>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPwd.password ? "text" : "password"} 
                    required
                    value={initial.password||''} 
                    onChange={(e)=>setInitial(i=>({...i,password:e.target.value}))} 
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
              <label className="lv-field" style={{ gridColumn: isMobileStack ? '1/-1' : '2/3' }}>
                <span>Confirm Password *</span>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPwd.confirm ? "text" : "password"} 
                    required
                    value={initial.password_confirmation||''} 
                    onChange={(e)=>setInitial(i=>({...i,password_confirmation:e.target.value}))} 
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
                {!passwordsMatch && (initial.password_confirmation?.length || 0) > 0 && (initial.password?.length || 0) > 0 && (
                  <div className="auth-error" role="alert" style={{ marginTop: 4, fontSize: '0.875rem', color: '#dc2626' }}>
                    Passwords do not match.
                  </div>
                )}
              </label>

              {/* Password strength & criteria */}
              <div className="lv-field" style={{ gridColumn: '1 / -1' }}>
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

          <label className="lv-field" style={{ gridColumn: '1/-1' }}>
            <span>Occupation</span>
            <select
              value={initial.occupation || ""}
              onChange={(e)=>setInitial(i=>({...i,occupation:e.target.value}))}
              disabled
              title="Occupation cannot be edited"
              onClick={(e) => { e.preventDefault(); alert('Occupation cannot be edited'); }}
            >
              <option value="" disabled>Select occupation</option>
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

          {initial.occupation === "other" && (
            <label className="lv-field" style={{ gridColumn: '1/-1' }}>
              <span>Specified Occupation</span>
              <input
                type="text"
                placeholder="Enter your occupation"
                value={initial.occupation_other || ""}
                onChange={(e)=>setInitial(i=>({...i,occupation_other:e.target.value}))}
                disabled
                title="Occupation cannot be edited"
                onClick={(e) => { e.preventDefault(); alert('Occupation cannot be edited'); }}
              />
            </label>
          )}
        </form>
      </Modal>
    </div>
  );
}
