// resources/js/pages/OrgInterface/OrgOverview.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from 'react-router-dom';
import {
  FiUsers,          // Active Members
  FiDatabase,       // Tests Logged
  FiClipboard,      // Pending Approvals
} from "react-icons/fi";

import api, { me as fetchMe } from "../../lib/api";
import { listTenantsOptions } from "../../lib/api"; // legacy direct use retained for fallback (not primary)
import { ensureTenantName } from "../../lib/tenantCache";
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
  const [tenantName, setTenantName] = useState('');
  const [readySignaled, setReadySignaled] = useState(false);

  const publish = useCallback((key, payload) => {
    setStats(prev => ({ ...prev, [key]: { ...prev[key], ...payload } }));
  }, []);

  const fetchAll = useCallback(async (forceRefresh = false) => {
    if (!tenantId) return;
    publish('members', { loading: true });
    publish('tests', { loading: true });
    publish('pending', { loading: true });
    const cacheKey = `org:${tenantId}:kpis:v2`;
    // If forcing refresh, skip cache entirely
    if (!forceRefresh) {
      const cached = kpiCache.getKpi(cacheKey);
      if (cached) {
        if (cached.members != null) publish('members', { value: cached.members, loading: false });
        if (cached.tests != null) publish('tests', { value: cached.tests, loading: false });
        if (cached.pending != null) publish('pending', { value: cached.pending, loading: false });
      }
    }
    // Prefer unified endpoint
    try {
      const res = await api.get('/kpis');
      const d = res?.data?.data || res?.data || res;
      const org = d?.org || {};
      const members = org?.members?.count ?? null;
      const tests = org?.tests?.count ?? null;
      const pending = org?.tests_draft?.count ?? null;
      const payload = { members, tests, pending };
      kpiCache.setKpi(cacheKey, payload, 30 * 1000);
      if (members != null) publish('members', { value: members, loading: false });
      if (tests != null) publish('tests', { value: tests, loading: false });
      if (pending != null) publish('pending', { value: pending, loading: false });
      if (!readySignaled) { window.dispatchEvent(new Event('lv-dashboard-ready')); setReadySignaled(true); }
      return;
    } catch (e) { /* fallback to legacy */ }

    // Legacy endpoints fallback
    // Members
    try {
      const key = `org:${tenantId}:members`;
      const cachedMembers = kpiCache.getKpi(key);
      if (cachedMembers) {
        publish('members', { value: cachedMembers, loading: false });
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
      const cachedTests = kpiCache.getKpi(key);
      if (cachedTests) {
        publish('tests', { value: cachedTests, loading: false });
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
      const cachedPending = kpiCache.getKpi(key);
      if (cachedPending) {
        publish('pending', { value: cachedPending, loading: false });
      } else {
        const r = await api.get(`/org/${tenantId}/kpis/tests/draft`);
        const val = r?.data?.count ?? r?.count ?? null;
        kpiCache.setKpi(key, val);
        publish('pending', { value: val, loading: false });
      }
    } catch (e) { publish('pending', { value: null, loading: false, error: true }); }
    if (!readySignaled) { window.dispatchEvent(new Event('lv-dashboard-ready')); setReadySignaled(true); }
  }, [tenantId, publish, readySignaled]);

  // Resolve tenant id if not provided by prop/url/global via me() helper
  useEffect(() => {
    let cancelled = false;
    if (tenantId === null) {
      (async () => {
        try {
          const meRes = await fetchMe({ maxAgeMs: 60 * 1000 });
          const tId = meRes?.tenant_id ?? null;
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
    // Clear cache and force refresh on initial mount
    const cacheKey = `org:${tenantId}:kpis:v2`;
    kpiCache.clearKpi(cacheKey);
    fetchAll(true);
    
    // Refresh every 60 seconds
    const interval = setInterval(() => fetchAll(false), 60 * 1000);
    
    // Refresh when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        kpiCache.clearKpi(cacheKey);
        fetchAll(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for custom events that indicate data changes
    const handleDataChange = () => {
      kpiCache.clearKpi(cacheKey);
      fetchAll(true);
    };
    window.addEventListener('lv-org-data-changed', handleDataChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('lv-org-data-changed', handleDataChange);
    };
  }, [tenantId, fetchAll]);

  // Cached tenant name (memory + localStorage)
  useEffect(() => {
    let cancelled = false;
    if (!tenantId) return;
    ensureTenantName(tenantId, (name) => { if (!cancelled) setTenantName(name); });
    return () => { cancelled = true; };
  }, [tenantId]);

  return (
    <>
      {tenantName && (
        <div style={{ marginBottom: 16, fontSize: 30, fontWeight: 700, letterSpacing: '0.5px' }}>Welcome to {tenantName}</div>
      )}
      <DashboardHeader
        icon={<FiUsersIcon />}
        title="Organization Dashboard"
        description="Overview of your organization: active members, tests logged, and pending approvals. Use the links to manage members and review tests."
      />
      <KPIGrid stats={stats} tenantId={tenantId} />
    </>
  );
}
