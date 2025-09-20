import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiSave, FiTrash2 } from "react-icons/fi";

import TableToolbar from "../../../components/table/TableToolbar";
import FilterPanel from "../../../components/table/FilterPanel";
import TableLayout from "../../../layouts/TableLayout";
import { api } from "../../../lib/api";
import { confirm, alertSuccess, alertError } from "../../../lib/alerts";

const TABLE_ID = "admin-thresholds";
const VIS_KEY = `${TABLE_ID}::visible`;
const ADV_KEY = `${TABLE_ID}::adv`;
const SEARCH_KEY = `${TABLE_ID}::search`;

const emptyThreshold = {
  parameter_id: "",
  class_code: "",
  standard_id: "",
  unit: "",
  min_value: "",
  max_value: "",
  notes: "",
};

function ThresholdsTab() {
  const [parameters, setParameters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [standards, setStandards] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [form, setForm] = useState(emptyThreshold);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState(() => {
    try {
      return localStorage.getItem(SEARCH_KEY) || "";
    } catch (err) {
      return "";
    }
  });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adv, setAdv] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(ADV_KEY)) || {};
      if (stored && typeof stored === "object") {
        delete stored.notes;
        delete stored.unit;
      }
      return stored;
    } catch (err) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ADV_KEY, JSON.stringify(adv));
    } catch (err) {
      // ignore storage failures
    }
  }, [adv]);

  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_KEY, query);
    } catch (err) {
      // ignore storage failures
    }
  }, [query]);

  const baseColumns = useMemo(
    () => [
      {
        id: "parameter",
        header: "Parameter",
        render: (row) => row.parameter?.name || row.parameter?.code || "",
      },
      { id: "class_code", header: "Class", accessor: "class_code", width: 100 },
      {
        id: "standard",
        header: "Standard",
        render: (row) => row.standard?.code || "(default)",
      },
      { id: "unit", header: "Unit", accessor: "unit", width: 120 },
      { id: "min_value", header: "Min", accessor: "min_value", width: 110 },
      { id: "max_value", header: "Max", accessor: "max_value", width: 110 },
      {
        id: "notes",
        header: "Notes",
        accessor: "notes",
        render: (row) => row.notes || "",
        defaultHidden: true,
      },
    ],
    []
  );

  const defaultsVisible = useMemo(() => {
    const initial = {};
    baseColumns.forEach((col) => {
      initial[col.id] = col.defaultHidden ? false : true;
    });
    return initial;
  }, [baseColumns]);

  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = localStorage.getItem(VIS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultsVisible, ...parsed };
      }
    } catch (err) {
      // ignore storage failures
    }
    return defaultsVisible;
  });

  useEffect(() => {
    try {
      localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap));
    } catch (err) {
      // ignore storage failures
    }
  }, [visibleMap]);

  useEffect(() => {
    setVisibleMap((prev) => {
      const merged = { ...defaultsVisible, ...prev };
      const hasChange = Object.keys(merged).some((key) => merged[key] !== prev[key]);
      return hasChange ? merged : prev;
    });
  }, [defaultsVisible]);

  const visibleColumns = useMemo(
    () => baseColumns.filter((col) => visibleMap[col.id] !== false),
    [baseColumns, visibleMap]
  );

  const [resetSignal, setResetSignal] = useState(0);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    for (const value of Object.values(adv)) {
      if (Array.isArray(value)) {
        if (value.some((item) => item !== null && item !== "" && item !== undefined)) count += 1;
      } else if (
        value !== null &&
        value !== "" &&
        value !== undefined &&
        !(typeof value === "boolean" && value === false)
      ) {
        count += 1;
      }
    }
    return count;
  }, [adv]);

  const fetchReference = useCallback(async () => {
    try {
      const [paramRes, classRes, standardRes] = await Promise.all([
        api("/admin/parameters"),
        api("/admin/water-quality-classes"),
        api("/admin/wq-standards"),
      ]);
      setParameters(Array.isArray(paramRes?.data) ? paramRes.data : []);
      setClasses(Array.isArray(classRes?.data) ? classRes.data : []);
      setStandards(Array.isArray(standardRes?.data) ? standardRes.data : []);
    } catch (err) {
      console.error("Failed to load reference data", err);
    }
  }, []);

  const fetchThresholds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/admin/parameter-thresholds");
      const list = Array.isArray(res?.data) ? res.data : [];
      setThresholds(list);
    } catch (err) {
      console.error("Failed to load thresholds", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchReference();
    fetchThresholds();
  }, [fetchReference, fetchThresholds]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const actions = useMemo(
    () => [
      {
        label: "Edit",
        type: "edit",
        icon: <FiEdit2 />,
        onClick: (threshold) => {
          const target = threshold?._raw ?? threshold;
          if (!target?.id) return;

          setForm({
            parameter_id: target.parameter_id || "",
            class_code: target.class_code || "",
            standard_id: target.standard_id || "",
            unit: target.unit || "",
            min_value: target.min_value ?? "",
            max_value: target.max_value ?? "",
            notes: target.notes || "",
            __id: target.id,
          });

          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
      {
        label: "Delete",
        type: "delete",
        icon: <FiTrash2 />,
        onClick: async (threshold) => {
          const target = threshold?._raw ?? threshold;
          if (!target?.id) return;
          const ok = await confirm({ title: 'Delete threshold?', text: `Delete threshold for ${target.parameter?.name || target.parameter?.code || ''}?`, confirmButtonText: 'Delete' });
          if (!ok) return;
          try {
            await api(`/admin/parameter-thresholds/${target.id}`, { method: "DELETE" });
            await fetchThresholds();
            await alertSuccess('Deleted', 'Threshold deleted.');
          } catch (err) {
            console.error("Failed to delete threshold", err);
            await alertError('Delete failed', err?.message || 'Failed to delete threshold');
          }
        },
      },
    ],
    [fetchThresholds]
  );

  const parameterOptions = useMemo(() => {
    return [...parameters].sort((a, b) => {
      const left = (a.name || a.code || "").toLowerCase();
      const right = (b.name || b.code || "").toLowerCase();
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
  }, [parameters]);

  const parameterFilterOptions = useMemo(
    () => [
      { value: "", label: "All parameters" },
      ...parameterOptions.map((p) => ({ value: String(p.id), label: p.code || p.name })),
    ],
    [parameterOptions]
  );

  const classFilterOptions = useMemo(
    () => [
      { value: "", label: "All classes" },
      ...classes.map((c) => ({ value: c.code, label: c.name || c.code })),
    ],
    [classes]
  );

  const standardFilterOptions = useMemo(
    () => [
      { value: "", label: "All standards" },
      { value: "__null__", label: "Default (none)" },
      ...standards.map((s) => ({ value: String(s.id), label: s.code })),
    ],
    [standards]
  );

  const unitChoices = useMemo(() => {
    const units = new Set();

    parameters.forEach((param) => {
      if (param.unit) units.add(param.unit);
    });

    thresholds.forEach((item) => {
      if (item.unit) units.add(item.unit);
    });

    if (form.unit) units.add(form.unit);

    return Array.from(units)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [parameters, thresholds, form.unit]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return thresholds.filter((row) => {
      if (q) {
        const haystack = [
          row.parameter?.name,
          row.parameter?.code,
          row.class_code,
          row.standard?.code,
          row.unit,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (adv.parameter_id && Number(adv.parameter_id) !== Number(row.parameter_id)) {
        return false;
      }

      if (adv.standard_id) {
        if (adv.standard_id === "__null__") {
          if (row.standard_id !== null) return false;
        } else if (Number(adv.standard_id) !== Number(row.standard_id)) {
          return false;
        }
      }

      if (adv.class_code && adv.class_code !== row.class_code) {
        return false;
      }

      if (adv.has_min && row.min_value == null) return false;
      if (adv.has_max && row.max_value == null) return false;

      return true;
    });
  }, [thresholds, query, adv]);

  const handleChange = (field, value) => {
    setForm((prev) => {
      if (field === "parameter_id") {
        const match = parameters.find((param) => String(param.id) === String(value));
        return {
          ...prev,
          parameter_id: value,
          unit: match?.unit || "",
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleReset = () => {
    setForm(emptyThreshold);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        parameter_id: form.parameter_id ? Number(form.parameter_id) : null,
        class_code: form.class_code || null,
        standard_id: form.standard_id ? Number(form.standard_id) : null,
        unit: form.unit || null,
        min_value: form.min_value === "" ? null : Number(form.min_value),
        max_value: form.max_value === "" ? null : Number(form.max_value),
        notes: form.notes.trim() || null,
      };

      if (form.__id) {
        await api(`/admin/parameter-thresholds/${form.__id}`, {
          method: "PUT",
          body: payload,
        });
        await alertSuccess('Saved', 'Threshold updated.');
      } else {
        await api("/admin/parameter-thresholds", { method: "POST", body: payload });
        await alertSuccess('Created', 'Threshold created.');
      }

      setForm(emptyThreshold);
      await fetchThresholds();
    } catch (err) {
      console.error("Failed to save threshold", err);
      await alertError('Save failed', err?.message || 'Failed to save threshold');
    } finally {
      setSaving(false);
    }
  };

  const filterPanelFields = useMemo(
    () => [
      {
        id: "parameter_id",
        label: "Parameter",
        type: "select",
        value: adv.parameter_id ?? "",
        onChange: (value) => setAdv((state) => ({ ...state, parameter_id: value })),
        options: parameterFilterOptions,
      },
      {
        id: "class_code",
        label: "Class",
        type: "select",
        value: adv.class_code ?? "",
        onChange: (value) => setAdv((state) => ({ ...state, class_code: value })),
        options: classFilterOptions,
      },
      {
        id: "standard_id",
        label: "Standard",
        type: "select",
        value: adv.standard_id ?? "",
        onChange: (value) => setAdv((state) => ({ ...state, standard_id: value })),
        options: standardFilterOptions,
      },
      {
        id: "has_min",
        label: "Only rows with min value",
        type: "boolean",
        value: !!adv.has_min,
        onChange: (value) => setAdv((state) => ({ ...state, has_min: value })),
      },
      {
        id: "has_max",
        label: "Only rows with max value",
        type: "boolean",
        value: !!adv.has_max,
        onChange: (value) => setAdv((state) => ({ ...state, has_max: value })),
      },
    ],
    [adv, parameterFilterOptions, classFilterOptions, standardFilterOptions]
  );

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <span>{form.__id ? "Edit Threshold" : "Create Threshold"}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="dashboard-card-body">
        <div className="org-form">
          <div className="form-group" style={{ minWidth: 240 }}>
            <label>Parameter *</label>
            <select
              value={form.parameter_id}
              onChange={(event) => handleChange("parameter_id", event.target.value)}
              required
            >
              <option value="">Select parameter</option>
              {parameterOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Class *</label>
            <select
              value={form.class_code}
              onChange={(event) => handleChange("class_code", event.target.value)}
              required
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Standard</label>
            <select
              value={form.standard_id}
              onChange={(event) => handleChange("standard_id", event.target.value)}
            >
              <option value="">(Default)</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Unit</label>
            <input
              type="text"
              value={form.unit}
              onChange={(event) => handleChange("unit", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Min</label>
            <input
              type="number"
              value={form.min_value}
              onChange={(event) => handleChange("min_value", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Max</label>
            <input
              type="number"
              value={form.max_value}
              onChange={(event) => handleChange("max_value", event.target.value)}
            />
          </div>

          <div className="form-group" style={{ flexBasis: "100%" }}>
            <label>Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
            />
          </div>
        </div>

        <div className="org-actions-right">
          <button
            type="button"
            className="pill-btn ghost"
            onClick={handleReset}
            disabled={saving}
          >
            Clear
          </button>
          <button type="submit" className="pill-btn primary" disabled={saving}>
            <FiSave />
            <span>{form.__id ? "Update" : "Save"}</span>
          </button>
        </div>
      </form>

      <TableToolbar
        tableId={TABLE_ID}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search parameter, class, unit...",
        }}
        filters={[]}
        columnPicker={{ columns: baseColumns, visibleMap, onVisibleChange: setVisibleMap }}
        onResetWidths={() => setResetSignal((value) => value + 1)}
        onRefresh={handleRefresh}
        onToggleFilters={() => setFiltersOpen((value) => !value)}
        filtersBadgeCount={activeFilterCount}
      />

      <FilterPanel
        open={filtersOpen}
        onClearAll={() => setAdv({})}
        fields={filterPanelFields}
      />

      <div className="dashboard-card-body" style={{ paddingTop: 0 }}>
        <TableLayout
          tableId={TABLE_ID}
          columns={visibleColumns}
          data={filtered.map((item) => ({ ...item, _raw: item }))}
          pageSize={5}
          actions={actions}
          resetSignal={resetSignal}
        />
        {loading && <p style={{ marginTop: 12, color: "#6b7280" }}>Loading</p>}
      </div>
    </div>
  );
}

export default ThresholdsTab;
