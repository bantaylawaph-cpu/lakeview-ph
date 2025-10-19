// resources/js/pages/AdminInterface/AdminOverview.jsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Link } from 'react-router-dom';
import {
  FiBriefcase,    // Organizations
  FiUsers,        // Registered Users
  FiMap,          // Lakes in Database
  FiDroplet,      // Water Quality Reports in Database
} from "react-icons/fi";

import api from "../../lib/api";
import kpiCache from '../../lib/kpiCache';

/* KPI Grid */
function KPIGrid() {
  // Local state lifted into parent via hooks in AdminOverview; here we just render placeholders
  return (
    <div className="kpi-grid">
      <KpiCard id="orgs" icon={<FiBriefcase />} title="Organizations" to="/admin-dashboard/organizations" />
      <KpiCard id="users" icon={<FiUsers />} title="Registered Users" to="/admin-dashboard/users" />
      <KpiCard id="lakes" icon={<FiMap />} title="Lakes" to="/admin-dashboard/lakes" />
      <KpiCard id="events" icon={<FiDroplet />} title="Water Quality Reports" to="/admin-dashboard/wq-tests" />
    </div>
  );
}

function KpiCard({ id, icon, title, to }) {
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

  const cardInner = (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-info">
        <div className="kpi-title-wrap">
          <span className="kpi-title btn-link">{title}</span>
        </div>
        <span className="kpi-value">{display}</span>
      </div>
    </div>
  );

  if (to) {
    // Wrap the whole card in a Link so the entire card is clickable.
    return (
      <Link to={to} className="kpi-card-link" style={{ textDecoration: 'none', color: 'inherit' }}>
        {cardInner}
      </Link>
    );
  }

  return cardInner;
}

/* ============================================================
   Overview Map
   (Basemap only; no markers/features preloaded.)
   ============================================================ */
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
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <span>Overview</span>
          </div>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          Quick operational metrics and recent platform KPIs for administrators.
        </p>
      </div>
      <KPIGrid />
    </>
  );
}
