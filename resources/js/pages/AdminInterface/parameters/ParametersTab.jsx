import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";

import TableLayout from "../../../layouts/TableLayout";
import TableToolbar from "../../../components/table/TableToolbar";
import { api } from "../../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../../lib/httpCache";
import { confirm, alertSuccess, alertError, showLoading, closeLoading } from "../../../lib/alerts";
import ParameterForm from "../../../components/ParameterForm";

// Small utility to briefly show the loader for snappy UX
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const UNIT_OPTIONS = [
  { value: "mg/L", label: "mg/L" },
  { value: "°C", label: "°C" },
  { value: "MPN/100mL", label: "MPN/100mL" },
  { value: "TCU", label: "TCU" },
  { value: "µg/L", label: "µg/L" },
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
  evaluation_type: "",
  desc: "",
};

const ensureOption = (options, value) => {
  if (!value) return options;
  return options.some((opt) => opt.value === value)
    ? options
    : [...options, { value, label: value }];
};

function ParametersTab() {

  const extractApiErrorMessage = (err) => {
    if (!err) return 'Unknown error';
    const respData = err?.response?.data;
    if (respData) {
      if (typeof respData === 'string') return respData;
      if (respData.message) return respData.message;
      try { return JSON.stringify(respData); } catch (_) { /* fallthrough */ }
    }
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

  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [gridResetSignal, setGridResetSignal] = useState(0);

  // Column visibility (managed via TableToolbar's ColumnPicker)
  const GRID_TABLE_ID = "admin-parameters-grid";
  const GRID_VISIBLE_KEY = `${GRID_TABLE_ID}::visible-cols`;
  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = localStorage.getItem(GRID_VISIBLE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    // Hide Description by default; users can enable via Column Picker
    return { desc: false };
  });
  useEffect(() => {
    try { localStorage.setItem(GRID_VISIBLE_KEY, JSON.stringify(visibleMap)); } catch {}
  }, [visibleMap]);
  const [resetSignal, setResetSignal] = useState(0);
  // Modal editing state
  const [editOpen, setEditOpen] = useState(false);
  const [modalForm, setModalForm] = useState(emptyForm);
  // Server-side pagination state
  const [page, setPage] = useState(1);
  const perPage = 5;
  const [totalPages, setTotalPages] = useState(1);

  const fetchParameters = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const res = await cachedGet(`/admin/parameters`, { params: opts, ttlMs: 10 * 60 * 1000 });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setParams(list);
      if (res && typeof res.current_page === 'number') {
        setPage(res.current_page || 1);
      }
      if (res && typeof res.last_page === 'number') {
        setTotalPages(res.last_page || 1);
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load parameters", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset to page 1 when query changes
  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    const paramsObj = {
      search: query,
      page,
      per_page: perPage,
    };
    fetchParameters(paramsObj);
  }, [fetchParameters, query, page, resetSignal]);

  const filtered = useMemo(() => params, [params]);

  const gridRows = useMemo(() => {
    return filtered.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name || "",
      unit: p.unit || "",
      evaluation_type: p.evaluation_type || "",
      desc: p.desc || "",
      _raw: p,
    }));
  }, [filtered]);

  const openCreateModal = async () => {
    try { closeLoading(); } catch {}
    try { showLoading('Loading', 'Preparing form…'); } catch {}
    try { await sleep(150); } catch {}
    closeLoading();
    setModalForm({ ...emptyForm });
    setEditOpen(true);
  };

  const openEditModal = async (row) => {
    try { closeLoading(); } catch {}
    try { showLoading('Loading', 'Preparing edit form…'); } catch {}
    try { await sleep(150); } catch {}
    closeLoading();
    setModalForm({
      code: row.code || "",
      name: row.name || "",
      unit: row.unit || "",
      evaluation_type: row.evaluation_type || "",
      desc: row.desc || "",
      __id: row.id,
    });
    setEditOpen(true);
  };

  const hasSamplingEventsForParameter = useCallback(async (paramId) => {
    try {
      const res = await api(`/admin/sample-events?parameter_id=${encodeURIComponent(paramId)}&per_page=1`);
      const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (Array.isArray(arr) && arr.length > 0) return true;
      if (res?.meta && typeof res.meta.total === 'number' && res.meta.total > 0) return true;
      return false;
    } catch (_) {
      return false;
    }
  }, []);

  const deleteGridRow = async (row) => {
    // Quick pre-confirm loader for snappy feedback
    try { closeLoading(); } catch {}
    try { showLoading('Loading', 'Preparing delete…'); } catch {}
    try { await sleep(150); } catch {}
    closeLoading();

    const ok = await confirm({ title: 'Delete parameter?', text: `Delete ${row.code}?`, confirmButtonText: 'Delete' });
    if (!ok) return;

    // Optional pre-check with loader
    try {
      try { showLoading('Loading', 'Checking related records…'); } catch {}
      const used = await hasSamplingEventsForParameter(row.id);
      closeLoading();
      if (used) {
        await alertError('Delete not allowed', `Cannot delete "${row.code}" because there are sampling events that used this parameter.`);
        return;
      }
    } catch (_) {
      // Ensure any loader is closed
      try { closeLoading(); } catch {}
    }

    try {
      showLoading('Deleting parameter', 'Please wait…');
      await api(`/admin/parameters/${row.id}`, { method: "DELETE" });
      invalidateHttpCache('/admin/parameters');
      await fetchParameters({
        search: query,
        page,
        per_page: perPage,
      });
      await alertSuccess('Deleted', `"${row.code}" was deleted.`);
    } catch (err) {
      console.error("Failed to delete parameter", err);
      const raw = extractApiErrorMessage(err);
      if (/(foreign key violation|violates foreign key constraint|still referenced)/i.test(raw)) {
        await alertError('Delete failed', `Cannot delete "${row.code}" because there are sample results that reference it. Remove or reassign those sample results first.`);
      } else {
        await alertError('Delete failed', raw || 'Failed to delete parameter');
      }
    } finally {
      closeLoading();
    }
  };

  const gridColumns = useMemo(() => [
    { id: "code", header: "Code", width: 140, render: (row) => <span>{row.code}</span> },
    { id: "name", header: "Name", width: 220, render: (row) => <span>{row.name}</span> },
    { id: "unit", header: "Unit", width: 120, render: (row) => <span>{row.unit || "—"}</span> },
    { id: "evaluation_type", header: "Evaluation", width: 160, render: (row) => <span>{EVALUATION_LABELS[(row.evaluation_type || "").toLowerCase()] || row.evaluation_type || "—"}</span> },
    { id: "desc", header: "Description", width: 280, render: (row) => <span title={row.desc}>{row.desc || "—"}</span> },
  ], []);

  const columnsForPicker = useMemo(
    () => gridColumns.map((c) => ({ id: c.id, header: c.header })),
    [gridColumns]
  );
  const effectiveColumns = useMemo(() => {
    const lockId = 'code';
    return gridColumns.filter((c) => c.id === lockId || visibleMap[c.id] !== false);
  }, [gridColumns, visibleMap]);

  const handleRefresh = useCallback(() => {
    fetchParameters({
      search: query,
      page,
      per_page: perPage,
    });
  }, [fetchParameters, query, page]);

  const unitOptions = useMemo(() => ensureOption(UNIT_OPTIONS, modalForm.unit), [modalForm.unit]);

  const actions = useMemo(
    () => [
      {
        label: "Edit",
        type: "edit",
        icon: <FiEdit2 />,
        onClick: (row) => openEditModal(row),
      },
      {
        label: "Delete",
        type: "delete",
        icon: <FiTrash2 />,
        onClick: (row) => deleteGridRow(row),
      },
    ], [deleteGridRow]
  );

  // Save handler used by ParameterForm
  const submitParameter = async (payload) => {
    try {
      setModalSaving(true);
      if (modalForm.__id) {
        showLoading('Saving parameter', 'Please wait…');
        await api(`/admin/parameters/${modalForm.__id}`, { method: "PUT", body: payload });
        await alertSuccess('Saved', `"${payload.code}" was updated.`);
      } else {
        showLoading('Creating parameter', 'Please wait…');
        await api(`/admin/parameters`, { method: "POST", body: payload });
        await alertSuccess('Created', `"${payload.code}" was created.`);
      }
      setEditOpen(false);
      setModalForm({ ...emptyForm });
      invalidateHttpCache('/admin/parameters');
      await fetchParameters({
        search: query,
        page,
        per_page: perPage,
      });
      setResetSignal((value) => value + 1);
    } catch (err) {
      console.error('Failed to save parameter', err);
      await alertError('Save failed', err?.message || 'Failed to save parameter');
    } finally {
      closeLoading();
      setModalSaving(false);
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
          columns={effectiveColumns}
          data={gridRows}
          serverSide={true}
          pagination={{ page, totalPages }}
          onPageChange={(p) => setPage(p)}
          actions={actions}
          resetSignal={gridResetSignal}
          columnPicker={false}
          toolbar={
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minWidth: 0, gap: 8 }}>
              <div>
                <button type="button" className="pill-btn primary" onClick={openCreateModal}>
                  <FiPlus />
                  <span>Add Water Quality Parameter</span>
                </button>
              </div>
              <TableToolbar
                tableId={GRID_TABLE_ID}
                search={{ value: query, onChange: setQuery, placeholder: 'Search code or name…' }}
                columnPicker={{
                  columns: columnsForPicker,
                  visibleMap,
                  onVisibleChange: (map) => {
                    const next = { ...map, code: true }; 
                    setVisibleMap(next);
                  },
                }}
                onResetWidths={() => setGridResetSignal((s) => s + 1)}
                onRefresh={handleRefresh}
              />
            </div>
          }
          loading={loading}
          loadingLabel="Loading parameters…"
        />

        {/* Create/Edit Modal via reusable ParameterForm */}
        <ParameterForm
          open={editOpen}
          mode={modalForm.__id ? 'edit' : 'create'}
          initialValue={modalForm}
          unitOptions={unitOptions}
          loading={modalSaving}
          onSubmit={submitParameter}
          onCancel={() => setEditOpen(false)}
        />
      </div>
    </div>
  );
}

export default ParametersTab;
 
