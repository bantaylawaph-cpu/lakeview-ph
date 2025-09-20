// resources/js/pages/OrgInterface/OrgWQTests.jsx
import React, { useMemo, useState, useEffect } from "react";
import TableLayout from "../../layouts/TableLayout";
import TableToolbar from "../../components/table/TableToolbar";
import OrgWQTestModal from "../../components/water-quality-test/OrgWQTestModal";
import { FiEye, FiEdit2, FiTrash2, FiGlobe } from "react-icons/fi";

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
      } catch (e) {
        console.error('[OrgWQTests] failed to fetch tests', e);
        if (mounted) setTests(initialTests || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [resetSignal]);

  const baseColumns = useMemo(
    () => [
      { id: "id", header: "ID", width: 110, accessor: "id" },
      {
        id: "status",
        header: "Status",
        width: 120,
        render: (row) => (
          <span className={`tag ${row.status === "public" ? "success" : "muted"}`}>
            {row.status === "public" ? "Published" : "Draft"}
          </span>
        ),
      },
      { id: "lake_name", header: "Lake", width: 200, accessor: "lake_name" },
      { id: "station_name", header: "Station", width: 220, render: (row) => row.station_name || "—" },
      { id: "year", header: "Year", width: 90, render: (row) => yqmFrom(row).year ?? "—" },
      { id: "quarter", header: "Qtr", width: 70, render: (row) => yqmFrom(row).quarter ?? "—" },
      { id: "month", header: "Month", width: 90, render: (row) => yqmFrom(row).month ?? "—" },
      { id: "sampler_name", header: "Sampler", width: 160, accessor: "sampler_name" },
      { id: "applied_standard_code", header: "Standard", width: 150, accessor: "applied_standard_code" },
    ],
    []
  );

  // Column visibility: default-hide year/quarter/month
  const [visibleMap, setVisibleMap] = useState(() =>
    Object.fromEntries(
      baseColumns.map((c) => [c.id, !["year", "quarter", "month"].includes(c.id)])
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
        const hay = [t.id, t.lake_name, t.station_name, t.sampler_name, t.method, t.applied_standard_code]
          .join(" ").toLowerCase();
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
      onClick: (row) => {
        if (!(canPublish || (currentUserId && row.created_by_user_id === currentUserId))) {
          alert('You do not have permission to edit this test.');
          return;
        }
        setSelected(row); setEditing(true); setOpen(true);
      },
    },
        ...(canPublish ? [{
      label: "Publish/Unpublish",
      title: "Toggle Publish",
      icon: <FiGlobe />,
      onClick: (row) => {
        setTests((prev) =>
          prev.map((t) => (t.id === row.id ? { ...t, status: t.status === "public" ? "draft" : "public" } : t))
        );
      },
    }] : []),
    {
      label: "Delete",
      title: "Delete",
      type: "delete",
      icon: <FiTrash2 />,
      onClick: async (row) => {
        if (!confirm("Delete this test?")) return;
        try {
          await api(`/admin/sample-events/${row.id}`, { method: "DELETE" });
          setTests((prev) => prev.filter((t) => t.id !== row.id));
        } catch (e) {
          alert('Delete failed: ' + e.message);
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
        { id: "quarter", label: "Qtr", type: "select", value: quarter, onChange: setQuarter,
          options: [{ value: "", label: "Qtr" }, { value: "1", label: "Q1" }, { value: "2", label: "Q2" }, { value: "3", label: "Q3" }, { value: "4", label: "Q4" }] },
        { id: "month", label: "Month", type: "select", value: month, onChange: setMonth,
          options: [{ value: "", label: "Month" }, ...[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => ({ value: String(m), label: String(m).padStart(2,"0") }))] },
        // Date range (inclusive)
        { id: "from", label: "From", type: "date", value: dateFrom, onChange: setDateFrom },
        { id: "to",   label: "To",   type: "date", value: dateTo,   onChange: setDateTo   },
      ]}
      columnPicker={{
        columns: baseColumns.map((c) => ({ id: c.id, label: c.header, locked: c.id === "id" })),
        visibleMap,
        onVisibleChange: (next) => setVisibleMap({ ...next, id: true }),
      }}
      onResetWidths={() => setResetSignal((x) => x + 1)}
      onRefresh={() => setResetSignal((x) => x + 1)}
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
