import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiEye, FiEdit2, FiTrash2, FiLayers } from "react-icons/fi";
import { GeoJSON } from "react-leaflet";
import AppMap from "../../components/AppMap";
import MapViewport from "../../components/MapViewport";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import TableLayout from "../../layouts/TableLayout";
import { api } from "../../lib/api";
import LakeForm from "../../components/LakeForm";
import ConfirmDialog from "../../components/ConfirmDialog";
import TableToolbar from "../../components/table/TableToolbar";
import FilterPanel from "../../components/table/FilterPanel";

const TABLE_ID = "admin-watercat-lakes";
const VIS_KEY = `${TABLE_ID}::visible`;
const ADV_KEY = `${TABLE_ID}::filters_advanced`;
const SEARCH_KEY = `${TABLE_ID}::search`;

const fmtNum = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return num.toFixed(digits);
};

const fmtDt = (value) => (value ? new Date(value).toLocaleDateString() : "");

const formatLocation = (row) => [row.municipality, row.province, row.region].filter(Boolean).join(", ");

const normalizeRows = (rows = []) =>
  rows.map((row) => ({
    id: row.id,
    name: row.name,
    alt_name: row.alt_name ?? "",
    region: row.region ?? "",
    province: row.province ?? "",
    municipality: row.municipality ?? "",
    surface_area_km2: fmtNum(row.surface_area_km2, 2),
    elevation_m: fmtNum(row.elevation_m, 1),
    mean_depth_m: fmtNum(row.mean_depth_m, 1),
    watershed: row.watershed?.name ?? "",
    created_at: fmtDt(row.created_at),
    updated_at: fmtDt(row.updated_at),
    location: formatLocation(row),
    _raw: row,
  }));

function ManageLakesTab() {
  const [query, setQuery] = useState(() => {
    try {
      return localStorage.getItem(SEARCH_KEY) || "";
    } catch (err) {
      return "";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_KEY, query);
    } catch (err) {
      // no-op when storage is unavailable
    }
  }, [query]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [allLakes, setAllLakes] = useState([]);
  const [lakes, setLakes] = useState([]);
  const [watersheds, setWatersheds] = useState([]);

  const mapRef = useRef(null);
  const lakeGeoRef = useRef(null);
  const watershedGeoRef = useRef(null);
  const [showLakePoly, setShowLakePoly] = useState(false);
  const [showWatershed, setShowWatershed] = useState(false);
  const [showInflow, setShowInflow] = useState(false);
  const [showOutflow, setShowOutflow] = useState(false);
  const [lakeFeature, setLakeFeature] = useState(null);
  const [lakeBounds, setLakeBounds] = useState(null);
  const [watershedFeature, setWatershedFeature] = useState(null);
  const [watershedBounds, setWatershedBounds] = useState(null);
  const [currentWatershedId, setCurrentWatershedId] = useState(null);

  const [mapViewport, setMapViewport] = useState({
    bounds: null,
    maxZoom: 14,
    padding: [24, 24],
    pad: 0.02,
    token: 0,
  });

  const updateViewport = useCallback((nextBounds, options = {}) => {
    if (!nextBounds?.isValid?.()) return;
    const clone = nextBounds.clone ? nextBounds.clone() : L.latLngBounds(nextBounds);
    setMapViewport({
      bounds: clone,
      maxZoom: options.maxZoom ?? 14,
      padding: options.padding ?? [24, 24],
      pad: options.pad ?? 0.02,
      token: Date.now(),
    });
  }, []);

  const resetViewport = useCallback(() => {
    setMapViewport((prev) => ({ ...prev, bounds: null, token: Date.now() }));
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formInitial, setFormInitial] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const baseColumns = useMemo(
    () => [
      { id: "name", header: "Name", accessor: "name" },
      {
        id: "alt_name",
        header: "Other Name",
        accessor: "alt_name",
        width: 180,
        render: (row) => (row.alt_name ? <em>{row.alt_name}</em> : ""),
      },
      { id: "region", header: "Region", accessor: "region", width: 140, className: "col-md-hide" },
      { id: "province", header: "Province", accessor: "province", width: 160, className: "col-md-hide" },
      { id: "municipality", header: "Municipality", accessor: "municipality", width: 180, className: "col-sm-hide" },
      { id: "surface_area_km2", header: "Surface Area (km^2)", accessor: "surface_area_km2", width: 170, className: "col-sm-hide" },
      { id: "elevation_m", header: "Elevation (m)", accessor: "elevation_m", width: 150, className: "col-md-hide", _optional: true },
      { id: "mean_depth_m", header: "Mean Depth (m)", accessor: "mean_depth_m", width: 160, className: "col-md-hide", _optional: true },
      { id: "watershed", header: "Watershed", accessor: "watershed", width: 220, _optional: true },
      { id: "created_at", header: "Created", accessor: "created_at", width: 140, className: "col-md-hide", _optional: true },
      { id: "updated_at", header: "Updated", accessor: "updated_at", width: 140, className: "col-sm-hide", _optional: true },
    ],
    []
  );

  const defaultsVisible = useMemo(() => {
    const initial = { name: true, alt_name: true, region: true, province: true, municipality: true, surface_area_km2: true };
    baseColumns.forEach((col) => {
      if (!(col.id in initial)) initial[col.id] = false;
    });
    return initial;
  }, [baseColumns]);

  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = localStorage.getItem(VIS_KEY);
      return raw ? JSON.parse(raw) : defaultsVisible;
    } catch (err) {
      return defaultsVisible;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap));
    } catch (err) {
      // ignore storage failure
    }
  }, [visibleMap]);

  const visibleColumns = useMemo(() => baseColumns.filter((col) => visibleMap[col.id] !== false), [baseColumns, visibleMap]);

  const [resetSignal, setResetSignal] = useState(0);
  const triggerResetWidths = () => setResetSignal((value) => value + 1);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adv, setAdv] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ADV_KEY)) || {};
    } catch (err) {
      return {};
    }
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    for (const value of Object.values(adv)) {
      if (Array.isArray(value)) {
        if (value.some((item) => item !== null && item !== "" && item !== undefined)) count += 1;
      } else if (value !== null && value !== "" && value !== undefined && !(typeof value === "boolean" && value === false)) {
        count += 1;
      }
    }
    return count;
  }, [adv]);

  useEffect(() => {
    try {
      localStorage.setItem(ADV_KEY, JSON.stringify(adv));
    } catch (err) {
      // ignore storage failure
    }
  }, [adv]);

  const fetchWatersheds = useCallback(async () => {
    try {
      const ws = await api("/watersheds");
      const list = Array.isArray(ws) ? ws : ws?.data ?? [];
      setWatersheds(list);
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load watersheds", err);
      setWatersheds([]);
    }
  }, []);

  const fetchLakes = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await api("/lakes");
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setAllLakes(normalizeRows(list));
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load lakes", err);
      setAllLakes([]);
      setErrorMsg("Failed to load lakes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatersheds();
    fetchLakes();
  }, [fetchWatersheds, fetchLakes]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    const region = (adv.region ?? "").toLowerCase();
    const province = (adv.province ?? "").toLowerCase();
    const municipality = (adv.municipality ?? "").toLowerCase();
    const [minArea, maxArea] = adv.area_km2 ?? [null, null];
    const [minElevation, maxElevation] = adv.elevation_m ?? [null, null];
    const [minDepth, maxDepth] = adv.mean_depth_m ?? [null, null];

    const filtered = allLakes.filter((row) => {
      const haystack = `${row.name} ${row.alt_name || ""} ${row.location} ${row.watershed}`.toLowerCase();

      if (q && !haystack.includes(q)) return false;
      if (region && (row.region || "").toLowerCase() !== region) return false;
      if (province && (row.province || "").toLowerCase() !== province) return false;
      if (municipality && (row.municipality || "").toLowerCase() !== municipality) return false;

      const area = row._raw?.surface_area_km2 ?? null;
      if (minArea != null && !(area != null && Number(area) >= Number(minArea))) return false;
      if (maxArea != null && !(area != null && Number(area) <= Number(maxArea))) return false;

      const elevation = row._raw?.elevation_m ?? null;
      if (minElevation != null && !(elevation != null && Number(elevation) >= Number(minElevation))) return false;
      if (maxElevation != null && !(elevation != null && Number(elevation) <= Number(maxElevation))) return false;

      const depth = row._raw?.mean_depth_m ?? null;
      if (minDepth != null && !(depth != null && Number(depth) >= Number(minDepth))) return false;
      if (maxDepth != null && !(depth != null && Number(depth) <= Number(maxDepth))) return false;

      return true;
    });

    setLakes(filtered);
  }, [allLakes, query, adv]);

  useEffect(() => {
    if (!lakeBounds) return;
    updateViewport(lakeBounds);
  }, [lakeBounds, updateViewport]);

  useEffect(() => {
    if (lakeGeoRef.current && showLakePoly) {
      try {
        lakeGeoRef.current.bringToFront();
      } catch (err) {
        // ignore leaflet instance errors
      }
    }
  }, [lakeFeature, showLakePoly]);

  useEffect(() => {
    if (watershedGeoRef.current && showWatershed) {
      try {
        watershedGeoRef.current.bringToFront();
      } catch (err) {
        // ignore leaflet instance errors
      }
    }
  }, [watershedFeature, showWatershed]);

  const loadWatershedFeature = useCallback(
    async (watershedId, { fit = false, autoShow = false, name = "" } = {}) => {
      if (!watershedId) {
        setCurrentWatershedId(null);
        setWatershedFeature(null);
        setWatershedBounds(null);
        if (autoShow) setShowWatershed(false);
        resetViewport();
        return;
      }

      if (currentWatershedId === watershedId && watershedFeature) {
        if (autoShow) setShowWatershed(true);
        if (fit && watershedBounds) {
          updateViewport(watershedBounds, { maxZoom: 12 });
        }
        return;
      }

      try {
        const detail = await api(`/watersheds/${watershedId}`);
        let geometry = null;
        if (detail?.geom_geojson) {
          try {
            geometry = JSON.parse(detail.geom_geojson);
          } catch (err) {
            console.error("[ManageLakesTab] Failed to parse watershed geometry", err);
          }
        }

        if (!geometry) {
          setWatershedFeature(null);
          setWatershedBounds(null);
          if (autoShow) setShowWatershed(false);
          resetViewport();
          return;
        }

        const feature = {
          type: "Feature",
          properties: {
            id: detail?.id ?? watershedId,
            name: (detail?.name ?? name) || "Watershed",
          },
          geometry,
        };

        setCurrentWatershedId(watershedId);
        setWatershedFeature(feature);

        try {
          const layer = L.geoJSON(feature);
          const bounds = layer.getBounds();
          if (bounds && bounds.isValid && bounds.isValid()) {
            setWatershedBounds(bounds);
            if (fit) {
              updateViewport(bounds, { maxZoom: 12 });
            }
          } else {
            setWatershedBounds(null);
            resetViewport();
          }
        } catch (err) {
          console.error("[ManageLakesTab] Failed to derive watershed bounds", err);
          setWatershedBounds(null);
          resetViewport();
        }

        if (autoShow) setShowWatershed(true);
      } catch (err) {
        console.error("[ManageLakesTab] Failed to load watershed", err);
        if (autoShow) setShowWatershed(false);
        setWatershedFeature(null);
        setWatershedBounds(null);
        resetViewport();
      }
    },
    [currentWatershedId, watershedFeature, watershedBounds, updateViewport, resetViewport]
  );

  useEffect(() => {
    if (showWatershed && currentWatershedId && !watershedFeature) {
      loadWatershedFeature(currentWatershedId, { autoShow: false });
    }
  }, [showWatershed, currentWatershedId, watershedFeature, loadWatershedFeature]);

  const viewLake = useCallback(
    async (row) => {
      const targetId = row?._raw?.id ?? row?.id;
      if (!targetId) return;

      setLoading(true);
      setErrorMsg("");
      try {
        const detail = await api(`/lakes/${targetId}`);

        let geometry = null;
        if (detail?.geom_geojson) {
          try {
            geometry = JSON.parse(detail.geom_geojson);
          } catch (err) {
            console.error("[ManageLakesTab] Failed to parse lake geometry", err);
          }
        }

        if (geometry) {
          const feature = {
            type: "Feature",
            properties: {
              id: detail.id,
              name: detail.name || row?.name || "Lake",
            },
            geometry,
          };
          setLakeFeature(feature);

          try {
            const layer = L.geoJSON(feature);
            const bounds = layer.getBounds();
            if (bounds && bounds.isValid && bounds.isValid()) {
              setLakeBounds(bounds);
              setShowLakePoly(true);
              updateViewport(bounds);
            } else {
              setLakeBounds(null);
              resetViewport();
            }
          } catch (err) {
            console.error("[ManageLakesTab] Failed to derive lake bounds", err);
            setLakeBounds(null);
            resetViewport();
          }
        } else {
          setLakeFeature(null);
          setLakeBounds(null);
          resetViewport();
        }

        const linkedWatershedId = detail?.watershed_id ?? detail?.watershed?.id ?? null;
        setCurrentWatershedId(linkedWatershedId);
        if (linkedWatershedId && showWatershed) {
          await loadWatershedFeature(linkedWatershedId, {
            autoShow: true,
            fit: false,
            name: detail?.watershed?.name ?? "",
          });
        } else if (!linkedWatershedId) {
          setWatershedFeature(null);
          setWatershedBounds(null);
          resetViewport();
        }
      } catch (err) {
        console.error("[ManageLakesTab] Failed to load lake", err);
        setErrorMsg("Failed to load lake details.");
        setLakeFeature(null);
        setLakeBounds(null);
        resetViewport();
      } finally {
        setLoading(false);
      }
    },
    [loadWatershedFeature, showWatershed, updateViewport, resetViewport]
  );

  const openCreate = useCallback(() => {
    setFormMode("create");
    setFormInitial({});
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((row) => {
    const source = row?._raw ?? row;
    if (!source) return;
    setFormMode("edit");
    setFormInitial({
      id: source.id,
      name: source.name ?? "",
      alt_name: source.alt_name ?? "",
      region: source.region ?? "",
      province: source.province ?? "",
      municipality: source.municipality ?? "",
      watershed_id: source.watershed_id ?? source.watershed?.id ?? "",
      surface_area_km2: source.surface_area_km2 ?? "",
      elevation_m: source.elevation_m ?? "",
      mean_depth_m: source.mean_depth_m ?? "",
    });
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((row) => {
    setConfirmTarget(row?._raw ?? row ?? null);
    setConfirmOpen(true);
  }, []);

  const parsePayload = (form) => {
    const payload = { ...form };
    ["surface_area_km2", "elevation_m", "mean_depth_m", "watershed_id"].forEach((field) => {
      const value = payload[field];
      if (value === "" || value === null || value === undefined) {
        payload[field] = null;
        return;
      }
      const num = Number(value);
      payload[field] = Number.isNaN(num) ? null : num;
    });
    ["name", "alt_name", "region", "province", "municipality"].forEach((field) => {
      const value = payload[field];
      payload[field] = value == null ? null : String(value).trim() || null;
    });
    return payload;
  };

  const saveLake = useCallback(
    async (formData) => {
      const payload = parsePayload(formData);
      setLoading(true);
      setErrorMsg("");
      try {
        if (formMode === "create") {
          await api("/lakes", { method: "POST", body: payload });
        } else {
          await api(`/lakes/${payload.id}`, { method: "PUT", body: payload });
        }
        setFormOpen(false);
        await fetchLakes();
      } catch (err) {
        console.error("[ManageLakesTab] Failed to save lake", err);
        setErrorMsg("Save failed. Please verify required fields and that the name is unique.");
      } finally {
        setLoading(false);
      }
    },
    [fetchLakes, formMode]
  );

  const deleteLake = useCallback(async () => {
    if (!confirmTarget?.id) {
      setConfirmOpen(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await api(`/lakes/${confirmTarget.id}`, { method: "DELETE" });
      setConfirmOpen(false);
      setConfirmTarget(null);
      await fetchLakes();
    } catch (err) {
      console.error("[ManageLakesTab] Failed to delete lake", err);
      setErrorMsg("Delete failed. This lake may be referenced by other records.");
    } finally {
      setLoading(false);
    }
  }, [confirmTarget, fetchLakes]);

  const exportCsv = useCallback(() => {
    const headers = visibleColumns.map((col) => (typeof col.header === "string" ? col.header : col.id));
    const csvRows = lakes.map((row) =>
      visibleColumns
        .map((col) => {
          const value = row[col.accessor] ?? "";
          const text = String(value);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(",")
    );

    const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lakes.csv";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 0);
  }, [lakes, visibleColumns]);

  const regionOptions = useMemo(
    () => ["", ...new Set(allLakes.map((row) => row.region).filter(Boolean))].map((value) => ({ value, label: value || "All Regions" })),
    [allLakes]
  );

  const provinceOptions = useMemo(
    () => ["", ...new Set(allLakes.map((row) => row.province).filter(Boolean))].map((value) => ({ value, label: value || "All Provinces" })),
    [allLakes]
  );

  const municipalityOptions = useMemo(
    () =>
      ["", ...new Set(allLakes.map((row) => row.municipality).filter(Boolean))].map((value) => ({
        value,
        label: value || "All Municipalities/Cities",
      })),
    [allLakes]
  );

  const actions = useMemo(
    () => [
      { label: "View", title: "View", icon: <FiEye />, onClick: viewLake },
      { label: "Edit", title: "Edit", icon: <FiEdit2 />, onClick: openEdit, type: "edit" },
      { label: "Delete", title: "Delete", icon: <FiTrash2 />, onClick: openDelete, type: "delete" },
    ],
    [openDelete, openEdit, viewLake]
  );

  return (
    <div className="dashboard-card">
      <TableToolbar
        tableId={TABLE_ID}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search lakes by name, alt name, location, watershed...",
        }}
        filters={[]}
        columnPicker={{ columns: baseColumns, visibleMap, onVisibleChange: setVisibleMap }}
        onResetWidths={triggerResetWidths}
        onRefresh={fetchLakes}
        onExport={exportCsv}
        onAdd={openCreate}
        onToggleFilters={() => setFiltersOpen((value) => !value)}
        filtersBadgeCount={activeFilterCount}
      />

      <FilterPanel
        open={filtersOpen}
        onClearAll={() => setAdv({})}
        fields={[
          {
            id: "region",
            label: "Region",
            type: "select",
            value: adv.region ?? "",
            onChange: (value) => setAdv((state) => ({ ...state, region: value })),
            options: regionOptions,
          },
          {
            id: "province",
            label: "Province",
            type: "select",
            value: adv.province ?? "",
            onChange: (value) => setAdv((state) => ({ ...state, province: value })),
            options: provinceOptions,
          },
          {
            id: "municipality",
            label: "Municipality/City",
            type: "select",
            value: adv.municipality ?? "",
            onChange: (value) => setAdv((state) => ({ ...state, municipality: value })),
            options: municipalityOptions,
          },
          {
            id: "area_km2",
            label: "Surface Area (km^2)",
            type: "number-range",
            value: adv.area_km2 ?? [null, null],
            onChange: (range) => setAdv((state) => ({ ...state, area_km2: range })),
          },
          {
            id: "elevation_m",
            label: "Elevation (m)",
            type: "number-range",
            value: adv.elevation_m ?? [null, null],
            onChange: (range) => setAdv((state) => ({ ...state, elevation_m: range })),
          },
          {
            id: "mean_depth_m",
            label: "Mean Depth (m)",
            type: "number-range",
            value: adv.mean_depth_m ?? [null, null],
            onChange: (range) => setAdv((state) => ({ ...state, mean_depth_m: range })),
          },
        ]}
      />

      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {loading && <div className="no-data">Loading...</div>}
        {!loading && errorMsg && <div className="no-data">{errorMsg}</div>}
        <div className="table-wrapper">
          <TableLayout
            tableId={TABLE_ID}
            columns={visibleColumns}
            data={lakes}
            pageSize={5}
            actions={actions}
            resetSignal={resetSignal}
          />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#374151" }}>
            <FiLayers /> Layers
          </span>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showLakePoly} onChange={(event) => setShowLakePoly(event.target.checked)} />
            Lake polygon
          </label>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showWatershed} onChange={(event) => setShowWatershed(event.target.checked)} />
            Watershed
          </label>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showInflow} onChange={(event) => setShowInflow(event.target.checked)} />
            Inflow markers
          </label>
          <label className="pill-btn" style={{ gap: 6 }}>
            <input type="checkbox" checked={showOutflow} onChange={(event) => setShowOutflow(event.target.checked)} />
            Outflow markers
          </label>
        </div>

        <div style={{ height: 500, borderRadius: 12, overflow: "hidden" }}>
          <AppMap
            view="osm"
            style={{ height: "100%", width: "100%" }}
            whenCreated={(map) => (mapRef.current = map)}
          >
            {showWatershed && watershedFeature ? (
              <GeoJSON
                ref={watershedGeoRef}
                key={`watershed-${currentWatershedId}-${JSON.stringify(watershedFeature.geometry ?? {}).length}`}
                data={watershedFeature}
                style={{ weight: 1.5, color: "#047857", fillOpacity: 0.08 }}
              />
            ) : null}

            {showLakePoly && lakeFeature ? (
              <GeoJSON
                ref={lakeGeoRef}
                key={`lake-${lakeFeature.properties?.id ?? "feature"}-${JSON.stringify(lakeFeature.geometry ?? {}).length}`}
                data={lakeFeature}
                style={{ weight: 2, color: "#2563eb", fillOpacity: 0.1 }}
              />
            ) : null}

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
      </div>

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

export default ManageLakesTab;

