import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiEdit2, FiEye, FiTrash2 } from "react-icons/fi";
import AppMap from "../../../components/AppMap";
import MapViewport from "../../../components/MapViewport";
import { GeoJSON } from "react-leaflet";
import L from "leaflet";

import TableLayout from "../../../layouts/TableLayout";
import TableToolbar from "../../../components/table/TableToolbar";
import { confirm, alertSuccess, alertError } from "../../../lib/alerts";
import WatershedForm from "../../../components/WatershedForm";
import { api } from "../../../lib/api";

const TABLE_ID = "admin-watercat-watersheds";
const VIS_KEY = `${TABLE_ID}::visible`;

const normalizeRows = (items = []) =>
  items.map((item) => ({
    id: item.id,
    name: item.name ?? "",
    description: item.description ?? "",
    createdAt: item.created_at ?? item.createdAt ?? null,
    _raw: item,
  }));

const parseError = (error, fallback) => {
  if (!error) return fallback;
  const message = error.message ?? fallback;
  if (!message) return fallback;
  try {
    const parsed = JSON.parse(message);
    if (parsed?.message) return parsed.message;
  } catch (_) {}
  return message;
};

export default function ManageWatershedsTab() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = window.localStorage.getItem(VIS_KEY);
      return raw ? JSON.parse(raw) : { name: true, description: true };
    } catch (_) {
      return { name: true, description: true };
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap));
    } catch (_) {}
  }, [visibleMap]);

  const [resetSignal, setResetSignal] = useState(0);
  const triggerResetWidths = () => setResetSignal((n) => n + 1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formInitial, setFormInitial] = useState({ name: "", description: "" });

  const mapRef = useRef(null);
  const lastLoadedIdRef = useRef(null);
  const [previewRow, setPreviewRow] = useState(null);
  const [previewFeature, setPreviewFeature] = useState(null);
  const [previewBounds, setPreviewBounds] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [mapViewport, setMapViewport] = useState({
    bounds: null,
    maxZoom: 13,
    padding: [24, 24],
    pad: 0.02,
    token: 0,
  });

  const updateViewport = useCallback((nextBounds, options = {}) => {
    if (!nextBounds?.isValid?.()) return;
    const clone = nextBounds.clone ? nextBounds.clone() : L.latLngBounds(nextBounds);
    setMapViewport({
      bounds: clone,
      maxZoom: options.maxZoom ?? 13,
      padding: options.padding ?? [24, 24],
      pad: options.pad ?? 0.02,
      token: Date.now(),
    });
  }, []);

  const resetViewport = useCallback(() => {
    setMapViewport((prev) => ({ ...prev, bounds: null, token: Date.now() }));
  }, []);

  const loadWatersheds = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await api("/watersheds");
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRows(normalizeRows(list));
    } catch (err) {
      console.error("[ManageWatershedsTab] Failed to load watersheds", err);
      setRows([]);
      setErrorMsg(parseError(err, "Failed to load watersheds."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWatersheds();
  }, [loadWatersheds]);

  const columns = useMemo(
    () => [
      { id: "name", header: "Name", accessor: "name" },
      { id: "description", header: "Description", accessor: "description", width: 320 },
    ],
    []
  );

  const visibleColumns = useMemo(
    () => columns.filter((col) => visibleMap[col.id] !== false),
    [columns, visibleMap]
  );

  const filteredRows = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter((row) => `${row.name} ${row.description}`.toLowerCase().includes(text));
  }, [rows, query]);

  const openCreate = () => {
    setFormMode("create");
    setFormInitial({ name: "", description: "" });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    const target = row?._raw ?? row;
    setFormMode("edit");
    setFormInitial({
      id: target?.id,
      name: target?.name ?? "",
      description: target?.description ?? "",
    });
    setFormOpen(true);
  };

  const openDelete = (row) => {
    const target = row?._raw ?? row;
    console.debug('[ManageWatershedsTab] delete clicked', target);
    handleDelete(target);
  };

  const loadPreview = useCallback(async (rawRow) => {
    const row = rawRow?._raw ?? rawRow;
    if (!row?.id) {
      setPreviewRow(null);
      setPreviewFeature(null);
      setPreviewBounds(null);
      setPreviewError("");
      lastLoadedIdRef.current = null;
      resetViewport();
      return;
    }

    if (lastLoadedIdRef.current === row.id && previewFeature) {
      setPreviewRow(row);
      return;
    }

    setPreviewRow(row);
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const response = await api(`/layers/active?body_type=watershed&body_id=${row.id}`);
      const data = response?.data;
      if (!data?.geom_geojson) {
        throw new Error("No published watershed layer found.");
      }

      let geometry;
      try {
        geometry = JSON.parse(data.geom_geojson);
      } catch (err) {
        throw new Error("Failed to parse watershed geometry.");
      }

      const feature = {
        type: "Feature",
        properties: {
          id: row.id,
          name: data.name || row.name || "Watershed",
        },
        geometry,
      };

      setPreviewFeature(feature);

      try {
        const layer = L.geoJSON(feature);
        const bounds = layer.getBounds();
        if (bounds?.isValid?.()) {
          setPreviewBounds(bounds);
          updateViewport(bounds);
        } else {
          setPreviewBounds(null);
          resetViewport();
        }
      } catch (_) {
        setPreviewBounds(null);
        resetViewport();
      }
    } catch (err) {
      console.error("[ManageWatershedsTab] Failed to load preview", err);
      setPreviewFeature(null);
      setPreviewBounds(null);
      setPreviewError(err?.message || "Failed to load watershed preview.");
      resetViewport();
    } finally {
      lastLoadedIdRef.current = row.id;
      setPreviewLoading(false);
    }
  }, [previewFeature, updateViewport, resetViewport]);

  useEffect(() => {
    if (!rows.length) {
      setPreviewRow(null);
      setPreviewFeature(null);
      setPreviewBounds(null);
      setPreviewError("");
      setPreviewLoading(false);
      lastLoadedIdRef.current = null;
      resetViewport();
      return;
    }

    if (!previewRow) {
      resetViewport();
      return;
    }

    const refreshed = rows.find((r) => r.id === previewRow.id);
    if (!refreshed) {
      setPreviewRow(null);
      setPreviewFeature(null);
      setPreviewBounds(null);
      setPreviewError("");
      setPreviewLoading(false);
      lastLoadedIdRef.current = null;
      return;
    }

    if (lastLoadedIdRef.current !== refreshed.id || !previewFeature) {
      loadPreview(refreshed);
    }
  }, [rows, previewRow, loadPreview, previewFeature, resetViewport]);

  useEffect(() => {
    if (!previewBounds) return;
    updateViewport(previewBounds);
  }, [previewBounds, updateViewport]);

  const handleSubmit = async (data) => {
    const name = (data.name || "").trim();
    const description = data.description ? data.description.trim() : "";
    if (!name) {
      setErrorMsg("Watershed name is required.");
      return;
    }

    const payload = {
      name,
      description: description || null,
    };

    setLoading(true);
    setErrorMsg("");
    try {
      if (formMode === "edit" && data.id) {
        await api(`/watersheds/${data.id}`, { method: "PUT", body: payload });
        await alertSuccess('Saved', `"${payload.name}" was updated.`);
      } else {
        await api('/watersheds', { method: "POST", body: payload });
        await alertSuccess('Created', `"${payload.name}" was created.`);
      }
      setFormOpen(false);
      await loadWatersheds();
    } catch (e) {
      console.error(e);
      setErrorMsg(parseError(e, "Failed to save watershed."));
      await alertError('Save failed', parseError(e, 'Failed to save watershed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (target) => {
    if (!target?.id) return;
    const ok = await confirm({ title: 'Delete watershed?', text: `Delete "${target.name}"?`, confirmButtonText: 'Delete' });
    if (!ok) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await api(`/watersheds/${target.id}`, { method: "DELETE" });
      await loadWatersheds();
      await alertSuccess('Deleted', `"${target.name}" was deleted.`);
    } catch (e) {
      console.error(e);
      setErrorMsg(parseError(e, "Failed to delete watershed."));
      await alertError('Delete failed', parseError(e, 'Failed to delete watershed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadWatersheds();
  };

  const handleView = useCallback(async (row) => {
    const target = row?._raw ?? row;
    await loadPreview(target);
  }, [loadPreview]);

  const exportCsv = () => {
    const headers = visibleColumns.map((c) => (typeof c.header === "string" ? c.header : c.id));
    const csvRows = filteredRows.map((row) =>
      visibleColumns
        .map((col) => {
          const value = row[col.accessor] ?? "";
          const str = String(value);
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(",")
    );
    const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "watersheds.csv";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 0);
  };

  const actions = [
    { label: "View", title: "View", icon: <FiEye />, onClick: handleView },
    { label: "Edit", title: "Edit", icon: <FiEdit2 />, onClick: openEdit, type: "edit" },
    { label: "Delete", title: "Delete", icon: <FiTrash2 />, onClick: openDelete, type: "delete" },
  ];

  return (
    <div className="dashboard-card">
      <TableToolbar
        tableId={TABLE_ID}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search watersheds by name or description...",
        }}
        filters={[]}
        columnPicker={{ columns, visibleMap, onVisibleChange: setVisibleMap }}
        onResetWidths={triggerResetWidths}
        onRefresh={handleRefresh}
        onExport={exportCsv}
        onAdd={openCreate}
        onToggleFilters={undefined}
        filtersBadgeCount={0}
      />

      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {loading && <div className="no-data">Loading...</div>}
        {!loading && errorMsg && <div className="no-data">{errorMsg}</div>}
        <div className="table-wrapper">
          <TableLayout
            tableId={TABLE_ID}
            columns={visibleColumns}
            data={filteredRows}
            pageSize={5}
            actions={actions}
            resetSignal={resetSignal}
          />
        </div>
      </div>

      <div className="dashboard-card" style={{ marginTop: 24 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiEye />
            <span>Watershed Preview</span>
          </div>
        </div>
        <div style={{ height: 360, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          <AppMap
            view="osm"
            style={{ height: "100%", width: "100%" }}
            whenCreated={(map) => (mapRef.current = map)}
          >
            {previewFeature && (
              <GeoJSON
                key={`preview-${previewFeature?.properties?.id || "x"}-${JSON.stringify(previewFeature?.geometry ?? {}).length}`}
                data={previewFeature}
                style={{ color: "#16a34a", weight: 2, fillOpacity: 0.15 }}
                onEachFeature={(feat, layer) => {
                  const nm = feat?.properties?.name || "Watershed";
                  layer.bindTooltip(nm, { sticky: true });
                }}
              />
            )}

            {mapViewport.bounds ? (
              <MapViewport
                bounds={mapViewport.bounds}
                maxZoom={mapViewport.maxZoom}
                padding={mapViewport.padding}
                pad={mapViewport.pad}
                version={mapViewport.token}
              />
            ) : null}
          </AppMap>
        </div>
        <div style={{ marginTop: 8 }}>
          {previewLoading && <div className="no-data">Loading preview...</div>}
          {!previewLoading && previewError && <div className="no-data">{previewError}</div>}
          {!previewLoading && !previewError && !previewFeature && (
            <div className="no-data">Select a watershed to preview its boundary.</div>
          )}
          {previewFeature && !previewLoading && !previewError && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Showing {previewRow?.name || "Watershed"}
            </div>
          )}
        </div>
      </div>

      <WatershedForm
        open={formOpen}
        mode={formMode}
        initialValue={formInitial}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => setFormOpen(false)}
      />

      {/* ConfirmDialog removed — deletion handled via centered SweetAlert confirm */}

    </div>
  );
}
