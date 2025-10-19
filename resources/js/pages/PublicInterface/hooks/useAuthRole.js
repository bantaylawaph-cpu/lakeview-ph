import { useState, useEffect, useCallback } from 'react';
import { api, getToken } from '../../../lib/api';
import { getCurrentUser, isStale, setCurrentUser } from '../../../lib/authState';

// Handles role derivation, user fetch, auth modal state.
export function useAuthRole() {
  const [userRole, setUserRole] = useState(null);
  const [authUser, setAuthUser] = useState(() => getCurrentUser());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const deriveRole = useCallback((u) => {
    if (!u) return null;
    return ['superadmin','org_admin','contributor'].includes(u.role) ? u.role : null;
  }, []);

  useEffect(() => {
    const refresh = async () => {
      if (!getToken()) { setUserRole(null); return; }
      const cached = getCurrentUser();
      setUserRole(deriveRole(cached));
      if (!cached || isStale()) {
        try {
          const res = await api('/auth/me');
          const u = res?.data || res;
          setCurrentUser(u, { silent: true });
            setUserRole(deriveRole(u));
            setAuthUser(u);
          try { window.dispatchEvent(new CustomEvent('lv-user-update', { detail: u })); } catch {}
        } catch { setUserRole(null); }
      }
    };
    refresh();
    const onUserUpdate = (e) => { const u = e.detail || getCurrentUser(); setUserRole(deriveRole(u)); setAuthUser(u); };
    const onAuthChange = () => {
      // Always close auth modal on login/logout or token changes to avoid OTP lingering
      try { setAuthOpen(false); } catch {}
      refresh();
    };
    window.addEventListener('lv-user-update', onUserUpdate);
    window.addEventListener('lv-auth-change', onAuthChange);
    return () => {
      window.removeEventListener('lv-user-update', onUserUpdate);
      window.removeEventListener('lv-auth-change', onAuthChange);
    };
  }, [deriveRole]);

  const openAuth = useCallback((mode='login') => { setAuthMode(mode); setAuthOpen(true); }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  return { userRole, authUser, authOpen, authMode, openAuth, closeAuth, setAuthMode };
}
