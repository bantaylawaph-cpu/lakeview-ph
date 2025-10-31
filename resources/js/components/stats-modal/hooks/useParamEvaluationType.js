import { useEffect, useState } from 'react';
import { apiPublic } from '../../../lib/api';

// Resolves parameter evaluation type (min/max/range) from /stats/series given selections
export default function useParamEvaluationType({ enabled, lakeId, paramCode, appliedStandardId, classCodeOverride }) {
  const [evaluationType, setEvaluationType] = useState(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!enabled || !paramCode) { if (!abort) setEvaluationType(null); return; }
      try {
        // Special case: when lakeId === 'custom', we can't call /stats/series without a lake.
        // If classCodeOverride is provided, call the lightweight thresholds endpoint to infer evaluation_type.
        if (String(lakeId) === 'custom') {
          if (!classCodeOverride) { if (!abort) setEvaluationType(null); return; }
          const body = { parameter_code: paramCode, applied_standard_id: appliedStandardId || undefined, class_code: classCodeOverride };
          const res = await apiPublic('/stats/thresholds', { method: 'POST', body });
          if (!abort) setEvaluationType(res?.evaluation_type || null);
        } else {
          const body = { parameter_code: paramCode, lake_id: Number(lakeId), applied_standard_id: appliedStandardId || undefined };
          if (classCodeOverride) body.class_code = classCodeOverride;
          const res = await apiPublic('/stats/series', { method: 'POST', body });
          if (!abort) setEvaluationType(res?.evaluation_type || null);
        }
      } catch {
        if (!abort) setEvaluationType(null);
      }
    })();
    return () => { abort = true; };
  }, [enabled, lakeId, paramCode, appliedStandardId, classCodeOverride]);

  return evaluationType;
}
