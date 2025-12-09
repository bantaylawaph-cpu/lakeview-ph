// resources/js/pages/ContributorInterface/contribOverview.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiClipboard, FiDatabase, FiUsers } from 'react-icons/fi';

import api, { me as fetchMe } from '../../lib/api';
import { listTenantsOptions } from '../../lib/api'; // retained for possible future fallback
import { ensureTenantName } from '../../lib/tenantCache';
import kpiCache from '../../lib/kpiCache';
import DashboardHeader from '../../components/DashboardHeader';
import { FiHome } from 'react-icons/fi';

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

  if (to) return <Link to={to} className="kpi-card-link" style={{ textDecoration: 'none', color: 'inherit' }}>{cardInner}</Link>;
  return cardInner;
}

function KPIGrid({ stats, tenantId, userId }) {
  const myDraftLink = `/contrib-dashboard/wq-tests${userId ? `?member_id=${encodeURIComponent(userId)}&status=draft` : '?status=draft'}`;
  const myPublishedLink = `/contrib-dashboard/wq-tests${userId ? `?member_id=${encodeURIComponent(userId)}&status=public` : '?status=public'}`;
  const orgPublishedLink = `/contrib-dashboard/wq-tests${tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}&status=public` : '?status=public'}`;

  return (
    <div className="kpi-grid">
      <KpiCard title="My Draft Tests" icon={<FiClipboard />} {...stats.myDraft} to={myDraftLink} />
      <KpiCard title="My Published Tests" icon={<FiDatabase />} {...stats.myPublished} to={myPublishedLink} />
      <KpiCard title="Org Published Tests" icon={<FiUsers />} {...stats.orgPublished} to={orgPublishedLink} />
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
  const [readySignaled, setReadySignaled] = useState(false);
  const [tenantName, setTenantName] = useState('');

  const publish = useCallback((key, payload) => {
    setStats(prev => ({ ...prev, [key]: { ...prev[key], ...payload } }));
  }, []);

  const fetchAll = useCallback(async (forceRefresh = false) => {
    if (!tenantId) return;
    publish('myDraft', { loading: true });
    publish('myPublished', { loading: true });
    publish('orgPublished', { loading: true });
    // Prefer unified endpoint once user+tenant are known
    try {
      const cacheKey = `contrib:${tenantId}:kpis:v2`;
      // If forcing refresh, skip cache entirely
      if (!forceRefresh) {
        const cached = kpiCache.getKpi(cacheKey);
        if (cached) {
          publish('myDraft', { value: cached.myDraft ?? 0, loading: false });
          publish('myPublished', { value: cached.myPublished ?? 0, loading: false });
          publish('orgPublished', { value: cached.orgPublished ?? 0, loading: false });
        }
      }
      const unified = await api.get('/kpis');
      const d = unified?.data?.data || unified?.data || unified;
      const contrib = d?.contrib || {};
      const draft = contrib?.my_tests?.draft ?? null;
      const publishedMine = contrib?.my_tests?.published ?? null;
      const orgPub = contrib?.org_tests?.published ?? null;
      const payload = { myDraft: draft, myPublished: publishedMine, orgPublished: orgPub };
      kpiCache.setKpi(cacheKey, payload, 30 * 1000);
      if (draft != null) publish('myDraft', { value: draft, loading: false });
      if (publishedMine != null) publish('myPublished', { value: publishedMine, loading: false });
      if (orgPub != null) publish('orgPublished', { value: orgPub, loading: false });
      if (!readySignaled) { window.dispatchEvent(new Event('lv-dashboard-ready')); setReadySignaled(true); }
      return;
    } catch (e) {
      // fallback to legacy contrib endpoints
    }
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
    if (!readySignaled) { window.dispatchEvent(new Event('lv-dashboard-ready')); setReadySignaled(true); }
  }, [tenantId, publish]);

  // Resolve tenant + user if missing using me() helper
  useEffect(() => {
    let cancelled = false;
    if (tenantId === null || userId === null) {
      (async () => {
        try {
          const meRes = await fetchMe({ maxAgeMs: 60 * 1000 });
            const tId = meRes?.tenant_id ?? null;
            const uId = meRes?.id ?? null;
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
    // Clear cache and force refresh on initial mount
    const cacheKey = `contrib:${tenantId}:kpis:v2`;
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
    window.addEventListener('lv-contrib-data-changed', handleDataChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('lv-contrib-data-changed', handleDataChange);
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
        icon={<FiHome />}
        title="Contributor Dashboard"
        description="Quick summary of your tests and organization-level published tests. Use the links to view or manage your water quality tests."
      />
      <KPIGrid stats={stats} tenantId={tenantId} userId={userId} />
    </>
  );
}
