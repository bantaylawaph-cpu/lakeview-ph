// resources/js/pages/ContributorInterface/contribOverview.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiClipboard, FiDatabase, FiUsers } from 'react-icons/fi';

import api from '../../lib/api';
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
      <DashboardHeader
        icon={<FiHome />}
        title="Contributor Dashboard"
        description="Quick summary of your tests and organization-level published tests. Use the links to view or manage your water quality tests."
      />
      <KPIGrid stats={stats} tenantId={tenantId} userId={userId} />
    </>
  );
}
