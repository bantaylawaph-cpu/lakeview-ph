import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { GeoJSON } from "react-leaflet"; // kept for parity; some callers compute bounds inline

import { FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";

import { api } from "../../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../../lib/httpCache";
import { confirm, alertSuccess, alertError, showLoading, closeLoading } from "../../../lib/alerts";

// Shared helpers
const fmtNum = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  if (digits === "full") return String(value);
  return num.toFixed(digits);
};

const fmtDt = (value) => (value ? new Date(value).toLocaleString() : "");

const fmtFlowsStatus = (value) => {
  switch (value) {
    case "present":
      return "Exists";
    case "none":
      return "None";
    case "unknown":
    default:
      return "Not yet recorded";
  }
};

const firstVal = (v) => (Array.isArray(v) ? v[0] : v);
const joinVals = (v) => (Array.isArray(v) ? v.join(" / ") : v || "");
const formatLocation = (row) =>
  [
    firstVal(row.municipality_list ?? row.municipality),
    firstVal(row.province_list ?? row.province),
    firstVal(row.region_list ?? row.region),
  ]
    .filter(Boolean)
    .join(", ");

// ---------------- Lakes ----------------
export function useManageLakesTabLogic() {
  const TABLE_ID = "admin-watercat-lakes";
  const VIS_KEY = `${TABLE_ID}::visible`;
  const ADV_KEY = `${TABLE_ID}::filters_advanced`;
  const SEARCH_KEY = `${TABLE_ID}::search`;
  const SORT_KEY = `${TABLE_ID}::sort`;

  const [query, setQuery] = useState(() => {
    try {
      return localStorage.getItem(SEARCH_KEY) || "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_KEY, query);
    } catch {}
  }, [query]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [lakes, setLakes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 5, total: 0, lastPage: 1 });
  const [sort, setSort] = useState(() => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      return raw ? JSON.parse(raw) : { id: "created_at", dir: "desc" };
    } catch {
      return { id: "created_at", dir: "desc" };
    }
  });

  const [watersheds, setWatersheds] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);

  const viewMapRef = useRef(null);
  const lakeGeoRef = useRef(null);
  const watershedGeoRef = useRef(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [showLakePoly, setShowLakePoly] = useState(false);
  const [showWatershed, setShowWatershed] = useState(false);
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

  const baseColumns = useMemo(
    () => [
      { id: "name", header: "Name", accessor: "name" },
      { id: "alt_name", header: "Other Name", accessor: "alt_name", width: 180, render: (row) => (row.alt_name ? <em>{row.alt_name}</em> : "") },
      { id: "region", header: "Region", accessor: "region", width: 140, className: "col-md-hide" },
      { id: "province", header: "Province", accessor: "province", width: 160, className: "col-md-hide" },
      { id: "municipality", header: "Municipality", accessor: "municipality", width: 180, className: "col-sm-hide" },
      { id: "classification", header: "Water Body Classification", accessor: "classification", width: 200, render: (row) => row.class_code || "" },
      { id: "surface_area_km2", header: "Surface Area (km²)", accessor: "surface_area_km2", width: 170, className: "col-sm-hide" },
      { id: "elevation_m", header: "Surface Elevation (m)", accessor: "elevation_m", width: 150, className: "col-md-hide", _optional: true },
      { id: "mean_depth_m", header: "Average Depth (m)", accessor: "mean_depth_m", width: 160, className: "col-md-hide", _optional: true },
      { id: "flows_status", header: "Tributaries", accessor: "flows_status", width: 160, className: "col-md-hide", _optional: true, render: (row) => fmtFlowsStatus(row.flows_status) },
      { id: "watershed", header: "Watershed", accessor: "watershed", width: 220, _optional: true },
      { id: "created_at", header: "Created", accessor: "created_at", width: 140, className: "col-md-hide", _optional: true },
      { id: "updated_at", header: "Updated", accessor: "updated_at", width: 140, className: "col-sm-hide", _optional: true },
    ],
    []
  );

  const defaultsVisible = useMemo(() => {
    const initial = { name: true, region: true, province: true, classification: true, flows_status: true, watershed: true };
    baseColumns.forEach((col) => {
      if (!(col.id in initial)) initial[col.id] = false;
    });
    return initial;
  }, [baseColumns]);

  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = localStorage.getItem(VIS_KEY);
      return raw ? JSON.parse(raw) : defaultsVisible;
    } catch {
      return defaultsVisible;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap));
    } catch {}
  }, [visibleMap]);

  const visibleColumns = useMemo(() => baseColumns.filter((col) => visibleMap[col.id] !== false), [baseColumns, visibleMap]);

  const [resetSignal, setResetSignal] = useState(0);
  const triggerResetWidths = () => setResetSignal((n) => n + 1);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adv, setAdv] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ADV_KEY)) || {};
    } catch {
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
    } catch {}
  }, [adv]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify(sort));
    } catch {}
  }, [sort]);

  const restoreDefaults = useCallback(() => {
    try {
      localStorage.removeItem(VIS_KEY);
      localStorage.removeItem(ADV_KEY);
      localStorage.removeItem(SEARCH_KEY);
      localStorage.removeItem(SORT_KEY);
    } catch {}
    setVisibleMap(defaultsVisible);
    setAdv({});
    setQuery("");
  setSort({ id: "created_at", dir: "desc" });
    triggerResetWidths();
  }, [defaultsVisible]);

  const normalizeRows = useCallback(
    (rows = []) =>
      rows.map((row) => {
        const regionList = row.region_list ?? (Array.isArray(row.region) ? row.region : null);
        const provinceList = row.province_list ?? (Array.isArray(row.province) ? row.province : null);
        const municipalityList = row.municipality_list ?? (Array.isArray(row.municipality) ? row.municipality : null);

        const multiRegion = regionList && regionList.length > 1;
        const multiProvince = provinceList && provinceList.length > 1;
        const multiMunicipality = municipalityList && municipalityList.length > 1;

        const regionDisplay = multiRegion ? joinVals(regionList) : firstVal(regionList) ?? (row.region ?? "");
        const provinceDisplay = multiProvince ? joinVals(provinceList) : firstVal(provinceList) ?? (row.province ?? "");
        const municipalityDisplay = multiMunicipality ? joinVals(municipalityList) : firstVal(municipalityList) ?? (row.municipality ?? "");

        return {
          id: row.id,
          name: row.name,
          alt_name: row.alt_name ?? "",
          flows_status: row.flows_status ?? "unknown",
          region: regionDisplay,
          province: provinceDisplay,
          municipality: municipalityDisplay,
          region_list: regionList || null,
          province_list: provinceList || null,
          municipality_list: municipalityList || null,
          class_code: row.class_code ?? "",
          class_name: row.water_quality_class?.name ?? "",
          classification: row.class_code ? [row.class_code, row.water_quality_class?.name].filter(Boolean).join(" - ") : "",
          surface_area_km2: fmtNum(row.surface_area_km2, "full"),
          elevation_m: fmtNum(row.elevation_m, 1),
          mean_depth_m: fmtNum(row.mean_depth_m, 1),
          watershed: row.watershed?.name ?? "",
          lat: fmtNum(row.lat, 6),
          lon: fmtNum(row.lon, 6),
          created_at: row.created_at ? new Date(row.created_at).toLocaleDateString() : "",
          updated_at: row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "",
          location: formatLocation(row),
          _raw: row,
        };
      }),
    []
  );

  const fetchWatersheds = useCallback(async () => {
    try {
      const ws = await cachedGet("/watersheds", { ttlMs: 10 * 60 * 1000 });
      const list = Array.isArray(ws) ? ws : ws?.data ?? [];
      setWatersheds(list);
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load watersheds", err);
      setWatersheds([]);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await cachedGet("/options/water-quality-classes", { ttlMs: 60 * 60 * 1000 });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setClassOptions(list);
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load water quality classes", err);
      setClassOptions([]);
    }
  }, []);

  const fetchProvinces = useCallback(async () => {
    try {
      const res = await cachedGet("/options/provinces", { ttlMs: 10 * 60 * 1000 });
      const list = Array.isArray(res) ? res : [];
      setProvinceOptions(list.map((p) => ({ value: p, label: p })));
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load provinces", err);
      setProvinceOptions([]);
    }
  }, []);

  const fetchRegions = useCallback(async () => {
    try {
      const res = await cachedGet("/options/regions", { ttlMs: 10 * 60 * 1000 });
      const list = Array.isArray(res) ? res : [];
      setRegionOptions(list.map((r) => ({ value: r, label: r })));
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load regions", err);
      setRegionOptions([]);
    }
  }, []);

  const fetchLakes = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page);
      params.append("per_page", pagination.perPage);
      params.append("sort_by", sort.id);
      params.append("sort_dir", sort.dir);
      if (query) params.append("q", query);
      if (Object.keys(adv).length > 0) params.append("adv", JSON.stringify(adv));

      const data = await api(`/lakes?${params.toString()}`, { auth: false });
      const list = Array.isArray(data.data) ? data.data : [];
      setLakes(normalizeRows(list));
      setPagination({ page: data.current_page, perPage: data.per_page, total: data.total, lastPage: data.last_page });
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load lakes", err);
      setLakes([]);
      setErrorMsg("Failed to load lakes.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, sort.id, sort.dir, query, adv, normalizeRows]);

  useEffect(() => {
    fetchWatersheds();
    fetchClasses();
    fetchProvinces();
    fetchRegions();
  }, [fetchWatersheds, fetchClasses, fetchProvinces, fetchRegions]);

  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [query, adv]);

  useEffect(() => {
    const t = setTimeout(() => fetchLakes(), 300);
    return () => clearTimeout(t);
  }, [fetchLakes]);

  const handleSortChange = (colId) => {
    setSort((prev) => (prev.id === colId ? { id: colId, dir: prev.dir === "asc" ? "desc" : "asc" } : { id: colId, dir: "asc" }));
  };
  const handlePageChange = (newPage) => setPagination((p) => ({ ...p, page: newPage }));

  useEffect(() => {
    if (!lakeBounds) return;
    updateViewport(lakeBounds);
  }, [lakeBounds, updateViewport]);
  useEffect(() => {
    if (lakeGeoRef.current && showLakePoly) {
      try {
        lakeGeoRef.current.bringToFront();
      } catch {}
    }
  }, [lakeFeature, showLakePoly]);
  useEffect(() => {
    if (watershedGeoRef.current && showWatershed) {
      try {
        watershedGeoRef.current.bringToFront();
      } catch {}
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
        if (fit && watershedBounds) updateViewport(watershedBounds, { maxZoom: 12 });
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
  const feature = { type: "Feature", properties: { id: detail?.id ?? watershedId, name: (detail?.name ?? name) || "Watershed" }, geometry };
        setCurrentWatershedId(watershedId);
        setWatershedFeature(feature);
        try {
          const layer = L.geoJSON(feature);
          const bounds = layer.getBounds();
          if (bounds?.isValid?.()) {
            setWatershedBounds(bounds);
            if (fit) updateViewport(bounds, { maxZoom: 12 });
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
        // Defensive: clear any prior stuck loading
  try { closeLoading(); } catch {}
  showLoading('Loading', 'Fetching lake details…');
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
          const feature = { type: "Feature", properties: { id: detail.id, name: detail.name || row?.name || "Lake" }, geometry };
          setLakeFeature(feature);
          try {
            const layer = L.geoJSON(feature);
            const bounds = layer.getBounds();
            if (bounds?.isValid?.()) {
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
          await loadWatershedFeature(linkedWatershedId, { autoShow: true, fit: false, name: detail?.watershed?.name ?? "" });
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
        closeLoading();
        setViewOpen(true);
      }
    },
    [loadWatershedFeature, showWatershed, updateViewport, resetViewport]
  );

  const openCreate = useCallback(() => {
    setFormMode("create");
    setFormInitial({});
    setFormOpen(true);
  }, []);

  const openEdit = useCallback(async (row) => {
    const source = row?._raw ?? row;
    if (!source?.id) return;
    setLoading(true);
    setErrorMsg("");
    try {
  try { closeLoading(); } catch {}
  showLoading('Loading', 'Preparing edit form…');
      const detail = await api(`/lakes/${source.id}`);
      // If lake has geometry but no lat/lon, calculate from centroid
      if (detail.geom_geojson && (!detail.lat || !detail.lon)) {
        try {
          const geom = JSON.parse(detail.geom_geojson);
          const layer = L.geoJSON(geom);
          const bounds = layer.getBounds();
          const center = bounds.getCenter();
          detail.lat = center.lat;
          detail.lon = center.lng;
        } catch (e) {
          // Ignore parsing errors
        }
      }
      setFormMode("edit");
      setFormInitial({
        id: detail.id,
        name: detail.name ?? "",
        alt_name: detail.alt_name ?? "",
        region: detail.region ?? "",
        province: detail.province ?? "",
        municipality: detail.municipality ?? "",
        watershed_id: detail.watershed_id ?? detail.watershed?.id ?? "",
        surface_area_km2: detail.surface_area_km2 ?? "",
        elevation_m: detail.elevation_m ?? "",
        mean_depth_m: detail.mean_depth_m ?? "",
        lat: detail.lat ?? "",
        lon: detail.lon ?? "",
        class_code: detail.class_code ?? "",
        flows_status: detail.flows_status ?? "unknown",
      });
      setFormOpen(true);
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load lake for edit", err);
      setErrorMsg("Failed to load lake details for editing.");
    } finally {
      setLoading(false);
      closeLoading();
    }
  }, []);

  const openDelete = useCallback(
    (row) => {
      const target = row?._raw ?? row ?? null;
      if (!target) return;
      (async () => {
        try {
          setLoading(true);
          setErrorMsg("");
          try { closeLoading(); } catch {}
          showLoading('Loading', 'Checking related records…');
          const id = target.id;
          let detail = null;
          try { detail = await api(`/lakes/${encodeURIComponent(id)}`); } catch {}
          const linkedWatershedId = detail?.watershed_id ?? detail?.watershed?.id ?? target?.watershed_id ?? target?.watershed?.id ?? null;
          const linkedWatershedName = detail?.watershed?.name ?? target?.watershed?.name ?? null;
          const checks = await Promise.allSettled([
            api(`/admin/sample-events?lake_id=${encodeURIComponent(target.id)}&per_page=1`),
            api(`/lake-flows?lake_id=${encodeURIComponent(target.id)}&per_page=1`),
            api(`/layers?body_type=lake&body_id=${encodeURIComponent(target.id)}&per_page=1`),
          ]);
          let hasEvents = false, hasFlows = false, hasLayers = false;
          try { const res = checks[0].status === 'fulfilled' ? checks[0].value : null; const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []; hasEvents = (Array.isArray(arr) && arr.length>0) || (res?.meta && typeof res.meta.total==='number' && res.meta.total>0); } catch {}
          try { const res = checks[1].status === 'fulfilled' ? checks[1].value : null; const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []; hasFlows = (Array.isArray(arr) && arr.length>0) || (res?.meta && typeof res.meta.total==='number' && res.meta.total>0); } catch {}
          try { const res = checks[2].status === 'fulfilled' ? checks[2].value : null; const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []; hasLayers = (Array.isArray(arr) && arr.length>0) || (res?.meta && typeof res.meta.total==='number' && res.meta.total>0); } catch {}
          const reasons = [];
          if (hasEvents) reasons.push('associated water quality test(s)');
          if (hasFlows) reasons.push('inlet/outlet tributary point(s)');
          if (hasLayers) reasons.push('published GIS layer(s)');
          if (linkedWatershedId) reasons.push(linkedWatershedName ? `linked watershed (${linkedWatershedName})` : 'a linked watershed');
          closeLoading();
          if (reasons.length) {
            const ok = await confirm({ title: 'Related records detected', text: `This lake has ${reasons.join(', ')}. Deleting the lake may affect related data. Delete anyway?`, confirmButtonText: 'Delete' });
            if (!ok) { setLoading(false); return; }
          } else {
            const ok = await confirm({ title: 'Delete lake?', text: `Delete "${target.name}"?`, confirmButtonText: 'Delete' });
            if (!ok) { setLoading(false); return; }
          }
          try {
            showLoading('Deleting lake', 'Please wait…');
            await api(`/lakes/${target.id}`, { method: 'DELETE' });
            invalidateHttpCache(['/lakes', '/options/lakes', '/lake-flows']);
            await fetchLakes();
            await alertSuccess('Deleted', `"${target.name}" was deleted.`);
          } catch (err) {
            console.error('[ManageLakesTab] Failed to delete lake', err);
            setErrorMsg('Delete failed. This lake may be referenced by other records.');
            await alertError('Delete failed', err?.message || 'Could not delete lake');
          } finally { closeLoading(); setLoading(false); }
        } catch (err) {
          try {
            closeLoading();
            const ok = await confirm({ title: 'Delete lake?', text: `Delete "${target.name}"?`, confirmButtonText: 'Delete' });
            if (!ok) return;
            setLoading(true); setErrorMsg('');
            try {
              showLoading('Deleting lake', 'Please wait…');
              await api(`/lakes/${target.id}`, { method: 'DELETE' });
              invalidateHttpCache(['/lakes', '/options/lakes', '/lake-flows']);
              await fetchLakes();
              await alertSuccess('Deleted', `"${target.name}" was deleted.`);
            } catch (err2) {
              console.error('[ManageLakesTab] Failed to delete lake', err2);
              setErrorMsg('Delete failed. This lake may be referenced by other records.');
              await alertError('Delete failed', err2?.message || 'Could not delete lake');
            } finally { closeLoading(); setLoading(false); }
          } catch {}
        }
      })();
    },
    [fetchLakes]
  );

  const parsePayload = (form) => {
    const payload = { ...form };
    ["surface_area_km2", "elevation_m", "mean_depth_m", "watershed_id"].forEach((field) => {
      const value = payload[field];
      if (value === "" || value == null) { payload[field] = null; return; }
      const num = Number(value); payload[field] = Number.isNaN(num) ? null : num;
    });
    ["name", "alt_name", "region", "province", "municipality", "class_code"].forEach((field) => {
      const value = payload[field]; payload[field] = value == null ? null : String(value).trim() || null;
    });
    if (payload.flows_status === "" || payload.flows_status == null) delete payload.flows_status; else payload.flows_status = String(payload.flows_status);
    return payload;
  };

  const saveLake = useCallback(
    async (formData) => {
      const payload = parsePayload(formData);
      setLoading(true); setErrorMsg("");
      try {
        let updatedLake;
        if (formMode === 'create') {
          showLoading('Creating lake', 'Please wait…');
          updatedLake = await api('/lakes', { method: 'POST', body: payload });
          await alertSuccess('Created', `"${updatedLake.name || payload.name}" was created.`);
          fetchLakes();
        } else {
          showLoading('Saving lake', 'Please wait…');
          updatedLake = await api(`/lakes/${payload.id}`, { method: 'PUT', body: payload });
          await alertSuccess('Saved', `"${updatedLake.name || payload.name}" was updated.`);
          fetchLakes();
        }
        setFormOpen(false);
        invalidateHttpCache(['/options/lakes', '/lake-flows']);
      } catch (err) {
        console.error('[ManageLakesTab] Failed to save lake', err);
        setErrorMsg('Save failed. Please verify required fields and that the name is unique.');
        await alertError('Save failed', err?.message || 'Unable to save lake');
      } finally { closeLoading(); setLoading(false); }
    },
    [formMode, fetchLakes]
  );

  const regionsForFilter = useMemo(() => [{ value: "", label: "All Regions" }, ...regionOptions], [regionOptions]);
  const provincesForFilter = useMemo(() => [{ value: "", label: "All Provinces" }, ...provinceOptions], [provinceOptions]);
  const classFilterOptions = useMemo(
    () => [
      { value: "", label: "All Classifications" },
      ...classOptions.map((item) => ({ value: item.code, label: item.name ? `${item.code} - ${item.name}` : item.code })),
    ],
    [classOptions]
  );

  const actions = useMemo(
    () => [
      { label: 'View', title: 'View', icon: <FiEye />, onClick: viewLake },
      { label: 'Edit', title: 'Edit', icon: <FiEdit2 />, onClick: openEdit, type: 'edit' },
      { label: 'Delete', title: 'Delete', icon: <FiTrash2 />, onClick: openDelete, type: 'delete' },
    ],
    [openDelete, openEdit, viewLake]
  );

  return {
    // identifiers and columns
    TABLE_ID,
    baseColumns,
    visibleColumns,
    visibleMap,
    setVisibleMap,
    resetSignal,
    triggerResetWidths,
    restoreDefaults,

    // table data
    lakes,
    loading,
    errorMsg,
    fetchLakes,
    actions,

    // paging & sorting & search
    pagination,
    sort,
    handleSortChange,
    handlePageChange,
    query,
    setQuery,

    // filters
    filtersOpen,
    setFiltersOpen,
    adv,
    setAdv,
    regionsForFilter,
    provincesForFilter,
    classFilterOptions,
    activeFilterCount,

    // view modal & map
    viewOpen,
    setViewOpen,
    viewMapRef,
    lakeFeature,
    watershedFeature,
    mapViewport,

    // form
    formOpen,
    formMode,
    formInitial,
    setFormOpen,
    openCreate,
    openEdit,
    openDelete,
    saveLake,
    watersheds,
    classOptions,
  };
}

// ---------------- Watersheds ----------------
export function useManageWatershedsTabLogic() {
  const TABLE_ID = "admin-watercat-watersheds";
  const VIS_KEY = `${TABLE_ID}::visible`;

  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [pagination, setPagination] = useState({ page: 1, perPage: 5, total: 0, lastPage: 1 });
  const [sort, setSort] = useState({ id: "name", dir: "asc" });

  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = window.localStorage.getItem(VIS_KEY);
      return raw ? JSON.parse(raw) : { name: true, description: true };
    } catch {
      return { name: true, description: true };
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {}
  }, [visibleMap]);

  const [resetSignal, setResetSignal] = useState(0);
  const triggerResetWidths = () => setResetSignal((n) => n + 1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formInitial, setFormInitial] = useState({ name: "", description: "" });

  const viewMapRef = useRef(null);
  const lastLoadedIdRef = useRef(null);
  const [previewRow, setPreviewRow] = useState(null);
  const [previewFeature, setPreviewFeature] = useState(null);
  const [previewBounds, setPreviewBounds] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [mapViewport, setMapViewport] = useState({ bounds: null, maxZoom: 13, padding: [24, 24], pad: 0.02, token: 0 });

  const [viewOpen, setViewOpen] = useState(false);

  const updateViewport = useCallback((nextBounds, options = {}) => {
    if (!nextBounds?.isValid?.()) return;
    const clone = nextBounds.clone ? nextBounds.clone() : L.latLngBounds(nextBounds);
    setMapViewport({ bounds: clone, maxZoom: options.maxZoom ?? 13, padding: options.padding ?? [24, 24], pad: options.pad ?? 0.02, token: Date.now() });
  }, []);
  const resetViewport = useCallback(() => { setMapViewport((prev) => ({ ...prev, bounds: null, token: Date.now() })); }, []);

  const normalizeRows = (items = []) => items.map((item) => ({ id: item.id, name: item.name ?? "", description: item.description ?? "", createdAt: item.created_at ?? item.createdAt ?? null, _raw: item }));
  const parseError = (error, fallback) => {
    if (!error) return fallback;
    const message = error.message ?? fallback;
    if (!message) return fallback;
    try { const parsed = JSON.parse(message); if (parsed?.message) return parsed.message; } catch {}
    return message;
  };

  const loadWatersheds = useCallback(async () => {
    setLoading(true); setErrorMsg("");
    try {
      const params = { page: pagination.page, per_page: pagination.perPage, sort_by: sort.id, sort_dir: sort.dir, q: query };
      const data = await api("/watersheds", { params });
      const list = Array.isArray(data.data) ? data.data : [];
      setRows(normalizeRows(list));
      setPagination({ page: data.current_page, perPage: data.per_page, total: data.total, lastPage: data.last_page });
    } catch (err) {
      console.error("[ManageWatershedsTab] Failed to load watersheds", err);
      setRows([]); setErrorMsg(parseError(err, "Failed to load watersheds."));
    } finally { setLoading(false); }
  }, [pagination.page, pagination.perPage, sort.id, sort.dir, query]);

  useEffect(() => { const t = setTimeout(() => loadWatersheds(), 300); return () => clearTimeout(t); }, [loadWatersheds]);
  useEffect(() => { setPagination((prev) => ({ ...prev, page: 1 })); }, [query]);

  const handleSortChange = (colId) => setSort((prev) => ({ id: colId, dir: prev.id === colId && prev.dir === "asc" ? "desc" : "asc" }));
  const handlePageChange = (newPage) => setPagination((prev) => ({ ...prev, page: newPage }));

  const columns = useMemo(() => [ { id: "name", header: "Name", accessor: "name" }, { id: "description", header: "Description", accessor: "description", width: 320 },], []);
  const visibleColumns = useMemo(() => columns.filter((col) => visibleMap[col.id] !== false), [columns, visibleMap]);

  const openCreate = () => { setFormMode("create"); setFormInitial({ name: "", description: "" }); setFormOpen(true); };
  const openEdit = async (row) => {
    const target = row?._raw ?? row;
  try { try { closeLoading(); } catch {}; showLoading('Loading', 'Preparing edit form…'); } catch {}
    setFormMode("edit");
    setFormInitial({ id: target?.id, name: target?.name ?? "", description: target?.description ?? "" });
    setFormOpen(true);
    closeLoading();
  };
  const openDelete = (row) => { const target = row?._raw ?? row; handleDelete(target); };

  const loadPreview = useCallback(async (rawRow) => {
    const row = rawRow?._raw ?? rawRow;
    if (!row?.id) { setPreviewRow(null); setPreviewFeature(null); setPreviewBounds(null); setPreviewError(""); lastLoadedIdRef.current = null; resetViewport(); return; }
    if (lastLoadedIdRef.current === row.id && previewFeature) { setPreviewRow(row); return; }
    setPreviewRow(row); setPreviewLoading(true); setPreviewError("");
    try {
      const response = await api(`/layers/active?body_type=watershed&body_id=${row.id}`);
      const data = response?.data;
      if (!data?.geom_geojson) throw new Error("No published watershed layer found.");
      let geometry; try { geometry = JSON.parse(data.geom_geojson); } catch { throw new Error("Failed to parse watershed geometry."); }
      const feature = { type: 'Feature', properties: { id: row.id, name: data.name || row.name || 'Watershed' }, geometry };
      setPreviewFeature(feature);
      try { const layer = L.geoJSON(feature); const bounds = layer.getBounds(); if (bounds?.isValid?.()) { setPreviewBounds(bounds); updateViewport(bounds); } else { setPreviewBounds(null); resetViewport(); } } catch { setPreviewBounds(null); resetViewport(); }
    } catch (err) {
      console.error("[ManageWatershedsTab] Failed to load preview", err);
      setPreviewFeature(null); setPreviewBounds(null); setPreviewError(err?.message || "Failed to load watershed preview."); resetViewport();
    } finally { lastLoadedIdRef.current = row.id; setPreviewLoading(false); }
  }, [previewFeature, updateViewport, resetViewport]);

  useEffect(() => {
    if (!rows.length) { setPreviewRow(null); setPreviewFeature(null); setPreviewBounds(null); setPreviewError(""); setPreviewLoading(false); lastLoadedIdRef.current = null; resetViewport(); return; }
    if (!previewRow) { resetViewport(); return; }
    const refreshed = rows.find((r) => r.id === previewRow.id);
    if (!refreshed) { setPreviewRow(null); setPreviewFeature(null); setPreviewBounds(null); setPreviewError(""); setPreviewLoading(false); lastLoadedIdRef.current = null; return; }
    if (lastLoadedIdRef.current !== refreshed.id || !previewFeature) { loadPreview(refreshed); }
  }, [rows, previewRow, loadPreview, previewFeature, resetViewport]);

  useEffect(() => { if (!previewBounds) return; updateViewport(previewBounds); }, [previewBounds, updateViewport]);

  const handleSubmit = async (data) => {
    const name = (data.name || "").trim();
    const description = data.description ? data.description.trim() : "";
    if (!name) { setErrorMsg("Watershed name is required."); return; }
    const payload = { name, description: description || null };
    setLoading(true); setErrorMsg("");
    try {
      if (formMode === 'edit' && data.id) {
        showLoading('Saving watershed', 'Please wait…'); await api(`/watersheds/${data.id}`, { method: 'PUT', body: payload }); await alertSuccess('Saved', `"${payload.name}" was updated.`);
      } else {
        showLoading('Creating watershed', 'Please wait…'); await api('/watersheds', { method: 'POST', body: payload }); await alertSuccess('Created', `"${payload.name}" was created.`);
      }
      setFormOpen(false);
      invalidateHttpCache(['/watersheds', '/lakes']);
      await loadWatersheds();
    } catch (e) {
      console.error(e); setErrorMsg("Failed to save watershed."); await alertError('Save failed', e?.message || 'Failed to save watershed.');
    } finally { closeLoading(); setLoading(false); }
  };

  const handleDelete = async (target) => {
    if (!target?.id) return;
    let hasLayers = false;
    try {
  try { closeLoading(); } catch {}
  showLoading('Loading', 'Checking related records…');
      const res = await api(`/layers?body_type=watershed&body_id=${encodeURIComponent(target.id)}&per_page=1`);
      const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (Array.isArray(arr) && arr.length > 0) hasLayers = true; else if (res?.meta && typeof res.meta.total === 'number' && res.meta.total > 0) hasLayers = true;
    } catch {}
    closeLoading();
    if (hasLayers) {
      const okLayers = await confirm({ title: 'Related records detected', text: `This watershed has published GIS layer(s). Deleting the watershed may affect related data. Delete anyway?`, confirmButtonText: 'Delete' });
      if (!okLayers) return;
    } else {
      const ok = await confirm({ title: 'Delete watershed?', text: `Delete "${target.name}"?`, confirmButtonText: 'Delete' }); if (!ok) return;
    }
    setLoading(true); setErrorMsg("");
    try {
      showLoading('Deleting watershed', 'Please wait…'); await api(`/watersheds/${target.id}`, { method: 'DELETE' }); invalidateHttpCache(['/watersheds', '/lakes']); await loadWatersheds(); await alertSuccess('Deleted', `"${target.name}" was deleted.`);
    } catch (e) {
      console.error(e); setErrorMsg("Failed to delete watershed."); await alertError('Delete failed', e?.message || 'Failed to delete watershed.');
    } finally { closeLoading(); setLoading(false); }
  };

  const handleRefresh = async () => { await loadWatersheds(); };
  const handleView = useCallback(async (row) => {
    const target = row?._raw ?? row;
  try { try { closeLoading(); } catch {}; showLoading('Loading', 'Loading preview…'); await loadPreview(target); } finally { closeLoading(); }
    setViewOpen(true);
  }, [loadPreview]);

  const actions = useMemo(() => [ { label: 'View', title: 'View', icon: <FiEye />, onClick: handleView }, { label: 'Edit', title: 'Edit', icon: <FiEdit2 />, onClick: openEdit, type: 'edit' }, { label: 'Delete', title: 'Delete', icon: <FiTrash2 />, onClick: openDelete, type: 'delete' }, ], []);

  return {
    TABLE_ID,
    columns,
    visibleColumns,
    visibleMap,
    setVisibleMap,
    resetSignal,
    triggerResetWidths,
    actions,
    rows,
    loading,
    errorMsg,
    pagination,
    sort,
    handleSortChange,
    handlePageChange,
    query,
    setQuery,
    handleRefresh,
    openCreate,
    // view modal & map
    viewOpen,
    setViewOpen,
    viewMapRef,
    previewRow,
    previewFeature,
  previewLoading,
  previewError,
    mapViewport,
    // form
    formOpen,
    formMode,
    formInitial,
    setFormOpen,
    handleSubmit,
  };
}

// ---------------- Flows ----------------
export function useManageFlowsTabLogic() {
  const TABLE_ID = 'admin-watercat-flows';
  const VIS_KEY = `${TABLE_ID}::visible`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lakes, setLakes] = useState([]);
  const [lakesLoading, setLakesLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adv, setAdv] = useState({});
  const [pagination, setPagination] = useState({ page: 1, perPage: 5, total: 0, lastPage: 1 });
  const [sort, setSort] = useState({ id: 'lake', dir: 'asc' });
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formInitial, setFormInitial] = useState(null);

  const [visibleMap, setVisibleMap] = useState(() => {
    try {
      const raw = localStorage.getItem(VIS_KEY);
      if (raw) {
        try { const parsed = JSON.parse(raw); parsed.updated_at = false; return parsed; } catch {}
      }
      return { lake:true, flow_type:true, name:true, source:true, is_primary:true, updated_at:false };
    } catch { return { lake:true, flow_type:true, name:true, source:true, is_primary:true, updated_at:false }; }
  });
  useEffect(()=>{ try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);
  const [resetSignal, setResetSignal] = useState(0);
  const triggerResetWidths = () => setResetSignal(n=>n+1);

  const fetchLakesOptions = useCallback(async () => {
    setLakesLoading(true);
    try { const res = await cachedGet('/options/lakes', { ttlMs: 10 * 60 * 1000 }); const list = Array.isArray(res) ? res : res?.data ?? []; setLakes(list); } catch { setLakes([]); } finally { setLakesLoading(false); }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true); setErrorMsg('');
    try {
      const params = { page: pagination.page, per_page: pagination.perPage, sort_by: sort.id, sort_dir: sort.dir, q: query, type: adv.flow_type || '', lake_id: adv.lake_id || '' };
      const res = await api('/lake-flows', { params });
      const list = Array.isArray(res.data) ? res.data : [];
      setRows(list.map(r => ({ id:r.id, lake: r.lake?.name || r.lake_name || r.lake_id, flow_type:r.flow_type, name: r.name||'', source:r.source||'', is_primary:!!r.is_primary, latitude:r.latitude??null, longitude:r.longitude??null, updated_at:r.updated_at||null, _raw:r })));
      setPagination({ page: res.current_page, perPage: res.per_page, total: res.total, lastPage: res.last_page });
    } catch (e) { setRows([]); setErrorMsg(e.message || 'Failed to load tributaries'); } finally { setLoading(false); }
  }, [pagination.page, pagination.perPage, sort.id, sort.dir, query, adv]);

  useEffect(()=>{ fetchLakesOptions(); }, [fetchLakesOptions]);
  useEffect(()=>{ const t = setTimeout(() => fetchRows(), 300); return () => clearTimeout(t); }, [fetchRows]);
  useEffect(()=>{ setPagination(p => ({ ...p, page: 1 })); }, [query, adv]);

  const handlePageChange = (newPage) => { setPagination(p => ({ ...p, page: newPage })); };
  const handleSortChange = (colId) => { setSort(s => ({ id: colId, dir: s.id === colId && s.dir === 'asc' ? 'desc' : 'asc' })); };

  const openCreate = () => { setFormMode('create'); setFormInitial({}); setFormOpen(true); };
  const openEdit = async (row) => {
    const src = row?._raw ?? row;
  try { try { closeLoading(); } catch {}; showLoading('Loading', 'Preparing edit form…'); } catch {}
    setFormMode('edit');
    setFormInitial(src);
    setFormOpen(true);
    closeLoading();
  };
  const openDelete = async (row) => {
    const src = row?._raw ?? row; if (!src) return;
    try { closeLoading(); } catch {}
    // Brief loading to keep UX consistent with other actions
    try { showLoading('Loading', 'Preparing delete…'); } catch {}
    await new Promise((r) => setTimeout(r, 200));
    closeLoading();
    const ok = await confirm({ title: 'Delete tributary?', text: `Delete "${src.name || 'this tributary'}"?`, confirmButtonText: 'Delete' });
    if (!ok) return;
    try { showLoading('Deleting tributary', 'Please wait…'); await api(`/lake-flows/${src.id}`, { method: 'DELETE' }); invalidateHttpCache(['/lake-flows', '/lakes']); await alertSuccess('Deleted', `"${src.name || 'Tributary'}" has been deleted successfully.`); fetchRows(); } catch (e) { await alertError('Delete failed', e.message || 'Failed to delete tributary'); } finally { closeLoading(); }
  };

  const [viewOpen, setViewOpen] = useState(false);
  const [viewFeature, setViewFeature] = useState(null);
  const [viewFlowPoint, setViewFlowPoint] = useState(null);
  const viewMapRef = useRef(null);

  const viewFlow = useCallback(async (row) => {
    const src = row?._raw ?? row; if (!src) return;
    setViewFeature(null); setViewFlowPoint(null);
    try {
  try { closeLoading(); } catch {}
  showLoading('Loading', 'Fetching lake and point…');
      const lakeId = src.lake_id ?? src._raw?.lake_id ?? src.lake_id; const lakeResp = await api(`/lakes/${lakeId}`);
      const geom = lakeResp?.geom_geojson ? (typeof lakeResp.geom_geojson === 'string' ? JSON.parse(lakeResp.geom_geojson) : lakeResp.geom_geojson) : null;
      if (geom) { const feature = { type: 'Feature', properties: { id: lakeResp.id, name: lakeResp.name || '' }, geometry: geom }; setViewFeature(feature); }
      const lat = src.latitude ?? src.lat ?? (src._raw && (src._raw.latitude ?? src._raw.lat));
      const lon = src.longitude ?? src.lon ?? (src._raw && (src._raw.longitude ?? src._raw.lon));
      if (lat && lon) setViewFlowPoint({ lat: Number(lat), lon: Number(lon), ...src });
    } finally {
      closeLoading();
      setViewOpen(true);
    }
  }, []);

  const submit = async (payload) => {
    const missing = [];
    if (!payload.lake_id) missing.push('Lake selection');
    if (!payload.flow_type) missing.push('Type');
    if (!payload.name?.trim()) missing.push('Name');
    if (!payload.source?.trim()) missing.push('Source');
    if (payload.lat == null || payload.lon == null) missing.push('Latitude/Longitude');
    if (missing.length > 0) { await alertError('Required Fields Missing', `Please fill in the following required fields: ${missing.join(', ')}`); return; }
    const selectedLake = lakes.find(l => String(l.id) === String(payload.lake_id));
    const lakeName = selectedLake?.name || `Lake ${payload.lake_id}`;
    const body = { ...payload };
    if (!body.lat) body.lat = payload.latitude ?? undefined;
    if (!body.lon) body.lon = payload.longitude ?? undefined;
    if (body.lake_id != null) body.lake_id = Number(body.lake_id);
    body.is_primary = !!body.is_primary;
    const method = formMode === 'create' ? 'POST' : 'PUT';
    try {
      const path = formMode === 'create' ? '/lake-flows' : `/lake-flows/${formInitial.id}`;
      showLoading(formMode === 'create' ? 'Creating tributary' : 'Saving tributary', 'Please wait…');
      await api(path, { method, body });
      await alertSuccess('Success', formMode === 'create' ? `Tributary "${payload.name}" created successfully in ${lakeName}!` : 'Tributary updated successfully!');
    } catch (e) { await alertError('Save failed', e.message || 'Failed to save tributary'); return; } finally { closeLoading(); }
    setFormOpen(false); invalidateHttpCache(['/lake-flows', '/lakes']); fetchRows();
  };

  const columns = useMemo(()=>[
    { id:'lake', header:'Lake', accessor:'lake', width:200 },
    { id:'flow_type', header:'Type', accessor:'flow_type', width:110, render:(r)=> { const t = r.flow_type === 'inflow' ? 'Inlet' : (r.flow_type === 'outflow' ? 'Outlet' : r.flow_type); return <span>{t}</span>; } },
    { id:'name', header:'Name', accessor:'name', width:200 },
    { id:'source', header:'Source', accessor:'source', width:200 },
    { id:'is_primary', header:'Primary', accessor:'is_primary', width:90, render:(r)=> r.is_primary ? 'Yes' : '' },
    { id:'updated_at', header:'Updated', accessor:'updated_at', width:180, render:(r)=> fmtDt(r.updated_at) },
  ], []);

  const visibleColumns = useMemo(()=> columns.filter(c => visibleMap[c.id] !== false), [columns, visibleMap]);
  const actions = useMemo(()=>[
    { label:'View', title:'View', icon:<FiEye />, onClick: (row) => viewFlow(row), type:'view' },
    { label:'Edit', title:'Edit', icon:<FiEdit2 />, onClick: openEdit, type:'edit' },
    { label:'Delete', title:'Delete', icon:<FiTrash2 />, onClick: openDelete, type:'delete' },
  ], [openEdit]);

  const activeFilterCount = useMemo(() => { let count = 0; if (adv.flow_type) count += 1; if (adv.lake_id) count += 1; return count; }, [adv]);

  return {
    TABLE_ID,
    columns,
    visibleColumns,
    visibleMap,
    setVisibleMap,
    resetSignal,
    triggerResetWidths,
    fetchRows,
    openCreate,
    actions,
    // filters
    filtersOpen,
    setFiltersOpen,
    adv,
    setAdv,
    lakes,
    lakesLoading,
    activeFilterCount,
    // table
    rows,
    loading,
    errorMsg,
    pagination,
    sort,
    query,
    setQuery,
    handlePageChange,
    handleSortChange,
    // form
    formOpen,
    formMode,
    formInitial,
    setFormOpen,
    submit,
    // view
    viewOpen,
    setViewOpen,
    viewMapRef,
    viewFeature,
    viewFlowPoint,
  };
}
