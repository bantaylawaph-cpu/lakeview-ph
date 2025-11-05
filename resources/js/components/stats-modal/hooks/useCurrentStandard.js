import { useEffect, useState } from 'react';
import { apiPublic } from '../../../lib/api';

// Lightweight hook to retrieve the current water quality standard once.
// Returns { id, code, name } for the current standard, plus loading/error flags.
// Uses module-level cache to avoid repeat network calls across components.
let cachedCurrent = null;
let cacheError = null;
let cachePromise = null;

async function fetchCurrentStandardOnce() {
  if (cachedCurrent || cacheError) return { current: cachedCurrent, error: cacheError };
  if (!cachePromise) {
    cachePromise = (async () => {
      try {
        const res = await apiPublic('/options/wq-standards');
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const cur = Array.isArray(rows) && rows.length ? (rows.find(r => r.is_current) || rows[0]) : null;
        cachedCurrent = cur ? { id: cur.id, code: cur.code, name: cur.name || cur.code || '' } : null;
        return { current: cachedCurrent, error: null };
      } catch (e) {
        cacheError = e || new Error('Failed to load standards');
        return { current: null, error: cacheError };
      }
    })();
  }
  return cachePromise;
}

export default function useCurrentStandard() {
  const [state, setState] = useState({ current: cachedCurrent, loading: !cachedCurrent && !cacheError, error: cacheError });

  useEffect(() => {
    let mounted = true;
    (async () => {
      // If already cached, sync and bail
      if (cachedCurrent || cacheError) {
        if (mounted) setState({ current: cachedCurrent, loading: false, error: cacheError });
        return;
      }
      const { current, error } = await fetchCurrentStandardOnce();
      if (!mounted) return;
      setState({ current, loading: false, error });
    })();
    return () => { mounted = false; };
  }, []);

  return state; // { current: {id,code,name}|null, loading, error }
}
