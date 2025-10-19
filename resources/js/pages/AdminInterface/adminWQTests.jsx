// resources/js/pages/AdminInterface/AdminWQTests.jsx
import React, { useMemo, useState, useEffect } from "react";
import TableLayout from "../../layouts/TableLayout";
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";
import OrgWQTestModal from "../../components/water-quality-test/OrgWQTestModal";
import { FiEye, FiTrash2, FiDroplet } from "react-icons/fi";
import DashboardHeader from '../../components/DashboardHeader';

import { api } from "../../lib/api";
import { fetchLakeOptions } from "../../lib/layers";
import { alertSuccess, alertError, alertWarning, confirm as swalConfirm } from "../../lib/alerts";

export default function AdminWQTests({ initialLakes = [], initialTests = [], parameterCatalog = [] }) {
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [lakes, setLakes] = useState(initialLakes);
  const [tests, setTests] = useState(initialTests);
  const [paramCatalog, setParamCatalog] = useState(parameterCatalog);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // filters/search
  const [q, setQ] = useState("");
  const [lakeId, setLakeId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [year, setYear] = useState("");
  const [quarter, setQuarter] = useState("");
  const [month, setMonth] = useState("");

  // modal state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  // Editing capability removed per request; modal will open in view-only mode.

  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api("/auth/me");
        if (!mounted) return;
        const role = (me?.role || "").toString().trim().replace(/\s+/g, "_").replace(/-/g, "_");
        setCurrentUserRole(role || null);
        setCurrentUserId(me?.id ?? null);
      } catch (e) {
        if (mounted) setCurrentUserRole(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer = null;
    timer = setTimeout(() => {
      (async () => {
        try {
          const opts = await fetchLakeOptions();
          if (!mounted) return;
          setLakes(Array.isArray(opts) ? opts : []);
        } catch (e) {
          console.error('[AdminWQTests] failed to fetch lakes', e);
          if (mounted) setLakes(initialLakes || []);
        }
      })();

      (async () => {
        try {
          const params = await api('/options/parameters');
          if (!mounted) return;
          setParamCatalog(Array.isArray(params) ? params : []);
        } catch (e) {
          if (mounted) setParamCatalog(parameterCatalog || []);
        }
      })();

      (async () => {
        try {
          const r = await api('/admin/tenants');
          if (!mounted) return;
          const data = Array.isArray(r?.data) ? r.data : [];
          setOrgs(data.map((o) => ({ id: o.id, name: o.name })));
        } catch (e) {
          if (mounted) setOrgs([]);
        }
      })();
    }, 50);
    return () => { mounted = false; if (timer) clearTimeout(timer); };
  }, []);

  // fetch tests
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const path = organizationId ? `/admin/sample-events?organization_id=${encodeURIComponent(organizationId)}` : '/admin/sample-events';
        const res = await api(path);
        if (!mounted) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setTests(data);
      } catch (e) {
        console.error('[AdminWQTests] failed to fetch tests', e);
        if (mounted) setTests(initialTests || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [resetSignal]);

  const doRefresh = async () => {
    setLoading(true);
    try {
      const eventsPath = organizationId ? `/admin/sample-events?organization_id=${encodeURIComponent(organizationId)}` : '/admin/sample-events';
      const [testsRes, lakesOpts, paramsRes] = await Promise.allSettled([
        api(eventsPath),
        fetchLakeOptions(),
        api('/options/parameters'),
      ]);

      if (testsRes.status === 'fulfilled') {
        const data = Array.isArray(testsRes.value.data) ? testsRes.value.data : [];
        setTests(data);
      }
      if (lakesOpts.status === 'fulfilled') {
        setLakes(Array.isArray(lakesOpts.value) ? lakesOpts.value : []);
      }
      if (paramsRes.status === 'fulfilled') {
        setParamCatalog(Array.isArray(paramsRes.value) ? paramsRes.value : []);
      }
      setResetSignal((x) => x + 1);
    } catch (e) {
      console.error('[AdminWQTests] refresh failed', e);
    } finally {
      setLoading(false);
    }
  };

  const isSuper = currentUserRole === 'superadmin';
  const canPublishAny = isSuper; // only superadmins may publish across orgs
  // const canEditAny removed alongside edit functionality.

  const baseColumns = useMemo(() => [
    { id: 'organization', header: 'Organization', width: 220, render: (r) => r?.organization?.name ?? r?.organization_name ?? '—', sortValue: (r) => r?.organization?.name ?? r?.organization_name ?? '' },
    { id: 'year', header: 'Year', width: 90, render: (row) => yqmFrom(row).year ?? '—', sortValue: (row) => yqmFrom(row).year ?? null },
    { id: 'quarter', header: 'Quarter', width: 90, render: (row) => { const q = yqmFrom(row).quarter; return Number.isFinite(q) ? `Q${q}` : '—'; }, sortValue: (row) => yqmFrom(row).quarter ?? null },
    { id: 'month_day', header: 'Month-Day', width: 160, render: (row) => { if (!row || !row.sampled_at) return '—'; try { const d = new Date(row.sampled_at); return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }); } catch (e) { return '—'; } }, sortValue: (row) => (row?.sampled_at ? new Date(row.sampled_at) : null) },
    { id: 'lake_name', header: 'Lake', width: 200, render: (row) => row?.lake?.name ?? row?.lake_name ?? '—', sortValue: (row) => row?.lake?.name ?? row?.lake_name ?? '' },
    { id: 'station_name', header: 'Station', width: 220, render: (row) => {
        const name = row?.station?.name ?? row?.station_name;
        if (name) return name;
        if (row?.latitude != null && row?.longitude != null) {
          try {
            const lat = Number(row.latitude).toFixed(6);
            const lon = Number(row.longitude).toFixed(6);
            return `${lat}, ${lon}`;
          } catch (e) {
            return '—';
          }
        }
        return '—';
      }, sortValue: (row) => row?.station?.name ?? row?.station_name ?? (row?.latitude != null && row?.longitude != null ? `${row.latitude},${row.longitude}` : '' ) },
    { id: 'status', header: 'Status', width: 120, render: (row) => (<span className={`tag ${row.status === 'public' ? 'success' : 'muted'}`}>{row.status === 'public' ? 'Published' : 'Draft'}</span>), sortValue: (row) => (row.status === 'public' ? 1 : 0) },
    { id: 'logged_by', header: 'Logged By', width: 180, render: (row) => (row?.createdBy?.name ?? row?.created_by_name ?? '—'), sortValue: (row) => row?.createdBy?.name ?? row?.created_by_name ?? '' },
    { id: 'updated_by', header: 'Updated By', width: 180, render: (row) => (row?.updatedBy?.name ?? row?.updated_by_name ?? '—'), sortValue: (row) => row?.updatedBy?.name ?? row?.updated_by_name ?? '' },
    { id: 'logged_at', header: 'Logged At', width: 170, render: (row) => (row?.created_at ? new Date(row.created_at).toLocaleString() : '—'), sortValue: (row) => (row?.created_at ? new Date(row.created_at) : null) },
    { id: 'updated_at', header: 'Updated At', width: 170, render: (row) => (row?.updated_at ? new Date(row.updated_at).toLocaleString() : '—'), sortValue: (row) => (row?.updated_at ? new Date(row.updated_at) : null) },
  ], []);

  const [visibleMap, setVisibleMap] = useState(() => Object.fromEntries(baseColumns.map((c) => [c.id, !['logged_by','updated_by','logged_at','updated_at'].includes(c.id)])));
  const displayColumns = useMemo(() => baseColumns.filter((c) => visibleMap[c.id] !== false), [baseColumns, visibleMap]);

  const filtered = useMemo(() => {
    let from = dateFrom ? startOfDay(dateFrom) : null;
    let to = dateTo ? endOfDay(dateTo) : null;
    if (from && to && from > to) { const tmp = from; from = to; to = tmp; }

    return tests.filter((t) => {
      if (organizationId && String(t.organization_id) !== String(organizationId)) return false;
      if (lakeId && String(t.lake_id) !== String(lakeId)) return false;
      if (status && String(t.status) !== status) return false;
      const yqm = yqmFrom(t);
      if (year && String(yqm.year) !== String(year)) return false;
      if (quarter && String(yqm.quarter) !== String(quarter)) return false;
      if (month && String(yqm.month) !== String(month)) return false;
      if (from || to) {
        const d = new Date(t.sampled_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      if (q) {
        const s = q.toLowerCase();
        const hay = [t.id, t.organization_name, t.organization?.name, t.lake_name, t.lake?.name, t.station_name, t.station?.name, t.sampler_name, t.method, t.applied_standard_code].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [tests, q, lakeId, organizationId, status, year, quarter, month, dateFrom, dateTo]);

  const actions = [
    { label: 'View', title: 'View', icon: <FiEye />, onClick: async (row) => { try { const res = await api(`/admin/sample-events/${row.id}`); setSelected(res.data); setOpen(true); } catch (e) { console.error('Failed to fetch event detail', e); await alertError('Failed', 'Could not load event details.'); } } },
    { label: 'Delete', title: 'Delete', type: 'delete', icon: <FiTrash2 />, onClick: async (row) => {
        // superadmins may delete any, org_admins may delete within org
        const ok = await swalConfirm({ title: 'Delete this test?', text: `This cannot be undone.`, icon: 'warning', confirmButtonText: 'Delete' });
        if (!ok) return;
        try {
          await api(`/admin/sample-events/${row.id}`, { method: 'DELETE' });
          setTests((prev) => prev.filter((t) => t.id !== row.id));
          await alertSuccess('Deleted', 'The test was removed.');
        } catch (e) {
          await alertError('Delete failed', e?.message || 'Please try again.');
        }
      } },
  ];

  const years = useMemo(() => { const set = new Set(tests.map((t) => yqmFrom(t).year).filter((n) => Number.isFinite(n))); return Array.from(set).sort((a, b) => b - a); }, [tests]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const toolbarNode = (
    <TableToolbar
      tableId="admin-wqtests"
      search={{ value: q, onChange: setQ, placeholder: 'ID, station, sampler, method, organization…' }}
      filters={[]}
      columnPicker={{ columns: baseColumns.map((c) => ({ id: c.id, label: c.header })), visibleMap, onVisibleChange: (next) => setVisibleMap(next) }}
      onResetWidths={() => setResetSignal((x) => x + 1)}
      onRefresh={doRefresh}
      onToggleFilters={() => setFiltersOpen((v) => !v)}
      filtersBadgeCount={[organizationId, lakeId, status, year, quarter, month, dateFrom, dateTo].filter(Boolean).length}
      onExport={null}
      onAdd={null}
    />
  );

  return (
    <div className="dashboard-content">
      <DashboardHeader
        icon={<FiDroplet />}
        title="Water Quality Tests"
        description="Browse, filter, and manage water quality test records across organizations."
      />
      <div className="dashboard-card-body">
        {toolbarNode}
        <FilterPanel
          open={filtersOpen}
          onClearAll={() => { setOrganizationId(''); setLakeId(''); setStatus(''); setYear(''); setQuarter(''); setMonth(''); setDateFrom(''); setDateTo(''); }}
          fields={[
            { id: 'organization', label: 'Organization', type: 'select', value: organizationId, onChange: setOrganizationId, options: [{ value: '', label: 'All organizations' }, ...orgs.map((o) => ({ value: String(o.id), label: o.name }))] },
            { id: 'lake', label: 'Lake', type: 'select', value: lakeId, onChange: setLakeId, options: [{ value: '', label: 'All lakes' }, ...lakes.map((l) => ({ value: String(l.id), label: l.name }))] },
            { id: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: [{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'public', label: 'Published' }] },
            { id: 'year', label: 'Year', type: 'select', value: year, onChange: setYear, options: [{ value: '', label: 'Year' }, ...years.map((y) => ({ value: String(y), label: String(y) }))] },
            { id: 'quarter', label: 'Quarter', type: 'select', value: quarter, onChange: setQuarter, options: [{ value: '', label: 'Quarter' }, { value: '1', label: 'Q1' }, { value: '2', label: 'Q2' }, { value: '3', label: 'Q3' }, { value: '4', label: 'Q4' }] },
            { id: 'month', label: 'Month', type: 'select', value: month, onChange: setMonth, options: [{ value: '', label: 'Month' }, ...[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => ({ value: String(m), label: String(m).padStart(2,'0') }))] },
            { id: 'from', label: 'From', type: 'date', value: dateFrom, onChange: setDateFrom, placeholder: 'From mm/dd/yyyy' },
            { id: 'to', label: 'To', type: 'date', value: dateTo, onChange: setDateTo, placeholder: 'To mm/dd/yyyy' },
          ]}
        />
        <TableLayout tableId="admin-wqtests" columns={displayColumns} data={filtered} pageSize={10} actions={actions} resetSignal={resetSignal} columnPicker={false} loading={loading} loadingLabel={loading ? 'Loading tests' : null} />
      </div>

      <OrgWQTestModal open={open} onClose={() => setOpen(false)} record={selected} editable={false} parameterCatalog={paramCatalog} canPublish={canPublishAny}
        onTogglePublish={async () => {
          if (!selected) return;
          try {
            const res = await api(`/admin/sample-events/${selected.id}/toggle-publish`, { method: 'POST' });
            setTests((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
            setSelected(res.data);
            await alertSuccess(res.data.status === 'public' ? 'Published' : 'Unpublished');
          } catch (e) {
            await alertError('Publish failed', e?.message || 'Please try again.');
          }
        }}
        onSave={(updated) => { setTests((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))); setSelected(updated); }}
      />
    </div>
  );
}
