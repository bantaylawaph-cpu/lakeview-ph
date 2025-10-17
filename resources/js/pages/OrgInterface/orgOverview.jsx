// resources/js/pages/OrgInterface/OrgOverview.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from 'react-router-dom';
import {
  FiUsers,          // Active Members
  FiDatabase,       // Tests Logged
  FiClipboard,      // Pending Approvals
  FiActivity,       // Recent Activity header icon
} from "react-icons/fi";
import AppMap from "../../components/AppMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* --- Leaflet default marker fix (keeps OSM markers visible) --- */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

import api from "../../lib/api";
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

/* ============================================================
   KPI Grid (4 stats; empty values for now)
   ============================================================ */
function KPIGrid({ stats, refresh }) {
  return (
    <div className="kpi-grid">
      <KpiCard title="Active Members" icon={<FiUsers />} {...stats.members} onRefresh={refresh} />
      <KpiCard title="Tests Logged" icon={<FiDatabase />} {...stats.tests} onRefresh={refresh} />
      <KpiCard title="Pending Approvals" icon={<FiClipboard />} {...stats.pending} onRefresh={refresh} />
    </div>
  );
}


/* ============================================================
   Tests Map
   - Shows only logged test locations (none yet)
   ============================================================ */
function TestsMap() {
  return (
    <div className="map-container" style={{ marginBottom: 16 }}>
      <AppMap view="osm" style={{ height: "100%", width: "100%" }}>
        {/*
          TODO: Once data exists, place markers for this org's logged tests here.
          e.g. tests.map(t => <Marker position={[t.lat,t.lng]} />)
        */}
      </AppMap>
    </div>
  );
}

/* ============================================================
   Recent Activity (Water Quality Logs only)
   - Empty list for now
   ============================================================ */
function RecentLogs() {
  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <FiActivity /><span>Recent Activity (Water Quality Logs)</span>
        </div>
      </div>
      <div className="dashboard-card-body">
        <ul className="recent-logs-list">
          {/* Intentionally empty. Map over this org's recent WQ logs here. */}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   Page: OrgOverview
  - Mirrors AdminOverview’s structure (KPIs → Map → Logs)
  - Quick Actions toolbar removed per request
   ============================================================ */
export default function OrgOverview({ tenantId: propTenantId }) {
  const params = useParams?.() || {};
  // Determine tenant id: prefer explicit prop, then URL param (tenant or tenantId), then global placeholder.
  const initialTenantId = propTenantId || params.tenant || params.tenantId || window.__LV_TENANT_ID || null;
  const [tenantId, setTenantId] = useState(initialTenantId ? Number(initialTenantId) : null);

  const [stats, setStats] = useState({
    members: { value: null, loading: true, error: null },
    tests:   { value: null, loading: true, error: null },
    pending: { value: null, loading: true, error: null },
  });

  const publish = useCallback((key, payload) => {
    setStats(prev => ({ ...prev, [key]: { ...prev[key], ...payload } }));
  }, []);

  const fetchAll = useCallback(async () => {
    if (!tenantId) return; // still resolving tenant id
    publish('members', { loading: true });
    publish('tests', { loading: true });
    publish('pending', { loading: true });
    // Members
    try {
      const key = `org:${tenantId}:members`;
      const cached = kpiCache.getKpi(key);
      if (cached) {
        publish('members', { value: cached, loading: false });
      } else {
        const r = await api.get(`/org/${tenantId}/kpis/members`);
        const val = r?.data?.count ?? r?.count ?? null;
        kpiCache.setKpi(key, val);
        publish('members', { value: val, loading: false });
      }
    } catch (e) { publish('members', { value: null, loading: false, error: true }); }

    // Tests
    try {
      const key = `org:${tenantId}:tests`;
      const cached = kpiCache.getKpi(key);
      if (cached) {
        publish('tests', { value: cached, loading: false });
      } else {
        const r = await api.get(`/org/${tenantId}/kpis/tests`);
        const val = r?.data?.count ?? r?.count ?? null;
        kpiCache.setKpi(key, val);
        publish('tests', { value: val, loading: false });
      }
    } catch (e) { publish('tests', { value: null, loading: false, error: true }); }

    // Pending
    try {
      const key = `org:${tenantId}:pending`;
      const cached = kpiCache.getKpi(key);
      if (cached) {
        publish('pending', { value: cached, loading: false });
      } else {
        const r = await api.get(`/org/${tenantId}/kpis/tests/draft`);
        const val = r?.data?.count ?? r?.count ?? null;
        kpiCache.setKpi(key, val);
        publish('pending', { value: val, loading: false });
      }
    } catch (e) { publish('pending', { value: null, loading: false, error: true }); }
  }, [tenantId, publish]);

  // Resolve tenant id if not provided by prop/url/global via /auth/me
  useEffect(() => {
    let cancelled = false;
    if (tenantId === null) {
      (async () => {
        try {
          const meRes = await api.get('/auth/me');
          const tId = meRes?.data?.tenant_id ?? meRes?.tenant_id ?? null;
          if (!cancelled && tId) setTenantId(Number(tId));
        } catch (e) {
          // If cannot resolve tenant, mark KPIs as error once
          if (!cancelled) {
            publish('members', { loading: false, error: true });
            publish('tests', { loading: false, error: true });
            publish('pending', { loading: false, error: true });
          }
        }
      })();
    }
    return () => { cancelled = true; };
  }, [tenantId, publish]);

  useEffect(() => {
    if (!tenantId) return; // wait for tenant id
    fetchAll();
    const interval = setInterval(fetchAll, 60 * 1000);
    return () => clearInterval(interval);
  }, [tenantId, fetchAll]);

  return (
    <>
      <KPIGrid stats={stats} refresh={fetchAll} />
      <TestsMap />
      <RecentLogs />
    </>
  );
}
