import React, { useEffect, useState } from 'react';
import { FiEye, FiMapPin } from 'react-icons/fi';
import { apiPublic, buildQuery } from '../../lib/api';
import { alertError } from '../../utils/alerts';

// Lightweight inline spinner that doesn't rely on global CSS
const LoadingSpinner = ({ label = "Loading…", size = 16, color = "#fff" }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '2px 0 8px 0' }}>
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <g>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" fill="none" opacity="0.2" />
        <path d="M22 12a10 10 0 0 1-10 10" stroke={color} strokeWidth="3" fill="none">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
    <span style={{ fontSize: 12, color: '#ddd' }}>{label}</span>
  </div>
);

/**
 * Props
 * - lake: { id, name }
 */
export default function TestsTab({ lake, onJumpToStation }) {
  const lakeId = lake?.id ?? null;
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState("");

  useEffect(() => {
    if (!lakeId) { setTests([]); return; }
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const qs = buildQuery({ lake_id: lakeId, limit: 50 });
        const res = await apiPublic(`/public/sample-events${qs}`);
        if (!mounted) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setTests(rows);

        // Dispatch markers for MapPage so tests render on the map while this tab is active
        const markers = rows
          .map((r) => {
            // support multiple coordinate shapes
            const lat = r.latitude ?? r.lat ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[1] : null) : null) ?? r.station?.latitude ?? r.station?.lat;
            const lon = r.longitude ?? r.lon ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[0] : null) : null) ?? r.station?.longitude ?? r.station?.lon;
            if (lat == null || lon == null) return null;
            return { lat: Number(lat), lon: Number(lon), label: (r.station?.name || null) };
          })
          .filter(Boolean);
        try {
          console.debug('[TestsTab] dispatching lv-wq-markers', markers);
          window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } }));
        } catch {}
      } catch (e) {
        console.error('[TestsTab] failed to load', e);
        await alertError('Failed', e?.message || 'Could not load tests');
        if (mounted) setTests([]);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [lakeId]);

  // Respond to explicit requests to emit markers (sent when tab becomes active)
  useEffect(() => {
    const onRequest = async () => {
      try {
        // If we already have tests loaded, emit their markers immediately
        if (tests && tests.length) {
          const markers = tests
            .map((r) => {
              const lat = r.latitude ?? r.lat ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[1] : null) : null) ?? r.station?.latitude ?? r.station?.lat;
              const lon = r.longitude ?? r.lon ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[0] : null) : null) ?? r.station?.longitude ?? r.station?.lon;
              if (lat == null || lon == null) return null;
              return { lat: Number(lat), lon: Number(lon), label: (r.station?.name || null) };
            })
            .filter(Boolean);
          try {
            console.debug('[TestsTab] dispatching lv-wq-markers (org filter)', markers);
            window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } }));
          } catch {}
          return;
        }

        // Otherwise, fetch then dispatch
        if (!lakeId) return;
        const qs = buildQuery({ lake_id: lakeId, limit: 50 });
        const res = await apiPublic(`/public/sample-events${qs}`);
        const rows = Array.isArray(res?.data) ? res.data : [];
        const markers = rows
          .map((r) => {
            const lat = r.latitude ?? r.lat ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[1] : null) : null) ?? r.station?.latitude ?? r.station?.lat;
            const lon = r.longitude ?? r.lon ?? (r.point?.coordinates ? (Array.isArray(r.point.coordinates) ? r.point.coordinates[0] : null) : null) ?? r.station?.longitude ?? r.station?.lon;
            if (lat == null || lon == null) return null;
            return { lat: Number(lat), lon: Number(lon), label: (r.station?.name || null) };
          })
          .filter(Boolean);
        try { window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } })); } catch {}
      } catch (err) {
        console.warn('[TestsTab] failed to respond to marker request', err);
      }
    };
    window.addEventListener('lv-request-wq-markers', onRequest);
    return () => window.removeEventListener('lv-request-wq-markers', onRequest);
  }, [lakeId, tests]);

    useEffect(() => {
      if (!lakeId) { setTests([]); setOrgs([]); return; }
      let mounted = true;
      (async () => {
        setLoading(true);
        try {
          const qs = buildQuery({ lake_id: lakeId, organization_id: orgId || undefined, limit: 50 });
          const res = await apiPublic(`/public/sample-events${qs}`);
          if (!mounted) return;
          const rows = Array.isArray(res?.data) ? res.data : [];
          setTests(rows);

          // Derive org list
          const uniq = new Map();
          rows.forEach((r) => {
            const oid = r.organization_id ?? r.organization?.id;
            const name = r.organization_name ?? r.organization?.name;
            if (oid && name && !uniq.has(String(oid))) uniq.set(String(oid), { id: oid, name });
          });
          setOrgs(Array.from(uniq.values()));

          // Dispatch markers for MapPage so tests render on the map while this tab is active
          const markers = rows
            .filter((r) => r && r.latitude != null && r.longitude != null)
            .map((r) => ({ lat: Number(r.latitude), lon: Number(r.longitude), label: (r.station?.name || null) }));
          try { window.dispatchEvent(new CustomEvent('lv-wq-markers', { detail: { markers } })); } catch {}
        } catch (e) {
          console.error('[TestsTab] failed to load', e);
          await alertError('Failed', e?.message || 'Could not load tests');
          if (mounted) setTests([]);
        } finally { if (mounted) setLoading(false); }
      })();
      return () => { mounted = false; };
    }, [lakeId, orgId]);
  const extractCoords = (t) => {
    const lat = t.latitude ?? t.lat ?? (t.point?.coordinates ? (Array.isArray(t.point.coordinates) ? t.point.coordinates[1] : null) : null) ?? t.station?.latitude ?? t.station?.lat;
    const lon = t.longitude ?? t.lon ?? (t.point?.coordinates ? (Array.isArray(t.point.coordinates) ? t.point.coordinates[0] : null) : null) ?? t.station?.longitude ?? t.station?.lon;
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
    try { window.dispatchEvent(new CustomEvent('lv-view-test', { detail: { test: t } })); } catch {}
  };

  return (
    <div>
      <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 6 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 11, marginBottom: 2 }}>Organization</label>
              <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ padding: '6px 8px' }}>
                <option value="">All</option>
                {orgs.map((o) => (<option key={o.id} value={String(o.id)}>{o.name}</option>))}
              </select>
            </div>
          </div>
          {loading && (
            <div style={{ margin: '2px 0 8px 0' }}>
              <LoadingSpinner label="Loading tests…" />
            </div>
          )}
          {!loading && tests.length === 0 && <div className="insight-card"><em>No published tests found for this lake.</em></div>}
        {tests.map((t) => (
          <div className="insight-card" key={t.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.organization_name || t.organization?.name || 'Organization'}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{t.sampled_at ? new Date(t.sampled_at).toLocaleString() : '–'}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{t.station?.name || (t.latitude != null && t.longitude != null ? `${Number(t.latitude).toFixed(6)}, ${Number(t.longitude).toFixed(6)}` : 'Station: –')}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                  <button className="pill-btn liquid" type="button" onClick={() => viewDetails(t)} title="View test"><FiEye /></button>
                  <button className="pill-btn liquid" type="button" onClick={() => jumpTo(t)} title="Jump to station"><FiMapPin /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
