import { useEffect, useState } from 'react';
import { apiPublic, buildQuery } from '../../../lib/api';
import cache from '../../../lib/storageCache';

// Fetch sample events for a lake with optional organization and custom date range.
// Does not anchor by latest; callers can use useAnchoredTimeRange for that behavior.
export default function useSampleEvents(lakeId, organizationId, timeRange = 'all', dateFrom = '', dateTo = '') {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!lakeId) { if (!aborted) setEvents([]); return; }

      // Build persistent cache key (per lake + org + range)
      const keyParts = [
        'events',
        String(lakeId || ''),
        String(organizationId || ''),
        String(timeRange || ''),
        String(dateFrom || ''),
        String(dateTo || ''),
      ];
      const cacheKey = keyParts.join(':');

      // Try to serve immediately from persistent cache
      try {
        const cached = cache.get(cacheKey);
        if (cached && Array.isArray(cached.events)) {
          setEvents(cached.events);
        }
      } catch {}

      setLoading(true);
      try {
        const lim = 5000;
        // Only apply server-side range for custom; anchored ranges are handled by the caller
        const fromEff = (timeRange === 'custom') ? (dateFrom || undefined) : undefined;
        const toEff = (timeRange === 'custom') ? (dateTo || undefined) : undefined;
        const qs = buildQuery({ lake_id: lakeId, organization_id: organizationId || undefined, sampled_from: fromEff, sampled_to: toEff, limit: lim });
        const res = await apiPublic(`/public/sample-events${qs}`);
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

        // Compute a simple fingerprint for invalidation: count + latest timestamp
        const latest = (() => {
          try {
            let maxTs = 0;
            for (const ev of rows) {
              const ts = ev?.sampled_at ? Date.parse(ev.sampled_at) : 0;
              if (Number.isFinite(ts) && ts > maxTs) maxTs = ts;
            }
            return maxTs ? new Date(maxTs).toISOString() : '';
          } catch { return ''; }
        })();
        const fp = `${rows.length}|${latest}`;

        try {
          const existing = cache.get(cacheKey);
          const existingFp = existing?.fingerprint || '';
          // Always set state from network; update cache only when changed or cache missing
          if (!aborted) setEvents(rows);
          if (!existing || existingFp !== fp) {
            cache.set(cacheKey, { events: rows, fingerprint: fp }, { ttlMs: 30 * 24 * 60 * 60 * 1000 }); // 30 days
          }
        } catch {
          if (!aborted) setEvents(rows);
        }
      } catch (e) {
        // On network error, keep whatever cached data we may have shown already
        if (!aborted) {
          try {
            const cached = cache.get(cacheKey);
            if (cached && Array.isArray(cached.events)) setEvents(cached.events);
            else setEvents([]);
          } catch { setEvents([]); }
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [lakeId, organizationId, timeRange, dateFrom, dateTo]);

  return { events, loading };
}
