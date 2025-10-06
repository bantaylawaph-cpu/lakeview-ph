import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import TableLayout from "../../../layouts/TableLayout";
import { api, buildQuery } from "../../../lib/api";
import { confirm, alertSuccess, alertError } from "../../../lib/alerts";

const CATEGORY_OPTIONS = [
  { value: "Physico-chemical", label: "Physico-chemical" },
  { value: "Biological", label: "Biological" },
  { value: "Bacteriological", label: "Bacteriological" },
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
  notes: "",
};

const ensureOption = (options, value) => {
  if (!value) return options;
  return options.some((opt) => opt.value === value)
    ? options
    : [...options, { value, label: value }];
};

function ParametersTab() {

  // Helper: normalize API errors into a readable message. The api client
  // often throws an Error whose message is a JSON-stringified object coming
  // from the backend (Laravel). Attempt to pull a useful message and
  // translate FK constraint errors into a friendly prompt.
  const extractApiErrorMessage = (err) => {
    if (!err) return 'Unknown error';
    // If the client attached a response object, prefer that
    const respData = err?.response?.data;
    if (respData) {
      if (typeof respData === 'string') return respData;
      if (respData.message) return respData.message;
      try { return JSON.stringify(respData); } catch (_) { /* fallthrough */ }
    }
    // err.message may itself be a JSON string produced by makeError()
    const msg = err.message || String(err);
    try {
      const parsed = JSON.parse(msg);
      if (parsed && parsed.message) return parsed.message;
      return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    } catch (_) {
      return msg;
    }
  };

  // TableLayout now supports an in-table loading spinner via its loading prop

  const [form, setForm] = useState(emptyForm);
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [gridEdits, setGridEdits] = useState({});
  const [newRows, setNewRows] = useState([]);

  const GRID_TABLE_ID = "admin-parameters-grid";

  const fetchParameters = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const qs = buildQuery(opts);
      const res = await api(`/admin/parameters${qs}`);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setParams(list);
    } catch (err) {
      console.error("Failed to load parameters", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParameters({ search: query });
  }, [fetchParameters, query, resetSignal]);

  const filtered = useMemo(() => {
    if (!query) return params;
    const q = query.toLowerCase();
    return params.filter((p) => (p.code || "").toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q));
  }, [params, query]);

  const gridRows = useMemo(() => {
    const existing = filtered.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name || "",
      category: p.category || "",
      group: p.group || "",
      unit: p.unit || "",
      data_type: p.data_type || "",
      evaluation_type: p.evaluation_type || "",
      notes: p.notes || "",
      __id: p.id,
    }));
    // New rows should appear at the beginning (first page)
    const newRowObjects = newRows.map((rid) => ({ id: rid, code: "", name: "", category: "", group: "", unit: "", data_type: "", evaluation_type: "", notes: "", __id: null }));
    const rows = [...newRowObjects, ...existing];
    return rows.map((r) => ({ ...r, ...(gridEdits[r.id] || {}) }));
  }, [filtered, newRows, gridEdits]);

  const updateGridCell = (key, field, value) => {
    setGridEdits((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const saveGridRow = async (row) => {
    const key = row?.id;
    const merged = { ...(row || {}), ...(gridEdits[key] || {}) };
    const effectiveId = merged.__id || (Number.isInteger(key) ? key : null);
    const effectiveRow = { ...merged, __id: effectiveId };

    const payload = {
      code: String(effectiveRow.code || "").trim(),
      name: String(effectiveRow.name || "").trim(),
      unit: effectiveRow.unit || null,
      category: effectiveRow.category || null,
      group: effectiveRow.group || null,
      data_type: effectiveRow.data_type || null,
      evaluation_type: effectiveRow.evaluation_type || null,
      notes: (effectiveRow.notes || "").trim() || null,
      // aliases removed from UI; backend may still accept aliases if needed
    };

    try {
      if (effectiveRow.__id) {
        await api(`/admin/parameters/${effectiveRow.__id}`, { method: "PUT", body: payload });
        await alertSuccess("Saved", `Updated ${payload.code}.`);
      } else {
        if (!payload.code || !payload.name) {
          await alertError("Validation", "Code and Name are required for new parameter");
          return;
        }
        await api(`/admin/parameters`, { method: "POST", body: payload });
        await alertSuccess("Created", `Created ${payload.code}.`);
      }

      setGridEdits((prev) => ({ ...prev, [key]: {} }));
      if (!effectiveRow.__id) setNewRows((prev) => prev.filter((rid) => rid !== key));
      await fetchParameters({ search: query });
    } catch (err) {
      console.error("Failed to save parameter", err);
      await alertError("Save failed", err?.message || "Failed to save parameter");
    }
  };

  const deleteGridRow = async (row) => {
    if (!row.__id) {
      setGridEdits((prev) => ({ ...prev, [row.id]: {} }));
      setNewRows((prev) => prev.filter((rid) => rid !== row.id));
      return;
    }
    const ok = await confirm({ title: 'Delete parameter?', text: `Delete ${row.code}?`, confirmButtonText: 'Delete' });
    if (!ok) return;
    try {
      await api(`/admin/parameters/${row.__id}`, { method: "DELETE" });
      setGridEdits((prev) => ({ ...prev, [row.id]: {} }));
      await fetchParameters({ search: query });
      await alertSuccess('Deleted', `"${row.code}" was deleted.`);
    } catch (err) {
      console.error("Failed to delete parameter", err);
      const raw = extractApiErrorMessage(err);
      // Detect common FK constraint message fragment from Postgres/Laravel
      if (/(foreign key violation|violates foreign key constraint|still referenced)/i.test(raw)) {
        await alertError('Delete failed', `Cannot delete "${row.code}" because there are sample results that reference it. Remove or reassign those sample results first.`);
      } else {
        await alertError('Delete failed', raw || 'Failed to delete parameter');
      }
    }
  };

  const gridColumns = useMemo(() => [
    { id: "code", header: "Code", width: 120, render: (row) => {
      const key = row.id;
      const wrapper = { ...row, ...(gridEdits[key] || {}) };
      return (
        <input type="text" value={wrapper.code ?? ""} disabled={!!wrapper.__id} placeholder="Type code..."
          onChange={(e) => updateGridCell(key, "code", e.target.value)} style={{ width: "100%" }} />
      );
    }},
    { id: "name", header: "Name", width: 200, render: (row) => {
      const key = row.id;
      const wrapper = { ...row, ...(gridEdits[key] || {}) };
      return (
        <input type="text" value={wrapper.name ?? ""} placeholder="Type name..."
          onChange={(e) => updateGridCell(key, "name", e.target.value)} style={{ width: "100%" }} />
      );
    }},
    { id: "category", header: "Category", width: 160, render: (row) => {
      const key = row.id;
      const wrapper = { ...row, ...(gridEdits[key] || {}) };
      return (
        <select value={wrapper.category ?? ""} onChange={(e) => updateGridCell(key, "category", e.target.value)} style={{ width: "100%" }}>
          <option value="">Select category</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }},
    { id: "group", header: "Group", width: 200, render: (row) => {
      const key = row.id;
      const wrapper = { ...row, ...(gridEdits[key] || {}) };
      return (
        <select value={wrapper.group ?? ""} onChange={(e) => updateGridCell(key, "group", e.target.value)} style={{ width: "100%" }}>
          <option value="">Select group</option>
          {GROUP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }},
    { id: "unit", header: "Unit", width: 120, render: (row) => {
      const key = row.id;
      const wrapper = { ...row, ...(gridEdits[key] || {}) };
      return (
        <select value={wrapper.unit ?? ""} onChange={(e) => updateGridCell(key, "unit", e.target.value)} style={{ width: "100%" }}>
          <option value="">Select unit</option>
          {UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }},
    { id: "data_type", header: "Data Type", width: 140, render: (row) => {
      const key = row.id;
      const wrapper = { ...row, ...(gridEdits[key] || {}) };
      return (
        <select value={wrapper.data_type ?? ""} onChange={(e) => updateGridCell(key, "data_type", e.target.value)} style={{ width: "100%" }}>
          <option value="">Select data type</option>
          <option value="Numeric">Numeric</option>
          <option value="Range">Range</option>
          <option value="Categorical">Categorical</option>
        </select>
      );
    }},
    { id: "evaluation_type", header: "Evaluation", width: 160, render: (row) => {
      const key = row.id;
      const wrapper = { ...row, ...(gridEdits[key] || {}) };
      return (
        <select value={wrapper.evaluation_type ?? ""} onChange={(e) => updateGridCell(key, "evaluation_type", e.target.value)} style={{ width: "100%" }}>
          <option value="">Not set</option>
          <option value="Max (≤)">Max (≤)</option>
          <option value="Min (≥)">Min (≥)</option>
          <option value="Range">Range (between)</option>
        </select>
      );
    }},
    // 'Active' and 'Aliases' columns removed per product decision
  ], [gridEdits]);

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

  const actions = useMemo(
    () => [
      {
        label: "Edit",
        type: "edit",
        icon: <FiEdit2 />,
        onClick: (row) => {
          setForm({
            code: row.code,
            name: row.name,
            unit: row.unit || "",
            category: row.category || "",
            group: row.group || "",
            data_type: row.data_type || "",
            evaluation_type: row.evaluation_type || "",
            notes: row.notes || "",
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
            const raw = extractApiErrorMessage(err);
            if (/(foreign key violation|violates foreign key constraint|still referenced)/i.test(raw)) {
              await alertError('Delete failed', `Cannot delete "${row.code}" because there are sample results that reference it. Remove or reassign those sample results first.`);
            } else {
              await alertError('Delete failed', raw || 'Failed to delete parameter');
            }
          }
        },
      },
    ], [fetchParameters]
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
        notes: form.notes.trim() || null,
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
          <span>Parameter Catalogue</span>
        </div>
      </div>

      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        <TableLayout
          tableId={GRID_TABLE_ID}
          columns={gridColumns}
          data={gridRows}
          pageSize={5}
          actions={[
            { label: "Save", type: "edit", icon: <FiSave />, onClick: (row) => saveGridRow(row) },
            { label: "Delete", type: "delete", icon: <FiTrash2 />, onClick: (row) => deleteGridRow(row) },
          ]}
          columnPicker={{ label: "Columns", locked: ["code"], defaultHidden: [] }}
          toolbar={{
            left: (
              <button type="button" className="pill-btn primary" onClick={() => setNewRows((prev) => [`__new__-${Date.now()}`, ...prev])}>
                <FiPlus />
                <span>Add Parameter</span>
              </button>
            ),
          }}
          loading={loading}
          loadingLabel="Loading parameters…"
        />
      </div>
    </div>
  );
}

export default ParametersTab;
 