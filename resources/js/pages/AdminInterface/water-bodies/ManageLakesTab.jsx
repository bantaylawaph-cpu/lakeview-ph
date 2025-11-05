import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiEye, FiEdit2, FiTrash2, FiLayers } from "react-icons/fi";
import { GeoJSON } from "react-leaflet";
import AppMap from "../../../components/AppMap";
import MapViewport from "../../../components/MapViewport";
import Modal from "../../../components/Modal";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import TableLayout from "../../../layouts/TableLayout";
import { api } from "../../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../../lib/httpCache";
import LakeForm from "../../../components/LakeForm";
import { confirm, alertSuccess, alertError, showLoading, closeLoading } from "../../../lib/alerts";
import TableToolbar from "../../../components/table/TableToolbar";
import FilterPanel from "../../../components/table/FilterPanel";

const TABLE_ID = "admin-watercat-lakes";
const VIS_KEY = `${TABLE_ID}::visible`;
const ADV_KEY = `${TABLE_ID}::filters_advanced`;
const SEARCH_KEY = `${TABLE_ID}::search`;
const PAGE_KEY = `${TABLE_ID}::page`;
const SORT_KEY = `${TABLE_ID}::sort`;

const fmtNum = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  // Support full-precision display when digits === 'full'
  if (digits === "full") return String(value);
  return num.toFixed(digits);
};

const fmtDt = (value) => (value ? new Date(value).toLocaleDateString() : "");

const fmtFlowsStatus = (value) => {
  switch (value) {
    case 'present': return 'Exists';
    case 'none': return 'None';
    case 'unknown':
    default: return 'Not yet recorded';
  }
};

const firstVal = (v) => (Array.isArray(v) ? v[0] : v);
const joinVals = (v) => (Array.isArray(v) ? v.join(' / ') : v || '');
const formatLocation = (row) => [firstVal(row.municipality_list ?? row.municipality), firstVal(row.province_list ?? row.province), firstVal(row.region_list ?? row.region)].filter(Boolean).join(", ");

const normalizeRows = (rows = []) =>
  rows.map((row) => {
    const regionList = row.region_list ?? (Array.isArray(row.region) ? row.region : null);
    const provinceList = row.province_list ?? (Array.isArray(row.province) ? row.province : null);
    const municipalityList = row.municipality_list ?? (Array.isArray(row.municipality) ? row.municipality : null);

    const multiRegion = regionList && regionList.length > 1;
    const multiProvince = provinceList && provinceList.length > 1;
    const multiMunicipality = municipalityList && municipalityList.length > 1;

    const regionDisplay = multiRegion ? joinVals(regionList) : (firstVal(regionList) ?? (row.region ?? ''));
    const provinceDisplay = multiProvince ? joinVals(provinceList) : (firstVal(provinceList) ?? (row.province ?? ''));
    const municipalityDisplay = multiMunicipality ? joinVals(municipalityList) : (firstVal(municipalityList) ?? (row.municipality ?? ''));

    return {
      id: row.id,
      name: row.name,
      alt_name: row.alt_name ?? "",
      flows_status: row.flows_status ?? 'unknown',
      region: regionDisplay,
      province: provinceDisplay,
      municipality: municipalityDisplay,
      region_list: regionList || null,
      province_list: provinceList || null,
      municipality_list: municipalityList || null,
      class_code: row.class_code ?? "",
      class_name: row.water_quality_class?.name ?? "",
      classification: row.class_code ? [row.class_code, row.water_quality_class?.name].filter(Boolean).join(" - ") : "",
  // Show full precision for surface area (no rounding)
  surface_area_km2: fmtNum(row.surface_area_km2, "full"),
      elevation_m: fmtNum(row.elevation_m, 1),
      mean_depth_m: fmtNum(row.mean_depth_m, 1),
      watershed: row.watershed?.name ?? "",
      lat: fmtNum(row.lat, 6),
      lon: fmtNum(row.lon, 6),
      created_at: fmtDt(row.created_at),
      updated_at: fmtDt(row.updated_at),
      location: formatLocation(row),
      _raw: row,
    };
  });

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

  const [lakes, setLakes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 5, total: 0, lastPage: 1 });
  const [sort, setSort] = useState(() => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      return raw ? JSON.parse(raw) : { id: 'name', dir: 'asc' };
    } catch (err) {
      return { id: 'name', dir: 'asc' };
    }
  });

  const [watersheds, setWatersheds] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);

  const mapRef = useRef(null);
  const viewMapRef = useRef(null);
  const lakeGeoRef = useRef(null);
  const watershedGeoRef = useRef(null);
  const [viewOpen, setViewOpen] = useState(false);
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
      { id: "lat", header: "Lat", accessor: "lat", width: 120, className: "col-md-hide", _optional: true },
      { id: "lon", header: "Lon", accessor: "lon", width: 120, className: "col-md-hide", _optional: true },
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
    // Default visible columns: Name, Region, Province, DENR Class (classification), Flows (flows_status), Watershed
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

  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify(sort));
    } catch (err) {
      // ignore storage failure
    }
  }, [sort]);

  const restoreDefaults = useCallback(() => {
    try {
      localStorage.removeItem(VIS_KEY);
      localStorage.removeItem(ADV_KEY);
      localStorage.removeItem(SEARCH_KEY);
    } catch (err) {
      // ignore storage errors
    }
    // Reset UI state
    setVisibleMap(defaultsVisible);
    setAdv({});
    setQuery("");
    // Reset table widths by triggering resetSignal
    triggerResetWidths();
  }, [defaultsVisible]);

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
      setProvinceOptions(list.map(p => ({ value: p, label: p })));
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load provinces", err);
      setProvinceOptions([]);
    }
  }, []);

  const fetchRegions = useCallback(async () => {
    try {
      const res = await cachedGet("/options/regions", { ttlMs: 10 * 60 * 1000 });
      const list = Array.isArray(res) ? res : [];
      setRegionOptions(list.map(r => ({ value: r, label: r })));
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
      params.append('page', pagination.page);
      params.append('per_page', pagination.perPage);
      params.append('sort_by', sort.id);
      params.append('sort_dir', sort.dir);
      if (query) {
        params.append('q', query);
      }
      if (Object.keys(adv).length > 0) {
        params.append('adv', JSON.stringify(adv));
      }

      const data = await api(`/lakes?${params.toString()}`, { auth: false });
      const list = Array.isArray(data.data) ? data.data : [];
      setLakes(normalizeRows(list));
      setPagination({
        page: data.current_page,
        perPage: data.per_page,
        total: data.total,
        lastPage: data.last_page,
      });
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load lakes", err);
      setLakes([]);
      setErrorMsg("Failed to load lakes.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, sort.id, sort.dir, query, adv]);

  useEffect(() => {
    fetchWatersheds();
    fetchClasses();
    fetchProvinces();
    fetchRegions();
  }, [fetchWatersheds, fetchClasses, fetchProvinces, fetchRegions]);

  useEffect(() => {
    const t = setTimeout(() => fetchLakes(), 300);
    return () => clearTimeout(t);
  }, [fetchLakes]);


  const handleSortChange = (colId) => {
    setSort(prev => {
      if (prev.id === colId) {
        return { id: colId, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { id: colId, dir: 'asc' };
    });
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

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
      const detail = await api(`/lakes/${source.id}`);
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
        flows_status: detail.flows_status ?? 'unknown',
      });
      setFormOpen(true);
    } catch (err) {
      console.error("[ManageLakesTab] Failed to load lake for edit", err);
      setErrorMsg("Failed to load lake details for editing.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openDelete = useCallback((row) => {
    const target = row?._raw ?? row ?? null;
    console.debug('[ManageLakesTab] delete clicked', target);
    if (!target) return;
    (async () => {
      // Run checks for related records: sample-events (tests) and lake flows (inflow/outflow).
      let checksOk = false;
      try {
        setLoading(true);
        setErrorMsg("");
        const id = target.id;

        // Fetch lake detail to get authoritative watershed linkage
        let detail = null;
        try {
          detail = await api(`/lakes/${encodeURIComponent(id)}`);
        } catch (e) {
          // ignore — we'll still try other checks
        }

        const linkedWatershedId = detail?.watershed_id ?? detail?.watershed?.id ?? target?.watershed_id ?? target?.watershed?.id ?? null;
        const linkedWatershedName = detail?.watershed?.name ?? target?.watershed?.name ?? null;

        // Parallel checks for sample-events, lake-flows (in/out tributaries), and published layers (request 1 item for speed)
        const checks = await Promise.allSettled([
          api(`/admin/sample-events?lake_id=${encodeURIComponent(target.id)}&per_page=1`),
          api(`/lake-flows?lake_id=${encodeURIComponent(target.id)}&per_page=1`),
          api(`/layers?body_type=lake&body_id=${encodeURIComponent(target.id)}&per_page=1`),
        ]);

        let hasEvents = false;
        let hasFlows = false;
        let hasLayers = false;

        // sample-events result
        try {
          const res = checks[0].status === 'fulfilled' ? checks[0].value : null;
          const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          if (Array.isArray(arr) && arr.length > 0) hasEvents = true;
          else if (res?.meta && typeof res.meta.total === 'number' && res.meta.total > 0) hasEvents = true;
        } catch (e) {}

        // lake-flows result
        try {
          const res = checks[1].status === 'fulfilled' ? checks[1].value : null;
          const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          if (Array.isArray(arr) && arr.length > 0) hasFlows = true;
          else if (res?.meta && typeof res.meta.total === 'number' && res.meta.total > 0) hasFlows = true;
        } catch (e) {}

        // layers result
        try {
          const res = checks[2].status === 'fulfilled' ? checks[2].value : null;
          const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          if (Array.isArray(arr) && arr.length > 0) hasLayers = true;
          else if (res?.meta && typeof res.meta.total === 'number' && res.meta.total > 0) hasLayers = true;
        } catch (e) {}

        // Build confirmation message
        const reasons = [];
  if (hasEvents) reasons.push('associated water quality test(s)');
  if (hasFlows) reasons.push('inlet/outlet tributary point(s)');
  if (hasLayers) reasons.push('published GIS layer(s)');
        if (linkedWatershedId) reasons.push(linkedWatershedName ? `linked watershed (${linkedWatershedName})` : 'a linked watershed');

        if (reasons.length) {
          const list = reasons.join(', ');
          const ok = await confirm({
            title: 'Related records detected',
            text: `This lake has ${list}. Deleting the lake may affect related data. Delete anyway?`,
            confirmButtonText: 'Delete',
          });
          if (!ok) {
            setLoading(false);
            return;
          }
        } else {
          const ok = await confirm({ title: 'Delete lake?', text: `Delete "${target.name}"?`, confirmButtonText: 'Delete' });
          if (!ok) {
            setLoading(false);
            return;
          }
        }

        // Proceed with delete
        try {
          showLoading('Deleting lake', 'Please wait…');
          await api(`/lakes/${target.id}`, { method: "DELETE" });
          // Invalidate all related caches where lake data/name appears
          invalidateHttpCache(['/lakes', '/options/lakes', '/lake-flows']);
          await fetchLakes();
          await alertSuccess('Deleted', `"${target.name}" was deleted.`);
        } catch (err) {
          console.error("[ManageLakesTab] Failed to delete lake", err);
          setErrorMsg("Delete failed. This lake may be referenced by other records.");
          await alertError('Delete failed', err?.message || 'Could not delete lake');
        } finally {
          closeLoading();
          setLoading(false);
        }
        checksOk = true;
      } catch (err) {
        // If checks failed unexpectedly, fallback to simple confirm-delete flow
        console.error('[ManageLakesTab] Pre-delete checks failed', err);
        try {
          const ok = await confirm({ title: 'Delete lake?', text: `Delete "${target.name}"?`, confirmButtonText: 'Delete' });
          if (!ok) return;
          setLoading(true);
          setErrorMsg("");
          try {
            showLoading('Deleting lake', 'Please wait…');
            await api(`/lakes/${target.id}`, { method: "DELETE" });
            invalidateHttpCache(['/lakes', '/options/lakes', '/lake-flows']);
            await fetchLakes();
            await alertSuccess('Deleted', `"${target.name}" was deleted.`);
          } catch (err2) {
            console.error("[ManageLakesTab] Failed to delete lake", err2);
            setErrorMsg("Delete failed. This lake may be referenced by other records.");
            await alertError('Delete failed', err2?.message || 'Could not delete lake');
          } finally {
            closeLoading();
            setLoading(false);
          }
        } catch (e2) {
          // nothing
        }
      }
    })();
  }, [fetchLakes]);

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
    ["name", "alt_name", "region", "province", "municipality", "class_code"].forEach((field) => {
      const value = payload[field];
      payload[field] = value == null ? null : String(value).trim() || null;
    });
    // Normalize flows_status: allow '', null => omit; otherwise pass through
    if (payload.flows_status === "" || payload.flows_status == null) {
      delete payload.flows_status;
    } else {
      payload.flows_status = String(payload.flows_status);
    }
    return payload;
  };

  const saveLake = useCallback(
    async (formData) => {
      const payload = parsePayload(formData);
      setLoading(true);
      setErrorMsg("");
      try {
        let updatedLake;
        if (formMode === "create") {
          showLoading('Creating lake', 'Please wait…');
          updatedLake = await api("/lakes", { method: "POST", body: payload });
          await alertSuccess('Created', `"${updatedLake.name || payload.name}" was created.`);
          fetchLakes(); // Refetch to show the new lake
        } else {
          showLoading('Saving lake', 'Please wait…');
          updatedLake = await api(`/lakes/${payload.id}`, { method: "PUT", body: payload });
          await alertSuccess('Saved', `"${updatedLake.name || payload.name}" was updated.`);
          fetchLakes(); // Refetch to show the updated data
        }
        setFormOpen(false);
        // Invalidate caches used across tabs (lists, options, and flows list which may display lake name)
        invalidateHttpCache(['/options/lakes', '/lake-flows']);
      } catch (err) {
        console.error("[ManageLakesTab] Failed to save lake", err);
        setErrorMsg("Save failed. Please verify required fields and that the name is unique.");
        await alertError('Save failed', err?.message || 'Unable to save lake');
      } finally {
        closeLoading();
        setLoading(false);
      }
    },
    [formMode]
  );

  const regionsForFilter = useMemo(
    () => [{ value: "", label: "All Regions" }, ...regionOptions],
    [regionOptions]
  );

  const provincesForFilter = useMemo(
    () => [{ value: "", label: "All Provinces" }, ...provinceOptions],
    [provinceOptions]
  );

  const classFilterOptions = useMemo(
    () => [
      { value: "", label: "All Classifications" },
      ...classOptions.map((item) => ({
        value: item.code,
        label: item.name ? `${item.code} - ${item.name}` : item.code,
      })),
    ],
    [classOptions]
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
          placeholder: "Search lakes by name, alt name, location, watershed, classification...",
        }}
        filters={[]}
        columnPicker={{ columns: baseColumns, visibleMap, onVisibleChange: setVisibleMap }}
  onResetWidths={() => { triggerResetWidths(); restoreDefaults(); }}
        onRefresh={fetchLakes}
        onAdd={openCreate}
        onToggleFilters={() => setFiltersOpen((value) => !value)}
        onRestoreDefaults={restoreDefaults}
        filtersBadgeCount={activeFilterCount}
      />

      <FilterPanel
        open={filtersOpen}
        onClearAll={() => setAdv({})}
        fields={[
          {
            type: 'group',
            className: 'grid-4',
            children: [
              {
                id: "flows_status",
                label: "Tributaries Status",
                type: "select",
                value: adv.flows_status ?? "",
                onChange: (value) => setAdv((state) => ({ ...state, flows_status: value })),
                options: [
                  { value: "", label: "All" },
                  { value: "present", label: "Exists" },
                  { value: "none", label: "None" },
                  { value: "unknown", label: "Not yet recorded" },
                ],
              },
              {
                id: "region",
                label: "Region",
                type: "select",
                value: adv.region ?? "",
                onChange: (value) => setAdv((state) => ({ ...state, region: value })),
                options: regionsForFilter,
              },
              {
                id: "province",
                label: "Province",
                type: "select",
                value: adv.province ?? "",
                onChange: (value) => setAdv((state) => ({ ...state, province: value })),
                options: provincesForFilter,
              },
              {
                id: "class_code",
                label: "Water Body Classification",
                type: "select",
                value: adv.class_code ?? "",
                onChange: (value) => setAdv((state) => ({ ...state, class_code: value })),
                options: classFilterOptions,
              },
            ]
          }
        ]}
      />

      <div className="dashboard-card-body" style={{ paddingTop: 8 }}>
        {!loading && errorMsg && <div className="no-data">{errorMsg}</div>}
        <div className="table-wrapper">
          <TableLayout
            tableId={TABLE_ID}
            columns={visibleColumns}
            data={lakes}
            actions={actions}
            resetSignal={resetSignal}
            loading={loading}
            loadingLabel={loading ? 'Loading lakes…' : null}
            serverSide={true}
            pagination={{ page: pagination.page, totalPages: pagination.lastPage }}
            onPageChange={handlePageChange}
            sort={sort}
            onSortChange={handleSortChange}
          />
        </div>
      </div>

      {/* Modal preview for lake */}
      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title={lakeFeature?.properties?.name ? `Lake: ${lakeFeature.properties.name}` : 'Lake Preview'} width={1000} ariaLabel="Lake Preview">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '80vh' }}>
          {/* Map area: only render when lake geometry exists; otherwise show placeholder */}
          {lakeFeature ? (
            <div style={{ height: '60vh', minHeight: 320, borderRadius: 8, overflow: 'hidden' }}>
              <AppMap view="osm" whenCreated={(map) => { viewMapRef.current = map; }}>
                {watershedFeature && (
                  <GeoJSON data={watershedFeature} style={{ weight: 1.5, color: '#047857', fillOpacity: 0.08 }} />
                )}

                {lakeFeature && (
                  <GeoJSON data={lakeFeature} style={{ weight: 2, color: '#2563eb', fillOpacity: 0.1 }} pointToLayer={(feature, latlng) => L.circleMarker(latlng, { color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.5, radius: 8 })} />
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
          ) : (
            <div style={{ height: '60vh', minHeight: 320, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', color: '#6b7280' }}>
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No lake geometry</div>
                <div style={{ fontSize: 13 }}>This lake has no published geometry to preview.</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 0 }}>
            {lakeFeature && !loading && !errorMsg && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Showing {lakeFeature.properties?.name || 'Lake'}{watershedFeature ? ` — Watershed: ${watershedFeature.properties?.name || ''}` : ''}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <LakeForm
        open={formOpen}
        mode={formMode}
        initialValue={formInitial}
        watersheds={watersheds}
        classOptions={classOptions}
        loading={loading}
        onSubmit={saveLake}
        onCancel={() => setFormOpen(false)}
      />
      {/* Delete confirmation handled via SweetAlert confirm dialog */}
    </div>
  );
}

export default ManageLakesTab;
