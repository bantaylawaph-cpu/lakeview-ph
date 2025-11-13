import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import TableLayout from "../../../layouts/TableLayout";
import { api } from "../../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../../lib/httpCache";
import { confirm, alertSuccess, alertError, showLoading, closeLoading } from "../../../lib/alerts";

// Small utility to briefly show the loader for snappy UX
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const [page, setPage] = useState(1);
  const perPage = 5;
  const [totalPages, setTotalPages] = useState(1);

  const GRID_TABLE_ID = "admin-standards-grid";

  const fetchStandards = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await cachedGet("/admin/wq-standards", { params: { page: p, per_page: perPage }, ttlMs: 10 * 60 * 1000 });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setStandards(list);
      // If server returned paginator, update page and totalPages
      if (res && typeof res.current_page === 'number') {
        setPage(res.current_page || p);
      }
      if (res && typeof res.last_page === 'number') {
        setTotalPages(res.last_page || 1);
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load standards", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchStandards(page);
  }, [fetchStandards, page]);

  const updateGridCell = (key, field, value) => {
    setGridEdits((prev) => {
      const next = { ...prev, [key]: { ...prev[key], [field]: value } };
      // If this edit sets a standard to current, clear current on other rows
      if (field === "is_current" && value === true) {
        const otherIds = [...standards.map((s) => s.id), ...newRows];
        otherIds.forEach((id) => {
          if (String(id) !== String(key)) {
            const entry = next[id] || {};
            // Ensure other rows are explicitly set to false in the overlay so the grid shows only one Current
            next[id] = { ...entry, is_current: false };
          }
        });
      }
      return next;
    });
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
      try { closeLoading(); } catch {}
      // Guard: if updating, avoid saving when nothing changed
      if (row.__id) {
        const orig = standards.find((s) => String(s.id) === String(row.__id));
        if (orig) {
          const origNormalized = {
            code: String(orig.code || "").trim(),
            name: (orig.name || "") ? String(orig.name).trim() : null,
            is_current: !!orig.is_current,
            notes: (orig.notes || "") ? String(orig.notes).trim() : null,
          };
          const payloadNormalized = {
            code: payload.code,
            name: payload.name,
            is_current: payload.is_current,
            notes: payload.notes,
          };
          const unchanged =
            origNormalized.code === payloadNormalized.code &&
            origNormalized.name === payloadNormalized.name &&
            origNormalized.is_current === payloadNormalized.is_current &&
            origNormalized.notes === payloadNormalized.notes;
          if (unchanged) {
            await alertError("No changes", "No changes detected for this standard.");
            return;
          }

          // Prevent turning off the only current standard without selecting another.
          if (origNormalized.is_current === true && payloadNormalized.is_current === false) {
            const anotherEditedTrue = Object.entries(gridEdits).some(([k, v]) => String(k) !== String(row.id) && v && v.is_current === true);
            const anotherExistingTrue = standards.some((s) => String(s.id) !== String(row.__id) && !!s.is_current);
            if (!anotherEditedTrue && !anotherExistingTrue) {
              await alertError("Invalid change", "At least one standard must be marked Current. Set another standard to Current before turning this one off.");
              return;
            }
          }
        }
      }
      if (row.__id) {
  showLoading('Saving standard', 'Please wait…');
        await api(`/admin/wq-standards/${row.__id}`, { method: "PUT", body: payload });
        await alertSuccess("Saved", `Updated ${payload.code}.`);
      } else {
        if (!payload.code) {
          await alertError("Validation", "Code is required for new standard");
          return;
        }
  showLoading('Creating standard', 'Please wait…');
        await api(`/admin/wq-standards`, { method: "POST", body: payload });
        await alertSuccess("Created", `Created ${payload.code}.`);
      }
      setGridEdits((prev) => ({ ...prev, [row.id]: {} }));
      if (!row.__id) setNewRows((prev) => prev.filter((rid) => rid !== row.id));
      invalidateHttpCache('/admin/wq-standards');
      await fetchStandards(page);
    } catch (err) {
      console.error("Failed to save standard", err);
      await alertError("Save failed", err?.message || "Failed to save standard");
    } finally {
      closeLoading();
    }
  };

  const deleteGridRow = async (row) => {
    if (!row.__id) {
      setGridEdits((prev) => ({ ...prev, [row.id]: {} }));
      setNewRows((prev) => prev.filter((rid) => rid !== row.id));
      return;
    }
    // Quick pre-confirm loader for snappy feedback
    try { closeLoading(); } catch {}
    try { showLoading('Loading', 'Preparing delete…'); } catch {}
    try { await sleep(150); } catch {}
    closeLoading();
    // Confirm deletion
    const ok = await confirm({ title: 'Delete standard?', text: `Delete ${row.code}?`, confirmButtonText: 'Delete' });
    if (!ok) return;
    // Guard: prevent deletion if there are sampling events using this standard
    try {
      try { showLoading('Loading', 'Checking related records…'); } catch {}
      const resEv = await api(`/admin/sample-events?applied_standard_id=${encodeURIComponent(row.__id)}&per_page=1`);
      const arrEv = Array.isArray(resEv?.data) ? resEv.data : Array.isArray(resEv) ? resEv : [];
      const hasEvents = (Array.isArray(arrEv) && arrEv.length > 0) || (resEv?.meta && typeof resEv.meta.total === 'number' && resEv.meta.total > 0);
      closeLoading();
      if (hasEvents) {
        await alertError('Delete not allowed', `Cannot delete "${row.code}" because there are sampling events that used this standard.`);
        return;
      }
    } catch (_) {
      // Ignore pre-check failures; backend will still enforce constraints
      try { closeLoading(); } catch {}
    }
    try {
  showLoading('Deleting standard', 'Please wait…');
      await api(`/admin/wq-standards/${row.__id}`, { method: "DELETE" });
      setGridEdits((prev) => ({ ...prev, [row.id]: {} }));
      invalidateHttpCache('/admin/wq-standards');
        await fetchStandards(page);
      await alertSuccess("Deleted", `Deleted ${row.code}.`);
    } catch (err) {
      console.error("Failed to delete standard", err);
      await alertError("Delete failed", err?.message || "Failed to delete standard");
    } finally {
      closeLoading();
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
          serverSide={true}
          pagination={{ page, totalPages }}
          onPageChange={(p) => setPage(p)}
          actions={[
            { label: "Save", type: "edit", icon: <FiSave />, onClick: (row) => saveGridRow(row) },
            { label: "Delete", type: "delete", icon: <FiTrash2 />, onClick: (row) => deleteGridRow(row) },
          ]}
          columnPicker={{ label: "Columns", locked: ["code"], defaultHidden: ["notes"] }}
          toolbar={{
            left: (
              <button type="button" className="pill-btn primary" onClick={() => { setPage(1); setNewRows((prev) => [`__new__-${Date.now()}`, ...prev]); }}>
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
