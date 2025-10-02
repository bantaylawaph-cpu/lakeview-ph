// resources/js/pages/ContributorInterface/contribWQTests.jsx
import React, { useMemo, useState, useEffect } from "react";
import TableLayout from "../../layouts/TableLayout";
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";
import OrgWQTestModal from "../../components/water-quality-test/OrgWQTestModal";
import { FiEye, FiEdit2, FiTrash2, FiDroplet } from "react-icons/fi";

import { api } from "../../lib/api";
import { fetchLakeOptions } from "../../lib/layers";
import { alertSuccess, alertError, alertWarning, confirm as swalConfirm } from "../../lib/alerts";

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

export default function ContribWQTests() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const [lakes, setLakes] = useState([]);
  const [tests, setTests] = useState([]);
  const [paramCatalog, setParamCatalog] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters/search
  const [q, setQ] = useState("");
  const [lakeId, setLakeId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [year, setYear] = useState("");
  const [quarter, setQuarter] = useState("");
  const [month, setMonth] = useState("");

  // modal state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);

  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api("/auth/me");
        if (!mounted) return;
        setCurrentUserId(me?.id ?? null);
        const org = me?.organization || (me?.tenant ? me.tenant : null);
        if (org?.id) setCurrentOrgId(org.id);
        else if (me?.organization_id) setCurrentOrgId(me.organization_id);
        else if (me?.tenant_id) setCurrentOrgId(me.tenant_id);
      } catch (e) {
        if (mounted) {
          setCurrentUserId(null);
          setCurrentOrgId(null);
        }
      } finally {
        if (mounted) setAuthLoaded(true);
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
          console.error('[ContribWQTests] failed to fetch lakes', e);
          if (mounted) setLakes([]);
        }
      })();

      (async () => {
        try {
          const params = await api('/options/parameters');
          if (!mounted) return;
          setParamCatalog(Array.isArray(params) ? params : []);
        } catch (e) {
          if (mounted) setParamCatalog([]);
        }
      })();
    }, 50);
    return () => { mounted = false; if (timer) clearTimeout(timer); };
  }, []);

  // fetch tests for this contributor's organization
  useEffect(() => {
    let mounted = true;
    if (!authLoaded) return () => {};
    if (!currentOrgId) return () => {};
    setLoading(true);
    (async () => {
      try {
        const basePath = `/contrib/${currentOrgId}/sample-events`;
        const res = await api(basePath);
        if (!mounted) return;
        const data = Array.isArray(res.data) ? res.data : [];
        // All events should already be tenant-scoped; still keep defensive filter
        const orgId = currentOrgId;
        const filtered = data.filter((t) => (
          (t.organization_id && String(t.organization_id) === String(orgId)) ||
          (t.tenant_id && String(t.tenant_id) === String(orgId)) ||
          (t.organization && t.organization.id && String(t.organization.id) === String(orgId)) ||
          (t.tenant && t.tenant.id && String(t.tenant.id) === String(orgId))
        ));
        setTests(filtered);
      } catch (e) {
        console.error('[ContribWQTests] failed to fetch tests', e);
        if (mounted) setTests([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authLoaded, currentOrgId, resetSignal]);

  const doRefresh = async () => {
    setLoading(true);
    try {
  const eventsPath = currentOrgId ? `/contrib/${currentOrgId}/sample-events` : null;
      if (!currentOrgId) return;
      const [testsRes, lakesOpts, paramsRes] = await Promise.allSettled([
        api(`/contrib/${currentOrgId}/sample-events`),
        fetchLakeOptions(),
        api('/options/parameters'),
      ]);

      if (testsRes.status === 'fulfilled') {
        const data = Array.isArray(testsRes.value.data) ? testsRes.value.data : [];
        let filtered;
        if (currentOrgId) {
          const orgId = currentOrgId;
          filtered = data.filter((t) => (
            (t.organization_id && String(t.organization_id) === String(orgId)) ||
            (t.tenant_id && String(t.tenant_id) === String(orgId)) ||
            (t.organization && t.organization.id && String(t.organization.id) === String(orgId)) ||
            (t.tenant && t.tenant.id && String(t.tenant.id) === String(orgId))
          ));
        } else {
          filtered = data;
        }
        setTests(filtered);
      }
      if (lakesOpts.status === 'fulfilled') {
        setLakes(Array.isArray(lakesOpts.value) ? lakesOpts.value : []);
      }
      if (paramsRes.status === 'fulfilled') {
        setParamCatalog(Array.isArray(paramsRes.value) ? paramsRes.value : []);
      }
      setResetSignal((x) => x + 1);
    } catch (e) {
      console.error('[ContribWQTests] refresh failed', e);
    } finally {
      setLoading(false);
    }
  };

  const baseColumns = useMemo(
    () => [
      { id: "year", header: "Year", width: 90, render: (row) => yqmFrom(row).year ?? "—", sortValue: (row) => yqmFrom(row).year ?? null },
      { id: "quarter", header: "Quarter", width: 90, render: (row) => { const q = yqmFrom(row).quarter; return Number.isFinite(q) ? `Q${q}` : "—"; }, sortValue: (row) => yqmFrom(row).quarter ?? null },
      { id: "month_day", header: "Month-Day", width: 160, render: (row) => { if (!row || !row.sampled_at) return "—"; try { const d = new Date(row.sampled_at); return d.toLocaleDateString(undefined, { month: "long", day: "numeric" }); } catch (e) { return "—"; } }, sortValue: (row) => (row?.sampled_at ? new Date(row.sampled_at) : null) },
      { id: "lake_name", header: "Lake", width: 200, render: (row) => row?.lake?.name ?? row?.lake_name ?? "—", sortValue: (row) => row?.lake?.name ?? row?.lake_name ?? "" },
      { id: "station_name", header: "Station", width: 220, render: (row) => { const name = row?.station?.name ?? row?.station_name; if (name) return name; if (row?.latitude != null && row?.longitude != null) { try { const lat = Number(row.latitude).toFixed(6); const lon = Number(row.longitude).toFixed(6); return `${lat}, ${lon}`; } catch (e) { return "—"; } } return "—"; }, sortValue: (row) => row?.station?.name ?? row?.station_name ?? (row?.latitude != null && row?.longitude != null ? `${row.latitude},${row.longitude}` : "") },
      { id: "status", header: "Status", width: 120, render: (row) => (<span className={`tag ${row.status === "public" ? "success" : "muted"}`}>{row.status === "public" ? "Published" : "Draft"}</span>), sortValue: (row) => (row.status === "public" ? 1 : 0) },
      { id: "logged_by", header: "Logged By", width: 180, render: (row) => (row?.createdBy?.name ?? row?.created_by_name ?? "—"), sortValue: (row) => row?.createdBy?.name ?? row?.created_by_name ?? "" },
      { id: "updated_by", header: "Updated By", width: 180, render: (row) => (row?.updatedBy?.name ?? row?.updated_by_name ?? "—"), sortValue: (row) => row?.updatedBy?.name ?? row?.updated_by_name ?? "" },
      { id: "logged_at", header: "Logged At", width: 170, render: (row) => (row?.created_at ? new Date(row.created_at).toLocaleString() : "—"), sortValue: (row) => (row?.created_at ? new Date(row.created_at) : null) },
      { id: "updated_at", header: "Updated At", width: 170, render: (row) => (row?.updated_at ? new Date(row.updated_at).toLocaleString() : "—"), sortValue: (row) => (row?.updated_at ? new Date(row.updated_at) : null) },
    ],
    []
  );

  const [visibleMap, setVisibleMap] = useState(() => Object.fromEntries(baseColumns.map((c) => [c.id, !["logged_by","updated_by","logged_at","updated_at"].includes(c.id)])));
  const displayColumns = useMemo(() => baseColumns.filter((c) => visibleMap[c.id] !== false), [baseColumns, visibleMap]);

  const filtered = useMemo(() => {
    let from = dateFrom ? startOfDay(dateFrom) : null;
    let to = dateTo ? endOfDay(dateTo) : null;
    if (from && to && from > to) { const tmp = from; from = to; to = tmp; }

    return tests.filter((t) => {
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
        const hay = [t.id, t.lake_name, t.lake?.name, t.station_name, t.station?.name, t.sampler_name, t.method, t.applied_standard_code].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [tests, q, lakeId, status, year, quarter, month, dateFrom, dateTo]);

  const actions = [
    {
      label: "View",
      title: "View",
      icon: <FiEye />,
      onClick: (row) => { setSelected(row); setEditing(false); setOpen(true); },
    },
    {
      label: "Edit",
      title: "Edit",
      icon: <FiEdit2 />,
      onClick: async (row) => {
        if (!(currentUserId && row.created_by_user_id === currentUserId)) {
          await alertError('Permission denied', 'You cannot edit this test.');
          return;
        }
        setSelected(row); setEditing(true); setOpen(true);
      },
    },
    {
      label: "Delete",
      title: "Delete",
      type: "delete",
      icon: <FiTrash2 />,
      onClick: async (row) => {
        if (!(currentUserId && row.created_by_user_id === currentUserId)) {
          await alertError('Permission denied', 'You cannot delete this test.');
          return;
        }
        const ok = await swalConfirm({ title: 'Delete this test?', text: `This cannot be undone.`, icon: 'warning', confirmButtonText: 'Delete' });
        if (!ok) return;
        try {
          if (!currentOrgId) return;
          const basePath = `/contrib/${currentOrgId}/sample-events`;
          await api(`${basePath}/${row.id}`, { method: "DELETE" });
          setTests((prev) => prev.filter((t) => t.id !== row.id));
          await alertSuccess('Deleted', 'The test was removed.');
        } catch (e) {
          await alertError('Delete failed', e?.message || 'Please try again.');
        }
      },
    },
  ];

  const years = useMemo(() => {
    const set = new Set(tests.map((t) => yqmFrom(t).year).filter((n) => Number.isFinite(n)));
    return Array.from(set).sort((a, b) => b - a);
  }, [tests]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const toolbarNode = (
    <TableToolbar
      tableId="contrib-wqtests"
      search={{ value: q, onChange: setQ, placeholder: "ID, station, sampler, method…" }}
      filters={[]}
      columnPicker={{ columns: baseColumns.map((c) => ({ id: c.id, label: c.header })), visibleMap, onVisibleChange: (next) => setVisibleMap(next) }}
      onResetWidths={() => setResetSignal((x) => x + 1)}
      onRefresh={doRefresh}
      onToggleFilters={() => setFiltersOpen((v) => !v)}
      filtersBadgeCount={[lakeId, status, year, quarter, month, dateFrom, dateTo].filter(Boolean).length}
      onExport={null}
      onAdd={null}
    />
  );

  const filterFields = [
    { id: 'lake', label: 'Lake', type: 'select', value: lakeId, onChange: setLakeId, options: [{ value: '', label: 'All lakes' }, ...lakes.map((l) => ({ value: String(l.id), label: l.name }))] },
    { id: 'status', label: 'Status', type: 'select', value: status, onChange: setStatus, options: [{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'public', label: 'Published' }] },
    { id: 'year', label: 'Year', type: 'select', value: year, onChange: setYear, options: [{ value: '', label: 'Year' }, ...years.map((y) => ({ value: String(y), label: String(y) }))] },
    { id: 'quarter', label: 'Quarter', type: 'select', value: quarter, onChange: setQuarter, options: [{ value: '', label: 'Quarter' }, { value: '1', label: 'Q1' }, { value: '2', label: 'Q2' }, { value: '3', label: 'Q3' }, { value: '4', label: 'Q4' }] },
    { id: 'month', label: 'Month', type: 'select', value: month, onChange: setMonth, options: [{ value: '', label: 'Month' }, ...[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => ({ value: String(m), label: String(m).padStart(2,'0') }))] },
    { id: 'from', label: 'From', type: 'date', value: dateFrom, onChange: setDateFrom },
    { id: 'to', label: 'To', type: 'date', value: dateTo, onChange: setDateTo },
  ];

  const clearAllFilters = () => { setLakeId(''); setStatus(''); setYear(''); setQuarter(''); setMonth(''); setDateFrom(''); setDateTo(''); };

  return (
    <div className="dashboard-content">
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiDroplet />
            <span>Water Quality Tests </span>
          </div>
        </div>
        <div className="dashboard-card-body">
          {toolbarNode}
          <FilterPanel open={filtersOpen} fields={filterFields} onClearAll={clearAllFilters} />
          <TableLayout
            tableId="contrib-wqtests"
            columns={displayColumns}
            data={filtered}
            pageSize={10}
            actions={actions}
            resetSignal={resetSignal}
            columnPicker={false}
            loading={loading}
            loadingLabel={loading ? 'Loading tests…' : null}
          />
        </div>
      </div>

      <OrgWQTestModal
        open={open}
        onClose={() => setOpen(false)}
        record={selected}
        editable={editing}
        parameterCatalog={paramCatalog}
        canPublish={false}
        basePath={currentOrgId ? `/contrib/${currentOrgId}/sample-events` : '/admin/sample-events'}
        onSave={async (updated) => {
          setTests((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
          setSelected(updated);
          await alertSuccess('Saved', 'Sampling event updated successfully.');
        }}
      />
    </div>
  );
}
