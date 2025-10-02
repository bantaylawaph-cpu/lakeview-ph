import React, { useEffect, useState, useCallback } from 'react';
import { getCurrentUser } from '../../lib/authState';
import useSettingsMode from './useSettingsMode';
import useUpdateSelf from './useUpdateSelf';

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
  const [localError, setLocalError] = useState('');
  const { mode, showSection, canEdit } = useSettingsMode({ user, context });
  const { update, loading, error, success, resetStatus } = useUpdateSelf();

  useEffect(() => {
    function handleUpdate(e) { setUser(e.detail); setName(e.detail?.name || ''); }
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
    onUpdated?.(res?.user);
  }, [password,password2,currentPassword,name,user,canEdit,update,onUpdated,showPasswordSection]);

  if (!user) return <div className="lv-settings-box"><p>You must be logged in to manage settings.</p></div>;

  const showTenant = showSection('tenant') && (user.tenant || user.tenant_id);
  const showPassword = showSection('password');

  // Align styles with FeedbackModal
  const labelStyle = { color: '#fff' };
  const inputStyle = { color: '#fff', background: 'transparent', border: '1px solid rgba(255,255,255,0.18)' };

  return (
    <div className="lv-modern-settings" data-mode={mode}>
      <div className="liquid-glass" data-mode="single" style={{ paddingTop: 0 }}>
        <div className="lv-settings-grid">
          <div className="insight-card" style={{ width: '100%' }}>
            <h3 style={{ marginTop: 0, color: '#fff' }}>Account Settings</h3>
            <div className="settings-subtext" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Manage your account details and security preferences.</div>
            <form onSubmit={handleSubmit} noValidate>
              <fieldset disabled={loading} style={{ border: 'none', padding: 0, margin: 0 }}>
                <div className={`lv-settings-grid ${showPassword ? 'two-col' : ''}`}>
                  <div className="lv-settings-panel">
                    <h3 style={{ color: '#fff' }}>Profile</h3>
                    <div className="lv-field-row">
                      <label style={labelStyle}>Name</label>
                      <input type="text" value={name} onChange={e=>setName(e.target.value)} maxLength={255} disabled={!canEdit('name')} style={inputStyle} />
                    </div>
                    <div className="lv-field-row">
                      <label style={labelStyle}>Email</label>
                      <input type="email" value={user.email} disabled readOnly style={inputStyle} />
                    </div>
                    {showTenant && (
                      <div className="lv-field-row">
                        <label style={labelStyle}>Tenant</label>
                        <input type="text" value={user.tenant || `Tenant #${user.tenant_id}`} disabled readOnly style={inputStyle} />
                      </div>
                    )}
                    {success && <div className="lv-status-success" role="status">{success}</div>}
                    {error && <div className="lv-status-error" role="alert">{error}</div>}
                    {localError && <div className="lv-status-error" role="alert">{localError}</div>}
                  </div>
                  {showPassword && (
                    <div className="lv-settings-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#fff' }}>Password</h3>
                        <button type="button" className="password-collapse-toggle" onClick={() => setShowPasswordSection(v=>!v)}>
                          {showPasswordSection ? 'Hide' : 'Change'}
                        </button>
                      </div>
                      {showPasswordSection && (
                        <div className="password-section">
                          <div className="lv-field-row">
                            <label style={labelStyle}>Current Password</label>
                            <input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="Enter current password" autoComplete="current-password" disabled={!canEdit('password')} style={inputStyle} />
                          </div>
                          <div className="lv-field-row">
                            <label style={labelStyle}>New Password</label>
                            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="(leave blank to keep)" autoComplete="new-password" disabled={!canEdit('password')} style={inputStyle} />
                          </div>
                          <div className="lv-field-row">
                            <label style={labelStyle}>Confirm New Password</label>
                            <input type="password" value={password2} onChange={e=>setPassword2(e.target.value)} autoComplete="new-password" disabled={!canEdit('password')} style={inputStyle} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Footer styled like Modal.footer */}
                <div className="lv-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="pill-btn primary" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
