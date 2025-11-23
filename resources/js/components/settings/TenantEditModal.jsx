import React, { useEffect, useState } from 'react';
import Modal from '../Modal';
import api from '../../lib/api';
import Swal from 'sweetalert2';
import { getCurrentUser } from '../../lib/authState';
import { TYPE_OPTIONS } from '../OrganizationForm';

// Modal for org_admin to edit their own tenant's details.
// Uses org-scoped endpoint: PATCH /org/{tenantId}/tenant
export default function TenantEditModal({ open, onClose, onSaved }) {
  const user = getCurrentUser();
  const tenantObj = user?.tenant && typeof user.tenant === 'object' ? user.tenant : null;
  const tenantId = user?.tenant_id || tenantObj?.id || (Array.isArray(user?.tenants) ? user.tenants[0]?.id : null);

  const [form, setForm] = useState({
    name: tenantObj?.name || user?.tenant_name || (typeof user?.tenant === 'string' ? user.tenant : '') || '',
    type: tenantObj?.type || '',
    contact_email: tenantObj?.contact_email || '',
    phone: tenantObj?.phone || '',
    address: tenantObj?.address || '',
  });
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  // On open, attempt to fetch fresh tenant details (org-scoped endpoint, fallback silently if not available)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!open || !tenantId) return;
      // Prime with existing user object immediately
      setForm(f => ({
        ...f,
        name: tenantObj?.name || user?.tenant_name || (typeof user?.tenant === 'string' ? user.tenant : '') || '',
        type: tenantObj?.type || '',
        contact_email: tenantObj?.contact_email || '',
        phone: tenantObj?.phone || '',
        address: tenantObj?.address || '',
      }));
      setFetching(true);
      try {
        // Try org-scoped endpoint first (now implemented for GET)
        let res = null;
        try { res = await api.get(`/org/${tenantId}/tenant`); } catch (e) {
          // Fallback to admin endpoint if superadmin context; ignore if forbidden.
          try { res = await api.get(`/admin/tenants/${tenantId}`); } catch { /* ignore */ }
        }
        const raw = res?.data?.data ?? res?.data ?? res;
        if (raw && typeof raw === 'object') {
          if (cancelled) return;
          setForm({
            name: raw.name || '',
            type: raw.type || '',
            contact_email: raw.contact_email || '',
            phone: raw.phone || '',
            address: raw.address || '',
          });
        }
      } catch { /* ignore network / permission errors */ } finally {
        if (!cancelled) setFetching(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenantId]);

  const handleChange = (key) => (e) => {
    const v = (e && e.target) ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm(s => ({ ...s, [key]: v }));
  };

  if (!tenantId) {
    return <Modal open={open} onClose={onClose} title="Organization" width={640}><p>Unable to resolve tenant id.</p></Modal>;
  }

  const disabled = !form.name?.trim();

  const submit = async (e) => {
    e?.preventDefault?.();
    if (disabled) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type || null,
        contact_email: form.contact_email || null,
        phone: form.phone || null,
        address: form.address || null,
      };
      // Reuse patch endpoint (assumed to accept extended fields)
      const res = await api.patch(`/org/${tenantId}/tenant`, payload);
      const updated = res?.data || res;
      Swal.fire({ toast:true, position:'top-end', timer:1700, showConfirmButton:false, icon:'success', title:'Organization updated' });
      // Build next user object
      const nextUser = { ...user };
      if (nextUser.tenant && typeof nextUser.tenant === 'object') {
        nextUser.tenant = { ...nextUser.tenant, ...payload };
      } else if (nextUser.tenant_name) {
        nextUser.tenant_name = payload.name;
      } else if (typeof nextUser.tenant === 'string') {
        nextUser.tenant = payload.name;
      }
      window.dispatchEvent(new CustomEvent('lv-user-update', { detail: nextUser }));
      onSaved?.(updated, payload, nextUser);
      onClose?.();
    } catch (e) {
      console.error('Tenant update failed', e);
      const msg = e?.response?.data?.message || (e?.response?.status === 403 ? 'You do not have permission to edit organization.' : 'Unable to update organization');
      Swal.fire('Update failed', msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Organization" width={660} ariaLabel="Edit Organization">
      <form onSubmit={submit} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, opacity: fetching ? 0.85 : 1 }}>
        <label className="lv-field" style={{ gridColumn:'1/2' }}>
          <span>Name*</span>
          <input type="text" value={form.name} onChange={handleChange('name')} maxLength={255} required />
        </label>
        <label className="lv-field" style={{ gridColumn:'2/3' }}>
          <span>Type</span>
          <select value={form.type || ''} onChange={handleChange('type')}>
            <option value="">— Select —</option>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="lv-field" style={{ gridColumn:'1/2' }}>
          <span>Contact Email</span>
          <input type="email" value={form.contact_email || ''} onChange={handleChange('contact_email')} />
        </label>
        <label className="lv-field" style={{ gridColumn:'2/3' }}>
          <span>Phone</span>
          <input type="text" value={form.phone || ''} onChange={handleChange('phone')} />
        </label>
        <label className="lv-field" style={{ gridColumn:'1/3' }}>
          <span>Address</span>
          <input type="text" value={form.address || ''} onChange={handleChange('address')} />
        </label>
        {fetching && (
          <div style={{ gridColumn:'1/3', fontSize:12, color:'#555' }}>Fetching latest organization details…</div>
        )}
        <div style={{ gridColumn:'1/3', display:'flex', justifyContent:'flex-end', gap:8, marginTop:4 }}>
          <button type="button" className="pill-btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="pill-btn primary" disabled={saving || disabled}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
