import { useEffect, useState } from 'react';
import { apiPublic } from '../../../lib/api';

// Fetch available depths for given context (supports one-sample and lake-vs-lake two-sample)
export default function useAvailableDepths({
  paramCode,
  lakeId,
  compareValue,
  yearFrom,
  yearTo,
  organizationId,
  stationId,
  inferredTest,
}) {
  const [availableDepths, setAvailableDepths] = useState([]);

  useEffect(() => {
    let abort = false;
    (async () => {
      const isTwoLake = inferredTest === 'two-sample' && compareValue && String(compareValue).startsWith('lake:');
      const isCustom = String(lakeId) === 'custom';
      if (!paramCode) { if (!abort) setAvailableDepths([]); return; }
      // For custom primary vs lake, fetch depths based on the comparison lake only
      if (isCustom && isTwoLake) {
        try {
          const otherLakeId = Number(String(compareValue).split(':')[1]);
          const params = new URLSearchParams({ parameter_code: paramCode, lake_id: String(otherLakeId) });
          if (yearFrom) params.append('date_from', `${yearFrom}-01-01`);
          if (yearTo) params.append('date_to', `${yearTo}-12-31`);
          if (organizationId) params.append('organization_id', organizationId);
          // stationId pertains to primary (custom) so ignore
          const res = await apiPublic(`/stats/depths?${params.toString()}`);
          if (abort) return;
          const depths = Array.isArray(res?.depths) ? res.depths : (Array.isArray(res?.data?.depths) ? res.data.depths : []);
          setAvailableDepths(depths);
        } catch {
          if (!abort) setAvailableDepths([]);
        }
        return;
      }

      if (!lakeId || (inferredTest === 'two-sample' && !isTwoLake)) { if (!abort) setAvailableDepths([]); return; }
      try {
        const params = new URLSearchParams({ parameter_code: paramCode });
        if (isTwoLake) {
          const otherLakeId = Number(String(compareValue).split(':')[1]);
          params.append('lake_ids[]', String(lakeId));
          params.append('lake_ids[]', String(otherLakeId));
        } else {
          params.append('lake_id', String(lakeId));
        }
        if (yearFrom) params.append('date_from', `${yearFrom}-01-01`);
        if (yearTo) params.append('date_to', `${yearTo}-12-31`);
        if (organizationId) params.append('organization_id', organizationId);
        if (stationId && stationId !== 'all') params.append('station_id', stationId);
        const res = await apiPublic(`/stats/depths?${params.toString()}`);
        if (abort) return;
        const depths = Array.isArray(res?.depths) ? res.depths : (Array.isArray(res?.data?.depths) ? res.data.depths : []);
        setAvailableDepths(depths);
      } catch {
        if (!abort) setAvailableDepths([]);
      }
    })();
    return () => { abort = true; };
  }, [paramCode, lakeId, compareValue, yearFrom, yearTo, organizationId, stationId, inferredTest]);

  return availableDepths;
}
