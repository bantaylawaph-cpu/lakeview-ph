// resources/js/pages/ContributorInterface/contribOverview.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { FiClipboard, FiDatabase, FiUsers } from 'react-icons/fi';
import AppMap from '../../components/AppMap';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
// Leaflet default icon fix
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

import api from '../../lib/api';
import kpiCache from '../../lib/kpiCache';

function KpiCard({ title, value, loading, error, onRefresh, icon }) {
  const display = loading ? '…' : (error ? '—' : (value ?? '0'));
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-info">
        <button className="kpi-title btn-link" onClick={onRefresh} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{title}</button>
        <span className="kpi-value">{display}</span>
      </div>
    </div>
  );
}

function KPIGrid({ stats, refresh }) {
  return (
    <div className="kpi-grid">
      <KpiCard title="My Draft Tests" icon={<FiClipboard />} {...stats.myDraft} onRefresh={refresh} />
      <KpiCard title="My Published Tests" icon={<FiDatabase />} {...stats.myPublished} onRefresh={refresh} />
      <KpiCard title="Org Published Tests" icon={<FiUsers />} {...stats.orgPublished} onRefresh={refresh} />
    </div>
  );
}

function TestsMap() {
  return (
    <div className="map-container" style={{ marginBottom: 16 }}>
      <AppMap view="osm" style={{ height: '100%', width: '100%' }}>
        {/* Future: contributor's own markers or org published markers */}
      </AppMap>
    </div>
  );
}

export default function ContribOverview({ tenantId: propTenantId }) {
  const params = useParams?.() || {};
  const initialTenantId = propTenantId || params.tenant || params.tenantId || window.__LV_TENANT_ID || null;
  const [tenantId, setTenantId] = useState(initialTenantId ? Number(initialTenantId) : null);
  const [userId, setUserId] = useState(null); // not strictly required client-side now but reserved for future

  const [stats, setStats] = useState({
    myDraft: { value: null, loading: true, error: null },
    myPublished: { value: null, loading: true, error: null },
    orgPublished: { value: null, loading: true, error: null },
  });

  const publish = useCallback((key, payload) => {
    setStats(prev => ({ ...prev, [key]: { ...prev[key], ...payload } }));
  }, []);

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    publish('myDraft', { loading: true });
    publish('myPublished', { loading: true });
    publish('orgPublished', { loading: true });
    try {
      const key = `contrib:${tenantId}:my-tests`;
      const cached = kpiCache.getKpi(key);
      if (cached) {
        publish('myDraft', { value: cached.draft ?? 0, loading: false });
        publish('myPublished', { value: cached.published ?? 0, loading: false });
      } else {
        const r = await api.get(`/contrib/${tenantId}/kpis/my-tests`);
        const draft = r?.data?.draft ?? r?.draft ?? 0;
        const published = r?.data?.published ?? r?.published ?? 0;
        kpiCache.setKpi(key, { draft, published });
        publish('myDraft', { value: draft, loading: false });
        publish('myPublished', { value: published, loading: false });
      }
    } catch (e) {
      publish('myDraft', { value: null, loading: false, error: true });
      publish('myPublished', { value: null, loading: false, error: true });
    }
    try {
      const key = `contrib:${tenantId}:org-tests`;
      const cached = kpiCache.getKpi(key);
      if (cached !== null) {
        publish('orgPublished', { value: cached, loading: false });
      } else {
        const r2 = await api.get(`/contrib/${tenantId}/kpis/org-tests`);
        const publishedOrg = r2?.data?.published ?? r2?.published ?? 0;
        kpiCache.setKpi(key, publishedOrg);
        publish('orgPublished', { value: publishedOrg, loading: false });
      }
    } catch (e) {
      publish('orgPublished', { value: null, loading: false, error: true });
    }
  }, [tenantId, publish]);

  // Resolve tenant + user if missing using /auth/me
  useEffect(() => {
    let cancelled = false;
    if (tenantId === null || userId === null) {
      (async () => {
        try {
          const meRes = await api.get('/auth/me');
            const tId = meRes?.data?.tenant_id ?? meRes?.tenant_id ?? null;
            const uId = meRes?.data?.id ?? meRes?.id ?? null;
            if (!cancelled) {
              if (tId && tenantId === null) setTenantId(Number(tId));
              if (uId && userId === null) setUserId(Number(uId));
            }
        } catch (e) {
          if (!cancelled) {
            publish('myDraft', { loading: false, error: true });
            publish('myPublished', { loading: false, error: true });
            publish('orgPublished', { loading: false, error: true });
          }
        }
      })();
    }
    return () => { cancelled = true; };
  }, [tenantId, userId, publish]);

  useEffect(() => {
    if (!tenantId) return;
    fetchAll();
    const interval = setInterval(fetchAll, 60 * 1000);
    return () => clearInterval(interval);
  }, [tenantId, fetchAll]);

  return (
    <>
      <KPIGrid stats={stats} refresh={fetchAll} />
      <TestsMap />
    </>
  );
}
