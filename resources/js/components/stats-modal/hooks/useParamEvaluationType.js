import { useEffect, useState } from 'react';
import { apiPublic } from '../../../lib/api';

// Resolves parameter evaluation type (min/max/range) from /stats/series given selections
export default function useParamEvaluationType({ enabled, lakeId, paramCode, appliedStandardId }) {
  const [evaluationType, setEvaluationType] = useState(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!enabled || !lakeId || !paramCode) { if (!abort) setEvaluationType(null); return; }
      try {
        const body = { parameter_code: paramCode, lake_id: Number(lakeId), applied_standard_id: appliedStandardId || undefined };
        const res = await apiPublic('/stats/series', { method: 'POST', body });
        if (!abort) setEvaluationType(res?.evaluation_type || null);
      } catch {
        if (!abort) setEvaluationType(null);
      }
    })();
    return () => { abort = true; };
  }, [enabled, lakeId, paramCode, appliedStandardId]);

  return evaluationType;
}
