// resources/js/pages/AdminInterface/AdminWaterCat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiEye, FiEdit2, FiTrash2, FiMap, FiLayers } from "react-icons/fi";
import { GeoJSON } from "react-leaflet";
import AppMap from "../../components/AppMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import TableLayout from "../../layouts/TableLayout";
import { api } from "../../lib/api";
import LakeForm from "../../components/LakeForm";
import ConfirmDialog from "../../components/ConfirmDialog";
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";

// Leaflet marker asset fix
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const TABLE_ID = "admin-watercat-lakes";
const VIS_KEY  = `${TABLE_ID}::visible`;
const ADV_KEY  = `${TABLE_ID}::filters_advanced`;

export default function AdminWaterCat() {
  /* ----------------------------- Basic toolbar state ----------------------------- */
  const [query, setQuery] = useState(() => {
    try { return localStorage.getItem(`${TABLE_ID}::search`) || ""; } catch { return ""; }
  });

  /* ----------------------------- Core state ----------------------------- */
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [allLakes, setAllLakes] = useState([]);
  const [lakes, setLakes] = useState([]);
  const [watersheds, setWatersheds] = useState([]);

  /* ----------------------------- Map ----------------------------- */
  const mapRef = useRef(null);
  const [showLakePoly, setShowLakePoly] = useState(false);
  const [showWatershed, setShowWatershed] = useState(false);
  const [showInflow, setShowInflow] = useState(false);
  const [showOutflow, setShowOutflow] = useState(false);
  const [lakeFeature, setLakeFeature] = useState(null);
  const [lakeBounds, setLakeBounds] = useState(null);
  // Initial view handled by AppMap (Philippines extent)

  /* ----------------------------- Modals ----------------------------- */
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formInitial, setFormInitial] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  /* ----------------------------- Columns ----------------------------- */
  const baseColumns = useMemo(() => ([
    { id: "name", header: "Name", accessor: "name" },
    { id: "alt_name", header: "Other Name", accessor: "alt_name", width: 180, render: (r) => (r.alt_name ? <em>{r.alt_name}</em> : "") },
    { id: "region", header: "Region", accessor: "region", width: 140, className: "col-md-hide" },
    { id: "province", header: "Province", accessor: "province", width: 160, className: "col-md-hide" },
    { id: "municipality", header: "Municipality", accessor: "municipality", width: 180, className: "col-sm-hide" },
    { id: "surface_area_km2", header: "Surface Area (km²)", accessor: "surface_area_km2", width: 170, className: "col-sm-hide" },
    // Optional/toggleable:
    { id: "elevation_m", header: "Elevation (m)", accessor: "elevation_m", width: 150, className: "col-md-hide", _optional: true },
    { id: "mean_depth_m", header: "Mean Depth (m)", accessor: "mean_depth_m", width: 160, className: "col-md-hide", _optional: true },
    { id: "watershed", header: "Watershed", accessor: "watershed", width: 220, _optional: true },
    { id: "created_at", header: "Created", accessor: "created_at", width: 140, className: "col-md-hide", _optional: true },
    { id: "updated_at", header: "Updated", accessor: "updated_at", width: 140, className: "col-sm-hide", _optional: true },
  ]), []);

  const defaultsVisible = useMemo(() => {
    const on = { name: true, alt_name: true, region: true, province: true, municipality: true, surface_area_km2: true };
    baseColumns.forEach(c => { if (!(c.id in on)) on[c.id] = false; });
    return on;
  }, [baseColumns]);

  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = localStorage.getItem(VIS_KEY);
      return raw ? JSON.parse(raw) : defaultsVisible;
    } catch { return defaultsVisible; }
  });
  useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);

  const visibleColumns = useMemo(() => baseColumns.filter(c => visibleMap[c.id] !== false), [baseColumns, visibleMap]);

  // Reset widths trigger for TableLayout
  const [resetSignal, setResetSignal] = useState(0);
  const triggerResetWidths = () => setResetSignal(n => n + 1);

  /* ----------------------------- Advanced Filters ----------------------------- */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adv, setAdv] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ADV_KEY)) || {}; } catch { return {}; }
  });

  const activeFilterCount = useMemo(() => {
    let c = 0;
    for (const [, v] of Object.entries(adv)) {
      if (Array.isArray(v)) { if (v.some(x => x !== null && x !== "" && x !== undefined)) c++; }
      else if (v !== null && v !== "" && v !== undefined && !(typeof v === "boolean" && v === false)) c++;
    }
    return c;
  }, [adv]);

  useEffect(() => { try { localStorage.setItem(ADV_KEY, JSON.stringify(adv)); } catch {} }, [adv]);

  /* ----------------------------- Formatting helpers ----------------------------- */
  const fmtNum = (v, d = 2) => (v === null || v === undefined || v === "" ? "" : Number(v).toFixed(d));
  const fmtDt  = (v) => (v ? new Date(v).toLocaleDateString() : "");
  const formatLocation = (r) => [r.municipality, r.province, r.region].filter(Boolean).join(", ");

  const normalizeRows = (rows) =>
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      alt_name: r.alt_name ?? "",
      region: r.region ?? "",
      province: r.province ?? "",
      municipality: r.municipality ?? "",
      surface_area_km2: fmtNum(r.surface_area_km2, 2),
      elevation_m: fmtNum(r.elevation_m, 1),
      mean_depth_m: fmtNum(r.mean_depth_m, 1),
      // max_depth_m removed
      watershed: r.watershed?.name ?? "",
      created_at: fmtDt(r.created_at),
      updated_at: fmtDt(r.updated_at),
      location: formatLocation(r),
      _raw: r,
    }));

  /* ----------------------------- Fetchers ----------------------------- */
  const fetchWatersheds = async () => {
    try {
      const ws = await api("/watersheds");
      setWatersheds(Array.isArray(ws) ? ws : []);
    } catch { setWatersheds([]); }
  };
  const fetchLakes = async () => {
    setLoading(true); setErrorMsg("");
    try {
      const data = await api("/lakes");
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setAllLakes(normalizeRows(list));
    } catch (e) {
      console.error(e); setErrorMsg("Failed to load lakes."); setAllLakes([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchWatersheds(); fetchLakes(); }, []);

  /* ----------------------------- Apply filters ----------------------------- */
  useEffect(() => {
    const q = query.trim().toLowerCase();

    const reg  = (adv.region ?? "").toLowerCase();
    const prov = (adv.province ?? "").toLowerCase();
    const muni = (adv.municipality ?? "").toLowerCase();

    const [minArea, maxArea]   = adv.area_km2    ?? [null, null];
    const [minEl,   maxEl]     = adv.elevation_m ?? [null, null];
    const [minMd,   maxMd]     = adv.mean_depth_m ?? [null, null];

    const filtered = allLakes.filter((row) => {
      const hay = `${row.name} ${row.alt_name || ""} ${row.location} ${row.watershed}`.toLowerCase();

      if (q && !hay.includes(q)) return false;
      if (reg  && (row.region || "").toLowerCase()       !== reg) return false;
      if (prov && (row.province || "").toLowerCase()     !== prov) return false;
      if (muni && (row.municipality || "").toLowerCase() !== muni) return false;

      const area = row._raw?.surface_area_km2 ?? null;
      if (minArea != null && !(area != null && Number(area) >= Number(minArea))) return false;
      if (maxArea != null && !(area != null && Number(area) <= Number(maxArea))) return false;

      const elv = row._raw?.elevation_m ?? null;
      if (minEl != null && !(elv != null && Number(elv) >= Number(minEl))) return false;
      if (maxEl != null && !(elv != null && Number(elv) <= Number(maxEl))) return false;

      const md = row._raw?.mean_depth_m ?? null;
      if (minMd != null && !(md != null && Number(md) >= Number(minMd))) return false;
      if (maxMd != null && !(md != null && Number(md) <= Number(maxMd))) return false;

      // max_depth_m removed

      return true;
    });

    setLakes(filtered);
  }, [allLakes, query, adv]);

  /* ----------------------------- Map fit on selected bounds ----------------------------- */
  useEffect(() => {
    if (!mapRef.current || !lakeBounds) return;
    mapRef.current.fitBounds(lakeBounds, { padding: [24, 24] });
  }, [lakeBounds]);

  /* ----------------------------- Row actions ----------------------------- */
  const viewLake = async (row) => {
    const id = row?.id ?? row?._raw?.id; if (!id) return;
    setLoading(true); setErrorMsg("");
    try {
      const detail = await api(`/lakes/${id}`);
      let feature = null;
      if (detail?.geom_geojson) { try { feature = JSON.parse(detail.geom_geojson); } catch {} }
      setLakeFeature(feature);
      if (feature) {
        const layer = L.geoJSON(feature);
        const b = layer.getBounds();
        if (b?.isValid?.() === true) setLakeBounds(b);
      } else setLakeBounds(null);
    } catch (e) {
      console.error(e); setErrorMsg("Failed to load lake details.");
      setLakeFeature(null); setLakeBounds(null);
    } finally { setLoading(false); }
  };
  const openCreate = () => { setFormMode("create"); setFormInitial({}); setFormOpen(true); };
  const openEdit = (row) => {
    const r = row?._raw ?? row;
    setFormMode("edit");
    setFormInitial({
      id: r.id, name: r.name ?? "", region: r.region ?? "", province: r.province ?? "",
      municipality: r.municipality ?? "", watershed_id: r._raw?.watershed_id ?? r.watershed_id ?? "",
      surface_area_km2: r._raw?.surface_area_km2 ?? r.surface_area_km2 ?? "",
      elevation_m: r._raw?.elevation_m ?? r.elevation_m ?? "",
      mean_depth_m: r._raw?.mean_depth_m ?? r.mean_depth_m ?? "",
      // max_depth_m removed
      alt_name: r.alt_name ?? "",
    });
    setFormOpen(true);
  };
  const openDelete = (row) => { setConfirmTarget(row?._raw ?? row); setConfirmOpen(true); };

  const actions = useMemo(() => [
    { label: "View",   title: "View",   icon: <FiEye />,   onClick: viewLake },
    { label: "Edit",   title: "Edit",   icon: <FiEdit2 />, onClick: openEdit,  type: "edit" },
    { label: "Delete", title: "Delete", icon: <FiTrash2 />,onClick: openDelete, type: "delete" },
  ], []);

  /* ----------------------------- Save/Delete ----------------------------- */
  const parsePayload = (src) => {
    const nx = { ...src };
    ["surface_area_km2","elevation_m","mean_depth_m","watershed_id"].forEach((k) => {
      nx[k] = nx[k] === "" || nx[k] === null || nx[k] === undefined ? null : Number(nx[k]);
      if (Number.isNaN(nx[k])) nx[k] = null;
    });
    ["name","alt_name","region","province","municipality"].forEach((k) => nx[k] = (nx[k] ?? "").toString().trim() || null);
    return nx;
  };
  const saveLake = async (formObj) => {
    const payload = parsePayload(formObj);
    setLoading(true); setErrorMsg("");
    try {
      if (formMode === "create") await api("/lakes", { method: "POST", body: payload });
      else await api(`/lakes/${payload.id}`, { method: "PUT", body: payload });
      setFormOpen(false);
      await fetchLakes();
    } catch (e) {
      console.error(e); setErrorMsg("Save failed. Please check required fields and uniqueness of name.");
    } finally { setLoading(false); }
  };
  const deleteLake = async () => {
    if (!confirmTarget?.id) { setConfirmOpen(false); return; }
    setLoading(true); setErrorMsg("");
    try {
      await api(`/lakes/${confirmTarget.id}`, { method: "DELETE" });
      setConfirmOpen(false); setConfirmTarget(null);
      await fetchLakes();
    } catch (e) {
      console.error(e); setErrorMsg("Delete failed. This lake may be referenced by other records.");
    } finally { setLoading(false); }
  };

  /* ----------------------------- CSV Export ----------------------------- */
  const exportCsv = () => {
    const cols = visibleColumns;
    const headers = cols.map(c => (typeof c.header === "string" ? c.header : c.id));
    const rows = lakes.map(row =>
      cols.map(c => {
        const v = row[c.accessor] ?? "";
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lakes.csv";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  };

  /* ----------------------------- Options for selects ----------------------------- */
  const regionOptions = useMemo(
    () => ["", ...new Set(allLakes.map(r => r.region).filter(Boolean))].map(v => ({ value: v, label: v || "All Regions" })),
    [allLakes]
  );
  const provinceOptions = useMemo(
    () => ["", ...new Set(allLakes.map(r => r.province).filter(Boolean))].map(v => ({ value: v, label: v || "All Provinces" })),
    [allLakes]
  );
  const municipalityOptions = useMemo(
    () => ["", ...new Set(allLakes.map(r => r.municipality).filter(Boolean))].map(v => ({ value: v, label: v || "All Municipalities/Cities" })),
    [allLakes]
  );

  /* ----------------------------- Render ----------------------------- */
  return (
    <div className="dashboard-card">
      {/* Reusable Toolbar (no basic filters now to keep it clean) */}
      <TableToolbar
        tableId={TABLE_ID}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search lakes by name, alt name, location, watershed…",
        }}
        filters={[]}
        columnPicker={{ columns: baseColumns, visibleMap, onVisibleChange: setVisibleMap }}
        onResetWidths={triggerResetWidths}
        onRefresh={fetchLakes}
        onExport={exportCsv}
        onAdd={() => openCreate()}
        onToggleFilters={() => setFiltersOpen(v => !v)}
        filtersBadgeCount={activeFilterCount}
      />

      {/* Advanced Filters (below toolbar, above table) */}
      <FilterPanel
        open={filtersOpen}
        onClearAll={() => setAdv({})}
        fields={[
          {
            id: "region",
            label: "Region",
            type: "select",
            value: adv.region ?? "",
            onChange: (v) => setAdv((s) => ({ ...s, region: v })),
            options: regionOptions,
          },
          {
            id: "province",
            label: "Province",
            type: "select",
            value: adv.province ?? "",
            onChange: (v) => setAdv((s) => ({ ...s, province: v })),
            options: provinceOptions,
          },
          {
            id: "municipality",
            label: "Municipality/City",
            type: "select",
            value: adv.municipality ?? "",
            onChange: (v) => setAdv((s) => ({ ...s, municipality: v })),
            options: municipalityOptions,
          },
          {
            id: "area_km2",
            label: "Surface Area (km²)",
            type: "number-range",
            value: adv.area_km2 ?? [null, null],
            onChange: (range) => setAdv((s) => ({ ...s, area_km2: range })),
          },
          {
            id: "elevation_m",
            label: "Elevation (m)",
            type: "number-range",
            value: adv.elevation_m ?? [null, null],
            onChange: (range) => setAdv((s) => ({ ...s, elevation_m: range })),
          },
          {
            id: "mean_depth_m",
            label: "Mean Depth (m)",
            type: "number-range",
            value: adv.mean_depth_m ?? [null, null],
            onChange: (range) => setAdv((s) => ({ ...s, mean_depth_m: range })),
          },
          // NOTE: watershed checkbox removed as requested
        ]}
      />

      {/* Table */}
      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {loading && <div className="no-data">Loading…</div>}
        {!loading && errorMsg && <div className="no-data">{errorMsg}</div>}
        <div className="table-wrapper">
          <TableLayout
            tableId={TABLE_ID}
            columns={visibleColumns}
            data={lakes}
            pageSize={10}
            actions={actions}
            resetSignal={resetSignal}
          />
        </div>
      </div>

      {/* Map + toggles */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#374151" }}>
            <FiLayers /> Layers
          </span>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showLakePoly} onChange={(e) => setShowLakePoly(e.target.checked)} />
            Lake polygon
          </label>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showWatershed} onChange={(e) => setShowWatershed(e.target.checked)} />
            Watershed
          </label>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showInflow} onChange={(e) => setShowInflow(e.target.checked)} />
            Inflow markers
          </label>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showOutflow} onChange={(e) => setShowOutflow(e.target.checked)} />
            Outflow markers
          </label>
        </div>

        <div style={{ height: 500, borderRadius: 12, overflow: "hidden" }}>
          <AppMap
            view="osm"
            style={{ height: "100%", width: "100%" }}
            whenCreated={(map) => (mapRef.current = map)}
          >
            {showLakePoly && lakeFeature ? (
              <GeoJSON
                key={JSON.stringify(lakeFeature).length}
                data={lakeFeature}
                style={{ weight: 2, fillOpacity: 0.1 }}
              />
            ) : null}
          </AppMap>
        </div>
      </div>

      {/* Modals */}
      <LakeForm
        open={formOpen}
        mode={formMode}
        initialValue={formInitial}
        watersheds={watersheds}
        loading={loading}
        onSubmit={saveLake}
        onCancel={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Lake"
        message={`Are you sure you want to delete "${confirmTarget?.name ?? "this lake"}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={deleteLake}
        onCancel={() => setConfirmOpen(false)}
        loading={loading}
      />
    </div>
  );
}
