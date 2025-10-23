import { useEffect, useState } from 'react';
import { apiPublic } from '../../../lib/api';

// Fetch stations for one-sample (lake vs class) when lake + org are set
export default function useStationsForLakeClass({ lakeId, organizationId, paramCode, yearFrom, yearTo, enabled }) {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    if (!enabled || !lakeId || !organizationId) { setStations([]); return; }
    let abort = false;
    (async () => {
      try {
        const params = new URLSearchParams({ lake_id: lakeId, organization_id: organizationId });
        if (yearFrom) params.append('date_from', `${yearFrom}-01-01`);
        if (yearTo) params.append('date_to', `${yearTo}-12-31`);
        if (paramCode) params.append('parameter_code', paramCode);
        const res = await apiPublic(`/stats/stations?${params}`);
        if (!abort) setStations(res.stations || []);
      } catch (e) {
        if (!abort) setStations([]);
      }
    })();
    return () => { abort = true; };
  }, [lakeId, organizationId, paramCode, yearFrom, yearTo, enabled]);

  return stations;
}
