import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import TableToolbar from "../../../components/table/TableToolbar";
import FilterPanel from "../../../components/table/FilterPanel";
import TableLayout from "../../../layouts/TableLayout";
import { api, buildQuery } from "../../../lib/api";
import { confirm, alertSuccess, alertError } from "../../../lib/alerts";

const TABLE_ID = "admin-parameters";
const VIS_KEY = `${TABLE_ID}::visible`;
const ADV_KEY = `${TABLE_ID}::adv`;
const SEARCH_KEY = `${TABLE_ID}::search`;

const CATEGORY_OPTIONS = [
  { value: "Physico-chemical", label: "Physico-chemical" },
  { value: "Microbiological", label: "Microbiological" },
  { value: "Inorganic", label: "Inorganic" },
  { value: "Metal", label: "Metal" },
  { value: "Organic", label: "Organic" },
  { value: "Other", label: "Other" },
];

const GROUP_OPTIONS = [
  { value: "Primary", label: "Primary" },
  { value: "Secondary (Inorganics)", label: "Secondary (Inorganics)" },
  { value: "Secondary (Metals)", label: "Secondary (Metals)" },
  { value: "Secondary (Organics)", label: "Secondary (Organics)" },
];

const UNIT_OPTIONS = [
  { value: "mg/L", label: "mg/L" },
  { value: "deg C", label: "deg C" },
  { value: "MPN/100mL", label: "MPN/100mL" },
  { value: "TCU", label: "TCU" },
];

const EVALUATION_LABELS = {
  max: "Max (=)",
  min: "Min (=)",
  range: "Range (between)",
};

const emptyForm = {
  code: "",
  name: "",
  unit: "",
  category: "",
  group: "",
  data_type: "",
  evaluation_type: "",
  is_active: true,
  notes: "",
  aliases_text: "",
};

const ensureOption = (options, value) => {
  if (!value) return options;
  return options.some((opt) => opt.value === value)
    ? options
    : [...options, { value, label: value }];
};

function ParametersTab() {
  const [form, setForm] = useState(emptyForm);
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState(() => {
    try {
      return localStorage.getItem(SEARCH_KEY) || "";
    } catch (err) {
      return "";
    }
  });
  const [resetSignal, setResetSignal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adv, setAdv] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ADV_KEY)) || {};
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
      { id: "code", header: "Code", accessor: "code", width: 120 },
      { id: "name", header: "Name", accessor: "name", width: 200 },
      { id: "category", header: "Category", accessor: "category", width: 160 },
      { id: "group", header: "Group", accessor: "group", width: 200 },
      { id: "unit", header: "Unit", accessor: "unit", width: 120 },
      { id: "data_type", header: "Data Type", accessor: "data_type", width: 140 },
      {
        id: "evaluation_type",
        header: "Evaluation",
        accessor: "evaluation_type",
        width: 160,
        render: (row) => {
          const value = (row.evaluation_type || "").toLowerCase();
          return EVALUATION_LABELS[value] || row.evaluation_type || "";
        },
      },
      {
        id: "is_active",
        header: "Active",
        width: 110,
        render: (row) => (row.is_active ? "Yes" : "No"),
      },
      {
        id: "aliases",
        header: "Aliases",
        render: (row) => row.aliases_display,
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

  const fetchParameters = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const queryString = buildQuery(opts);
      const res = await api(`/admin/parameters${queryString}`);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setParams(list);
    } catch (err) {
      console.error("Failed to load parameters", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  const normalized = useMemo(() => {
    return params.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category || "",
      group: item.group || "",
      unit: item.unit || "",
      data_type: item.data_type || "",
      evaluation_type: item.evaluation_type || "",
      is_active: item.is_active,
      alias_count: item.aliases?.length || 0,
      aliases_display: item.aliases?.map((a) => a.alias).join(", ") || "-",
      notes: item.notes || "",
      aliases: item.aliases,
      _raw: item,
    }));
  }, [params]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return normalized.filter((row) => {
      if (q) {
        const haystack = [
          row.code,
          row.name,
          row.category,
          row.group,
          row.unit,
          row.aliases_display,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (adv.category && row.category !== adv.category) return false;
      if (adv.group && row.group !== adv.group) return false;
      if (adv.data_type && row.data_type !== adv.data_type) return false;
      if (
        adv.evaluation_type &&
        (row.evaluation_type || "").toLowerCase() !== adv.evaluation_type
      )
        return false;
      if (adv.is_active === "1" && !row.is_active) return false;
      if (adv.is_active === "0" && row.is_active) return false;
      if (
        adv.unit &&
        !(row.unit || "").toLowerCase().includes(adv.unit.trim().toLowerCase())
      )
        return false;
      if (
        adv.notes &&
        !(row.notes || "").toLowerCase().includes(adv.notes.trim().toLowerCase())
      )
        return false;

      return true;
    });
  }, [normalized, query, adv]);

  const handleRefresh = useCallback(() => {
    fetchParameters({ search: query });
  }, [fetchParameters, query]);

  const categoryOptions = useMemo(() => ensureOption(CATEGORY_OPTIONS, form.category), [form.category]);
  const groupOptions = useMemo(() => ensureOption(GROUP_OPTIONS, form.group), [form.group]);
  const unitOptions = useMemo(() => ensureOption(UNIT_OPTIONS, form.unit), [form.unit]);

  const categoryFilterOptions = useMemo(() => {
    const map = new Map();
    CATEGORY_OPTIONS.forEach((opt) => map.set(opt.value, opt.label));
    params.forEach((item) => {
      if (item.category && !map.has(item.category)) {
        map.set(item.category, item.category);
      }
    });
    return [
      { value: "", label: "All categories" },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [params]);

  const groupFilterOptions = useMemo(() => {
    const map = new Map();
    GROUP_OPTIONS.forEach((opt) => map.set(opt.value, opt.label));
    params.forEach((item) => {
      if (item.group && !map.has(item.group)) {
        map.set(item.group, item.group);
      }
    });
    return [
      { value: "", label: "All groups" },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [params]);

  const dataTypeFilterOptions = useMemo(() => {
    const values = new Set();
    params.forEach((item) => {
      if (item.data_type) values.add(item.data_type);
    });
    const ordered = ["Numeric", "Range", "Categorical"];
    const deduped = [];
    ordered.forEach((value) => {
      if (values.has(value)) deduped.push(value);
    });
    values.forEach((value) => {
      if (!ordered.includes(value)) deduped.push(value);
    });
    return [
      { value: "", label: "All data types" },
      ...deduped.map((value) => ({ value, label: value })),
    ];
  }, [params]);

  const evaluationFilterOptions = useMemo(() => {
    const values = new Set();
    params.forEach((item) => {
      if (item.evaluation_type) values.add((item.evaluation_type || "").toLowerCase());
    });
    const canonical = ["max", "min", "range"];
    const deduped = [];
    canonical.forEach((value) => {
      if (values.has(value)) deduped.push(value);
    });
    values.forEach((value) => {
      if (!canonical.includes(value)) deduped.push(value);
    });
    return [
      { value: "", label: "All evaluation types" },
      ...deduped.map((value) => ({ value, label: EVALUATION_LABELS[value] || value })),
    ];
  }, [params]);

  const filterPanelFields = useMemo(
    () => [
      {
        id: "category",
        label: "Category",
        type: "select",
        value: adv.category ?? "",
        onChange: (value) => setAdv((state) => ({ ...state, category: value })),
        options: categoryFilterOptions,
      },
      {
        id: "group",
        label: "Group",
        type: "select",
        value: adv.group ?? "",
        onChange: (value) => setAdv((state) => ({ ...state, group: value })),
        options: groupFilterOptions,
      },
      {
        id: "data_type",
        label: "Data Type",
        type: "select",
        value: adv.data_type ?? "",
        onChange: (value) => setAdv((state) => ({ ...state, data_type: value })),
        options: dataTypeFilterOptions,
      },
      {
        id: "evaluation_type",
        label: "Evaluation",
        type: "select",
        value: adv.evaluation_type ?? "",
        onChange: (value) => setAdv((state) => ({ ...state, evaluation_type: value })),
        options: evaluationFilterOptions,
      },
      {
        id: "is_active",
        label: "Status",
        type: "select",
        value: adv.is_active ?? "",
        onChange: (value) => setAdv((state) => ({ ...state, is_active: value })),
        options: [
          { value: "", label: "Active + inactive" },
          { value: "1", label: "Active only" },
          { value: "0", label: "Inactive only" },
        ],
      },
    ],
    [adv, categoryFilterOptions, groupFilterOptions, dataTypeFilterOptions, evaluationFilterOptions]
  );

  const actions = useMemo(
    () => [
      {
        label: "Edit",
        type: "edit",
        icon: <FiEdit2 />,
        onClick: (row) => {
          const aliases = row.aliases?.map((a) => a.alias).join(", ") || "";
          setForm({
            code: row.code,
            name: row.name,
            unit: row.unit || "",
            category: row.category || "",
            group: row.group || "",
            data_type: row.data_type || "",
            evaluation_type: row.evaluation_type || "",
            is_active: !!row.is_active,
            notes: row.notes || "",
            aliases_text: aliases,
            __id: row.id,
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
      {
        label: "Delete",
        type: "delete",
        icon: <FiTrash2 />,
        onClick: async (row) => {
          const ok = await confirm({ title: 'Delete parameter?', text: `Delete ${row.code}?`, confirmButtonText: 'Delete' });
          if (!ok) return;
          try {
            await api(`/admin/parameters/${row.id}`, { method: "DELETE" });
            await fetchParameters();
            await alertSuccess('Deleted', `"${row.code}" was deleted.`);
          } catch (err) {
            console.error("Failed to delete parameter", err);
            await alertError('Delete failed', err?.message || 'Failed to delete parameter');
          }
        },
      },
    ],
    [fetchParameters]
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setForm(emptyForm);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        unit: form.unit || null,
        category: form.category || null,
        group: form.group || null,
        data_type: form.data_type || null,
        evaluation_type: form.evaluation_type || null,
        is_active: !!form.is_active,
        notes: form.notes.trim() || null,
        aliases: form.aliases_text
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      };

      if (form.__id) {
        await api(`/admin/parameters/${form.__id}`, { method: "PUT", body: payload });
        await alertSuccess('Saved', `"${payload.code}" was updated.`);
      } else {
        await api("/admin/parameters", { method: "POST", body: payload });
        await alertSuccess('Created', `"${payload.code}" was created.`);
      }

      handleReset();
      await fetchParameters();
      setResetSignal((value) => value + 1);
    } catch (err) {
      console.error("Failed to save parameter", err);
      await alertError('Save failed', err?.message || 'Failed to save parameter');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <FiPlus />
          <span>{form.__id ? "Edit Parameter" : "Create Parameter"}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="dashboard-card-body">
        <div className="org-form">
          <div className="form-group" style={{ minWidth: 220 }}>
            <label>Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(event) => handleChange("code", event.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ minWidth: 260 }}>
            <label>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={form.category}
              onChange={(event) => handleChange("category", event.target.value)}
            >
              <option value="">Select category</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Group</label>
            <select
              value={form.group}
              onChange={(event) => handleChange("group", event.target.value)}
            >
              <option value="">Select group</option>
              {groupOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Unit</label>
            <select
              value={form.unit}
              onChange={(event) => handleChange("unit", event.target.value)}
            >
              <option value="">Select unit</option>
              {unitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Data Type</label>
            <select
              value={form.data_type}
              onChange={(event) => handleChange("data_type", event.target.value)}
            >
              <option value="">Select Data Type</option>
              <option value="Numeric">Numeric</option>
              <option value="Range">Range</option>
              <option value="Categorical">Categorical</option>
            </select>
          </div>

          <div className="form-group">
            <label>Evaluation</label>
            <select
              value={form.evaluation_type}
              onChange={(event) => handleChange("evaluation_type", event.target.value)}
            >
              <option value="">Not set</option>
              <option value="Max (≤)">Max (≤)</option>
              <option value="Min (≥)">Min (≥)</option>
              <option value="Range">Range (between)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={form.is_active ? "1" : "0"}
              onChange={(event) => handleChange("is_active", event.target.value === "1")}
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>

          <div className="form-group" style={{ flexBasis: "100%" }}>
            <label>Aliases (comma separated)</label>
            <textarea
              rows={2}
              value={form.aliases_text}
              onChange={(event) => handleChange("aliases_text", event.target.value)}
            />
          </div>

          <div className="form-group" style={{ flexBasis: "100%" }}>
            <label>Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
            />
          </div>
        </div>

        <div className="org-actions-right">
          <button type="button" className="pill-btn ghost" onClick={handleReset} disabled={saving}>
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
          placeholder: "Search code, name, category...",
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
          data={filtered}
          pageSize={12}
          actions={actions}
          resetSignal={resetSignal}
        />
        {loading && <p style={{ marginTop: 12, color: "#6b7280" }}>Loading...</p>}
      </div>
    </div>
  );
}

export default ParametersTab;


