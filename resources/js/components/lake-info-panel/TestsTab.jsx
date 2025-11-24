import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FiEye, FiMapPin } from 'react-icons/fi';
import { apiPublic, buildQuery } from '../../lib/api';
import cache from '../../lib/storageCache';
import { alertError } from '../../lib/alerts';
import PublicWQTestModal from '../modals/PublicWQTestModal';
import LoadingSpinner from '../LoadingSpinner';
import OrgSelect from '../stats-modal/ui/OrgSelect';
import StationSelect from '../stats-modal/ui/StationSelect';

export default function TestsTab({ lake, onJumpToStation }) {
  const lakeId = lake?.id ?? null;
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const initialLoadedRef = useRef(false);
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState("");
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState("");
  const [years, setYears] = useState([]);        // available years for this lake
  const [year, setYear] = useState("");         // selected single year (defaults to latest)
  const [allRows, setAllRows] = useState([]);    // unfiltered raw rows for current lake
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  // Reset first-load marker when lake changes
  useEffect(() => { initialLoadedRef.current = false; }, [lakeId]);

  // Fetch for the current lake (stale-while-revalidate). Filtering happens in a separate effect.
  useEffect(() => {
    if (!lakeId) { setAllRows([]); setTests([]); setOrgs([]); setStations([]); setYears([]); setInitialLoading(false); return; }
    let mounted = true;
    (async () => {
      if (!initialLoadedRef.current) setInitialLoading(true);
      setLoading(true);
      try {
        const qs = buildQuery({ lake_id: lakeId, limit: 500 });
        const key = `public:sample-events:lake:${lakeId}:limit:500`;
        const TTL = 5 * 60 * 1000; // 5 minutes

        const applyRows = (rows) => {
          if (!mounted) return;
          setAllRows(rows);
          // Derive orgs from all rows
          const uniqOrgs = new Map();
          rows.forEach((r) => {
            const oid = r.organization_id ?? r.organization?.id;
            const oname = r.organization_name ?? r.organization?.name;
            if (oid && oname && !uniqOrgs.has(String(oid))) uniqOrgs.set(String(oid), { id: oid, name: oname });
          });
          setOrgs(Array.from(uniqOrgs.values()));

          // Derive available years and default to latest if needed
          const yearSet = new Set();
          rows.forEach((r) => {
            if (!r?.sampled_at) return;
            const d = new Date(r.sampled_at); if (!isNaN(d)) yearSet.add(d.getFullYear());
          });
          const yearsArr = Array.from(yearSet).map(Number).sort((a,b) => b - a); // latest first
          setYears(yearsArr);
          if (yearsArr.length > 0) {
            const latest = yearsArr[0];
            if (!year || !yearsArr.includes(Number(year))) setYear(String(latest));
          } else {
            if (year) setYear("");
          }

          if (!initialLoadedRef.current) {
            initialLoadedRef.current = true;
            setInitialLoading(false);
          }
        };

        // Serve from cache immediately if available
        const cached = cache.get(key, { maxAgeMs: TTL });
        if (cached) applyRows(Array.isArray(cached) ? cached : []);

        // Always revalidate in background
        const res = await apiPublic(`/public/sample-events${qs}`);
        if (!mounted) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        cache.set(key, rows, { ttlMs: TTL });
        applyRows(rows);
      } catch (e) {
        console.error('[TestsTab] failed to load', e);
        await alertError('Failed', e?.message || 'Could not load tests');
        if (mounted) { setAllRows([]); setTests([]); }
      } finally {
        if (mounted) {
          setLoading(false);
          if (!initialLoadedRef.current) { initialLoadedRef.current = true; setInitialLoading(false); }
        }
      }
    })();
    return () => { mounted = false; };
  }, [lakeId]);

  // Derive filtered tests + stations and emit markers whenever filters or data change
  useEffect(() => {
    // Filter according to orgId, stationId and single year (if set)
    let filtered = (allRows || []).filter((r) => {
      if (orgId) {
        const oid = r.organization_id ?? r.organization?.id;
        if (!oid || String(oid) !== String(orgId)) return false;
      }
      if (stationId) {
        const sid = r.station?.id ?? null;
        if (!sid || String(sid) !== String(stationId)) return false;
      }
      if (year) {
        if (!r.sampled_at) return false;
        const d = new Date(r.sampled_at);
        if (isNaN(d)) return false;
        if (d.getFullYear() !== Number(year)) return false;
      }
      return true;
    });

    const uniqStations = new Map();
    filtered.forEach((r) => {
      const sid = r.station?.id ?? null;
      const sname = r.station?.name ?? r.station_name ?? null;
      if (sid && sname && !uniqStations.has(String(sid))) uniqStations.set(String(sid), { id: sid, name: sname });
    });
    const stationsArr = Array.from(uniqStations.values());
    setStations(stationsArr);
    if (stationId) {
      const exists = stationsArr.some((s) => String(s.id) === String(stationId));
      if (!exists) setStationId("");
    }

    setTests(filtered);

    // Emit markers for the current filtered set
    const markers = filtered
      .map((r) => {
        const lat = r.station?.latitude ?? r.station?.lat ?? r.latitude ?? r.lat ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[1] : null) : null);
        const lon = r.station?.longitude ?? r.station?.lon ?? r.longitude ?? r.lon ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[0] : null) : null);
        if (lat == null || lon == null) return null;
        return { lat: Number(lat), lon: Number(lon), label: (r.station?.name || null), stationId: r.station?.id, orgId: r.organization_id || r.organization?.id, lakeId: lakeId };
      })
      .filter(Boolean);
    try { window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } })); } catch {}
  }, [allRows, orgId, stationId, year, lakeId]);

  useEffect(() => {
    const onRequest = async () => {
      try {
        if (tests && tests.length) {
          const markers = tests
            .map((r) => {
              const lat = r.station?.latitude ?? r.station?.lat ?? r.latitude ?? r.lat ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[1] : null) : null);
              const lon = r.station?.longitude ?? r.station?.lon ?? r.longitude ?? r.lon ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[0] : null) : null);
              if (lat == null || lon == null) return null;
              return { lat: Number(lat), lon: Number(lon), label: (r.station?.name || null), stationId: r.station?.id, orgId: r.organization_id || r.organization?.id, lakeId: lakeId };
            })
            .filter(Boolean);
          try {
            window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } }));
          } catch {}
          return;
        }

      } catch (err) {
        console.warn('[TestsTab] failed to respond to marker request', err);
      }
    };
    window.addEventListener('lv-request-wq-markers', onRequest);
    return () => window.removeEventListener('lv-request-wq-markers', onRequest);
  }, [tests]);
  const extractCoords = (t) => {
    const lat = t.station?.latitude ?? t.station?.lat ?? t.latitude ?? t.lat ?? (t.point?.coordinates ? (Array.isArray(t.point.coordinates) ? t.point.coordinates[1] : null) : null);
    const lon = t.station?.longitude ?? t.station?.lon ?? t.longitude ?? t.lon ?? (t.point?.coordinates ? (Array.isArray(t.point.coordinates) ? t.point.coordinates[0] : null) : null);
    if (lat == null || lon == null) return null;
    return { lat: Number(lat), lon: Number(lon) };
  };

  const jumpTo = (t) => {
    const c = extractCoords(t);
    if (!c) return;
    if (typeof onJumpToStation === 'function') {
      onJumpToStation(c.lat, c.lon);
    } else {
      try { window.dispatchEvent(new CustomEvent('lv-jump-to-station', { detail: { lat: c.lat, lon: c.lon } })); } catch {}
    }
  };

  const viewDetails = (t) => {
    setViewRecord(t || null);
    setViewOpen(true);
  };

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner label={"Loading tests…"} color="#fff" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gap: 8 }}>
          <style>{`
.tests-filters-flex {
  display: flex;
  gap: 8px;
  align-items: end;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.tests-filters-flex .form-group { margin-right: 6px; }
.tests-filters-flex select,
.tests-filters-flex .form-group > select {
  padding: 4px 8px;
  padding-top: 4px;
  padding-bottom: 4px;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.12);
  background: #ffffff;
  color: #000000;
  font-size: 13px;
  box-sizing: border-box;
  height: auto;
}
.tests-filters-flex select option {
  color: #000000;
}
.tests-filters-flex select:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
  border-color: rgba(0,0,0,0.2);
}
@media (max-width: 639px) {
  .tests-filters-flex {
    flex-direction: column;
    align-items: stretch;
  }
  .tests-filters-flex .form-group { margin-right: 0; }
  .tests-filters-flex select { width: 100%; }
}
`}</style>
          <div className="tests-filters-flex">
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 11, marginBottom: 2, color: '#fff' }}>Dataset Source</label>
              <OrgSelect options={orgs} value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="All dataset sources" style={{ padding: '6px 8px', height: 'auto' }} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 11, marginBottom: 2, color: '#fff' }}>Station</label>
              <StationSelect options={stations} value={stationId} onChange={(e) => setStationId(e.target.value)} includeAllOption={true} allValue="" allLabel="All Stations" showPlaceholder={false} style={{ padding: '6px 8px', height: 'auto' }} />
            </div>
            <div className="form-group" style={{ minWidth: 0 }}>
              <label style={{ fontSize: 11, marginBottom: 2, color: '#fff' }}>Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} style={{ padding: '6px 8px' }}>
                {years.map((y) => (<option key={`y-${y}`} value={String(y)}>{y}{years[0] === y ? ' (latest)' : ''}</option>))}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#ddd' }}>Click on the Station markers to see their data.</div>
          {loading && (
            <div style={{ margin: '2px 0 8px 0' }}>
              <LoadingSpinner label="Loading tests…" color="#fff" />
            </div>
          )}
          {!loading && tests.length === 0 && <div className="insight-card"><em>No tests match your filters. Try a different dataset source, station, or year.</em></div>}
        {tests.map((t) => (
          <div className="insight-card" key={t.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{t.sampled_at ? new Date(t.sampled_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '–'}</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{t.station?.name || 'Station: –'}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{t.organization_name || t.organization?.name || 'Dataset Source'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="pill-btn liquid" type="button" onClick={() => viewDetails(t)} title="View test"><FiEye /></button>
                <button className="pill-btn liquid" type="button" onClick={() => jumpTo(t)} title="Jump to station"><FiMapPin /></button>
              </div>
            </div>
          </div>
        ))}
      {/* Modal */}
      <PublicWQTestModal open={viewOpen} record={viewRecord} onClose={() => setViewOpen(false)} />
    </div>
    </div>
  );
}

export function TestsTabModalHost({ open, record, onClose }) {
  return (
    <PublicWQTestModal open={open} record={record} onClose={onClose} />
  );
}
