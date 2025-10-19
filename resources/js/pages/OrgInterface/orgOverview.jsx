// resources/js/pages/OrgInterface/OrgOverview.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from 'react-router-dom';
import {
  FiUsers,          // Active Members
  FiDatabase,       // Tests Logged
  FiClipboard,      // Pending Approvals
} from "react-icons/fi";

import api from "../../lib/api";
import kpiCache from '../../lib/kpiCache';
import DashboardHeader from '../../components/DashboardHeader';
import { FiUsers as FiUsersIcon } from 'react-icons/fi';

function KpiCard({ title, value, loading, error, icon, to }) {
  const display = loading ? '…' : (error ? '—' : (value ?? '0'));

  const cardInner = (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-info">
        <div className="kpi-title-wrap"><span className="kpi-title btn-link">{title}</span></div>
        <span className="kpi-value">{display}</span>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="kpi-card-link" style={{ textDecoration: 'none', color: 'inherit' }}>
        {cardInner}
      </Link>
    );
  }

  return cardInner;
}

/* ============================================================
   KPI Grid (4 stats; empty values for now)
   ============================================================ */
function KPIGrid({ stats, refresh, tenantId }) {
  // Build links: members page filtered to active, tests page, tests page filtered to draft
  const membersLink = `/org-dashboard/members${tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}&status=active` : '?status=active'}`;
  const testsLink = `/org-dashboard/wq-tests${tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : ''}`;
  const pendingLink = `/org-dashboard/wq-tests${tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}&status=draft` : '?status=draft'}`;

  return (
    <div className="kpi-grid">
      <KpiCard title="Active Members" icon={<FiUsers />} {...stats.members} to={membersLink} />
      <KpiCard title="Tests Logged" icon={<FiDatabase />} {...stats.tests} to={testsLink} />
      <KpiCard title="Pending Approvals" icon={<FiClipboard />} {...stats.pending} to={pendingLink} />
    </div>
  );
}


/* ============================================================
   Tests Map
   - Shows only logged test locations (none yet)
   ============================================================ */

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
      <DashboardHeader
        icon={<FiUsersIcon />}
        title="Organization Dashboard"
        description="Overview of your organization: active members, tests logged, and pending approvals. Use the links to manage members and review tests."
      />
      <KPIGrid stats={stats} tenantId={tenantId} />
    </>
  );
}
