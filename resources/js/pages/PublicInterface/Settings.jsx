import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import SettingsForm from '../../components/settings/SettingsForm';
import { getCurrentUser, ensureUser, setCurrentUser } from '../../lib/authState';
import api from '../../lib/api';

/**
 * Route-level Settings page now behaves purely as a modal overlay.
 * It fetches the user (if not in cache); if unauthenticated it redirects home.
 * On close, it navigates back (or to '/') after allowing the close animation to play.
 */
export default function SettingsModalRoute() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [user, setUser] = useState(() => getCurrentUser());
  const [loading, setLoading] = useState(!user);
  const attemptedRef = useRef(false);

  // Fetch user if not present
  useEffect(() => {
    if (user || attemptedRef.current) return;
    attemptedRef.current = true;
    (async () => {
      try {
        const res = await ensureUser(() => api('/auth/me'));
        setUser(res);
      } catch {
        // Not logged in -> redirect out (no settings page for guests)
        navigate('/', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  // Sync on global user updates
  useEffect(() => {
    const sync = (e) => { setUser(e.detail); };
    window.addEventListener('lv-user-update', sync);
    return () => window.removeEventListener('lv-user-update', sync);
  }, []);

  function handleClose() {
    setOpen(false);
    // Navigate away after animation (keep small delay < animationDuration)
    setTimeout(() => {
      // Try to go back; if history stack shallow, fallback to root
      if (window.history.state && window.history.length > 1) navigate(-1);
      else navigate('/', { replace: true });
    }, 180);
  }

  // While loading user
  if (loading) {
    return (
      <Modal open={open} onClose={handleClose} title="Settings" width={640}>
        <p style={{ margin: 0 }}>Loading account…</p>
      </Modal>
    );
  }

  // If user still null (redirect already scheduled), render nothing
  if (!user) return null;

  const role = user.role;
  return (
    <Modal open={open} onClose={handleClose} title="Settings" width={640}>
      <SettingsForm
        showTenant={['org_admin','contributor'].includes(role)}
        onUpdated={(u) => { if (u) { setCurrentUser(u); setUser(u); } }}
      />
    </Modal>
  );
}
