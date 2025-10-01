import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import TableLayout from "../../../layouts/TableLayout";
import { api } from "../../../lib/api";
import { alertSuccess, alertError } from "../../../lib/alerts";

const emptyStandard = {
  code: "",
  name: "",
  is_current: false,
  notes: "",
};

function StandardsTab() {
  const [form, setForm] = useState(emptyStandard);
  const [saving, setSaving] = useState(false);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gridEdits, setGridEdits] = useState({}); // { [id|'__new__']: partial }
  const [newRows, setNewRows] = useState([]); // array of synthetic IDs

  const GRID_TABLE_ID = "admin-standards-grid";

  const fetchStandards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/admin/wq-standards");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setStandards(list);
    } catch (err) {
      console.error("Failed to load standards", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStandards();
  }, [fetchStandards]);

  const updateGridCell = (key, field, value) => {
    setGridEdits((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const gridRows = useMemo(() => {
    const rows = standards.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name || "",
      is_current: !!s.is_current,
      notes: s.notes || "",
      __id: s.id,
    }));
    // New rows
    newRows.forEach((rid) => {
      rows.push({ id: rid, code: "", name: "", is_current: false, notes: "", __id: null });
    });
    // Overlay edits
    return rows.map((r) => ({ ...r, ...(gridEdits[r.id] || {}) }));
  }, [standards, newRows, gridEdits]);

  const saveGridRow = async (row) => {
    const payload = {
      code: String(row.code || "").trim(),
      name: (row.name || "").trim() || null,
      is_current: !!row.is_current,
      notes: (row.notes || "").trim() || null,
    };
    try {
      if (row.__id) {
        await api(`/admin/wq-standards/${row.__id}`, { method: "PUT", body: payload });
        await alertSuccess("Saved", `Updated ${payload.code}.`);
      } else {
        if (!payload.code) {
          await alertError("Validation", "Code is required for new standard");
          return;
        }
        await api(`/admin/wq-standards`, { method: "POST", body: payload });
        await alertSuccess("Created", `Created ${payload.code}.`);
      }
      setGridEdits((prev) => ({ ...prev, [row.id]: {} }));
      if (!row.__id) setNewRows((prev) => prev.filter((rid) => rid !== row.id));
      await fetchStandards();
    } catch (err) {
      console.error("Failed to save standard", err);
      await alertError("Save failed", err?.message || "Failed to save standard");
    }
  };

  const deleteGridRow = async (row) => {
    if (!row.__id) {
      setGridEdits((prev) => ({ ...prev, [row.id]: {} }));
      setNewRows((prev) => prev.filter((rid) => rid !== row.id));
      return;
    }
    try {
      await api(`/admin/wq-standards/${row.__id}`, { method: "DELETE" });
      setGridEdits((prev) => ({ ...prev, [row.id]: {} }));
      await fetchStandards();
      await alertSuccess("Deleted", `Deleted ${row.code}.`);
    } catch (err) {
      console.error("Failed to delete standard", err);
      await alertError("Delete failed", err?.message || "Failed to delete standard");
    }
  };

  const gridColumns = useMemo(() => [
    {
      id: "code",
      header: "Code",
      width: 150,
      render: (row) => (
        <input type="text" value={row.code ?? ""} disabled={!!row.__id} placeholder="Type code..."
          onChange={(e) => updateGridCell(row.id, "code", e.target.value)} style={{ width: "100%" }} />
      ),
    },
    {
      id: "name",
      header: "Name",
      render: (row) => (
        <input type="text" value={row.name ?? ""} placeholder="Type name..."
          onChange={(e) => updateGridCell(row.id, "name", e.target.value)} style={{ width: "100%" }} />
      ),
    },
    {
      id: "is_current",
      header: "Current",
      width: 120,
      render: (row) => (
        <select value={row.is_current ? "1" : "0"} onChange={(e) => updateGridCell(row.id, "is_current", e.target.value === "1")}
          style={{ width: "100%" }}>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      defaultHidden: true,
      render: (row) => (
        <input type="text" value={row.notes ?? ""} placeholder="Add notes..."
          onChange={(e) => updateGridCell(row.id, "notes", e.target.value)} style={{ width: "100%" }} />
      ),
    },
  ], []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => setForm(emptyStandard);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim() || null,
        is_current: !!form.is_current,
        notes: form.notes.trim() || null,
      };

      if (form.__id) {
        await api(`/admin/wq-standards/${form.__id}`, { method: "PUT", body: payload });
        await alertSuccess('Saved', `"${payload.code}" was updated.`);
      } else {
        await api("/admin/wq-standards", { method: "POST", body: payload });
        await alertSuccess('Created', `"${payload.code}" was created.`);
      }

  handleReset();
    } catch (err) {
      console.error("Failed to save standard", err);
      await alertError('Save failed', err?.message || 'Failed to save standard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <span>Standards Catalogue</span>
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
          columnPicker={{ label: "Columns", locked: ["code"], defaultHidden: ["notes"] }}
          toolbar={{
            left: (
              <button type="button" className="pill-btn primary" onClick={() => setNewRows((prev) => [`__new__-${Date.now()}`, ...prev])}>
                <FiPlus />
                    <span>Add Standard</span>
              </button>
            ),
          }}
          loading={loading}
          loadingLabel="Loading standards…"
        />
      </div>
      {/* Create/Edit form replaced by inline Add Row workflow */}
    </div>
  );
}
export default StandardsTab;

