// resources/js/pages/OrgInterface/OrgWQTests.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableLayout from "../../layouts/TableLayout";
import TableToolbar from "../../components/table/TableToolbar";
import OrgWQTestModal from "../../components/water-quality-test/OrgWQTestModal";
import { FiEye, FiEdit2, FiTrash2, FiGlobe } from "react-icons/fi";
import {
  fetchOrgContext,
  fetchLakeOptions,
  fetchParameterOptions,
  fetchOrgWqTests,
  fetchOrgWqTest,
  updateOrgWqTest,
  deleteOrgWqTest,
  setOrgWqTestStatus,
} from "../../lib/waterQuality";
import { alertError, alertSuccess, confirm } from "../../utils/alerts";
import { extractErrorMessage } from "../../utils/errors";

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

export default function OrgWQTests() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [role, setRole] = useState("org-admin");
  const [lakes, setLakes] = useState([]);
  const [tests, setTests] = useState([]);
  const [parameterCatalog, setParameterCatalog] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const canPublish = role === "org-admin" || role === "system-admin";

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
    let cancelled = false;

    const loadContext = async () => {
      setLoadingContext(true);
      try {
        const ctx = await fetchOrgContext();
        if (cancelled) return;

        const membership = ctx.membership;
        if (!membership) {
          setError("You must belong to an active organization to view tests.");
          alertError("No organization", "You must belong to an active organization to view tests.");
          return;
        }

        setOrganization({
          id: membership.organization_id,
          name: membership.organization_name,
        });
        const normalizedRole =
          membership.role === "org_admin"
            ? "org-admin"
            : membership.role === "system_admin"
              ? "system-admin"
              : membership.role;
        setRole(normalizedRole);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          const message = extractErrorMessage(err);
          setError(message);
          alertError("Failed to load organization", message);
        }
      } finally {
        if (!cancelled) {
          setLoadingContext(false);
        }
      }
    };

    loadContext();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const [lakeRows, parameterRows] = await Promise.all([
          fetchLakeOptions(),
          fetchParameterOptions(),
        ]);

        if (!cancelled) {
          setLakes(lakeRows);
          setParameterCatalog(parameterRows);
        }
      } catch (err) {
        if (!cancelled) {
          alertError("Failed to load reference data", extractErrorMessage(err));
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadTests = useCallback(async () => {
    if (!organization?.id) {
      return;
    }

    setFetching(true);
    setError(null);
    try {
      const rows = await fetchOrgWqTests({
        organizationId: organization.id,
        lakeId: lakeId || undefined,
        status: status || undefined,
        sampledFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        sampledTo: dateTo ? `${dateTo}T23:59:59` : undefined,
      });
      setTests(rows);
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      alertError("Failed to load tests", message);
    } finally {
      setFetching(false);
    }
  }, [organization?.id, lakeId, status, dateFrom, dateTo]);

  useEffect(() => {
    if (organization?.id) {
      loadTests();
    }
  }, [organization?.id, loadTests]);

  const toNumberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const openTestModal = useCallback(async (row, isEdit) => {
    setSelected(row);
    setEditing(isEdit);
    setOpen(true);
    try {
      const detail = await fetchOrgWqTest(row.id, { organizationId: organization?.id });
      setSelected(detail);
    } catch (err) {
      alertError("Failed to load test", extractErrorMessage(err));
      setOpen(false);
      setSelected(null);
    }
  }, [organization?.id]);

  const handleTogglePublish = useCallback(async (record) => {
    if (!organization?.id) return;
    const next = record.status === "published" ? "draft" : "published";

    try {
      const updated = await setOrgWqTestStatus(record.id, next, { organizationId: organization.id });
      setTests((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
      alertSuccess(
        next === "published" ? "Test published" : "Test set to draft",
        next === "published"
          ? "The water quality test is now public."
          : "The water quality test is now a draft."
      );
    } catch (err) {
      alertError("Failed to update status", extractErrorMessage(err));
    }
  }, [organization?.id]);

  const handleDeleteTest = useCallback(async (record) => {
    const confirmed = await confirm("Delete test?", "This action cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteOrgWqTest(record.id);
      setTests((prev) => prev.filter((t) => t.id !== record.id));
      if (selected?.id === record.id) {
        setOpen(false);
        setSelected(null);
      }
      alertSuccess("Water quality test deleted", "The test has been removed.");
    } catch (err) {
      alertError("Failed to delete test", extractErrorMessage(err));
    }
  }, [selected]);

  const handleSaveModal = useCallback(async (draft) => {
    if (!organization?.id) {
      alertError("No organization", "Please wait for the organization context to load.");
      return;
    }

    try {
      const payload = {
        organization_id: organization.id,
        lake_id: draft.lake_id,
        station_id: draft.station_id,
        applied_standard_id: draft.applied_standard_id,
        sampled_at: draft.sampled_at,
        sampler_name: draft.sampler_name,
        method: draft.method,
        weather: draft.weather,
        notes: draft.notes,
        status: draft.status,
        latitude: toNumberOrNull(draft.lat),
        longitude: toNumberOrNull(draft.lng),
        measurements: Array.isArray(draft.results)
          ? draft.results
              .map((r) => {
                const parameterId = Number(r.parameter_id);
                if (!Number.isFinite(parameterId)) return null;
                return {
                  parameter_id: parameterId,
                  value: toNumberOrNull(r.value),
                  unit: r.unit?.trim() ? r.unit : null,
                  depth_m: toNumberOrNull(r.depth_m),
                  remarks: r.remarks?.trim() ? r.remarks : null,
                };
              })
              .filter(Boolean)
          : undefined,
      };

      const updated = await updateOrgWqTest(draft.id, payload);
      setTests((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelected(updated);
      alertSuccess("Water quality test updated", "Changes saved.");
    } catch (err) {
      alertError("Failed to update test", extractErrorMessage(err));
    }
  }, [organization?.id]);

  const baseColumns = useMemo(
    () => [
      { id: "id", header: "ID", width: 110, accessor: "id" },
      {
        id: "status",
        header: "Status",
        width: 120,
        render: (row) => (
          <span className={`tag ${row.status === "published" ? "success" : "muted"}`}>
            {row.status === "published" ? "Published" : "Draft"}
          </span>
        ),
      },
      { id: "lake_name", header: "Lake", width: 200, accessor: "lake_name" },
      { id: "station_name", header: "Station", width: 220, render: (row) => row.station_name || "—" },
      { id: "sampled_at", header: "Sampled At", width: 180, render: (row) => new Date(row.sampled_at).toLocaleString() },
      // Optional period columns (default hidden via ColumnPicker initial state below)
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
      onClick: (row) => openTestModal(row, false),
    },
    {
      label: "Edit",
      title: "Edit",
      icon: <FiEdit2 />,
      onClick: (row) => openTestModal(row, true),
    },
    ...(canPublish
      ? [{
          label: "Publish/Unpublish",
          title: "Toggle Publish",
          icon: <FiGlobe />,
          onClick: (row) => handleTogglePublish(row),
        }]
      : []),
    {
      label: "Delete",
      title: "Delete",
      type: "delete",
      icon: <FiTrash2 />,
      onClick: (row) => handleDeleteTest(row),
    },
  ];

  const handleRefresh = () => {
    loadTests();
    setResetSignal((x) => x + 1);
  };

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
          options: [{ value: "", label: "All" }, { value: "draft", label: "Draft" }, { value: "published", label: "Published" }],
        },
        { id: "year", label: "Year", type: "select", value: year, onChange: setYear,
          options: [{ value: "", label: "Year" }, ...years.map((y) => ({ value: String(y), label: String(y) }))] },
        { id: "quarter", label: "Qtr", type: "select", value: quarter, onChange: setQuarter,
          options: [{ value: "", label: "Qtr" }, { value: "1", label: "Q1" }, { value: "2", label: "Q2" }, { value: "3", label: "Q3" }, { value: "4", label: "Q4" }] },
        { id: "month", label: "Month", type: "select", value: month, onChange: setMonth,
          options: [{ value: "", label: "Month" }, ...[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => ({ value: String(m), label: String(m).padStart(2,"0") }))] },
        { id: "from", label: "From", type: "date", value: dateFrom, onChange: setDateFrom },
        { id: "to",   label: "To",   type: "date", value: dateTo,   onChange: setDateTo   },
      ]}
      columnPicker={{
        columns: baseColumns.map((c) => ({ id: c.id, label: c.header, locked: c.id === "id" })),
        visibleMap,
        onVisibleChange: (next) => setVisibleMap({ ...next, id: true }),
      }}
      onResetWidths={() => setResetSignal((x) => x + 1)}
      onRefresh={handleRefresh}
      onExport={null}
      onAdd={() => navigate("/org-dashboard/add-wq-tests")}
    />
  );

  return (
    <div className="dashboard-content">
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-title"><span>Water Quality Tests</span></div>
        </div>
        <div className="dashboard-card-body">
          {loadingContext ? (
            <div>Loading organization context…</div>
          ) : !organization ? (
            <div>{error || "You must belong to an active organization to view tests."}</div>
          ) : (
            <>
              {toolbarNode}
              {error ? (
                <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>
              ) : null}
              {fetching ? (
                <div style={{ color: "#6b7280", marginBottom: 8 }}>Refreshing…</div>
              ) : null}
              <TableLayout
                tableId="org-wqtests"
                columns={displayColumns}
                data={filtered}
                pageSize={10}
                actions={actions}
                resetSignal={resetSignal}
                columnPicker={false}
              />
            </>
          )}
        </div>
      </div>

      <OrgWQTestModal
        open={open && !!selected}
        onClose={() => { setOpen(false); setSelected(null); }}
        record={selected}
        editable={editing}
        parameterCatalog={parameterCatalog}
        canPublish={canPublish}
        onTogglePublish={() => {
          if (selected) {
            handleTogglePublish(selected);
          }
        }}
        onSave={handleSaveModal}
      />
    </div>
  );
}
