// resources/js/pages/shared/useWQTests.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import TableToolbar from "../../components/table/TableToolbar";
import { FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";

import { api, me as fetchMe } from "../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../lib/httpCache";
import { fetchLakeOptions } from "../../lib/layers";
import { alertSuccess, alertError, alertWarning, confirm as swalConfirm, showLoading, closeLoading } from "../../lib/alerts";

// small utility to create a brief UX delay for loader visibility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startOfDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}
function yqmFrom(record) {
  const d = record?.sampled_at ? new Date(record.sampled_at) : null;
  const y = Number(record?.year ?? (d ? d.getFullYear() : NaN));
  const m = Number(record?.month ?? (d ? d.getMonth() + 1 : NaN));
  const q = Number(record?.quarter ?? (Number.isFinite(m) ? Math.floor((m - 1) / 3) + 1 : NaN));
  return { year: y, quarter: q, month: m };
}
const monthName = (m) => [null,'January','February','March','April','May','June','July','August','September','October','November','December'][m] || String(m);

export function useWQTests({ variant, tableId, initialLakes = [], initialTests = [], parameterCatalog = [] }) {
  const isAdmin = variant === 'admin';
  const isOrg = variant === 'org';
  const isContrib = variant === 'contrib';

  const location = useLocation();
  const qp = new URLSearchParams(location.search);

  // Shared UI state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);

  const [lakes, setLakes] = useState(initialLakes);
  const [tests, setTests] = useState(initialTests);
  const [paramCatalog, setParamCatalog] = useState(parameterCatalog);
  const [loading, setLoading] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Cursor pagination support (keyset on sampled_at DESC, id DESC)
  const useCursorMode = true; // enable keyset pagination by default for performance
  const cursorMapRef = React.useRef({ 1: null }); // page -> cursor token (cursor for page p means "start after" token for that page)
  // Sorting (client-side on current page data)
  const SORT_KEY = `${tableId || 'wqtests'}::sort`;
  const [sort, setSort] = useState(() => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.id === 'string' && (parsed.dir === 'asc' || parsed.dir === 'desc')) {
          return parsed;
        }
      }
    } catch {}
    // Default to sampling date (Month-Day) DESC i.e., most recent first
    return { id: 'month_day', dir: 'desc' };
  });

  useEffect(() => {
    try { localStorage.setItem(SORT_KEY, JSON.stringify(sort)); } catch {}
  }, [SORT_KEY, sort]);

  // Auth/context
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(isAdmin ? true : false); // admin doesn't gate on org/tenant
  const [currentTenantId, setCurrentTenantId] = useState(null); // org
  const [currentOrgId, setCurrentOrgId] = useState(null); // contrib

  // Admin specific
  const [orgs, setOrgs] = useState([]);

  // Members (org + contrib)
  const [members, setMembers] = useState([]);
  const [membersFetchForbidden, setMembersFetchForbidden] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [lakeId, setLakeId] = useState(() => (isOrg ? (qp.get('lake_id') || '') : ''));
  const [status, setStatus] = useState(() => (isContrib || isOrg ? (qp.get('status') || '') : ''));
  const [organizationId, setOrganizationId] = useState(""); // admin only
  const [memberId, setMemberId] = useState(() => (isContrib || isOrg ? (qp.get('member_id') || qp.get('created_by_user_id') || '') : ''));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [year, setYear] = useState("");
  const [quarter, setQuarter] = useState("");
  const [month, setMonth] = useState("");

  // Dynamic option lists
  const [yearOpts, setYearOpts] = useState([]);
  const [quarterOpts, setQuarterOpts] = useState([]);
  const [monthOpts, setMonthOpts] = useState([]);

  // Filters panel
  const [filtersOpen, setFiltersOpen] = useState(false);

  // created_by id from QS (contrib may filter additionally)
  const createdByUserIdFromQs = (isContrib || isOrg) ? (qp.get('created_by_user_id') || qp.get('user_id') || null) : null;

  // Resolve auth and context
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await fetchMe({ maxAgeMs: 60 * 1000 });
        if (!mounted) return;
        if (!me) {
          setCurrentUserRole(null);
          if (isOrg) setCurrentTenantId(null);
          if (isContrib) setCurrentOrgId(null);
          setAuthLoaded(true);
          return;
        }
        const role = (me?.role || "").toString().trim().replace(/\s+/g, "_").replace(/-/g, "_");
        setCurrentUserRole(role || null);
        setCurrentUserId(me?.id ?? null);
        const org = me?.tenant || me?.organization || null;
        if (isOrg) {
          if (org?.id) setCurrentTenantId(org.id);
          else if (me?.tenant_id) setCurrentTenantId(me.tenant_id);
          else if (me?.organization_id) setCurrentTenantId(me.organization_id);
        }
        if (isContrib) {
          const org2 = me?.organization || (me?.tenant ? me.tenant : null);
          if (org2?.id) setCurrentOrgId(org2.id);
          else if (me?.organization_id) setCurrentOrgId(me.organization_id);
          else if (me?.tenant_id) setCurrentOrgId(me.tenant_id);
        }
      } catch (e) {
        if (mounted) {
          setCurrentUserRole(null);
          if (isOrg) setCurrentTenantId(null);
          if (isContrib) setCurrentOrgId(null);
        }
      } finally {
        if (mounted) setAuthLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, [isOrg, isContrib]);

  // Fetch lakes, parameter catalog, orgs (admin)
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      (async () => {
        try {
          const opts = await fetchLakeOptions();
          if (!mounted) return;
          setLakes(Array.isArray(opts) ? opts : []);
        } catch (e) {
          if (mounted) setLakes(initialLakes || []);
        }
      })();

      (async () => {
        try {
          const params = await cachedGet('/options/parameters', { ttlMs: 20 * 60 * 1000 });
          if (!mounted) return;
          setParamCatalog(Array.isArray(params) ? params : []);
        } catch (e) {
          if (mounted) setParamCatalog(parameterCatalog || []);
        }
      })();

      if (isAdmin) {
        (async () => {
          try {
            const r = await cachedGet('/admin/tenants', { ttlMs: 5 * 60 * 1000 });
            if (!mounted) return;
            const data = Array.isArray(r?.data) ? r.data : [];
            setOrgs(data.map((o) => ({ id: o.id, name: o.name })));
          } catch (e) {
            if (mounted) setOrgs([]);
          }
        })();
      }
    }, 50);

    return () => { mounted = false; clearTimeout(timer); };
  }, [isAdmin]);

  // Fetch members (org/contrib)
  useEffect(() => {
    let mounted = true;
    if (isOrg) {
      if (!authLoaded || !currentTenantId) return () => {};
      (async () => {
        try {
          const r = await cachedGet(`/org/${currentTenantId}/users`, { ttlMs: 5 * 60 * 1000 });
          if (!mounted) return;
          const raw = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
          const filtered = (Array.isArray(raw) ? raw : []).filter((u) => {
            if (!u) return false;
            const roleStr = (u.role || '').toString();
            if (["org_admin", "contributor"].includes(roleStr)) return true;
            const rid = Number(u.role_id);
            if (!Number.isNaN(rid) && [2, 3].includes(rid)) return true;
            return false;
          });
          setMembers(filtered);
        } catch (e) {
          // best-effort only
        }
      })();
    }
    if (isContrib) {
      if (!authLoaded || !currentOrgId) return () => {};
      (async () => {
        try {
          const r = await cachedGet(`/org/${currentOrgId}/users`, { ttlMs: 5 * 60 * 1000 });
          if (!mounted) return;
          const raw = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
          const filtered = (Array.isArray(raw) ? raw : []).filter((u) => {
            if (!u) return false;
            const roleStr = (u.role || '').toString();
            if (["org_admin", "contributor"].includes(roleStr)) return true;
            const rid = Number(u.role_id);
            if (!Number.isNaN(rid) && [2, 3].includes(rid)) return true;
            return false;
          });
          setMembers(filtered);
          setMembersFetchForbidden(false);
        } catch (e) {
          const status = e?.response?.status || (e?.message ? (e.message.includes('Forbidden') ? 403 : null) : null);
          if (status === 403) setMembersFetchForbidden(true);
        }
      })();
    }
    return () => { mounted = false; };
  }, [isOrg, isContrib, authLoaded, currentTenantId, currentOrgId]);

  // Contrib-only: fallback build members list from tests
  useEffect(() => {
    if (!isContrib || !membersFetchForbidden) return;
    const map = new Map();
    tests.forEach((t) => {
      const id = t.created_by_user_id ?? t.createdBy?.id ?? t.created_by;
      const name = t.createdBy?.name || t.created_by_name || t.created_by_display || t.sampler_name || null;
      if (id && !map.has(String(id))) map.set(String(id), { id: String(id), name: name || `User ${id}` });
    });
    setMembers(Array.from(map.values()));
  }, [isContrib, membersFetchForbidden, tests]);

  // Fetch tests (server-side pagination with cursor when enabled)
  useEffect(() => {
    let mounted = true;
    const gated = isAdmin || (isOrg ? !!authLoaded : !!authLoaded) || (isContrib ? !!authLoaded : true);
    const hasScope = isAdmin || (isOrg && currentTenantId) || (isContrib && currentOrgId);
    if (!gated) return () => {};
    if (!hasScope && !isAdmin) return () => {};
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('per_page', '10');
        if (useCursorMode) {
          params.set('mode', 'cursor');
          const cursor = cursorMapRef.current[page] || '';
          if (cursor) params.set('cursor', String(cursor));
          // Force server sort to canonical cursor order
          params.delete('sort_by');
          params.delete('sort_dir');
        } else {
          params.set('page', String(page));
          if (sort && sort.id) {
            params.set('sort_by', String(sort.id));
            params.set('sort_dir', sort.dir === 'asc' ? 'asc' : 'desc');
          }
        }
        if (isAdmin) {
          if (organizationId) params.set('organization_id', String(organizationId));
        }
        if (lakeId) params.set('lake_id', String(lakeId));
        if (status) params.set('status', String(status));
        if ((isOrg || isContrib) && memberId) params.set('created_by_user_id', String(memberId));
        if (year) params.set('year', String(year));
        if (quarter) params.set('quarter', String(quarter));
        if (month) params.set('month', String(month));
        if (q) params.set('q', String(q));
        const deriveRange = () => {
          if (dateFrom || dateTo) return { from: dateFrom || null, to: dateTo || null };
          const y = year ? Number(year) : null;
          const qv = quarter ? Number(quarter) : null;
          const m = month ? Number(month) : null;
          if (!y) return { from: null, to: null };
          if (m) { const start = new Date(y, m - 1, 1); const end = new Date(y, m, 0); return { from: start.toISOString(), to: end.toISOString() }; }
          if (qv) { const sm = (qv - 1) * 3; const start = new Date(y, sm, 1); const end = new Date(y, sm + 3, 0); return { from: start.toISOString(), to: end.toISOString() }; }
          const start = new Date(y, 0, 1); const end = new Date(y, 12, 0); return { from: start.toISOString(), to: end.toISOString() };
        };
        const range = deriveRange();
        if (range.from) params.set('sampled_from', range.from);
        if (range.to) params.set('sampled_to', range.to);

        const basePath = isAdmin
          ? '/admin/sample-events'
          : isOrg
            ? `/org/${currentTenantId}/sample-events`
            : `/contrib/${currentOrgId}/sample-events`;

        const res = await cachedGet(`${basePath}?${params.toString()}`, { ttlMs: 2 * 60 * 1000 });
        if (!mounted) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : (Array.isArray(res?.data?.data) ? res.data.data : []);
        setTests(list);
        if (useCursorMode) {
          // Maintain synthetic totalPages to enable Next button if next_cursor exists
          const nextCursor = res?.next_cursor ?? res?.meta?.next_cursor ?? null;
          // Store cursor token for the next page
          if (nextCursor) {
            cursorMapRef.current[page + 1] = nextCursor;
            setTotalPages(page + 1);
          } else {
            setTotalPages(page);
          }
        } else {
          const cp = res?.current_page ?? 1; const lp = res?.last_page ?? 1;
          setTotalPages(Number(lp) || 1);
          if (Number(cp) > Number(lp)) setPage(Number(lp) || 1);
          else if (Number(cp) !== Number(page)) setPage(Number(cp) || 1);
        }
      } catch (e) {
        if (mounted) { setTests([]); setTotalPages(1); if (page !== 1) setPage(1); cursorMapRef.current = { 1: null }; }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isAdmin, isOrg, isContrib, authLoaded, currentTenantId, currentOrgId, resetSignal, page, organizationId, lakeId, status, memberId, dateFrom, dateTo, year, quarter, month, q, sort.id, sort.dir]);

  // Reset to first page on filter changes
  useEffect(() => {
    if (isAdmin || (authLoaded && (isOrg || isContrib))) {
      // Reset cursor map on filter changes
      cursorMapRef.current = { 1: null };
      setTotalPages(1);
      setPage(1);
    }
  }, [isAdmin, authLoaded, lakeId, status, memberId, organizationId, dateFrom, dateTo, year, quarter, month, q]);

  // Dynamic Y/Q/M options
  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams();
    if (isAdmin) {
      if (organizationId) params.set('organization_id', String(organizationId));
    } else {
      if (!authLoaded) return () => {};
    }
    if (lakeId) params.set('lake_id', String(lakeId));
    if (status) params.set('status', String(status));
    if ((isOrg || isContrib) && memberId) params.set('created_by_user_id', String(memberId));
    if (dateFrom) params.set('sampled_from', dateFrom);
    if (dateTo) params.set('sampled_to', dateTo);
    if (year) params.set('year', String(year));
    if (quarter) params.set('quarter', String(quarter));
    if (q) params.set('q', String(q));

    (async () => {
      try {
        const basePath = isAdmin
          ? '/admin/sample-events/options'
          : (isOrg
              ? `/org/${currentTenantId}/sample-events/options`
              : `/contrib/${currentOrgId}/sample-events/options`);
        const res = await cachedGet(`${basePath}?${params.toString()}`, { ttlMs: 60 * 1000 });
        if (!mounted) return;
        const data = res?.data ?? res;
        setYearOpts(Array.isArray(data?.years) ? data.years : []);
        setQuarterOpts(Array.isArray(data?.quarters) ? data.quarters : []);
        setMonthOpts(Array.isArray(data?.months) ? data.months : []);
      } catch (e) {
        if (mounted) { setYearOpts([]); setQuarterOpts([]); setMonthOpts([]); }
      }
    })();

    return () => { mounted = false; };
  }, [isAdmin, isOrg, isContrib, authLoaded, currentTenantId, currentOrgId, organizationId, lakeId, status, memberId, dateFrom, dateTo, year, quarter, q]);

  // Columns
  const baseColumns = useMemo(() => {
    const cols = [];
    if (isAdmin) {
      cols.push({ id: 'organization', header: 'Organization', width: 220, render: (r) => r?.organization?.name ?? r?.organization_name ?? '—', sortValue: (r) => r?.organization?.name ?? r?.organization_name ?? '' });
    }
    cols.push(
      { id: 'year', header: 'Year', width: 90, render: (row) => yqmFrom(row).year ?? '—', sortValue: (row) => yqmFrom(row).year ?? null },
      { id: 'quarter', header: 'Quarter', width: 90, render: (row) => { const q = yqmFrom(row).quarter; return Number.isFinite(q) ? `Q${q}` : '—'; }, sortValue: (row) => yqmFrom(row).quarter ?? null },
      { id: 'month_day', header: 'Month-Day', width: 160, render: (row) => { if (!row || !row.sampled_at) return '—'; try { const d = new Date(row.sampled_at); return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }); } catch { return '—'; } }, sortValue: (row) => (row?.sampled_at ? new Date(row.sampled_at) : null) },
      { id: 'lake_name', header: 'Lake', width: 200, render: (row) => row?.lake?.name ?? row?.lake_name ?? '—', sortValue: (row) => row?.lake?.name ?? row?.lake_name ?? '' },
      { id: 'station_name', header: 'Station', width: 220, render: (row) => {
          const name = row?.station?.name ?? row?.station_name;
          if (name) return name;
          if (row?.latitude != null && row?.longitude != null) {
            try { const lat = Number(row.latitude).toFixed(6); const lon = Number(row.longitude).toFixed(6); return `${lat}, ${lon}`; } catch { return '—'; }
          }
          return '—';
        }, sortValue: (row) => row?.station?.name ?? row?.station_name ?? (row?.latitude != null && row?.longitude != null ? `${row.latitude},${row.longitude}` : '') },
      { id: 'status', header: 'Status', width: 120, render: (row) => (<span className={`tag ${row.status === 'public' ? 'success' : 'muted'}`}>{row.status === 'public' ? 'Published' : 'Draft'}</span>), sortValue: (row) => (row.status === 'public' ? 1 : 0) },
      { id: 'logged_by', header: 'Logged By', width: 180, render: (row) => (row?.createdBy?.name ?? row?.created_by_name ?? '—'), sortValue: (row) => row?.createdBy?.name ?? row?.created_by_name ?? '' },
      { id: 'updated_by', header: 'Updated By', width: 180, render: (row) => (row?.updatedBy?.name ?? row?.updated_by_name ?? '—'), sortValue: (row) => row?.updatedBy?.name ?? row?.updated_by_name ?? '' },
      { id: 'logged_at', header: 'Logged At', width: 170, render: (row) => (row?.created_at ? new Date(row.created_at).toLocaleString() : '—'), sortValue: (row) => (row?.created_at ? new Date(row.created_at) : null) },
      { id: 'updated_at', header: 'Updated At', width: 170, render: (row) => (row?.updated_at ? new Date(row.updated_at).toLocaleString() : '—'), sortValue: (row) => (row?.updated_at ? new Date(row.updated_at) : null) },
    );
    return cols;
  }, [isAdmin]);

  const [visibleMap, setVisibleMap] = useState(() => Object.fromEntries([].concat([])));
  useEffect(() => {
    // initialize visibility when baseColumns changes
    const defaults = Object.fromEntries(
      baseColumns.map((c) => [c.id, !['logged_by','updated_by','logged_at','updated_at'].includes(c.id)])
    );
    setVisibleMap(defaults);
  }, [baseColumns]);

  const displayColumns = useMemo(() => baseColumns.filter((c) => visibleMap[c.id] !== false), [baseColumns, visibleMap]);

  // Client-side filtered array used for current page view; server does pagination
  const filtered = useMemo(() => {
    let from = dateFrom ? startOfDay(dateFrom) : null;
    let to = dateTo ? endOfDay(dateTo) : null;
    if (from && to && from > to) { const tmp = from; from = to; to = tmp; }

    return tests.filter((t) => {
      if (isAdmin && organizationId && String(t.organization_id) !== String(organizationId)) return false;
      if (lakeId && String(t.lake_id) !== String(lakeId)) return false;
      if (status && String(t.status) !== status) return false;
      if ((isOrg || isContrib) && memberId && String((t.created_by_user_id ?? t.createdBy?.id ?? t.created_by) || '') !== String(memberId)) return false;
      if (isContrib && typeof createdByUserIdFromQs !== 'undefined' && createdByUserIdFromQs && String(t.created_by_user_id) !== String(createdByUserIdFromQs)) return false;
      const yqm = yqmFrom(t);
      if (year && String(yqm.year) !== String(year)) return false;
      if (quarter && String(yqm.quarter) !== String(quarter)) return false;
      if (month && String(yqm.month) !== String(month)) return false;
      if (from || to) {
        const d = new Date(t.sampled_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [tests, isAdmin, isOrg, isContrib, organizationId, lakeId, status, memberId, year, quarter, month, dateFrom, dateTo, createdByUserIdFromQs]);

  // Sorting: derive sorted array from filtered using the selected column's sortValue or sensible fallback
  // For server-side sorting, the backend returns the list already sorted for the current page.
  const sorted = filtered;

  const handleSortChange = (colId) => {
    setSort((prev) => {
      if (!prev || prev.id !== colId) return { id: colId, dir: 'asc' };
      return { id: colId, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
    // reset to first page when sort changes so the server returns the correct page start
    setPage(1);
  };

  // Actions per variant
  const actions = useMemo(() => {
    if (isAdmin) {
      return [
        { label: 'View', title: 'View', icon: <FiEye />, onClick: async (row) => {
          try { closeLoading(); } catch {}
          try { showLoading('Loading', 'Fetching test…'); } catch {}
          try {
            const res = await api(`/admin/sample-events/${row.id}`);
            closeLoading();
            setSelected(res.data);
            setEditing(false);
            setOpen(true);
          } catch (e) {
            try { closeLoading(); } catch {}
            await alertError('Failed', 'Could not load event details.');
          }
        } },
        { label: 'Delete', title: 'Delete', type: 'delete', icon: <FiTrash2 />, onClick: async (row) => {
          // brief pre-confirm loader
          try { closeLoading(); } catch {}
          try { showLoading('Loading', 'Preparing delete…'); } catch {}
          try { await sleep(150); } catch {}
          closeLoading();
          const ok = await swalConfirm({ title: 'Delete this test?', text: 'This cannot be undone.', icon: 'warning', confirmButtonText: 'Delete' });
          if (!ok) return;
          try {
            showLoading('Deleting test', 'Please wait…');
            await api(`/admin/sample-events/${row.id}`, { method: 'DELETE' });
            setTests((prev) => prev.filter((t) => t.id !== row.id));
            invalidateHttpCache('/admin/sample-events');
            await alertSuccess('Deleted', 'The test was removed.');
          } catch (e) {
            const status = e?.response?.status || e?.status || null;
            const rawMsg = e?.response?.data?.message || e?.message || '';
            const isNotFound = status === 404 || /No query results for model/i.test(String(rawMsg));
            if (isNotFound) {
              // Treat as already removed; clean up UI and notify user gently
              setTests((prev) => prev.filter((t) => t.id !== row.id));
              try { invalidateHttpCache(basePath); } catch {}
              await alertSuccess('Already deleted', 'This test was already removed. The list has been refreshed.');
            } else {
              const friendly = /cannot delete published/i.test(rawMsg)
                ? 'You cannot delete a published test.'
                : (status === 403 ? 'You do not have permission to delete this test.' : (rawMsg || 'Please try again.'));
              await alertError('Delete not allowed', friendly);
            }
          } finally {
            closeLoading();
          }
        } },
      ];
    }
    if (isOrg) {
      const basePath = currentTenantId ? `/org/${currentTenantId}/sample-events` : '/admin/sample-events';
      return [
        { label: 'View', title: 'View', icon: <FiEye />, onClick: async (row) => {
          try { closeLoading(); } catch {}
          try { showLoading('Loading', 'Preparing view…'); } catch {}
          try { await sleep(150); } catch {}
          closeLoading();
          setSelected(row);
          setEditing(false);
          setOpen(true);
        } },
        { label: 'Edit', title: 'Edit', icon: <FiEdit2 />, onClick: async (row) => {
          const canPublish = currentUserRole === 'org_admin' || currentUserRole === 'superadmin';
          if (!(canPublish || (currentUserId && row.created_by_user_id === currentUserId))) {
            await alertError('Permission denied', 'You cannot edit this test.');
            return;
          }
          try { closeLoading(); } catch {}
          try { showLoading('Loading', 'Preparing edit form…'); } catch {}
          try { await sleep(150); } catch {}
          closeLoading();
          setSelected(row);
          setEditing(true);
          setOpen(true);
        } },
        { label: 'Delete', title: 'Delete', type: 'delete', icon: <FiTrash2 />, onClick: async (row) => {
          // brief pre-confirm loader
          try { closeLoading(); } catch {}
          try { showLoading('Loading', 'Preparing delete…'); } catch {}
          try { await sleep(150); } catch {}
          closeLoading();
          const ok = await swalConfirm({ title: 'Delete this test?', text: 'This cannot be undone.', icon: 'warning', confirmButtonText: 'Delete' });
          if (!ok) return;
          try {
            showLoading('Deleting test', 'Please wait…');
            await api(`${basePath}/${row.id}`, { method: 'DELETE' });
            try { invalidateHttpCache(basePath); } catch {}
            setTests((prev) => prev.filter((t) => t.id !== row.id));
            await alertSuccess('Deleted', 'The test was removed.');
          } catch (e) {
            const status = e?.response?.status || e?.status || null;
            const rawMsg = e?.response?.data?.message || e?.message || '';
            const isNotFound = status === 404 || /No query results for model/i.test(String(rawMsg));
            if (isNotFound) {
              // Treat as already removed; clean up UI and notify user gently
              setTests((prev) => prev.filter((t) => t.id !== row.id));
              try { invalidateHttpCache(basePath); } catch {}
              await alertSuccess('Already deleted', 'This test was already removed. The list has been refreshed.');
            } else {
              const friendly = /cannot delete published/i.test(rawMsg)
                ? 'You cannot delete a published test.'
                : (status === 403 ? 'You do not have permission to delete this test.' : (rawMsg || 'Please try again.'));
              await alertError('Delete not allowed', friendly);
            }
          } finally {
            closeLoading();
          }
        } },
      ];
    }
    // contrib
    return [
      { label: 'View', title: 'View', icon: <FiEye />, onClick: async (row) => {
        try { closeLoading(); } catch {}
        try { showLoading('Loading', 'Preparing view…'); } catch {}
        try { await sleep(150); } catch {}
        closeLoading();
        setSelected(row);
        setEditing(false);
        setOpen(true);
      } },
  { label: 'Edit', title: 'Edit', icon: <FiEdit2 />, visible: (row) => Boolean(currentUserId && String(row.created_by_user_id) === String(currentUserId) && row?.status !== 'public'), onClick: async (row) => {
        try { closeLoading(); } catch {}
        try { showLoading('Loading', 'Preparing edit form…'); } catch {}
        try { await sleep(150); } catch {}
        closeLoading();
        setSelected(row);
        setEditing(true);
        setOpen(true);
      } },
      { label: 'Delete', title: 'Delete', type: 'delete', icon: <FiTrash2 />, visible: (row) => Boolean(currentUserId && String(row.created_by_user_id) === String(currentUserId) && row?.status !== 'public'), onClick: async (row) => {
        // brief pre-confirm loader
        try { closeLoading(); } catch {}
        try { showLoading('Loading', 'Preparing delete…'); } catch {}
        try { await sleep(150); } catch {}
        closeLoading();
        const ok = await swalConfirm({ title: 'Delete this test?', text: 'This cannot be undone.', icon: 'warning', confirmButtonText: 'Delete' });
        if (!ok) return;
        try {
          if (!currentOrgId) return;
          const basePath = `/contrib/${currentOrgId}/sample-events`;
          showLoading('Deleting test', 'Please wait…');
          await api(`${basePath}/${row.id}`, { method: 'DELETE' });
          try { invalidateHttpCache(basePath); } catch {}
          setTests((prev) => prev.filter((t) => t.id !== row.id));
          await alertSuccess('Deleted', 'The test was removed.');
        } catch (e) {
          // Friendlier messaging for permission or not-found errors
          const status = e?.response?.status || e?.status || null;
          const rawMsg = e?.response?.data?.message || e?.message || '';
          const isNotFound = status === 404 || /No query results for model/i.test(String(rawMsg));
          if (isNotFound) {
            // Already deleted by someone else; clean up and inform gently
            setTests((prev) => prev.filter((t) => t.id !== row.id));
            try { invalidateHttpCache(basePath); } catch {}
            await alertSuccess('Already deleted', 'This test was already removed. The list has been refreshed.');
          } else {
            const friendly = /cannot delete published/i.test(rawMsg)
              ? 'You cannot delete a published test.'
              : (status === 403 ? 'You do not have permission to delete this test.' : (rawMsg || 'Please try again.'));
            await alertError('Delete not allowed', friendly);
          }
        } finally {
          closeLoading();
        }
      } },
    ];
  }, [isAdmin, isOrg, currentTenantId, currentUserRole, currentUserId, isContrib, currentOrgId]);

  // Toolbar node
  const doRefresh = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('per_page', '10');
      if (useCursorMode) {
        params.set('mode', 'cursor');
      } else {
        params.set('page', '1');
      }
      if (isAdmin) {
        if (organizationId) params.set('organization_id', String(organizationId));
      }
      if (lakeId) params.set('lake_id', String(lakeId));
      if (status) params.set('status', String(status));
      if ((isOrg || isContrib) && memberId) params.set('created_by_user_id', String(memberId));
      if (year) params.set('year', String(year));
      if (quarter) params.set('quarter', String(quarter));
      if (month) params.set('month', String(month));
      if (q) params.set('q', String(q));
      const deriveRange = () => {
        if (dateFrom || dateTo) return { from: dateFrom || null, to: dateTo || null };
        const y = year ? Number(year) : null;
        const qv = quarter ? Number(quarter) : null;
        const m = month ? Number(month) : null;
        if (!y) return { from: null, to: null };
        if (m) { const start = new Date(y, m - 1, 1); const end = new Date(y, m, 0); return { from: start.toISOString(), to: end.toISOString() }; }
        if (qv) { const sm = (qv - 1) * 3; const start = new Date(y, sm, 1); const end = new Date(y, sm + 3, 0); return { from: start.toISOString(), to: end.toISOString() }; }
        const start = new Date(y, 0, 1); const end = new Date(y, 12, 0); return { from: start.toISOString(), to: end.toISOString() };
      };
      const range = deriveRange();
      if (range.from) params.set('sampled_from', range.from);
      if (range.to) params.set('sampled_to', range.to);

      const basePath = isAdmin
        ? '/admin/sample-events'
        : isOrg
          ? `/org/${currentTenantId}/sample-events`
          : `/contrib/${currentOrgId}/sample-events`;

      const [testsRes, lakesOpts, paramsRes] = await Promise.allSettled([
        cachedGet(`${basePath}?${params.toString()}`, { ttlMs: 2 * 60 * 1000 }),
        fetchLakeOptions(),
        cachedGet('/options/parameters', { ttlMs: 20 * 60 * 1000 }),
      ]);

      if (testsRes.status === 'fulfilled') {
        const data = Array.isArray(testsRes.value.data) ? testsRes.value.data : [];
        if (isContrib && currentOrgId) {
          const orgId = currentOrgId;
          const filteredList = data.filter((t) => (
            (t.organization_id && String(t.organization_id) === String(orgId)) ||
            (t.tenant_id && String(t.tenant_id) === String(orgId)) ||
            (t.organization && t.organization.id && String(t.organization.id) === String(orgId)) ||
            (t.tenant && t.tenant.id && String(t.tenant.id) === String(orgId))
          ));
          setTests(filteredList);
        } else {
          setTests(data);
        }
      }
      if (lakesOpts.status === 'fulfilled') setLakes(Array.isArray(lakesOpts.value) ? lakesOpts.value : []);
      if (paramsRes.status === 'fulfilled') setParamCatalog(Array.isArray(paramsRes.value) ? paramsRes.value : []);
      // Reset cursor map and paging
      cursorMapRef.current = { 1: null };
      setResetSignal((x) => x + 1);
      setTotalPages(1);
      setPage(1);
    } catch (e) {
      // log only
    } finally {
      setLoading(false);
    }
  };

  const toolbarNode = (
    <TableToolbar
      tableId={tableId}
      search={{ value: q, onChange: setQ, placeholder: isAdmin ? 'ID, station, sampler, method, organization…' : 'ID, station, sampler, method…' }}
      filters={[]}
      columnPicker={{ columns: baseColumns.map((c) => ({ id: c.id, label: c.header })), visibleMap, onVisibleChange: (next) => setVisibleMap(next) }}
      onResetWidths={() => { setResetSignal((x) => x + 1); setSort({ id: 'sampled_at', dir: 'desc' }); try { localStorage.removeItem(SORT_KEY); } catch {} }}
      onRefresh={doRefresh}
      onToggleFilters={() => setFiltersOpen((v) => !v)}
      filtersBadgeCount={[
        ...(isAdmin ? [organizationId] : []),
        lakeId, status, (isOrg || isContrib) ? memberId : null, year, quarter, month, dateFrom, dateTo
      ].filter(Boolean).length}
      onExport={null}
      onAdd={null}
    />
  );

  // Filter fields per variant
  const filterFields = useMemo(() => {
    const fields = [];
    if (isAdmin) {
      fields.push({ id: 'organization', label: 'Organization', type: 'select', value: organizationId, onChange: setOrganizationId, options: [{ value: '', label: 'All organizations' }, ...orgs.map((o) => ({ value: String(o.id), label: o.name }))] });
    } else if (isOrg || isContrib) {
      fields.push({ id: 'lake', label: 'Lake', type: 'select', value: lakeId, onChange: setLakeId, options: [{ value: '', label: 'All lakes' }, ...lakes.map((l) => ({ value: String(l.id), label: l.name }))] });
      fields.push({ id: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: [{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'public', label: 'Published' }] });
      fields.push({ id: 'member', label: 'Member', type: 'select', value: memberId, onChange: setMemberId, options: [{ value: '', label: 'Any Member' }, ...members.map((m) => ({ value: String(m.id), label: m.name || m.full_name || m.display_name || m.email || `User ${m.id}` }))] });
    }

    // Y/Q/M group
    fields.push({
      id: 'yqm', type: 'group', children: [
        { id: 'year', label: 'Year', type: 'select', value: year, onChange: setYear, options: [{ value: '', label: 'Year' }, ...yearOpts.map((yy) => ({ value: String(yy), label: String(yy) }))] },
        { id: 'quarter', label: 'Quarter', type: 'select', value: quarter, onChange: setQuarter, options: [{ value: '', label: 'Quarter' }, ...quarterOpts.map((qv) => ({ value: String(qv), label: `Q${qv}` }))] },
        { id: 'month', label: 'Month', type: 'select', value: month, onChange: setMonth, options: [{ value: '', label: 'Month' }, ...monthOpts.map((mv) => ({ value: String(mv), label: monthName(mv) }))] },
      ]
    });

    // Date range
    fields.push({ id: 'from', label: 'From', type: 'date', value: dateFrom, onChange: setDateFrom });
    fields.push({ id: 'to', label: 'To', type: 'date', value: dateTo, onChange: setDateTo });

    if (isAdmin) {
      // Admin also needs Lake + Status (match existing UI)
      fields.splice(1, 0, { id: 'lake', label: 'Lake', type: 'select', value: lakeId, onChange: setLakeId, options: [{ value: '', label: 'All lakes' }, ...lakes.map((l) => ({ value: String(l.id), label: l.name }))] });
      fields.splice(2, 0, { id: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: [{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'public', label: 'Published' }] });
    }

    return fields;
  }, [isAdmin, isOrg, isContrib, organizationId, lakeId, status, memberId, year, quarter, month, dateFrom, dateTo, orgs, lakes, yearOpts, quarterOpts, monthOpts, members]);

  const clearAllFilters = () => {
    setLakeId(''); setStatus(''); setYear(''); setQuarter(''); setMonth(''); setDateFrom(''); setDateTo('');
    setMemberId(''); setOrganizationId('');
  };

  const basePath = isAdmin ? '/admin/sample-events' : (isOrg ? (currentTenantId ? `/org/${currentTenantId}/sample-events` : '/admin/sample-events') : (currentOrgId ? `/contrib/${currentOrgId}/sample-events` : null));
  const canPublish = isAdmin ? (currentUserRole === 'superadmin') : (isOrg ? (currentUserRole === 'org_admin' || currentUserRole === 'superadmin') : false);

  return {
    // UI bits
    toolbarNode,
    filterFields,
    filtersOpen,
    setFiltersOpen,

    // table
  displayColumns,
  // data for table
  filtered,
  sorted,
  sort,
  handleSortChange,
    actions,
    resetSignal,
    loading,
    page,
    totalPages,
    setPage,

    // modal + selections
    open,
    setOpen,
    selected,
    setSelected,
    editing,
    setEditing,

    // data
    paramCatalog,
    tests,
    setTests,

    // misc
    clearAllFilters,
    basePath,
    canPublish,
  };
}
