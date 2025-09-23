// resources/js/pages/OrgInterface/OrgWQTests.jsx
import React, { useMemo, useState, useEffect } from "react";
import TableLayout from "../../layouts/TableLayout";
import TableToolbar from "../../components/table/TableToolbar";
import OrgWQTestModal from "../../components/water-quality-test/OrgWQTestModal";
import { FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";

// Inline mock data removed. Real data should be provided by parent components or fetched from the API.

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

import { api } from "../../lib/api";
import { fetchLakeOptions } from "../../lib/layers";
import { alertSuccess, alertError, alertWarning, confirm as swalConfirm } from "../../lib/alerts";

export default function OrgWQTests({
  initialLakes = [],
  initialTests = [],
  parameterCatalog = [],
}) {
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api("/auth/me");
        if (!mounted) return;
        // Normalize backend role values like 'org_admin' to frontend-friendly strings
        const role = (me?.role || "")
          .toString()
          .trim()
          .replace(/\s+/g, "_")
          .replace(/-/g, "_");
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

    // debounce to avoid rapid back-to-back requests triggering 429
    timer = setTimeout(() => {
      (async () => {
        try {
          const opts = await fetchLakeOptions();
          console.debug('[OrgWQTests] fetched lakes:', Array.isArray(opts) ? opts.length : typeof opts, opts);
          if (!mounted) return;
          setLakes(Array.isArray(opts) ? opts : []);
        } catch (e) {
          console.error('[OrgWQTests] failed to fetch lakes', e);
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
    }, 50);

    return () => { mounted = false; if (timer) clearTimeout(timer); };
  }, []);

  const canPublish = currentUserRole === "org_admin" || currentUserRole === "superadmin";

  const [lakes, setLakes] = useState(initialLakes);
  const [tests, setTests] = useState(initialTests);
  const [paramCatalog, setParamCatalog] = useState(parameterCatalog);
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
  // fetch tests when the page mounts or when resetSignal increments
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await api('/admin/sample-events');
        if (!mounted) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setTests(data);

        // Resolve missing user names (createdBy/updatedBy) when backend didn't include relation
        (async () => {
          try {
            const ids = new Set();
            data.forEach((r) => {
              if (!r?.createdBy?.name && r?.created_by_user_id) ids.add(r.created_by_user_id);
              if (!r?.updatedBy?.name && r?.updated_by_user_id) ids.add(r.updated_by_user_id);
            });
            if (!ids.size) return;

            const cache = new Map();
            async function fetchUserName(id) {
              if (!id) return null;
              if (cache.has(id)) return cache.get(id);
              let name = null;
              const tryPaths = [`/admin/users/${id}`, `/users/${id}`];
              for (const p of tryPaths) {
                try {
                  const r = await api(p);
                  // r may be {data:{...}} or direct object
                  const u = r?.data ?? r;
                  if (u && (u.name || u.full_name || u.display_name)) {
                    name = u.name || u.full_name || u.display_name;
                    break;
                  }
                } catch (e) {
                  // ignore and try next
                }
              }
              cache.set(id, name);
              return name;
            }

            // Resolve in parallel but limited to avoid flooding: batch of 6
            const idsArr = Array.from(ids);
            for (let i = 0; i < idsArr.length; i += 6) {
              const batch = idsArr.slice(i, i + 6);
              const promises = batch.map((id) => fetchUserName(id));
              const names = await Promise.all(promises);
              // update tests with any found names
              setTests((prev) => prev.map((r) => {
                const copy = { ...r };
                if (!copy?.createdBy?.name && copy?.created_by_user_id) {
                  const idx = batch.indexOf(copy.created_by_user_id);
                  const nm = idx !== -1 ? names[idx] : cache.get(copy.created_by_user_id);
                  if (nm) copy.createdBy = { name: nm };
                }
                if (!copy?.updatedBy?.name && copy?.updated_by_user_id) {
                  const idx2 = batch.indexOf(copy.updated_by_user_id);
                  const nm2 = idx2 !== -1 ? names[idx2] : cache.get(copy.updated_by_user_id);
                  if (nm2) copy.updatedBy = { name: nm2 };
                }
                return copy;
              }));
            }
          } catch (e) {
            // ignore failures — UI will still show fallback
            console.debug('[OrgWQTests] user name resolution failed', e);
          }
        })();
      } catch (e) {
        console.error('[OrgWQTests] failed to fetch tests', e);
        if (mounted) setTests(initialTests || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [resetSignal]);

  // Full refresh handler: reload tests, lakes and parameter catalog
  const doRefresh = async () => {
    setLoading(true);
    try {
      const [testsRes, lakesOpts, paramsRes] = await Promise.allSettled([
        api('/admin/sample-events'),
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
      console.error('[OrgWQTests] refresh failed', e);
    } finally {
      setLoading(false);
    }
  };

  const baseColumns = useMemo(
    () => [
      { id: "year", header: "Year", width: 90, render: (row) => yqmFrom(row).year ?? "—", sortValue: (row) => yqmFrom(row).year ?? null },
      {
        id: "quarter",
        header: "Quarter",
        width: 90,
        render: (row) => {
          const q = yqmFrom(row).quarter;
          return Number.isFinite(q) ? `Q${q}` : "—";
        },
        sortValue: (row) => yqmFrom(row).quarter ?? null,
      },
      {
        id: "month_day",
        header: "Month-Day",
        width: 160,
        render: (row) => {
          if (!row || !row.sampled_at) return "—";
          try {
            const d = new Date(row.sampled_at);
            return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
          } catch (e) {
            return "—";
          }
        },
        sortValue: (row) => (row?.sampled_at ? new Date(row.sampled_at) : null),
      },
      { id: "lake_name", header: "Lake", width: 200, render: (row) => row?.lake?.name ?? row?.lake_name ?? "—", sortValue: (row) => row?.lake?.name ?? row?.lake_name ?? "" },
      { id: "station_name", header: "Station", width: 220, render: (row) => {
          const name = row?.station?.name ?? row?.station_name;
          if (name) return name;
          if (row?.latitude != null && row?.longitude != null) {
            try {
              const lat = Number(row.latitude).toFixed(6);
              const lon = Number(row.longitude).toFixed(6);
              return `${lat}, ${lon}`;
            } catch (e) {
              return "—";
            }
          }
          return "—";
        },
        sortValue: (row) => row?.station?.name ?? row?.station_name ?? (row?.latitude != null && row?.longitude != null ? `${row.latitude},${row.longitude}` : ""),
      },
      {
        id: "status",
        header: "Status",
        width: 120,
        render: (row) => (
          <span className={`tag ${row.status === "public" ? "success" : "muted"}`}>
            {row.status === "public" ? "Published" : "Draft"}
          </span>
        ),
        sortValue: (row) => (row.status === "public" ? 1 : 0),
      },

      // Hidden/toggleable columns
  { id: "logged_by", header: "Logged By", width: 180, render: (row) => (row?.createdBy?.name ?? row?.created_by_name ?? "—"), sortValue: (row) => row?.createdBy?.name ?? row?.created_by_name ?? "" },
  { id: "updated_by", header: "Updated By", width: 180, render: (row) => (row?.updatedBy?.name ?? row?.updated_by_name ?? "—"), sortValue: (row) => row?.updatedBy?.name ?? row?.updated_by_name ?? "" },
      { id: "logged_at", header: "Logged At", width: 170, render: (row) => (row?.created_at ? new Date(row.created_at).toLocaleString() : "—"), sortValue: (row) => (row?.created_at ? new Date(row.created_at) : null) },
      { id: "updated_at", header: "Updated At", width: 170, render: (row) => (row?.updated_at ? new Date(row.updated_at).toLocaleString() : "—"), sortValue: (row) => (row?.updated_at ? new Date(row.updated_at) : null) },
    ],
    []
  );

  // Column visibility: show Year/Quarter/Month-Day/Lake/Station/Status by default;
  // hide logged/updated columns by default but make them toggleable
  const [visibleMap, setVisibleMap] = useState(() =>
    Object.fromEntries(
      baseColumns.map((c) => [
        c.id,
        !["logged_by", "updated_by", "logged_at", "updated_at"].includes(c.id),
      ])
    )
  );
  const displayColumns = useMemo(
    () => baseColumns.filter((c) => visibleMap[c.id] !== false),
    [baseColumns, visibleMap]
  );

  const filtered = useMemo(() => {
    // normalize date range (inclusive); auto-swap if inverted
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
        const hay = [
          t.id,
          t.lake_name,
          t.lake?.name,
          t.station_name,
          t.station?.name,
          t.sampler_name,
          t.method,
          t.applied_standard_code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
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
        if (!(canPublish || (currentUserId && row.created_by_user_id === currentUserId))) {
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
        const ok = await swalConfirm({
          title: 'Delete this test?',
          text: `This cannot be undone.`,
          icon: 'warning',
          confirmButtonText: 'Delete',
        });
        if (!ok) return;
        try {
          await api(`/admin/sample-events/${row.id}`, { method: "DELETE" });
          setTests((prev) => prev.filter((t) => t.id !== row.id));
          await alertSuccess('Deleted', 'The test was removed.');
        } catch (e) {
          await alertError('Delete failed', e?.message || 'Please try again.');
        }
      },
    },
  ];

  // Unique years from data (for Year filter)
  const years = useMemo(() => {
    const set = new Set(tests.map((t) => yqmFrom(t).year).filter((n) => Number.isFinite(n)));
    return Array.from(set).sort((a, b) => b - a);
  }, [tests]);

  const toolbarNode = (
    <TableToolbar
      tableId="org-wqtests"
      search={{ value: q, onChange: setQ, placeholder: "ID, station, sampler, method…" }}
      filters={[
        {
          id: "lake",
          label: "Lake",
          type: "select",
          value: lakeId,
          onChange: setLakeId,
          options: [{ value: "", label: "All lakes" }, ...lakes.map((l) => ({ value: String(l.id), label: l.name }))],
        },
        {
          id: "status",
          label: "Status",
          type: "select",
          value: status,
          onChange: setStatus,
    options: [{ value: "", label: "All" }, { value: "draft", label: "Draft" }, { value: "public", label: "Published" }],
        },
        // Period selects (compact; stay on one line)
        { id: "year", label: "Year", type: "select", value: year, onChange: setYear,
          options: [{ value: "", label: "Year" }, ...years.map((y) => ({ value: String(y), label: String(y) }))] },
        { id: "quarter", label: "Quarter", type: "select", value: quarter, onChange: setQuarter,
          options: [{ value: "", label: "Quarter" }, { value: "1", label: "Q1" }, { value: "2", label: "Q2" }, { value: "3", label: "Q3" }, { value: "4", label: "Q4" }] },
        { id: "month", label: "Month", type: "select", value: month, onChange: setMonth,
          options: [{ value: "", label: "Month" }, ...[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => ({ value: String(m), label: String(m).padStart(2,"0") }))] },
  // Date range (inclusive)
  { id: "from", label: "From", type: "date", value: dateFrom, onChange: setDateFrom, placeholder: "From mm/dd/yyyy" },
  { id: "to",   label: "To",   type: "date", value: dateTo,   onChange: setDateTo,   placeholder: "To mm/dd/yyyy" },
      ]}
      columnPicker={{
        columns: baseColumns.map((c) => ({ id: c.id, label: c.header })),
        visibleMap,
        onVisibleChange: (next) => setVisibleMap(next),
      }}
  onResetWidths={() => setResetSignal((x) => x + 1)}
  onRefresh={doRefresh}
      onExport={null}
      onAdd={null}
    />
  );

  return (
    <div className="dashboard-content">
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-title"><span>Water Quality Tests</span></div>
        </div>
        <div className="dashboard-card-body">
          {toolbarNode}
          <TableLayout
            tableId="org-wqtests"
            columns={displayColumns}
            data={filtered}
            pageSize={10}
            actions={actions}
            resetSignal={resetSignal}
            columnPicker={false}
          />
        </div>
      </div>

      <OrgWQTestModal
        open={open}
        onClose={() => setOpen(false)}
        record={selected}
        editable={editing}                     // <-- edit vs view
    parameterCatalog={paramCatalog}       // optional, for add-row select
        canPublish={canPublish}
        onTogglePublish={() => {
          if (!selected) return;
          (async () => {
            try {
              const res = await api(`/admin/sample-events/${selected.id}/toggle-publish`, { method: 'POST' });
              // backend returns updated record
              setTests((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
              setSelected(res.data);
              await alertSuccess(res.data.status === 'public' ? 'Published' : 'Unpublished');
            } catch (e) {
              // fallback local toggle
              setTests((prev) =>
                prev.map((t) =>
                  t.id === selected.id
                    ? { ...t, status: t.status === "public" ? "draft" : "public" }
                    : t
                )
              );
              setSelected((s) =>
                s ? { ...s, status: s.status === "public" ? "draft" : "public" } : s
              );
              await alertWarning('Offline toggle', 'Toggled locally due to API error.');
            }
          })();
        }}
        onSave={(updated) => {                 // <-- persist edits from modal
          setTests((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
          setSelected(updated);
        }}
      />
    </div>
  );
}
