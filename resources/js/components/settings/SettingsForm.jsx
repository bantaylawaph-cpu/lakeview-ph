import React, { useEffect, useState, useCallback } from 'react';
import { getCurrentUser } from '../../lib/authState';
import useSettingsMode from './useSettingsMode';
import useUpdateSelf from './useUpdateSelf';
import api from '../../lib/api';
import Swal from 'sweetalert2';
import TenantEditModal from './TenantEditModal';

/**
 * Reusable Settings form allowing user to update name & password.
 * Props: showTenant (boolean) to display tenant info if available.
 */
export default function SettingsForm({ context = 'public', onUpdated }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  // Tenant manage modal (org_admin only)
  const [tenantName, setTenantName] = useState(() => (user?.tenant?.name || user?.tenant_name || user?.tenant || ''));
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [localError, setLocalError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { mode, showSection, canEdit } = useSettingsMode({ user, context });
  const { update, loading, error, success, resetStatus } = useUpdateSelf();

  useEffect(() => {
  function handleUpdate(e) { setUser(e.detail); setName(e.detail?.name || ''); setTenantName(e.detail?.tenant?.name || e.detail?.tenant_name || e.detail?.tenant || ''); }
    window.addEventListener('lv-user-update', handleUpdate);
    return () => window.removeEventListener('lv-user-update', handleUpdate);
  }, []);

  function resetPasswordFields() {
    setCurrentPassword('');
    setPassword('');
    setPassword2('');
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    resetStatus();
    setLocalError('');
    // clear panel-specific messages
    setProfileSuccess(''); setProfileError(''); setPasswordSuccess(''); setPasswordError('');
    if (showPasswordSection && (password || password2 || currentPassword)) {
      if (password !== password2) { setLocalError('Passwords do not match.'); return; }
      if (!currentPassword) { setLocalError('Current password is required.'); return; }
    }
    const payload = {};
    if (name && name !== user?.name && canEdit('name')) payload.name = name;
    if (showPasswordSection && password && canEdit('password')) {
      if (password !== password2) { return; }
      if (!currentPassword) { return; }
      payload.password = password;
      payload.password_confirmation = password2;
      payload.current_password = currentPassword;
    }
    const res = await update(payload);
    if (res?.user) { setUser(res.user); setName(res.user.name); }
    if (payload.password) resetPasswordFields();
    // If update returned an error, route it to the proper panel
    if (res?.error) {
      // Route error to relevant panels
      if (payload.password) setPasswordError(res.error);
      if (payload.name) setProfileError(res.error);
      if (!payload.password && !payload.name) setProfileError(res.error);
    } else if (res?.updated) {
      // resolved ok — show panel-specific success for each affected field
      if (payload.password) setPasswordSuccess('Password updated successfully.');
      if (payload.name) setProfileSuccess('Settings updated successfully.');
      if (!payload.password && !payload.name) setProfileSuccess('Settings updated successfully.');
    }
    onUpdated?.(res?.user);
  }, [password,password2,currentPassword,name,user,canEdit,update,onUpdated,showPasswordSection]);

  if (!user) return <div className="lv-settings-box"><p>You must be logged in to manage settings.</p></div>;

  const showTenant = showSection('tenant') && (user.tenant || user.tenant_id);
  const canEditTenant = user?.role === 'org_admin';
  const showPassword = showSection('password');

  return (
    <div className="lv-modern-settings" data-mode={mode}>
      <div className="settings-header">
        <h2>Account Settings</h2>
        <div className="settings-subtext">Manage your account details and security preferences.</div>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={loading} style={{ border: 'none', padding: 0, margin: 0 }}>
          <div className={`lv-settings-grid ${showPassword ? 'two-col' : ''}`}>
            <div className="lv-settings-panel">
              <h3>Profile</h3>
              <div className="lv-field-row">
                <label>Name</label>
                <input type="text" value={name} onChange={e=>{ setName(e.target.value); setProfileSuccess(''); setProfileError(''); }} maxLength={255} disabled={!canEdit('name')} />
              </div>
              <div className="lv-field-row">
                <label>Email</label>
                <input type="email" value={user.email} disabled readOnly />
              </div>
              {showTenant && (
                <div className="lv-field-row">
                  <label>Organization</label>
                  <div style={{ display:'flex', gap:8, alignItems:'center', width:'100%' }}>
                    <input type="text" value={tenantName || `Tenant #${user.tenant_id}`} disabled readOnly style={{ flex:1 }} />
                    {canEditTenant && (
                      <button type="button" className="pill-btn ghost sm" onClick={()=>setOrgModalOpen(true)}>Manage</button>
                    )}
                  </div>
                </div>
              )}
              {profileSuccess && <div className="lv-status-success" role="status">{profileSuccess}</div>}
              {profileError && <div className="lv-status-error" role="alert">{profileError}</div>}
            </div>
            {showPassword && (
              <div className="lv-settings-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Password</h3>
                  <button type="button" className="password-collapse-toggle" onClick={() => setShowPasswordSection(v=>!v)}>
                    {showPasswordSection ? 'Hide' : 'Change'}
                  </button>
                </div>
                {showPasswordSection && (
                  <div className="password-section">
                    <div className="lv-field-row">
                      <label>Current Password</label>
                      <input type="password" value={currentPassword} onChange={e=>{ setCurrentPassword(e.target.value); setLocalError(''); setPasswordSuccess(''); setPasswordError(''); }} placeholder="Enter current password" autoComplete="current-password" disabled={!canEdit('password')} />
                    </div>
                    <div className="lv-field-row">
                      <label>New Password</label>
                      <input type="password" value={password} onChange={e=>{ setPassword(e.target.value); setLocalError(''); setPasswordSuccess(''); setPasswordError(''); }} placeholder="(leave blank to keep)" autoComplete="new-password" disabled={!canEdit('password')} />
                    </div>
                    <div className="lv-field-row">
                      <label>Confirm New Password</label>
                      <input type="password" value={password2} onChange={e=>{ setPassword2(e.target.value); setLocalError(''); setPasswordSuccess(''); setPasswordError(''); }} autoComplete="new-password" disabled={!canEdit('password')} />
                    </div>
                  </div>
                )}
                {passwordSuccess && <div className="lv-status-success" role="status">{passwordSuccess}</div>}
                {passwordError && <div className="lv-status-error" role="alert">{passwordError}</div>}
                {localError && <div className="lv-status-error" role="alert">{localError}</div>}
              </div>
            )}
          </div>
          <div className="settings-actions">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </fieldset>
      </form>
      {canEditTenant && (
        <TenantEditModal
          open={orgModalOpen}
          onClose={() => setOrgModalOpen(false)}
          onSaved={(updated, payload, nextUser) => {
            // Update local tenantName display
            setTenantName(payload?.name || nextUser?.tenant?.name || nextUser?.tenant_name || tenantName);
          }}
        />
      )}
    </div>
  );
}
