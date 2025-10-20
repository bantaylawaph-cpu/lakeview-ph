import { useEffect, useState } from 'react';
import { apiPublic, buildQuery } from '../../../lib/api';

// Fetch sample events for a lake with optional organization and custom date range.
// Does not anchor by latest; callers can use useAnchoredTimeRange for that behavior.
export default function useSampleEvents(lakeId, organizationId, timeRange = 'all', dateFrom = '', dateTo = '') {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!lakeId) { if (!aborted) setEvents([]); return; }
      setLoading(true);
      try {
        const lim = 5000;
        // Only apply server-side range for custom; anchored ranges are handled by the caller
        const fromEff = (timeRange === 'custom') ? (dateFrom || undefined) : undefined;
        const toEff = (timeRange === 'custom') ? (dateTo || undefined) : undefined;
        const qs = buildQuery({ lake_id: lakeId, organization_id: organizationId || undefined, sampled_from: fromEff, sampled_to: toEff, limit: lim });
        const res = await apiPublic(`/public/sample-events${qs}`);
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!aborted) setEvents(rows);
      } catch (e) {
        if (!aborted) setEvents([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [lakeId, organizationId, timeRange, dateFrom, dateTo]);

  return { events, loading };
}
