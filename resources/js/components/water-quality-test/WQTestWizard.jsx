import React, { useState, useEffect } from "react";
import { api, getToken } from "../../lib/api";
import { alertError, alertSuccess } from "../../utils/alerts";
import { fetchLakeOptions } from "../../lib/layers";
import {
  FiMapPin, FiThermometer,
  FiPlus, FiTrash2, FiEdit2, FiFlag, FiClipboard
} from "react-icons/fi";
import Wizard from "../Wizard";
import AppMap from "../AppMap";
import MapViewport from "../MapViewport";
import StationModal from "../../components/modals/StationModal";
import { GeoJSON, Marker, Popup } from "react-leaflet";
import L from "leaflet";

/* Config */

const fmtDateLocal = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DEFAULT_ICON = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const INITIAL_DATA = {
  organization_id: null,
  organization_name: "",
  lake_id: "",
  lake_name: "",
  lake_class_code: "",
  loc_mode: "coord",
  lat: "",
  lng: "",
  station_id: "",
  station_name: "",
  station_desc: "",
  geom_point: null,
  sampled_at: fmtDateLocal(),
  method: "",
  sampler_name: "",
  weather: "",
  results: [],
  applied_standard_id: "",
  applied_standard_code: "",
  notes: "",
  status: "draft",
};

/* Small UI helpers */
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

/* Wizard step labels used by the local Wizard component */
const STEP_LABELS = [
  { key: 'location', title: 'Location' },
  { key: 'details',  title: 'Details'  },
  { key: 'params',    title: 'Parameters' },
  { key: 'standard',  title: 'Standard' },
  { key: 'review',    title: 'Review' },
];

/* Component */
export default function WQTestWizard({
  lakes = [],
  lakeGeoms = {},
  stationsByLake: stationsByLakeProp = {},
  parameters = [],
  standards = [],
  organization = null,
  currentUserRole = null,   // if not provided, determine from API
  onSubmit,
}) {
  const [resolvedUserRole, setResolvedUserRole] = useState(currentUserRole);

  useEffect(() => {
    if (currentUserRole) return; // prop provided — trust it
    let mounted = true;
    (async () => {
      try {
        const me = await api("/auth/me");
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
  const [localLakes, setLocalLakes] = useState(lakes);
  const [localLakeGeoms, setLocalLakeGeoms] = useState(lakeGeoms || {});
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [stationEdit, setStationEdit] = useState(null);

  // Parameter & standards lists (fetch from API if not provided as props)
  const [parametersList, setParametersList] = useState(parameters || []);
  const [standardsList, setStandardsList] = useState(standards || []);

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

  // Permissions: only org_admin or superadmin may manage stations
  const canManageStations = roleToCheck === "org_admin" || roleToCheck === "superadmin";

  // API-backed station handlers (only used when canManageStations)
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
  // normalize server fields (latitude/longitude) to frontend shape (lat/lng)
  const norm = { ...s, lat: s.latitude ?? s.lat ?? null, lng: s.longitude ?? s.lng ?? null };
  const list = stationsByLake[String(data.lake_id)] || [];
  setStationsByLake({ ...stationsByLake, [String(data.lake_id)]: [...list, norm] });
      // select the newly-created station
      setData({ ...data,
        station_id: s.id,
        station_name: s.name,
        station_desc: s.description || "",
        lat: s.latitude ?? data.lat,
        lng: s.longitude ?? data.lng,
        geom_point: (s.latitude !== null && s.longitude !== null) ? { lat: Number(s.latitude), lng: Number(s.longitude) } : data.geom_point,
      });
    } catch (e) {
      // If validation error from server, show message. Otherwise fall back to local create.
      const msg = e?.message || String(e);
      if (msg.includes('422') || msg.toLowerCase().includes('validation')) {
        alertError('Validation error', msg.replace(/^HTTP\s*422\s*/i, '').trim() || 'Please check the station fields.');
        return;
      }
  // Non-validation error: report and abort.
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
  // normalize and merge into list
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
  await api(`/admin/stations/${encodeURIComponent(stationId)}`, { method: "DELETE" });
  const list = stationsByLake[String(data.lake_id)] || [];
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
    // If parent provided lakes, use them. Otherwise fetch lightweight options.
    if (Array.isArray(lakes) && lakes.length) {
      setLocalLakes(lakes);
      return () => { mounted = false; };
    }

    // debounce a bit to avoid StrictMode double-invoke causing multiple back-to-back requests
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

  // merged geoms: prop `lakeGeoms` may be provided by parent; localLakeGeoms stores fetched geometries
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

  const initialData = {
    ...INITIAL_DATA,
    organization_id: organization?.id ?? null,
    organization_name: organization?.name ?? "",
  };

  /* ----------------------------- handlers (ctx) ------------------------------ */
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
    });
    // fetch geometry for the selected lake (if not already present)
    if (id) {
      fetchLakeGeo(id).catch(() => {});
      // fetch stations for this lake so the modal/table shows up-to-date data
      fetchStationsForLake(id).catch(() => {});
    }
  };

  // Fetch lake geometry (from /api/lakes/:id -> returns geom_geojson string)
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
  const setLocMode = (data, setData, mode) => setData({ ...data, loc_mode: mode });
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

  // Parameter rows
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
          depth_m: "",
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
        if (!nr.unit) nr.unit = p?.unit || "";
      }
      return nr;
    });
    setData({ ...data, results: next });
  };

  // Station CRUD is API-backed (createStationApi/updateStationApi/deleteStationApi).

  const submit = (data) => {
    const payload = {
      organization_id: data.organization_id ?? null,
      lake_id: data.lake_id ? Number(data.lake_id) : null,
      station_id: data.station_id ? Number(data.station_id) : null,
      applied_standard_id: data.applied_standard_id ? Number(data.applied_standard_id) : null,
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
        depth_m: r.depth_m === "" ? null : (r.depth_m === null ? null : Number(r.depth_m)),
        remarks: r.remarks || null,
      })),
    };

    // If parent supplied an onSubmit handler, delegate to it (useful for tests or overrides)
    if (onSubmit) return onSubmit(payload);

    // Log payload only in dev consoles if needed (removed for cleanliness)

    // Return the promise so callers can await and observe errors
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
  // response handled below; no debug log here

        if (!resp.ok) {
          const msg = (json && (json.message || json.errors)) ? (json.message || JSON.stringify(json.errors)) : text || `HTTP ${resp.status}`;
          alertError('Save failed', msg);
          const err = new Error(msg);
          err.status = resp.status;
          err.response = json || text;
          throw err;
        }

        const data = json?.data ?? json;
        alertSuccess('Saved', 'Water quality test saved.');
        return data;
      } catch (e) {
        console.error('[WQTestWizard] submit error', e);
        throw e;
      }
    })();
  };

  // Fetch stations for a lake from the server and cache them in `stationsByLake`.
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
  const steps = [
    {
      key: STEP_LABELS[0].key,
      title: STEP_LABELS[0].title,
      canNext: (d) => {
        if (!d.lake_id) return false;
        if (d.loc_mode === "coord") return d.lat !== "" && d.lng !== "";
        if (d.station_id) return true;
        return false;
      },
      render: ({ data, setData }) => (
        <div className="wizard-pane">
          {organization && (
            <div className="info-row" style={{ marginBottom: 12 }}>
              <Tag>
                <FiFlag /> Org: {organization.name}
              </Tag>
            </div>
          )}

          <FormRow>
            <FG label="Lake *" style={{ minWidth: 260 }}>
              <select
                value={data.lake_id}
                onChange={(e) => pickLake(data, setData, e.target.value)}
              >
                <option value="">Select a lake…</option>
                {lakeOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </FG>
          </FormRow>

          <div className="org-form" style={{ marginTop: 8 }}>
            <div className="form-group" style={{ minWidth: 220 }}>
              <label>Mode</label>
              <div className="segmented-pills">
                <button
                  className={`pill-btn ${data.loc_mode === "coord" ? "primary" : "ghost"}`}
                  onClick={() => setLocMode(data, setData, "coord")}
                  type="button"
                >
                  Coordinates
                </button>
                <button
                  className={`pill-btn ${data.loc_mode === "station" ? "primary" : "ghost"}`}
                  onClick={() => setLocMode(data, setData, "station")}
                  type="button"
                >
                  Station
                </button>
              </div>
            </div>
          </div>

          {data.loc_mode === "coord" ? (
            <FormRow>
              <FG label="Latitude *">
                <input
                  type="number"
                  value={data.lat}
                  onChange={(e) => setCoords(data, setData, e.target.value, data.lng)}
                />
              </FG>
              <FG label="Longitude *">
                <input
                  type="number"
                  value={data.lng}
                  onChange={(e) => setCoords(data, setData, data.lat, e.target.value)}
                />
              </FG>
            </FormRow>
          ) : (
            <>
              <FormRow>
                <FG label="Existing Station" style={{ minWidth: 260 }}>
                  <select
                    value={data.station_id}
                    onChange={(e) => pickStation(data, setData, e.target.value)}
                    disabled={!data.lake_id}
                  >
                    <option value="">
                      {data.lake_id ? "Select a station…" : "Choose a lake first"}
                    </option>
                    {stationOptions(data).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FG>

                {canManageStations && (
                  <FG label="Actions" style={{ minWidth: 220 }}>
                    <div style={{ display: "flex", gap: 8 }}>
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
                          setStationEdit(
                            stationOptions(data).find((s) => String(s.id) === String(data.station_id)) || null
                          );
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
              </FormRow>

              <FormRow>
                <FG label={`Latitude ${data.station_id ? "" : "*"}`}>
                  <input
                    type="number"
                    value={data.lat}
                    onChange={(e) => setCoords(data, setData, e.target.value, data.lng)}
                  />
                </FG>
                <FG label={`Longitude ${data.station_id ? "" : "*"}`}>
                  <input
                    type="number"
                    value={data.lng}
                    onChange={(e) => setCoords(data, setData, data.lat, e.target.value)}
                  />
                </FG>
              </FormRow>
            </>
          )}

          {/* Map */}
          <div className="map-preview" style={{ marginTop: 12 }}>
            <AppMap onClick={(e) => handleMapClick(data, setData, e)} style={{ height: 380 }}>
              {data.lake_id && mergedLakeGeoms?.[String(data.lake_id)] ? (
                <GeoJSON key={String(data.lake_id)} data={mergedLakeGeoms[String(data.lake_id)]} style={{ color: "#2563eb", weight: 2, fillOpacity: 0.1 }} />
              ) : null}

              {data.geom_point ? (
                <Marker position={[data.geom_point.lat, data.geom_point.lng]} icon={DEFAULT_ICON}>
                  <Popup>
                    <div>
                      <div><strong>Point</strong></div>
                      <div>{data.geom_point && Number.isFinite(Number(data.geom_point.lat)) ? Number(data.geom_point.lat).toFixed(6) : '—'}, {data.geom_point && Number.isFinite(Number(data.geom_point.lng)) ? Number(data.geom_point.lng).toFixed(6) : '—'}</div>
                      {data.station_id ? <div>Station: {data.station_name}</div> : null}
                    </div>
                  </Popup>
                </Marker>
              ) : null}

              <MapViewport bounds={mapBounds(data)} maxZoom={14} padding={[16, 16]} pad={0.02} />
            </AppMap>
          </div>

          <div className="alert-note" style={{ marginTop: 12 }}>
            Click on the map to set coordinates. Create or edit stations via the modal.
          </div>

          {/* Station Modal */}
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

    // Step 2: Sampling Details
    {
      key: STEP_LABELS[1].key,
      title: STEP_LABELS[1].title,
      canNext: (d) => !!d.sampled_at,
      render: ({ data, setData }) => (
        <div className="wizard-pane">
          <FormRow>
            <FG label="Date & Time *">
              <input
                type="datetime-local"
                value={data.sampled_at}
                onChange={(e) => setData({ ...data, sampled_at: e.target.value })}
              />
            </FG>
            <FG label="Method">
              <input
                value={data.method}
                onChange={(e) => setData({ ...data, method: e.target.value })}
              />
            </FG>
            <FG label="Sampler Name">
              <input
                value={data.sampler_name}
                onChange={(e) => setData({ ...data, sampler_name: e.target.value })}
              />
            </FG>
            <FG label="Weather">
              <input
                value={data.weather}
                onChange={(e) => setData({ ...data, weather: e.target.value })}
              />
            </FG>
          </FormRow>
        </div>
      ),
    },

    // Step 3: Parameters
    {
      key: STEP_LABELS[2].key,
      title: STEP_LABELS[2].title,
      canNext: (d) =>
        (d.results || []).length > 0 &&
        (d.results || []).every((r) => r.parameter_id && r.value !== ""),
      render: ({ data, setData }) => (
        <div className="wizard-pane">
          <div className="wizard-nav" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
            <button className="pill-btn primary" onClick={() => addRow(data, setData)}>
              <FiPlus /> Add Row
            </button>
          </div>

          <div className="table-wrapper">
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
                          value={r.value}
                          onChange={(e) => patchRow(data, setData, r.tempId, { value: e.target.value })}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                        <input
                          value={r.unit}
                          onChange={(e) => patchRow(data, setData, r.tempId, { unit: e.target.value })}
                          placeholder="auto"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                        <input
                          type="number"
                          value={r.depth_m}
                          onChange={(e) => patchRow(data, setData, r.tempId, { depth_m: e.target.value })}
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
            Multiple DO values at different depths? Add several DO rows with different Depth (m).
          </div>
        </div>
      ),
    },

    // Step 4: Standard & Notes (+ Status with role gating)
    {
      key: STEP_LABELS[3].key,
      title: STEP_LABELS[3].title,
      render: ({ data, setData }) => (
        <div className="wizard-pane">
          <FormRow>
            <FG label="Applied Standard (DAO)">
              <select
                value={data.applied_standard_id}
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
                <option value="">None</option>
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
              >
                <option value="draft">Draft</option>
                {canPublish && <option value="public">Published</option>}
              </select>
              {!canPublish && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                  Only org-admins can publish. Contributors can save as Draft.
                </div>
              )}
            </FG>

            <FG label="Notes" style={{ flexBasis: "100%" }}>
              <input
                value={data.notes}
                onChange={(e) => setData({ ...data, notes: e.target.value })}
              />
            </FG>
          </FormRow>

          <div className="alert-note" style={{ marginTop: 12 }}>
            Threshold selection is informational here; wire the evaluation on the backend using parameter thresholds.
          </div>
        </div>
      ),
    },

    // Step 5: Review (show derived period preview)
    {
      key: STEP_LABELS[4].key,
      title: STEP_LABELS[4].title,
      render: ({ data }) => {
        const d = data.sampled_at ? new Date(data.sampled_at) : null;
        const yr = d ? d.getFullYear() : null;
        const mo = d ? d.getMonth() + 1 : null;
        const qt = d ? Math.floor((mo - 1) / 3) + 1 : null;
        return (
          <div className="wizard-pane">
            <div className="dashboard-card" style={{ marginBottom: 12 }}>
              <div className="dashboard-card-title"><FiMapPin /> Context</div>
              <div className="dashboard-card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><strong>Organization:</strong> {organization?.name || data.organization_name || "—"}</div>
                <div><strong>Lake:</strong> {data.lake_name || "—"}</div>
                <div><strong>Lake Class:</strong> {data.lake_class_code || "—"}</div>
                <div><strong>Location Mode:</strong> {data.loc_mode === "coord" ? "Coordinates" : "Station"}</div>
                <div><strong>Point:</strong> {data.geom_point && Number.isFinite(Number(data.geom_point.lat)) ? `${Number(data.geom_point.lat).toFixed(6)}, ${Number(data.geom_point.lng).toFixed(6)}` : "—"}</div>
                <div><strong>Station:</strong> {data.station_id ? data.station_name : "—"}</div>
                <div><strong>Sampled At:</strong> {data.sampled_at || "—"}</div>
                <div><strong>Period:</strong> {d ? `${yr} · Q${qt} · M${String(mo).padStart(2,"0")}` : "—"}</div>
                <div><strong>Sampler:</strong> {data.sampler_name || "—"}</div>
                <div><strong>Method:</strong> {data.method || "—"}</div>
                <div><strong>Weather:</strong> {data.weather || "—"}</div>
                <div><strong>Status:</strong> {data.status || "draft"}</div>
              </div>
            </div>

            <div className="dashboard-card" style={{ marginBottom: 12 }}>
              <div className="dashboard-card-title"><FiThermometer /> Parameters</div>
              {!((data.results || []).length) ? (
                <div className="no-data">No parameters.</div>
              ) : (
                <div className="table-wrapper">
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
                            <td>{r.depth_m !== "" && r.depth_m !== null ? r.depth_m : "—"}</td>
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
                <div><strong>Standard:</strong> {data.applied_standard_code || "—"}</div>
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
