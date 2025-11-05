import { useEffect, useState } from 'react';
import { apiPublic } from '../../../lib/api';

// Cache key: `${paramCode}|${standardId}|${classCode||''}`
const cache = new Map();

export async function fetchParamThresholds({ paramCode, appliedStandardId, classCode }) {
  const key = `${paramCode || ''}|${appliedStandardId || ''}|${classCode || ''}`;
  if (cache.has(key)) return cache.get(key);
  const body = { parameter_code: paramCode, applied_standard_id: appliedStandardId || undefined, class_code: classCode || undefined };
  try {
    const res = await apiPublic('/stats/thresholds', { method: 'POST', body });
    // Backend returns threshold_min/threshold_max; keep fallbacks for older shapes
    const min = res?.threshold_min ?? res?.min_value ?? res?.min ?? null;
    const max = res?.threshold_max ?? res?.max_value ?? res?.max ?? null;
    const code = res?.standard_code || res?.standard?.code || res?.standard || null;
    const out = { min: min != null ? Number(min) : null, max: max != null ? Number(max) : null, code: code || null };
    cache.set(key, out);
    return out;
  } catch (e) {
    const out = { min: null, max: null, code: null };
    cache.set(key, out);
    return out;
  }
}

export default function useParamThresholds({ paramCode, appliedStandardId, classCode }) {
  const [state, setState] = useState({ min: null, max: null, code: null, loading: !!paramCode && !!appliedStandardId, error: null });

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!paramCode || !appliedStandardId) { setState({ min: null, max: null, code: null, loading: false, error: null }); return; }
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const out = await fetchParamThresholds({ paramCode, appliedStandardId, classCode });
        if (abort) return;
        setState({ ...out, loading: false, error: null });
      } catch (e) {
        if (abort) return;
        setState({ min: null, max: null, code: null, loading: false, error: e });
      }
    })();
    return () => { abort = true; };
  }, [paramCode, appliedStandardId, classCode]);

  return state; // { min, max, code, loading, error }
}
