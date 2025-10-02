import { useState, useCallback } from 'react';
import api from '../../lib/api';
import { setCurrentUser, getCurrentUser } from '../../lib/authState';
import { alertSuccess, alertError } from '../../utils/alerts';

export default function useUpdateSelf() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = useCallback(async (changes) => {
    setError(''); setSuccess('');
    if (!changes || Object.keys(changes).length === 0) { setSuccess('No changes to update.'); return { updated: false }; }
    setLoading(true);
    try {
      const res = await api.patch('/user/settings', changes);
      const updatedUser = res?.data || res;
      if (updatedUser?.id) {
        setCurrentUser(updatedUser);
        // emit event for listeners
        try { window.dispatchEvent(new CustomEvent('lv-user-update', { detail: updatedUser })); } catch {}
      }
      if (res?.updated) setSuccess('Settings updated successfully.'); else setSuccess('No changes were applied.');
      alertSuccess('Saved', 'Your settings have been updated.');
      return { updated: !!res?.updated, user: updatedUser };
    } catch (e) {
      let msg = 'Update failed.';
      try {
        const j = JSON.parse(e.message || '{}');
        if (j?.errors) {
          const first = Object.values(j.errors).flat()[0];
          if (first) msg = first;
        } else if (j?.message) msg = j.message;
      } catch {}
      setError(msg);
      alertError('Error', msg);
      return { error: msg };
    } finally { setLoading(false); }
  }, []);

  return { update, loading, error, success, user: getCurrentUser(), resetStatus: () => { setError(''); setSuccess(''); } };
}
