import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { api, getToken, me as fetchMe } from "../../lib/api";
import { alertError, alertSuccess, confirm } from "../../lib/alerts";
import { fetchLakeOptions } from "../../lib/layers";
import {
  FiMapPin, FiThermometer,
  FiPlus, FiTrash2, FiEdit2, FiClipboard, FiUpload
} from "react-icons/fi";
import Wizard from "../Wizard";
import { useWindowSize } from '../../hooks/useWindowSize';
import AppMap from "../AppMap";
import MapViewport from "../MapViewport";
import StationModal from "../../components/modals/StationModal";
import BulkImportUploader from "./BulkImportUploader";
import { GeoJSON, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";

function DateInvalidPopup({ message = 'Date must not be later than today.' }) {
  React.useEffect(() => {
    // show a modal-style alert when mounted
    try { alertError('Invalid date', message); } catch (e) { /* ignore */ }
  }, []);
  return null;
}

const fmtDate = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Returns true if the provided date or datetime-local string is not later than today's date (ignores time of day)
const isNotLaterThanTodayDate = (dtStr) => {
  if (!dtStr || typeof dtStr !== 'string') return false;
  const [ymd] = dtStr.split('T');
  if (!ymd) return false;
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const today = new Date();
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;
  const td = today.getDate();
  if (y < ty) return true;
  if (y > ty) return false;
  if (m < tm) return true;
  if (m > tm) return false;
  return d <= td;
};

// Letters/spaces-only check for names
const isLettersOnly = (s) => typeof s === 'string' && /^[A-Za-z\s]+$/.test(s.trim());

const INITIAL_DATA = {
  organization_id: null,
  organization_name: "",
  lake_id: "",
  lake_name: "",
  lake_class_code: "",
  lat: "",
  lng: "",
  station_id: "",
  station_name: "",
  station_desc: "",
  geom_point: null,
  sampled_at: fmtDate(),
  method: "",
  sampler_name: "",
  weather: "",
  results: [],
  applied_standard_id: "",
  applied_standard_code: "",
  notes: "",
  status: "draft",
};

const Tag = ({ children }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 8px", borderRadius: 999, fontSize: 12,
    background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe",
  }}>{children}</span>
);
const FormRow = ({ children, style }) => <div className="org-form" style={style}>{children}</div>;
const FG = ({ label, children, style }) => (
  <div className="form-group" style={style}>
    {label ? <label>{label}</label> : null}
    {children}
  </div>
);

const STEP_LABELS = [
  { key: 'location', title: 'Location' },
  { key: 'details',  title: 'Details'  },
  { key: 'params',    title: 'Parameters' },
  { key: 'standard',  title: 'Standard' },
  { key: 'review',    title: 'Review' },
];

const METHOD_DISPLAY = {
  manual: "Manual Grab Sampling",
  automatic: "Automatic Sampling",
};

const WEATHER_DISPLAY = {
  sunny: "Sunny",
  partly_cloudy: "Partly Cloudy",
  cloudy: "Cloudy",
  rainy: "Rainy",
  stormy: "Stormy",
  foggy: "Foggy",
  windy: "Windy",
  overcast: "Overcast",
};

const STATUS_DISPLAY = {
  draft: "Draft",
  public: "Published",
};

export default function WQTestWizard({
  lakes = [],
  lakeGeoms = {},
  stationsByLake: stationsByLakeProp = {},
  parameters = [],
  standards = [],
  organization = null,
  currentUserRole = null, 
  onSubmit,
}) {
  const { tenant } = useParams(); // Get tenant ID from URL params
  const [resolvedUserRole, setResolvedUserRole] = useState(currentUserRole);

  // Determine tenant ID from URL params or organization prop
  const tenantId = tenant || organization?.id;

  const formatDepth = (d) => {
    const n = Number(d);
    if (!Number.isFinite(n)) return d ?? '—';
    return n === 0 ? 'Surface' : d;
  };

  useEffect(() => {
    if (currentUserRole) return; 
    let mounted = true;
    (async () => {
      try {
        const me = await fetchMe({ maxAgeMs: 5 * 60 * 1000 });
        if (!mounted) return;
        const role = (me?.role || "")
          .toString()
          .trim()
          .replace(/\s+/g, "_")
          .replace(/-/g, "_");
        setResolvedUserRole(role || null);
      } catch (e) {
        if (mounted) setResolvedUserRole(null);
      }
    })();
    return () => { mounted = false; };
  }, [currentUserRole]);
  const [stationsByLake, setStationsByLake] = useState(stationsByLakeProp);
  const { width: windowW } = useWindowSize();
  const [localLakes, setLocalLakes] = useState(lakes);
  const [localLakeGeoms, setLocalLakeGeoms] = useState(lakeGeoms || {});
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [stationEdit, setStationEdit] = useState(null);
  const [parametersList, setParametersList] = useState(parameters || []);
  const [standardsList, setStandardsList] = useState(standards || []);
  const [parameterEntryMode, setParameterEntryMode] = useState('manual'); // 'manual' or 'bulk'

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if ((!parameters || !parameters.length) && mounted) {
          const p = await api('/options/parameters');
          if (mounted) setParametersList(Array.isArray(p) ? p : []);
        }
      } catch (e) { /* ignore */ }
      try {
        if ((!standards || !standards.length) && mounted) {
          const s = await api('/options/wq-standards');
          if (mounted) setStandardsList(Array.isArray(s) ? s : []);
        }
      } catch (e) { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  const lakeOptions      = Array.isArray(localLakes) && localLakes.length ? localLakes : [];
  const parameterOptions = Array.isArray(parametersList) && parametersList.length ? parametersList : [];
  const standardOptions  = Array.isArray(standardsList)  && standardsList.length  ? standardsList  : [];

  const roleToCheck = currentUserRole ?? resolvedUserRole;
  const canPublish = roleToCheck === "org_admin" || roleToCheck === "superadmin";
  const stationOptions = (data) => stationsByLake?.[String(data.lake_id)] || [];

  const canManageStations = roleToCheck === "org_admin" || roleToCheck === "superadmin";

  const createStationApi = async (data, setData, station) => {
    try {
      const payload = {
        organization_id: data.organization_id ?? null,
        lake_id: data.lake_id ? Number(data.lake_id) : null,
        name: station.name,
        description: station.description || null,
        latitude: station.lat === "" ? null : Number(station.lat),
        longitude: station.lng === "" ? null : Number(station.lng),
      };
  const res = await api(`/admin/stations`, { method: "POST", body: payload });
  const s = res?.data;
  if (!s) throw new Error("Invalid response");
  const norm = { ...s, lat: s.latitude ?? s.lat ?? null, lng: s.longitude ?? s.lng ?? null };
  const list = stationsByLake[String(data.lake_id)] || [];
  setStationsByLake({ ...stationsByLake, [String(data.lake_id)]: [...list, norm] });
      setData({ ...data,
        station_id: s.id,
        station_name: s.name,
        station_desc: s.description || "",
        lat: s.latitude ?? data.lat,
        lng: s.longitude ?? data.lng,
        geom_point: (s.latitude !== null && s.longitude !== null) ? { lat: Number(s.latitude), lng: Number(s.longitude) } : data.geom_point,
      });
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('422') || msg.toLowerCase().includes('validation')) {
        alertError('Validation error', msg.replace(/^HTTP\s*422\s*/i, '').trim() || 'Please check the station fields.');
        return;
      }
  alertError('Station create failed', msg);
  return;
    }
  };

  const updateStationApi = async (data, setData, station) => {
    try {
      const payload = {
        organization_id: data.organization_id ?? null,
        lake_id: data.lake_id ? Number(data.lake_id) : null,
        name: station.name,
        description: station.description || null,
        latitude: station.lat === "" ? null : Number(station.lat),
        longitude: station.lng === "" ? null : Number(station.lng),
      };
  const res = await api(`/admin/stations/${encodeURIComponent(station.id)}`, { method: "PUT", body: payload });
  const s = res?.data;
  if (!s) throw new Error("Invalid response");

  const norm = { ...s, lat: s.latitude ?? s.lat ?? null, lng: s.longitude ?? s.lng ?? null };
  const list = stationsByLake[String(data.lake_id)] || [];
  const updated = list.map((x) => (String(x.id) === String(norm.id) ? norm : x));
  setStationsByLake({ ...stationsByLake, [String(data.lake_id)]: updated });
      if (String(data.station_id) === String(s.id)) {
        setData({ ...data,
          station_name: s.name,
          station_desc: s.description || "",
          lat: s.latitude ?? data.lat,
          lng: s.longitude ?? data.lng,
          geom_point: (s.latitude !== null && s.longitude !== null) ? { lat: Number(s.latitude), lng: Number(s.longitude) } : data.geom_point,
        });
      }
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('422') || msg.toLowerCase().includes('validation')) {
        alertError('Validation error', msg.replace(/^HTTP\s*422\s*/i, '').trim() || 'Please check the station fields.');
        return;
      }
  alertError('Station update failed', msg);
  return;
    }
  };

  const deleteStationApi = async (data, setData, stationId) => {
    try {
      const list = stationsByLake[String(data.lake_id)] || [];
      const target = list.find((s) => String(s.id) === String(stationId));
      const name = target?.name || String(stationId);

      let hasTests = false;
      let testsCount = null;
      try {
        const qs = `?station_id=${encodeURIComponent(stationId)}&per_page=1`;
        const res = await api(`/admin/sample-events${qs}`);
        const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (Array.isArray(arr) && arr.length > 0) {
          hasTests = true;
          testsCount = null;
        } else if (res?.meta && typeof res.meta.total === 'number' && res.meta.total > 0) {
          hasTests = true;
          testsCount = res.meta.total;
        }
      } catch (e) {
      }

      if (hasTests) {
        const countText = testsCount ? `${testsCount} ` : '';
        const ok = await confirm({
          title: 'Station has associated tests',
          text: `This station has ${countText}associated water quality test(s). Deleting the station may affect historical records. Delete anyway?`,
          confirmButtonText: 'Delete'
        });
        if (!ok) return;
      } else {
        const ok = await confirm({ title: 'Delete station?', text: `Delete "${name}"?`, confirmButtonText: 'Delete' });
        if (!ok) return;
      }

      await api(`/admin/stations/${encodeURIComponent(stationId)}`, { method: "DELETE" });
      const updated = list.filter((s) => String(s.id) !== String(stationId));
      setStationsByLake({ ...stationsByLake, [String(data.lake_id)]: updated });
      if (String(data.station_id) === String(stationId)) {
        setData({ ...data, station_id: "", station_name: "", station_desc: "" });
      }
      alertSuccess('Station deleted', 'The station was removed.');
    } catch (e) {
      alertError('Delete failed', 'Could not delete station.');
      return;
    }
  };

  useEffect(() => {
    let mounted = true;
    let timer = null;
    if (Array.isArray(lakes) && lakes.length) {
      setLocalLakes(lakes);
      return () => { mounted = false; };
    }
    timer = setTimeout(() => {
      (async () => {
        try {
          const opts = await fetchLakeOptions();
          if (!mounted) return;
          setLocalLakes(Array.isArray(opts) ? opts : []);
        } catch (e) {
          if (mounted) setLocalLakes([]);
        }
      })();
    }, 50);

    return () => { mounted = false; if (timer) clearTimeout(timer); };
  }, [lakes]);

  const mergedLakeGeoms = { ...(lakeGeoms || {}), ...(localLakeGeoms || {}) };

  const mapBounds = (data) => {
    if (data?.geom_point) {
      const { lat, lng } = data.geom_point;
      const pad = 0.02;
      return [[lat - pad, lng - pad], [lat + pad, lng + pad]];
    }
    if (data?.lake_id) {
      try {
        const k = String(data.lake_id);
        if (mergedLakeGeoms?.[k]) {
          const layer = L.geoJSON(mergedLakeGeoms[k]);
          return layer.getBounds();
        }
      } catch {}
    }
    return [[13.5, 120.5], [15.5, 122.2]];
  };

  const initialData = useMemo(() => {
    const currentStd = standardsList.find(s => s.is_current);
    return {
      ...INITIAL_DATA,
      organization_id: organization?.id ?? null,
      organization_name: organization?.name ?? "",
      applied_standard_id: currentStd?.id || "",
      applied_standard_code: currentStd?.code || "",
    };
  }, [standardsList, organization]);

  const pickLake = (data, setData, lakeId) => {
    const id = lakeId || "";
    const lake = lakeOptions.find((l) => String(l.id) === String(id));
    setData({
      ...data,
      lake_id: id,
      lake_name: lake?.name || "",
      lake_class_code: lake?.class_code || "",
      station_id: "",
      station_name: "",
      station_desc: "",
      geom_point: null,
    });
    if (id) {
      fetchLakeGeo(id).catch(() => {});
      fetchStationsForLake(id).catch(() => {});
    }
  };

  const fetchLakeGeo = async (id) => {
    if (!id) return null;
    const key = String(id);
    if ((lakeGeoms && lakeGeoms[key]) || (localLakeGeoms && localLakeGeoms[key])) return localLakeGeoms[key] || lakeGeoms[key];
    try {
      const r = await api(`/lakes/${encodeURIComponent(id)}`);
  const raw = r?.geom_geojson;
      if (!raw) return null;
      let geom = null;
      try { geom = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { geom = raw; }
  if (geom) setLocalLakeGeoms((prev) => ({ ...(prev || {}), [key]: geom }));
      return geom;
    } catch (e) {
      return null;
    }
  };
  const setCoords = (data, setData, lat, lng) => {
    const nlat = Number(lat), nlng = Number(lng);
    if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) return setData({ ...data, lat, lng });
    setData({ ...data, lat, lng, geom_point: { lat: nlat, lng: nlng } });
  };
  const pickStation = (data, setData, stationId) => {
    const st = stationOptions(data).find((s) => String(s.id) === String(stationId));
    if (!st) return setData({ ...data, station_id: "", station_name: "", station_desc: "" });
    const latNum = st.lat !== null && st.lat !== undefined && st.lat !== '' ? Number(st.lat) : null;
    const lngNum = st.lng !== null && st.lng !== undefined && st.lng !== '' ? Number(st.lng) : null;
    setData({
      ...data,
      station_id: stationId,
      station_name: st.name,
      station_desc: st.description || "",
      lat: latNum,
      lng: lngNum,
      geom_point: latNum !== null && lngNum !== null ? { lat: latNum, lng: lngNum } : data.geom_point,
    });
  };
  const handleMapClick = (data, setData, e) => {
    const { lat, lng } = e?.latlng || {};
    if (!lat || !lng) return;
    setCoords(data, setData, Number(lat.toFixed(6)), Number(lng.toFixed(6)));
  };

  const addRow = (data, setData) =>
    setData({
      ...data,
      results: [
        ...(data.results || []),
        {
          tempId: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          parameter_id: "",
          parameter_code: "",
          value: "",
          unit: "",
          depth_m: 0,
          remarks: "",
        },
      ],
    });
  const rmRow = (data, setData, tempId) =>
    setData({ ...data, results: (data.results || []).filter((r) => r.tempId !== tempId) });
  const patchRow = (data, setData, tempId, patch) => {
    const next = (data.results || []).map((r) => {
      if (r.tempId !== tempId) return r;
      const nr = { ...r, ...patch };
      if (patch.parameter_id !== undefined) {
        const p = parameterOptions.find((pp) => String(pp.id) === String(patch.parameter_id));
        nr.parameter_code = p?.code || "";
        nr.unit = p?.unit || "";
      }
      if (patch.depth_m !== undefined) {
        const val = patch.depth_m;
        nr.depth_m = val === "" ? "" : (val === null || isNaN(Number(val)) ? 0 : Number(val));
      }
      return nr;
    });
    setData({ ...data, results: next });
  };

  const submit = async (data) => {
    if (!data?.station_id) {
      alertError('Missing station', canManageStations ? 'A station is required for every sampling event. Please select or create a station.' : 'A station is required for every sampling event.');
      const err = new Error('Station is required');
      err.code = 'VALIDATION';
      throw err;
    }
    if (!data?.sampled_at || !isNotLaterThanTodayDate(data.sampled_at)) {
      alertError('Invalid date/time', 'The sampling date must not be later than today.');
      const err = new Error('Invalid sampled_at');
      err.code = 'VALIDATION';
      throw err;
    }
    if (!isLettersOnly(data.sampler_name || '')) {
      alertError('Invalid sampler name', 'Sampler name should contain letters only.');
      const err = new Error('Invalid sampler_name');
      err.code = 'VALIDATION';
      throw err;
    }
    // Ensure applied standard falls back to current standard when not explicitly chosen
    const fallbackStdId = standardsList.find(s => s.is_current)?.id || null;
    const appliedStdId = data.applied_standard_id || fallbackStdId || null;

    const payload = {
      organization_id: data.organization_id ?? null,
      lake_id: data.lake_id ? Number(data.lake_id) : null,
      station_id: data.station_id ? Number(data.station_id) : null,
      applied_standard_id: appliedStdId ? Number(appliedStdId) : null,
      sampled_at: data.sampled_at,
      sampler_name: data.sampler_name || null,
      method: data.method || null,
      weather: data.weather || null,
      notes: data.notes || null,
      status: canPublish ? (data.status || "draft") : "draft",
      latitude: data.lat === "" ? null : (data.lat === null ? null : Number(data.lat)),
      longitude: data.lng === "" ? null : (data.lng === null ? null : Number(data.lng)),
      measurements: (data.results || []).map((r) => ({
        parameter_id: r.parameter_id ? Number(r.parameter_id) : null,
        value: r.value === "" ? null : (r.value === null ? null : Number(r.value)),
        unit: r.unit || null,
        depth_m: r.depth_m === "" || r.depth_m === null ? 0 : Number(r.depth_m),
        remarks: r.remarks || null,
      })),
    };

    if (onSubmit) {
      const result = await onSubmit(payload);
      try { alertSuccess('Saved', 'Water quality test saved.'); } catch {}
      // redirect to appropriate listing depending on current UI context
      try {
        const p = window.location && window.location.pathname ? window.location.pathname : '';
        if (p.includes('/org-dashboard')) window.location.href = '/org-dashboard/wq-tests';
        else if (p.includes('/contrib-dashboard')) window.location.href = '/contrib-dashboard/wq-tests';
        else window.location.href = '/admin/sample-events';
      } catch (e) {}
      return result;
    }

    return (async () => {
      try {
        const token = getToken();
        const resp = await fetch('/api/admin/sample-events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        const text = await resp.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = null; }

        if (!resp.ok) {
          const msg = (json && (json.message || json.errors)) ? (json.message || JSON.stringify(json.errors)) : text || `HTTP ${resp.status}`;
          alertError('Save failed', msg);
          const err = new Error(msg);
          err.status = resp.status;
          err.response = json || text;
          throw err;
        }

        const data = json?.data ?? json;
        try { alertSuccess('Saved', 'Water quality test saved.'); } catch {}
        try {
          const p = window.location && window.location.pathname ? window.location.pathname : '';
          if (p.includes('/org-dashboard')) window.location.href = '/org-dashboard/wq-tests';
          else if (p.includes('/contrib-dashboard')) window.location.href = '/contrib-dashboard/wq-tests';
          else window.location.href = '/admin/sample-events';
        } catch (e) {}
        return data;
      } catch (e) {
        console.error('[WQTestWizard] submit error', e);
        throw e;
      }
    })();
  };

  const fetchStationsForLake = async (lakeId) => {
    if (!lakeId) return [];
    if (stationsByLake && stationsByLake[String(lakeId)] && stationsByLake[String(lakeId)].length) return stationsByLake[String(lakeId)];
    try {
      const qs = `?lake_id=${encodeURIComponent(lakeId)}${organization && organization.id ? `&organization_id=${encodeURIComponent(organization.id)}` : ''}`;
      const res = await api(`/admin/stations${qs}`);
      const list = Array.isArray(res?.data) ? res.data : [];
      const normalized = list.map((s) => {
        const latRaw = s.latitude ?? s.lat ?? null;
        const lngRaw = s.longitude ?? s.lng ?? null;
        return {
          ...s,
          lat: latRaw !== null && latRaw !== undefined && latRaw !== '' ? Number(latRaw) : null,
          lng: lngRaw !== null && lngRaw !== undefined && lngRaw !== '' ? Number(lngRaw) : null,
        };
      });
      setStationsByLake((prev) => ({ ...(prev || {}), [String(lakeId)]: normalized }));
      return normalized;
    } catch (e) {
      return [];
    }
  };

  /* --------------------------------- Steps ---------------------------------- */
  // Responsive map height by breakpoint
  const mapHeight = (() => {
    if (windowW <= 480) return 260;      // Mobile S
    if (windowW <= 640) return 300;      // Mobile M/L
    if (windowW <= 768) return 320;      // Tablet portrait
    if (windowW <= 1024) return 350;     // Tablet landscape / small laptop
    if (windowW <= 1280) return 380;     // Laptop
    if (windowW <= 1536) return 420;     // Laptop L
    if (windowW <= 1920) return 460;     // 1080p
    return 520;                          // 4K & larger
  })();
  const isMobile = windowW <= 640;
  const isTablet = windowW > 640 && windowW <= 1024;
  const steps = [
    {
      key: STEP_LABELS[0].key,
      title: STEP_LABELS[0].title,
      onInvalid: ({ data }) => {
        if (!data.lake_id) {
          return alertError('Missing lake', 'Please select a lake before continuing.');
        }
        if (!data.station_id) {
          // contributors cannot create new stations so show a shorter message
          return alertError('Missing station', canManageStations ? 'A station is required — please select or create one.' : 'A station is required');
        }
        return null;
      },
      canNext: (d) => {
        // Station is required for all sampling events
        return !!d.lake_id && !!d.station_id;
      },
      render: ({ data, setData }) => (
        <div className="wizard-pane">
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr 1fr' : '1fr 1fr 1fr'),
              alignItems: 'start'
            }}
          >
            <FG label="Lake *" style={{ minWidth: 200 }}>
              <select value={data.lake_id} onChange={(e) => pickLake(data, setData, e.target.value)}>
                <option value="">Select a lake…</option>
                {lakeOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FG>
            <FG label="Existing Station *" style={{ minWidth: 200 }}>
              <select
                value={data.station_id}
                onChange={(e) => pickStation(data, setData, e.target.value)}
                disabled={!data.lake_id}
              >
                <option value="">{data.lake_id ? 'Select a station…' : 'Choose a lake first'}</option>
                {stationOptions(data).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FG>
            {canManageStations && (
              <FG label="Actions" style={{ minWidth: 200 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    className="pill-btn primary"
                    onClick={async () => {
                      if (!data.lake_id) return;
                      await fetchStationsForLake(data.lake_id).catch(() => {});
                      setStationEdit(null);
                      setStationModalOpen(true);
                    }}
                    disabled={!data.lake_id}
                  >
                    <FiPlus /> New Station
                  </button>
                  <button
                    className="pill-btn ghost"
                    disabled={!data.station_id}
                    onClick={async () => {
                      if (!data.station_id) return;
                      await fetchStationsForLake(data.lake_id).catch(() => {});
                      setStationEdit(stationOptions(data).find((s) => String(s.id) === String(data.station_id)) || null);
                      setStationModalOpen(true);
                    }}
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className="pill-btn ghost danger"
                    disabled={!data.station_id}
                    onClick={() => deleteStationApi(data, setData, Number(data.station_id))}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </FG>
            )}
          </div>
          <div
            className="map-preview"
            style={{
              marginTop: 16,
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff'
            }}
          >
            <AppMap
              style={{ height: '100%', width: '100%' }}
              disableDrag={isMobile}
              zoomControl={!isMobile}
              scrollWheelZoom={!isMobile}
            >
              {data.lake_id && mergedLakeGeoms?.[String(data.lake_id)] && (
                <GeoJSON
                  key={String(data.lake_id)}
                  data={mergedLakeGeoms[String(data.lake_id)]}
                  style={{ color: '#2563eb', weight: 2, fillOpacity: 0.1 }}
                  pointToLayer={(feature, latlng) => L.circleMarker(latlng, { color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.5, radius: 8 })}
                />
              )}
              {data.geom_point && (
                <CircleMarker center={[data.geom_point.lat, data.geom_point.lng]} radius={8} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }}>
                  <Popup>
                    <div>
                      <div><strong>Station Coordinates</strong></div>
                      <div>
                        {data.geom_point && Number.isFinite(Number(data.geom_point.lat)) ? Number(data.geom_point.lat).toFixed(6) : '—'},
                        {data.geom_point && Number.isFinite(Number(data.geom_point.lng)) ? ' ' + Number(data.geom_point.lng).toFixed(6) : ' —'}
                      </div>
                      {data.station_id && <div>Station: {data.station_name}</div>}
                    </div>
                  </Popup>
                </CircleMarker>
              )}
              <MapViewport bounds={mapBounds(data)} maxZoom={14} padding={[16, 16]} pad={0.02} />
            </AppMap>
          </div>
          <StationModal
            open={stationModalOpen}
            onClose={() => setStationModalOpen(false)}
            lakeId={data.lake_id}
            stations={stationOptions(data)}
            editing={stationEdit}
            canManage={canManageStations}
            onCreate={(station) => createStationApi(data, setData, station)}
            onUpdate={(station) => updateStationApi(data, setData, station)}
            onDelete={(id) => deleteStationApi(data, setData, id)}
          />
        </div>
      ),
    },

    {
      key: STEP_LABELS[1].key,
      title: STEP_LABELS[1].title,
      onInvalid: ({ data }) => {
        if (!data.sampled_at) return alertError('Missing date', 'Please enter the sampling date.');
        if (!isNotLaterThanTodayDate(data.sampled_at)) return alertError('Invalid date', 'The sampling date must not be later than today.');
        if (!data.method) return alertError('Missing method', 'Please choose a sampling method.');
        if (!data.sampler_name) return alertError('Missing sampler', 'Please enter the sampler\'s name.');
        if (data.sampler_name && !isLettersOnly(data.sampler_name)) return alertError('Invalid sampler name', 'Sampler name should contain letters only.');
        if (!data.weather) return alertError('Missing weather', 'Please select the weather during sampling.');
        return null;
      },
      canNext: (d) => !!d.sampled_at && isNotLaterThanTodayDate(d.sampled_at) && !!d.method && !!d.weather && !!d.sampler_name && isLettersOnly(d.sampler_name),
      render: ({ data, setData }) => {
        const maxDt = fmtDate(new Date());
        const dateInvalid = !!data.sampled_at && !isNotLaterThanTodayDate(data.sampled_at);
        return (
        <div className="wizard-pane">
          <FormRow>
            <FG label="Date*">
              <input
                type="date"
                max={maxDt}
                value={data.sampled_at}
                onChange={(e) => setData({ ...data, sampled_at: e.target.value })}
              />
              {dateInvalid ? (
                <DateInvalidPopup />
              ) : null}
            </FG>
            <FG label="Method*">
              <select
                value={data.method}
                onChange={(e) => setData({ ...data, method: e.target.value })}
              >
                <option value="">Select method…</option>
                <option value="manual">Manual Grab Sampling</option>
                <option value="automatic">Automatic Sampling</option>
              </select>
            </FG>
            <FG label="Sampler Name*">
              <input
                value={data.sampler_name}
                onChange={(e) => {
                  const val = e.target.value || '';
                  const filtered = val.replace(/[^A-Za-z\s]/g, '');
                  setData({ ...data, sampler_name: filtered });
                }}
                placeholder="Juan dela Cruz"
                title="Letters and spaces only"
              />
            </FG>
            <FG label="Weather*">
              <select
                value={data.weather}
                onChange={(e) => setData({ ...data, weather: e.target.value })}
              >
                <option value="">Select weather…</option>
                <option value="sunny">Sunny</option>
                <option value="partly_cloudy">Partly Cloudy</option>
                <option value="cloudy">Cloudy</option>
                <option value="rainy">Rainy</option>
                <option value="stormy">Stormy</option>
                <option value="foggy">Foggy</option>
                <option value="windy">Windy</option>
                <option value="overcast">Overcast</option>
              </select>
            </FG>
          </FormRow>
        </div>
        );
      },
    },

    // Step 3: Parameters
    {
      key: STEP_LABELS[2].key,
      title: STEP_LABELS[2].title,
      onInvalid: ({ data }) => {
        const rows = data.results || [];
        if (!rows.length) return alertError('No parameters', 'Add at least one parameter row before continuing.');
        const bad = rows.find((r) => {
          if (!r.parameter_id || r.value === "" || r.value === null) return true;
          const v = Number(r.value);
          if (!Number.isFinite(v) || v < 0) return true;
          if (r.depth_m !== "" && r.depth_m !== null && r.depth_m !== undefined) {
            const d = Number(r.depth_m);
            if (!Number.isFinite(d) || d < 0) return true;
          }
          return false;
        });
        if (bad) return alertError('Invalid parameter row', 'Value and Depth (m) must be positive numbers.');
        return null;
      },
      canNext: (d) =>
        (d.results || []).length > 0 &&
        (d.results || []).every((r) => {
          if (!r.parameter_id) return false;
          if (r.value === "" || r.value === null) return false;
          const v = Number(r.value);
          if (!Number.isFinite(v) || v < 0) return false;
          if (r.depth_m !== "" && r.depth_m !== null && r.depth_m !== undefined) {
            const dnum = Number(r.depth_m);
            if (!Number.isFinite(dnum) || dnum < 0) return false;
          }
          return true;
        }),
      onBeforeNext: ({ data }) => {
        // Prevent multiple rows of the same parameter at the identical depth when user clicks Next
        const rows = Array.isArray(data?.results) ? data.results : [];
        if (!rows.length) return true;

        const counts = new Map();
        for (const r of rows) {
          // only consider rows with a selected parameter
          if (!r.parameter_id) continue;
          // normalize depth: empty or null -> 0
          const depth = r.depth_m === "" || r.depth_m === null || r.depth_m === undefined ? 0 : Number(r.depth_m);
          const key = `${String(r.parameter_id)}::${String(depth)}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }

        const dups = Array.from(counts.entries()).filter(([, c]) => c > 1);
        if (dups.length === 0) return true;

        // Build a helpful message listing the duplicated parameter + depth combos
        const lines = dups.map(([k]) => {
          const [paramId, depthStr] = k.split('::');
          const param = parameterOptions.find((p) => String(p.id) === String(paramId));
          const paramLabel = param ? `${param.code} — ${param.name}` : `Parameter ${paramId}`;
          const depth = Number(depthStr);
          return `${paramLabel} at ${formatDepth(depth)} (${depth} m)`;
        });

        alertError('Duplicate parameter entries', `You have multiple rows for the same parameter at the same depth. Please remove or change duplicates before continuing:\n\n${lines.join('\n')}`);
        return false;
      },
      render: ({ data, setData }) => (
        <div className="wizard-pane">
          {/* Entry Mode Selection */}
          <div style={{
            marginBottom: 20,
            padding: 16,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8
          }}>
            <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 15 }}>
              Choose how to enter parameter data:
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '12px 16px',
                border: parameterEntryMode === 'manual' ? '2px solid #3b82f6' : '2px solid #cbd5e1',
                borderRadius: 8,
                background: parameterEntryMode === 'manual' ? '#eff6ff' : '#fff',
                transition: 'all 0.2s ease',
                flex: '1 1 200px'
              }}>
                <input
                  type="radio"
                  name="entryMode"
                  value="manual"
                  checked={parameterEntryMode === 'manual'}
                  onChange={(e) => setParameterEntryMode(e.target.value)}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Manual Entry</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Add parameters row by row</div>
                </div>
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '12px 16px',
                border: parameterEntryMode === 'bulk' ? '2px solid #3b82f6' : '2px solid #cbd5e1',
                borderRadius: 8,
                background: parameterEntryMode === 'bulk' ? '#eff6ff' : '#fff',
                transition: 'all 0.2s ease',
                flex: '1 1 200px'
              }}>
                <input
                  type="radio"
                  name="entryMode"
                  value="bulk"
                  checked={parameterEntryMode === 'bulk'}
                  onChange={(e) => setParameterEntryMode(e.target.value)}
                  style={{ cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}><FiUpload style={{ display: 'inline', marginRight: 4 }} /> Bulk Import</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Upload from template</div>
                </div>
              </label>
            </div>
          </div>

          {/* Manual Entry Interface */}
          {parameterEntryMode === 'manual' && (
            <>
          <div className="wizard-nav" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
            <button className="pill-btn primary" onClick={() => addRow(data, setData)}>
              <FiPlus /> Add Row
            </button>
          </div>

          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="lv-table">
              <thead>
                <tr>
                  <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Parameter</span></div></th>
                  <th className="lv-th" style={{ width: 140 }}><div className="lv-th-inner"><span className="lv-th-label">Value</span></div></th>
                  <th className="lv-th" style={{ width: 110 }}><div className="lv-th-inner"><span className="lv-th-label">Unit</span></div></th>
                  <th className="lv-th" style={{ width: 140 }}><div className="lv-th-inner"><span className="lv-th-label">Depth (m)</span></div></th>
                  <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Remarks</span></div></th>
                  <th className="lv-th" style={{ width: 70 }} />
                </tr>
              </thead>
              <tbody>
                {(data.results || []).map((r) => (
                  <tr key={r.tempId}>
                    <td>
                      <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                        <select
                          value={r.parameter_id}
                          onChange={(e) => patchRow(data, setData, r.tempId, { parameter_id: e.target.value })}
                        >
                          <option value="">Select…</option>
                          {parameterOptions.map((p) => (
                            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={r.value ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '' || /^\d*\.?\d*$/.test(v)) {
                              patchRow(data, setData, r.tempId, { value: v });
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                        <span>{r.unit || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={r.depth_m ?? 0}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '' || /^\d*\.?\d*$/.test(v)) {
                              patchRow(data, setData, r.tempId, { depth_m: v });
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                        <input
                          value={r.remarks}
                          onChange={(e) => patchRow(data, setData, r.tempId, { remarks: e.target.value })}
                        />
                      </div>
                    </td>
                    <td>
                      <button className="pill-btn ghost danger" onClick={() => rmRow(data, setData, r.tempId)} title="Remove">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
                {!(data.results || []).length && (
                  <tr><td colSpan={6} className="lv-empty">No parameters yet. Click “Add Row”.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="alert-note" style={{ marginTop: 12 }}>
            Multiple parameter values at different depths? Add several parameter rows with different Depth (m) values.
          </div>
            </>
          )}
tenantI
          {/* Bulk Import Interface */}
          {parameterEntryMode === 'bulk' && (
            <BulkImportUploader
              tenantId={tenantId}
              userRole={resolvedUserRole}
              onImportSuccess={(importedParameters) => {
                // Convert imported parameters to wizard format
                const newResults = importedParameters.map((param) => {
                  // Find parameter ID by matching parameter name/code
                  const matchedParam = parameterOptions.find((p) => 
                    p.name === param.parameter || p.code === param.parameter
                  );
                  
                  return {
                    tempId: `param-${Date.now()}-${Math.random()}`,
                    parameter_id: matchedParam?.id || '',
                    value: param.value,
                    unit: param.unit || matchedParam?.unit || '',
                    depth_m: param.depth_m ?? 0,
                    remarks: param.remarks || ''
                  };
                });

                setData({ ...data, results: newResults });
                setParameterEntryMode('manual'); // Switch to manual mode to show imported data
                
                // Show success message
                try {
                  alertSuccess('Import successful', `${newResults.length} parameters loaded. You can edit them below before proceeding.`);
                } catch (e) {}
              }}
              onCancel={() => setParameterEntryMode('manual')}
            />
          )}
        </div>
      ),
    },

    // Step 4: Standard & Notes (+ Status with role gating)
    {
      key: STEP_LABELS[3].key,
      title: STEP_LABELS[3].title,
      onInvalid: ({ data }) => {
        const okStd = !!(data.applied_standard_id || standardsList.find(s => s.is_current)?.id);
        if (!okStd) return alertError('Missing standard', 'Please select an applied standard (DAO) before continuing.');
        return null;
      },
      canNext: (d) => !! (d.applied_standard_id || standardsList.find(s => s.is_current)?.id),
      render: ({ data, setData }) => (
        <div className="wizard-pane">
          <FormRow>
            <FG label="Applied Standard (DAO) *">
              <select
                value={data.applied_standard_id || standardsList.find(s => s.is_current)?.id || ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const std = standardOptions.find((s) => String(s.id) === String(id));
                  setData({
                    ...data,
                    applied_standard_id: id,
                    applied_standard_code: std?.code || "",
                  });
                }}
              >
                {standardOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name} {s.is_current ? "(current)" : ""}
                  </option>
                ))}
              </select>
            </FG>

            <FG label="Status">
              <select
                value={data.status}
                onChange={(e) => setData({ ...data, status: e.target.value })}
                disabled={!canPublish}
                title={roleToCheck === 'contributor' ? 'Only Organization Administrators can publish. Contributors can save as Draft.' : undefined}
              >
                <option value="draft">Draft</option>
                {canPublish && <option value="public">Published</option>}
              </select>
            </FG>

            <FG label="Notes" style={{ flexBasis: "100%" }}>
              <input
                value={data.notes}
                onChange={(e) => setData({ ...data, notes: e.target.value })}
              />
            </FG>
          </FormRow>
        </div>
      ),
    },

    // Step 5: Review (show derived period preview)
    {
      key: STEP_LABELS[4].key,
      title: STEP_LABELS[4].title,
      onBeforeFinish: async ({ data }) => {
        // run full validation for all steps and surface the first problem found
        if (!data.lake_id) { alertError('Missing lake', 'Please select a lake.'); return false; }
        if (!data.station_id) { alertError('Missing station', canManageStations ? 'A station is required — please select or create one.' : 'A station is required'); return false; }
        if (!data.sampled_at) { alertError('Missing date', 'Please enter the sampling date.'); return false; }
        if (!isNotLaterThanTodayDate(data.sampled_at)) { alertError('Invalid date', 'The sampling date must not be later than today.'); return false; }
        if (!data.method) { alertError('Missing method', 'Please choose a sampling method.'); return false; }
        if (!data.sampler_name) { alertError('Missing sampler', 'Please enter the sampler name.'); return false; }
        if (!isLettersOnly(data.sampler_name)) { alertError('Invalid sampler name', 'Sampler name should contain letters only.'); return false; }
        if (!data.weather) { alertError('Missing weather', 'Please select the weather during sampling.'); return false; }
        const rows = data.results || [];
        if (!rows.length) { alertError('No parameters', 'Add at least one parameter row before submitting.'); return false; }
        const bad = rows.find((r) => {
          if (!r.parameter_id || r.value === "" || r.value === null) return true;
          const v = Number(r.value);
          if (!Number.isFinite(v) || v < 0) return true;
          if (r.depth_m !== "" && r.depth_m !== null && r.depth_m !== undefined) {
            const d = Number(r.depth_m);
            if (!Number.isFinite(d) || d < 0) return true;
          }
          return false;
        });
        if (bad) { alertError('Invalid parameter row', 'Value and Depth (m) must be positive numbers.'); return false; }
        const okStd = !!(data.applied_standard_id || standardsList.find(s => s.is_current)?.id);
        if (!okStd) { alertError('Missing standard', 'Please select an applied standard (DAO) before submitting.'); return false; }

        // ask for final confirmation before submitting
        const confirmText = data.status === 'public' ? 'This will publish the water quality test. Continue?' : 'Submit this water quality test?';
        const ok = await confirm({ title: 'Confirm submission', text: confirmText, confirmButtonText: 'Submit' });
        return !!ok;
      },
      render: ({ data }) => {
        const selectedStd = standardOptions.find(s => String(s.id) === String(data.applied_standard_id || standardsList.find(s => s.is_current)?.id || ""));
        return (
          <div className="wizard-pane">
            <div className="dashboard-card" style={{ marginBottom: 12 }}>
              <div className="dashboard-card-title"><FiMapPin /> Context</div>
              <div className="dashboard-card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><strong>Lake:</strong> {data.lake_name || "—"}</div>
                <div><strong>Lake Class:</strong> {data.lake_class_code || "—"}</div>
                <div><strong>Station:</strong> {data.station_id ? data.station_name : "—"}</div>
                <div><strong>Sampled On:</strong> {data.sampled_at ? new Date(data.sampled_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) : "—"}</div>
                <div><strong>Sampler:</strong> {data.sampler_name || "—"}</div>
                <div><strong>Method:</strong> {METHOD_DISPLAY[data.method] || data.method || "—"}</div>
                <div><strong>Weather:</strong> {WEATHER_DISPLAY[data.weather] || data.weather || "—"}</div>
                <div><strong>Status:</strong> {STATUS_DISPLAY[data.status] || data.status || "Draft"}</div>
              </div>
            </div>

            <div className="dashboard-card" style={{ marginBottom: 12 }}>
              <div className="dashboard-card-title"><FiThermometer /> Parameters</div>
              {!((data.results || []).length) ? (
                <div className="no-data">No parameters.</div>
              ) : (
                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="lv-table">
                    <thead>
                      <tr>
                        <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Parameter</span></div></th>
                        <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Value</span></div></th>
                        <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Unit</span></div></th>
                        <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Depth (m)</span></div></th>
                        <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Remarks</span></div></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.results || []).map((r) => {
                        const p = parameterOptions.find((pp) => String(pp.id) === String(r.parameter_id));
                        return (
                          <tr key={r.tempId}>
                            <td>{p ? `${p.code} — ${p.name}` : r.parameter_code || "—"}</td>
                            <td>{r.value !== "" && r.value !== null ? r.value : "—"}</td>
                            <td>{r.unit || p?.unit || "—"}</td>
                            <td>{r.depth_m !== "" && r.depth_m !== null ? formatDepth(r.depth_m) : "—"}</td>
                            <td>{r.remarks || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-title"><FiClipboard /> Standard & Notes</div>
              <div className="dashboard-card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><strong>Standard:</strong> {selectedStd?.code || "—"}</div>
                <div><strong>Notes:</strong> {data.notes || "—"}</div>
              </div>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="wizard-container">
      <Wizard
        steps={steps}
        initialData={initialData}
        labels={{ back: "Prev", next: "Next", finish: "Submit" }}
        onFinish={submit}
      />
    </div>
  );
}
