// resources/js/pages/AdminInterface/AdminOverview.jsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  FiBriefcase,    // Organizations
  FiUsers,        // Registered Users
  FiMap,          // Lakes in Database
  FiDroplet,      // Water Quality Reports in Database
  FiActivity,     // Recent Activity header icon
} from "react-icons/fi";

import AppMap from "../../components/AppMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

import api from "../../lib/api";
import kpiCache from '../../lib/kpiCache';

/* KPI Grid */
function KPIGrid() {
  // Local state lifted into parent via hooks in AdminOverview; here we just render placeholders
  return (
    <div className="kpi-grid">
      <KpiCard id="orgs" icon={<FiBriefcase />} title="Organizations" />
      <KpiCard id="users" icon={<FiUsers />} title="Registered Users" />
      <KpiCard id="lakes" icon={<FiMap />} title="Lakes in Database" />
      <KpiCard id="events" icon={<FiDroplet />} title="Water Quality Reports in Database" />
    </div>
  );
}

function KpiCard({ id, icon, title }) {
  // We'll read values from the DOM-level shared store via a simple event-based approach
  // The AdminOverview component will dispatch a custom event with payload { id, value, loading, error }
  const [state, setState] = useState({ value: null, loading: true, error: null });

  useEffect(() => {
    const handler = (e) => {
      if (!e?.detail) return;
      if (e.detail.id !== id) return;
      setState({ value: e.detail.value, loading: !!e.detail.loading, error: e.detail.error || null });
    };
    window.addEventListener('lv:kpi:update', handler);
    return () => window.removeEventListener('lv:kpi:update', handler);
  }, [id]);

  const display = state.loading ? '…' : (state.error ? '—' : (state.value ?? '0'));

  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-info">
        <button className="kpi-title btn-link" onClick={() => window.dispatchEvent(new CustomEvent('lv:kpi:refresh'))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{title}</button>
        <span className="kpi-value">{display}</span>
      </div>
    </div>
  );
}

/* ============================================================
   Overview Map
   (Basemap only; no markers/features preloaded.)
   ============================================================ */
function OverviewMap() {
  return (
    <div className="map-container">
      <AppMap view="osm" style={{ height: "100%", width: "100%" }}>
        {/* Add GeoJSON layers or markers once data is available */}
      </AppMap>
    </div>
  );
}

/* ============================================================
   Recent Logs
   (Empty list; render items when you have data.)
   ============================================================ */
function RecentLogs() {
  return (
    <div className="dashboard-card" style={{ marginTop: 24 }}>
      <div className="dashboard-card-title">
        <FiActivity style={{ marginRight: 8 }} />
        <span>Recent Activity</span>
      </div>
      <div className="dashboard-card-body">
        <ul className="recent-logs-list">
          {/* Intentionally empty. Map over recent logs here. */}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   Page: AdminOverview
   ============================================================ */
export default function AdminOverview() {
  const [kpis, setKpis] = useState({
    orgs: { value: null, loading: true, error: null },
    users: { value: null, loading: true, error: null },
    lakes: { value: null, loading: true, error: null },
    events: { value: null, loading: true, error: null },
  });

  const publish = useCallback((id, payload) => {
    setKpis((prev) => ({ ...prev, [id]: payload }));
    window.dispatchEvent(new CustomEvent('lv:kpi:update', { detail: { id, ...payload } }));
  }, []);

  const fetchAll = useCallback(async () => {
    // Organizations (admin endpoint - requires auth)
    publish('orgs', { loading: true });
    publish('users', { loading: true });
    publish('lakes', { loading: true });
    publish('events', { loading: true });

    try {
      // orgs: use a lightweight KPI endpoint that returns { count }
      const key = 'admin:orgs';
      const cached = kpiCache.getKpi(key);
      if (cached !== null) {
        publish('orgs', { value: cached, loading: false });
      } else {
        const orgRes = await api.get('/admin/kpis/orgs');
        const orgTotal = orgRes?.data?.count ?? (orgRes?.count ?? null);
        kpiCache.setKpi(key, orgTotal);
        publish('orgs', { value: orgTotal, loading: false });
      }
    } catch (e) {
      publish('orgs', { value: null, loading: false, error: true });
    }

    try {
      const key = 'admin:users';
      const cached = kpiCache.getKpi(key);
      if (cached !== null) {
        publish('users', { value: cached, loading: false });
      } else {
        const userRes = await api.get('/admin/kpis/users');
        const userTotal = userRes?.data?.count ?? (userRes?.count ?? null);
        kpiCache.setKpi(key, userTotal);
        publish('users', { value: userTotal, loading: false });
      }
    } catch (e) {
      publish('users', { value: null, loading: false, error: true });
    }

    try {
      const key = 'admin:lakes';
      const cached = kpiCache.getKpi(key);
      if (cached !== null) {
        publish('lakes', { value: cached, loading: false });
      } else {
        const lakeRes = await api.get('/lakes');
        const lakesList = Array.isArray(lakeRes) ? lakeRes : lakeRes?.data ?? [];
        const lakeTotal = Array.isArray(lakesList) ? lakesList.length : 0;
        kpiCache.setKpi(key, lakeTotal);
        publish('lakes', { value: lakeTotal, loading: false });
      }
    } catch (e) {
      publish('lakes', { value: null, loading: false, error: true });
    }

    try {
      const key = 'admin:events';
      const cached = kpiCache.getKpi(key);
      if (cached !== null) {
        publish('events', { value: cached, loading: false });
      } else {
        const evRes = await api.get('/admin/sample-events');
        const evList = evRes?.data ?? [];
        const evTotal = Array.isArray(evList) ? evList.length : (evRes?.data?.length ?? 0);
        kpiCache.setKpi(key, evTotal);
        publish('events', { value: evTotal, loading: false });
      }
    } catch (e) {
      publish('events', { value: null, loading: false, error: true });
    }
  }, [publish]);

  useEffect(() => {
    fetchAll();
    const onRefresh = () => fetchAll();
    window.addEventListener('lv:kpi:refresh', onRefresh);
    const interval = setInterval(fetchAll, 60 * 1000); // refresh every minute
    return () => { window.removeEventListener('lv:kpi:refresh', onRefresh); clearInterval(interval); };
  }, [fetchAll]);

  return (
    <>
      <KPIGrid />
      <OverviewMap />
      <RecentLogs />
    </>
  );
}
