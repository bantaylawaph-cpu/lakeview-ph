import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiSave, FiTrash2 } from "react-icons/fi";

import TableLayout from "../../../layouts/TableLayout";
import { api } from "../../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../../lib/httpCache";
import { confirm, alertSuccess, alertError, showLoading, closeLoading } from "../../../lib/alerts";

const GRID_TABLE_ID = "admin-thresholds-grid";

function ThresholdsTab() {
  const [parameters, setParameters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [standards, setStandards] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  // Editable grid controls
  const [gridParamId, setGridParamId] = useState("");
  const [gridStandardId, setGridStandardId] = useState(""); // "" means default (null)
  const [gridEdits, setGridEdits] = useState({}); // { [class_code]: { unit, min_value, max_value, notes, __id? } }
  const [loading, setLoading] = useState(false);

  // Removed table toolbar and related filter/search state

  const fetchReference = useCallback(async () => {
    try {
      const [paramRes, classRes, standardRes] = await Promise.all([
        cachedGet("/admin/parameters", { ttlMs: 10 * 60 * 1000 }),
        cachedGet("/admin/water-quality-classes", { ttlMs: 30 * 60 * 1000 }),
        cachedGet("/admin/wq-standards", { ttlMs: 10 * 60 * 1000 }),
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
      const res = await cachedGet("/admin/parameter-thresholds", { ttlMs: 5 * 60 * 1000 });
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

  // Note: row-level edit/delete via listing table removed along with table

  const parameterOptions = useMemo(() => {
    return [...parameters].sort((a, b) => {
      const left = (a.name || a.code || "").toLowerCase();
      const right = (b.name || b.code || "").toLowerCase();
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
  }, [parameters]);

  // Removed listing filters/search and computed filtered data

  // ------- Editable grid helpers -------
  const orderedClasses = useMemo(() => {
    const priority = new Map([["AA", 0], ["A", 1], ["B", 2], ["C", 3], ["D", 4]]);
    const copy = [...classes];
    copy.sort((a, b) => {
      const pa = priority.has(a.code) ? priority.get(a.code) : 100 + a.code.charCodeAt(0);
      const pb = priority.has(b.code) ? priority.get(b.code) : 100 + b.code.charCodeAt(0);
      if (pa !== pb) return pa - pb;
      return (a.name || a.code).localeCompare(b.name || b.code);
    });
    return copy;
  }, [classes]);

  useEffect(() => {
    // Default selected parameter/standard when data loads
    if (!gridParamId && parameters.length) setGridParamId(String(parameters[0].id));
  }, [parameters, gridParamId]);

  const currentStandard = useMemo(() => {
    return standards.find((s) => s && s.is_current);
  }, [standards]);

  useEffect(() => {
    if (!gridStandardId && currentStandard) {
      setGridStandardId(String(currentStandard.id));
    }
  }, [gridStandardId, currentStandard]);

  const findThreshold = useCallback((paramId, clsCode, stdId) => {
    const sid = stdId === "" || stdId == null ? null : Number(stdId);
    return thresholds.find(
      (t) => Number(t.parameter_id) === Number(paramId) && t.class_code === clsCode && ((sid === null && t.standard_id == null) || Number(t.standard_id) === sid)
    );
  }, [thresholds]);

  const gridRows = useMemo(() => {
    if (!gridParamId) return [];
    return orderedClasses.map((c) => {
      const base = findThreshold(gridParamId, c.code, gridStandardId);
      const edit = gridEdits[c.code] || {};
      const param = parameters.find((p) => String(p.id) === String(gridParamId));
      return {
        id: c.code,
        class_code: c.code,
        class_name: c.name || c.code,
        unit: edit.unit ?? base?.unit ?? param?.unit ?? "",
        min_value: edit.min_value ?? (base?.min_value ?? ""),
        max_value: edit.max_value ?? (base?.max_value ?? ""),
        __id: edit.__id ?? base?.id ?? null,
        _base: base,
      };
    });
  }, [orderedClasses, gridParamId, gridStandardId, gridEdits, parameters, findThreshold]);

  const updateGridCell = (classCode, field, value) => {
    setGridEdits((prev) => ({
      ...prev,
      [classCode]: { ...prev[classCode], [field]: value },
    }));
  };

  const saveGridRow = async (row) => {
    const payload = {
      parameter_id: Number(gridParamId),
      class_code: row.class_code,
      standard_id: gridStandardId === "" ? null : Number(gridStandardId),
      unit: row.unit || null,
      min_value: row.min_value === "" ? null : Number(row.min_value),
      max_value: row.max_value === "" ? null : Number(row.max_value),
    };

    // If both numeric values are null, treat this save as a delete
    const bothNull = payload.min_value == null && payload.max_value == null;
    if (bothNull) {
      // If there's an existing record, delete it on the server
      if (row.__id) {
        try {
          showLoading('Deleting threshold', 'Please wait…');
          await api(`/admin/parameter-thresholds/${row.__id}`, { method: "DELETE" });
          setGridEdits((prev) => ({ ...prev, [row.class_code]: {} }));
          invalidateHttpCache('/admin/parameter-thresholds');
          await fetchThresholds();
          await alertSuccess('Deleted', `Threshold for ${row.class_code} deleted.`);
        } catch (err) {
          console.error("Failed to delete threshold during save", err);
          await alertError('Delete failed', err?.message || 'Failed to delete threshold');
        } finally {
          closeLoading();
        }
      } else {
        // New (unsaved) row with no values — just clear edits locally
        setGridEdits((prev) => ({ ...prev, [row.class_code]: {} }));
      }
      return;
    }

    try {
      if (row.__id) {
        showLoading('Saving threshold', 'Please wait…');
        await api(`/admin/parameter-thresholds/${row.__id}`, { method: "PUT", body: payload });
        await alertSuccess("Saved", `Updated ${row.class_code} threshold.`);
      } else {
        showLoading('Creating threshold', 'Please wait…');
        await api(`/admin/parameter-thresholds`, { method: "POST", body: payload });
        await alertSuccess("Created", `Saved ${row.class_code} threshold.`);
      }
      setGridEdits((prev) => ({ ...prev, [row.class_code]: {} }));
      invalidateHttpCache('/admin/parameter-thresholds');
      await fetchThresholds();
    } catch (err) {
      console.error("Failed to save threshold", err);
      await alertError("Save failed", err?.message || "Failed to save threshold");
    } finally {
      closeLoading();
    }
  };

  const deleteGridRow = async (row) => {
    if (!row.__id) {
      setGridEdits((prev) => ({ ...prev, [row.class_code]: {} }));
      return;
    }
    const ok = await confirm({ title: 'Delete threshold?', text: `Delete ${row.class_code} threshold?`, confirmButtonText: 'Delete' });
    if (!ok) return;
    try {
  showLoading('Deleting threshold', 'Please wait…');
      await api(`/admin/parameter-thresholds/${row.__id}`, { method: "DELETE" });
      setGridEdits((prev) => ({ ...prev, [row.class_code]: {} }));
      invalidateHttpCache('/admin/parameter-thresholds');
      await fetchThresholds();
      await alertSuccess('Deleted', 'Threshold deleted.');
    } catch (err) {
      console.error("Failed to delete threshold", err);
      await alertError('Delete failed', err?.message || 'Failed to delete threshold');
    } finally {
      closeLoading();
    }
  };

  const selectedParameter = useMemo(() => {
    return parameters.find((p) => String(p.id) === String(gridParamId));
  }, [parameters, gridParamId]);

  const { showMin, showMax } = useMemo(() => {
    const evalType = (selectedParameter?.evaluation_type || "").toLowerCase();
    if (evalType.includes("max") && !evalType.includes("range")) {
      return { showMin: false, showMax: true };
    }
    if (evalType.includes("min") && !evalType.includes("range")) {
      return { showMin: true, showMax: false };
    }
    // Default and 'range' show both
    return { showMin: true, showMax: true };
  }, [selectedParameter]);

  const gridColumns = useMemo(() => {
    const cols = [
      {
        id: "class_code",
        header: "Class",
        width: 120,
        render: (row) => row.class_name,
        disableToggle: true,
        alwaysVisible: true,
      },
      {
        id: "unit",
        header: "Unit",
        width: 140,
        render: (row) => (
          <div style={{ padding: '6px 8px', color: '#111827' }}>{row.unit ?? ""}</div>
        ),
      },
    ];

    if (showMin) {
      cols.push({
        id: "min_value",
        header: "Min",
        width: 120,
        render: (row) => (
          <input
            type="number"
            step="any"
            value={row.min_value ?? ""}
            placeholder="Numeric value (leave blank to unset)"
            title="Enter a numeric minimum value; leave blank to unset"
            onChange={(e) => updateGridCell(row.class_code, "min_value", e.target.value)}
            style={{ width: "100%" }}
          />
        ),
      });
    }

    if (showMax) {
      cols.push({
        id: "max_value",
        header: "Max",
        width: 120,
        render: (row) => (
          <input
            type="number"
            step="any"
            value={row.max_value ?? ""}
            placeholder="Numeric value (leave blank to unset)"
            title="Enter a numeric maximum value; leave blank to unset"
            onChange={(e) => updateGridCell(row.class_code, "max_value", e.target.value)}
            style={{ width: "100%" }}
          />
        ),
      });
    }

    return cols;
  }, [showMin, showMax]);

  // Removed filter panel configuration

  return (
    <div className="dashboard-card">
      {/* Editable grid */}
      <div id="thresholds-grid-anchor" className="dashboard-card-header">
        <div className="dashboard-card-title">
          <span>Thresholds Catalogue</span>
        </div>
      </div>

      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        <div className="org-form" style={{ alignItems: "flex-end", gap: 16 }}>
          <div className="form-group" style={{ minWidth: 260 }}>
            <label>Parameter</label>
            <select value={gridParamId} onChange={(e) => { setGridParamId(e.target.value); setGridEdits({}); }}>
              {parameterOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.code}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ minWidth: 220 }}>
            <label>Standard</label>
            <select value={gridStandardId} onChange={(e) => { setGridStandardId(e.target.value); setGridEdits({}); }}>
              {currentStandard ? (
                <>
                  <option value={String(currentStandard.id)}>{`Current: ${currentStandard.code}`}</option>
                  {standards
                    .filter((s) => String(s.id) !== String(currentStandard.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.code}</option>
                    ))}
                </>
              ) : (
                <option value="" disabled>Select Standard</option>
              )}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <TableLayout
            tableId={GRID_TABLE_ID}
            columns={gridColumns}
            data={gridRows}
            pageSize={Math.max(orderedClasses.length, 6)}
            actions={[
              { label: "Save", type: "edit", icon: <FiSave />, onClick: (row) => saveGridRow(row) },
              { label: "Delete", type: "delete", icon: <FiTrash2 />, onClick: (row) => deleteGridRow(row) },
            ]}
            columnPicker={{ label: "Columns", locked: ["class_code"] }}
            loading={loading}
            loadingLabel="Loading thresholds…"
          />
        </div>
      </div>
    </div>
  );
}

export default ThresholdsTab;
