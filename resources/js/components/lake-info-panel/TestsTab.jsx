import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FiEye, FiMapPin } from 'react-icons/fi';
import { apiPublic, buildQuery } from '../../lib/api';
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
  const [years, setYears] = useState([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  useEffect(() => {
    if (!lakeId) { setTests([]); setOrgs([]); setStations([]); setYears([]); setInitialLoading(false); return; }
    let mounted = true;
    (async () => {
      // mark first-load
      initialLoadedRef.current = false;
      setInitialLoading(true);
      setLoading(true);
      try {
        const qs = buildQuery({ lake_id: lakeId, limit: 500 });
        const res = await apiPublic(`/public/sample-events${qs}`);
        if (!mounted) return;
        let rows = Array.isArray(res?.data) ? res.data : [];

        const uniqOrgs = new Map();
        rows.forEach((r) => {
          const oid = r.organization_id ?? r.organization?.id;
          const oname = r.organization_name ?? r.organization?.name;
          if (oid && oname && !uniqOrgs.has(String(oid))) uniqOrgs.set(String(oid), { id: oid, name: oname });
        });
        setOrgs(Array.from(uniqOrgs.values()));

        let filtered = rows.filter((r) => {
          if (orgId) {
            const oid = r.organization_id ?? r.organization?.id;
            if (!oid || String(oid) !== String(orgId)) return false;
          }
          if (stationId) {
            const sid = r.station?.id ?? null;
            if (!sid || String(sid) !== String(stationId)) return false;
          }
          if (yearFrom || yearTo) {
            if (!r.sampled_at) return false;
            const d = new Date(r.sampled_at);
            if (isNaN(d)) return false;
            const y = d.getFullYear();
            if (yearFrom && y < Number(yearFrom)) return false;
            if (yearTo && y > Number(yearTo)) return false;
          }
          return true;
        });

        const uniqStations = new Map();
        const uniqYears = new Set();
        filtered.forEach((r) => {
          const sid = r.station?.id ?? null;
          const sname = r.station?.name ?? r.station_name ?? null;
          if (sid && sname && !uniqStations.has(String(sid))) uniqStations.set(String(sid), { id: sid, name: sname });
          if (r.sampled_at) {
            const d = new Date(r.sampled_at);
            if (!isNaN(d)) uniqYears.add(String(d.getFullYear()));
          }
        });
        setStations(Array.from(uniqStations.values()));
        setYears(Array.from(uniqYears).map((y) => Number(y)).sort((a,b) => a - b));

        setTests(filtered);

        if (stationId) {
          const exists = Array.from(uniqStations.values()).some((s) => String(s.id) === String(stationId));
          if (!exists) setStationId("");
        }

        const markers = filtered
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
      } catch (e) {
        console.error('[TestsTab] failed to load', e);
        await alertError('Failed', e?.message || 'Could not load tests');
        if (mounted) setTests([]);
      } finally { if (mounted) { setLoading(false); if (!initialLoadedRef.current) { initialLoadedRef.current = true; setInitialLoading(false); } } }
    })();
    return () => { mounted = false; };
  }, [lakeId, orgId, stationId, yearFrom, yearTo]);

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
        <div style={{ fontSize: 12, color: '#ddd' }}>Markers are shown on the map while this tab is open.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 6 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 11, marginBottom: 2, color: '#fff' }}>Dataset Source</label>
              <OrgSelect options={orgs} value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="All dataset sources" style={{ padding: '6px 8px', height: 'auto' }} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 11, marginBottom: 2, color: '#fff' }}>Station</label>
              <StationSelect options={stations} value={stationId} onChange={(e) => setStationId(e.target.value)} includeAllOption={true} allValue="" allLabel="All" placeholder="Select a station" style={{ padding: '6px 8px', height: 'auto' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
              <div className="form-group" style={{ minWidth: 0 }}>
                <label style={{ fontSize: 11, marginBottom: 2, color: '#fff' }}>Year from</label>
                <select value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} style={{ padding: '6px 8px' }}>
                  <option value="">Any</option>
                  {years.map((y) => (<option key={`f-${y}`} value={String(y)}>{y}</option>))}
                </select>
              </div>
              <div className="form-group" style={{ minWidth: 0 }}>
                <label style={{ fontSize: 11, marginBottom: 2, color: '#fff' }}>Year to</label>
                <select value={yearTo} onChange={(e) => setYearTo(e.target.value)} style={{ padding: '6px 8px' }}>
                  <option value="">Any</option>
                  {years.map((y) => (<option key={`t-${y}`} value={String(y)}>{y}</option>))}
                </select>
              </div>
            </div>
          </div>
          {loading && (
            <div style={{ margin: '2px 0 8px 0' }}>
              <LoadingSpinner label="Loading tests…" color="#fff" />
            </div>
          )}
          {!loading && tests.length === 0 && <div className="insight-card"><em>No tests match your filters. Try clearing filters or expanding the date range.</em></div>}
        {tests.map((t) => (
          <div className="insight-card" key={t.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{t.sampled_at ? new Date(t.sampled_at).toLocaleString() : '–'}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{t.sampled_at ? '(local time)' : ''}</div>
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
