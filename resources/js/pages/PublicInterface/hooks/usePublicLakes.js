import { useState, useCallback, useEffect } from 'react';
import { apiPublic, buildQuery } from '../../../lib/api';
import cache from '../../../lib/storageCache';

export function usePublicLakes(initialFilters = {}) {
  const [publicFC, setPublicFC] = useState(null);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [baseKey, setBaseKey] = useState(0);
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

  const cacheKeyFor = (filters) => {
    try { return `public:lakes-geo:${btoa(unescape(encodeURIComponent(JSON.stringify(filters || {}))))}`; }
    catch { return `public:lakes-geo:${JSON.stringify(filters || {})}`; }
  };

  const load = useCallback(async (filters = activeFilters) => {
    const qs = buildQuery(filters || {});
    try {
      // 1) Try cached value for instant paint
      const key = cacheKeyFor(filters || {});
      const cached = cache.get(key, { maxAgeMs: CACHE_TTL });
      if (cached && !publicFC) {
        setPublicFC(cached);
        setBaseKey(k => k + 1);
      }
      // 2) Network fetch to revalidate
      const fc = await apiPublic(`/public/lakes-geo${qs}`);
      if (fc?.type === 'FeatureCollection') {
        setPublicFC(fc);
        cache.set(key, fc, { ttlMs: CACHE_TTL });
      } else {
        setPublicFC({ type: 'FeatureCollection', features: [] });
      }
      setBaseKey(k => k + 1); // force GeoJSON remount
    } catch (e) {
      console.warn('[usePublicLakes] Failed to load lakes', e);
      setPublicFC({ type: 'FeatureCollection', features: [] });
    }
  }, [activeFilters, publicFC]);

  const applyFilters = useCallback(async (filters) => {
    setActiveFilters(filters || {});
    await load(filters || {});
  }, [load]);

  useEffect(() => { load(initialFilters); }, []); // initial load

  return { publicFC, activeFilters, applyFilters, reload: load, baseKey };
}
