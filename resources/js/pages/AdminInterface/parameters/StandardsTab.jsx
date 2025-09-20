import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiEdit2, FiSave, FiTrash2 } from "react-icons/fi";

import TableLayout from "../../../layouts/TableLayout";
import { api } from "../../../lib/api";
import { confirm, alertSuccess, alertError } from "../../../lib/alerts";

const TABLE_ID = "admin-standards";

const emptyStandard = {
  code: "",
  name: "",
  priority: 0,
  is_current: false,
  notes: "",
};

function StandardsTab() {
  const [form, setForm] = useState(emptyStandard);
  const [standards, setStandards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const columns = useMemo(() => [
    { header: "Code", accessor: "code", width: 160 },
    { header: "Name", accessor: "name" },
    { header: "Priority", accessor: "priority", width: 110 },
    {
      header: "Current",
      id: "current",
      width: 100,
      render: (row) => (row.is_current ? "Yes" : "No"),
    },
    {
      header: "Notes",
      accessor: "notes",
      render: (row) => row.notes || "-",
    },
  ], []);

  const actions = useMemo(() => [
    {
      label: "Set current",
      icon: <FiCheckCircle />,
      onClick: async (standard) => {
        try {
          await api(`/admin/wq-standards/${standard.id}`, {
            method: "PUT",
            body: { ...standard, is_current: true },
          });
          await fetchStandards();
        } catch (err) {
          console.error("Failed to mark current", err);
        }
      },
    },
    {
      label: "Edit",
      type: "edit",
      icon: <FiEdit2 />,
      onClick: (standard) => {
        setForm({
          code: standard.code,
          name: standard.name || "",
          priority: standard.priority ?? 0,
          is_current: !!standard.is_current,
          notes: standard.notes || "",
          __id: standard.id,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    },
    {
      label: "Delete",
      type: "delete",
      icon: <FiTrash2 />,
      onClick: async (standard) => {
        const ok = await confirm({ title: 'Delete standard?', text: `Delete ${standard.code}?`, confirmButtonText: 'Delete' });
        if (!ok) return;
        try {
          await api(`/admin/wq-standards/${standard.id}`, { method: "DELETE" });
          await fetchStandards();
          await alertSuccess('Deleted', `"${standard.code}" was deleted.`);
        } catch (err) {
          console.error("Failed to delete standard", err);
          await alertError('Delete failed', err?.message || 'Failed to delete standard');
        }
      },
    },
  ], [fetchStandards]);

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
        priority: Number.isFinite(Number(form.priority)) ? Number(form.priority) : 0,
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
      await fetchStandards();
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
          <span>{form.__id ? "Edit Standard" : "Create Standard"}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="dashboard-card-body">
        <div className="org-form">
          <div className="form-group">
            <label>Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => handleChange("code", e.target.value)}
              required
              disabled={!!form.__id}
            />
          </div>

          <div className="form-group" style={{ minWidth: 240 }}>
            <label>Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Priority</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => handleChange("priority", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Current</label>
            <select
              value={form.is_current ? "1" : "0"}
              onChange={(e) => handleChange("is_current", e.target.value === "1")}
            >
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>

          <div className="form-group" style={{ flexBasis: "100%" }}>
            <label>Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
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

      <div className="dashboard-card-body" style={{ paddingTop: 0 }}>
        <TableLayout
          tableId={TABLE_ID}
          columns={columns}
          data={standards.map((s) => ({ ...s, _raw: s }))}
          pageSize={5}
          actions={actions}
        />
        {loading && <p style={{ marginTop: 12, color: "#6b7280" }}>Loading.....</p>}
      </div>
    </div>
  );
}
export default StandardsTab;

