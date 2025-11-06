import React, { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import { api } from "../../lib/api";
import { alertSuccess, alertError, showLoading, closeLoading } from "../../lib/alerts";
import AppMap from "../AppMap";
import MapViewport from "../MapViewport";
import { CircleMarker, Popup } from "react-leaflet";
import { FiMapPin, FiThermometer, FiPlus, FiTrash2 } from "react-icons/fi";
// Using CircleMarker avoids external icon assets and reduces initial load.

const Pill = ({ children, tone = "muted" }) => (
  <span className={`tag ${tone === "success" ? "success" : tone === "danger" ? "danger" : "muted"}`}>
    {children}
  </span>
);

// Keep these in sync with WQTestWizard
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

function yqmFrom(record) {
  const d = record?.sampled_at ? new Date(record.sampled_at) : null;
  const y = Number(record?.year ?? (d ? d.getFullYear() : NaN));
  const m = Number(record?.month ?? (d ? d.getMonth() + 1 : NaN));
  const q = Number(record?.quarter ?? (Number.isFinite(m) ? Math.floor((m - 1) / 3) + 1 : NaN));
  const day = Number(record?.day ?? (d ? d.getDate() : NaN));
  return { year: y, quarter: q, month: m, day };
}

const pfLabel = (v) => {
  const s = (v ?? "").toString().trim().toLowerCase();
  return s === "pass" ? "Pass" : s === "fail" ? "Fail" : s === "not_applicable" ? "N/A" : "—";
};

export default function OrgWQTestModal({
  open,
  onClose,
  record,
  canPublish = false,
  onTogglePublish,
  editable = false,
  onSave,
  parameterCatalog = [],
  basePath = '/admin/sample-events', // injected by pages so modal stays agnostic
}) {
  const [sampleEvent, setSampleEvent] = useState(record || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const [stationOptions, setStationOptions] = useState([]);
  const [standards, setStandards] = useState([]);

  const formatDepth = (d) => {
    const n = Number(d);
    if (!Number.isFinite(n)) return d ?? '—';
    return n === 0 ? 'Surface' : d;
  };

  useEffect(() => {
    setSampleEvent(record || null);
  }, [record, open]);

  // When map is revealed, bump a version token so MapViewport/Map reflow runs once
  useEffect(() => {
    if (showMap) setMapVersion(Date.now());
  }, [showMap]);

  // When opened with a record id, fetch full event details (includes results + parameter info)
  useEffect(() => {
    let mounted = true;
    if (!open || !record || !record.id || !basePath) return;
    // If the caller already prefetched full details (including results), skip re-fetch
    if (record && Array.isArray(record.results)) {
      // Normalize prefetched results so we always have code/name/unit flattened
      const normalizedResults = record.results.map((r) => {
        const paramObj = r.parameter || null;
        const catalogParam = (!paramObj && Array.isArray(parameterCatalog) && r.parameter_id)
          ? parameterCatalog.find((p) => String(p.id) === String(r.parameter_id))
          : null;
        const source = paramObj || catalogParam || {};
        return {
          id: r.id,
          parameter_id: r.parameter_id ?? source.id ?? null,
          code: r.code ?? source.code ?? "",
          name: r.name ?? source.name ?? "",
          unit: r.unit ?? source.unit ?? "",
          value: r.value ?? null,
          depth_m: r.depth_m ?? 0,
          pass_fail: r.pass_fail ?? null,
          remarks: r.remarks ?? "",
        };
      });
      setSampleEvent({ ...record, results: normalizedResults });
      return () => { mounted = false; };
    }

    // Setup abort controller to cancel in-flight fetches when modal closes or deps change
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api(`${basePath}/${encodeURIComponent(record.id)}`, { signal });
        const data = res?.data || res || {};

        const normalizedResults = Array.isArray(data.results)
          ? data.results.map((r) => {
              const paramObj = r.parameter || null;
              // fallback to provided parameterCatalog if API didn't include parameter object
              const catalogParam = (!paramObj && Array.isArray(parameterCatalog) && r.parameter_id)
                ? parameterCatalog.find((p) => String(p.id) === String(r.parameter_id))
                : null;
              const source = paramObj || catalogParam || {};
              return {
                id: r.id,
                parameter_id: r.parameter_id ?? source.id ?? null,
                code: source.code ?? r.code ?? "",
                name: source.name ?? r.name ?? "",
                unit: r.unit ?? source.unit ?? "",
                value: r.value ?? null,
                depth_m: r.depth_m ?? 0,
                pass_fail: r.pass_fail ?? null,
                remarks: r.remarks ?? "",
              };
            })
          : [];

        if (!mounted) return;
        // Merge list-row record with full details; prefer detailed fields
        setSampleEvent({
          ...(record || {}),
          ...(data || {}),
          results: normalizedResults,
        });
      } catch (e) {
        if (!mounted) return;
        setError(e);
        const status = e?.response?.status || e?.status || null;
        const rawMsg = e?.response?.data?.message || e?.message || '';
        const isNotFound = status === 404 || /No query results for model/i.test(String(rawMsg));
        if (isNotFound) {
          await (await import('../../lib/alerts')).alertWarning('Not found', 'This test no longer exists. It may have been deleted.');
          onClose?.();
          return;
        }
        // Fallback: keep whatever we had from the list
        setSampleEvent(record || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      try { controller.abort(); } catch (_) {}
    };
  }, [open, record, basePath, parameterCatalog]);

  // Fetch station options for the lake (and org) when opened
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!open) return;
        const lakeId = sampleEvent?.lake_id || record?.lake_id;
        if (!lakeId) { setStationOptions([]); return; }
        const orgId = sampleEvent?.organization_id || record?.organization_id;
        const qs = `?lake_id=${encodeURIComponent(lakeId)}${orgId ? `&organization_id=${encodeURIComponent(orgId)}` : ''}`;
        const res = await api(`/admin/stations${qs}`);
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!mounted) return;
        const normalized = list.map((s) => ({
          ...s,
          lat: s.latitude ?? s.lat ?? null,
          lng: s.longitude ?? s.lng ?? null,
        }));
        setStationOptions(normalized);
      } catch (_) {
        if (mounted) setStationOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, [open, sampleEvent?.lake_id, record?.lake_id, sampleEvent?.organization_id, record?.organization_id]);

  // Fetch standards list for dropdown
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!open) return;
        const res = await api('/options/wq-standards');
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (mounted) setStandards(rows);
      } catch (_) {
        if (mounted) setStandards([]);
      }
    })();
    return () => { mounted = false; };
  }, [open]);

  // derive geographic values from multiple possible field names
  const geo = useMemo(() => {
    if (!sampleEvent) return { hasPoint: false, lat: NaN, lng: NaN, bounds: null };
    const lat = Number(sampleEvent.lat ?? sampleEvent.latitude ?? sampleEvent.latitude_dd ?? sampleEvent.latitude_decimal);
    const lng = Number(sampleEvent.lng ?? sampleEvent.longitude ?? sampleEvent.longitude_dd ?? sampleEvent.longitude_decimal);
    const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
    const bounds = hasPoint ? [[lat - 0.02, lng - 0.02], [lat + 0.02, lng + 0.02]] : null;
    return { hasPoint, lat, lng, bounds };
  }, [sampleEvent]);

  if (!open || !sampleEvent) return null;

  const { year, quarter, month, day } = yqmFrom(sampleEvent);
  // derive displayable lake name and nicely formatted sampled date
  const lakeName = sampleEvent?.lake?.name ?? sampleEvent?.lake_name ?? sampleEvent?.lake?.display_name ?? "—";
  const lakeClass = sampleEvent?.lake?.class_code ?? sampleEvent?.lake_class_code ?? sampleEvent?.lake?.class ?? null;
  const formattedDate = (() => {
    try {
      return new Date(sampleEvent.sampled_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    } catch (e) {
      return new Date(sampleEvent.sampled_at).toLocaleDateString();
    }
  })();
  // derive station display name (fall back to coords if no station name)
  const stationName = (() => {
    const n = sampleEvent?.station?.name ?? sampleEvent?.station_name ?? sampleEvent?.station?.display_name;
    if (n) return n;
    if (Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
      try { return `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`; } catch (e) { /* fallthrough */ }
    }
    return "—";
  })();

  // ---- parameter edit helpers ----
  const rows = Array.isArray(sampleEvent.results) ? sampleEvent.results : [];

  // Helper for date-only input: ensure value is YYYY-MM-DD
  const toLocalInput = (isoish) => {
    if (!isoish) return '';
    const s = String(isoish);
    return s.includes('T') ? s.split('T')[0] : s;
  };

  const updateRow = (idx, patch) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setSampleEvent({ ...sampleEvent, results: next });
  };

  const removeRow = (idx) => {
    const next = rows.filter((_, i) => i !== idx);
    setSampleEvent({ ...sampleEvent, results: next });
  };

  const addRow = () => {
    const firstParam = parameterCatalog?.[0] || {};
    setSampleEvent({
      ...sampleEvent,
      results: [
        ...rows,
        {
          parameter_id: firstParam.id ?? "",
          code: firstParam.code ?? "",
          name: firstParam.name ?? "",
          unit: firstParam.unit ?? "",
          value: "",
          depth_m: 0,
          remarks: "",
        },
      ],
    });
  };

  const save = () => {
    (async () => {
      try {
        // Show a blocking loading modal while saving
        // Note: don't await showLoading; it resolves only when closed.
        showLoading('Saving changes…', 'Almost there — this may take a few seconds.');
        // send updated sampling event to backend
        const payload = {
          lake_id: sampleEvent.lake_id,
          station_id: sampleEvent.station_id,
          sampled_at: sampleEvent.sampled_at,
          sampler_name: sampleEvent.sampler_name,
          method: sampleEvent.method,
          weather: sampleEvent.weather,
          notes: sampleEvent.notes,
          applied_standard_id: sampleEvent.applied_standard_id,
          status: sampleEvent.status,
          latitude: Number.isFinite(geo.lat) ? geo.lat : (sampleEvent.lat ?? sampleEvent.latitude ?? null),
          longitude: Number.isFinite(geo.lng) ? geo.lng : (sampleEvent.lng ?? sampleEvent.longitude ?? null),
          measurements: (sampleEvent.results || []).map((r) => ({
            parameter_id: r.parameter_id ?? null,
            value: r.value ?? null,
            unit: r.unit ?? null,
            depth_m: r.depth_m ?? 0,
            remarks: r.remarks ?? null,
            id: r.id ?? undefined,
          })),
        };

  const res = await api(`${basePath}/${sampleEvent.id}`, { method: 'PUT', body: payload });
    const updated = res.data || sampleEvent;
        onSave?.(updated);
        closeLoading();
        await alertSuccess('Saved', 'Sampling event updated successfully.');
        onClose?.();
      } catch (e) {
        const status = e?.response?.status || e?.status || null;
        const rawMsg = e?.response?.data?.message || e?.message || '';
        const isNotFound = status === 404 || /No query results for model/i.test(String(rawMsg));
        if (isNotFound) {
          await alertError('Not found', 'This test no longer exists. It may have been deleted in another session.');
          onClose?.();
        } else {
          let friendly = rawMsg || 'Please try again.';
          if (/cannot publish/i.test(rawMsg)) friendly = 'You do not have permission to publish tests.';
          else if (status === 403) friendly = 'You do not have permission to save these changes.';
          await alertError('Save not allowed', friendly);
        }
      } finally {
        // ensure we close loader in any case
        closeLoading();
      }
    })();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={980}
      // keep overall modal compact; inner body will scroll
      maxHeight="86vh"
  title={`${formattedDate} - ${lakeName}`}
      footer={
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {canPublish && (
              <button className="pill-btn" onClick={async () => {
                const will = sampleEvent.status === 'public' ? 'Unpublish' : 'Publish';
                const ok = await (await import('../../lib/alerts')).confirm({ title: `${will} this test?`, confirmButtonText: will });
                if (!ok) return;
                try {
                  await onTogglePublish?.();
                } catch (e) {
                  await (await import('../../lib/alerts')).alertWarning('Toggle failed', e?.message || 'Toggled locally.');
                }
              }}>
                {sampleEvent.status === "public" ? "Unpublish" : "Publish"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {editable && (
              <button className="pill-btn primary" onClick={save} aria-label="Save changes">
                Save
              </button>
            )}
            <button className="pill-btn ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      }
    >
      {/* SCROLLABLE BODY WRAPPER */}
      <div
        className="modal-scroll-body"
        style={{
          maxHeight: "72vh",
          overflowY: "auto",
          padding: 12,
        }}
      >
        {/* Context pills */}
        <div className="info-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <Pill tone={sampleEvent.status === "public" ? "success" : "muted"}>
            {sampleEvent.status === "public" ? "Published" : "Draft"}
          </Pill>
          {lakeName ? <Pill>{lakeName}</Pill> : null}
          {stationName ? <Pill>{stationName}</Pill> : null}
        </div>

        {/* Location card */}
        <div className="dashboard-card" style={{ marginBottom: 12 }}>
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiMapPin />
              <span>Location</span>
            </div>
          </div>
          <div className="dashboard-card-body">
            <div
              className="map-preview"
              style={{
                height: 300,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: 0,
              }}
            >
              {!showMap ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button className="pill-btn ghost" onClick={() => setShowMap(true)}>
                    <FiMapPin /> Show map
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%', position: 'relative', height: '100%' }}>
                  <AppMap
                    key={mapVersion || 'map'}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    disableDrag={true}
                    scrollWheelZoom={false}
                    zoomControl={false}
                    whenCreated={(map) => {
                      try {
                        if (map && map.dragging && map.dragging.disable) map.dragging.disable();
                        if (map && map.touchZoom && map.touchZoom.disable) map.touchZoom.disable();
                        if (map && map.doubleClickZoom && map.doubleClickZoom.disable) map.doubleClickZoom.disable();
                        if (map && map.scrollWheelZoom && map.scrollWheelZoom.disable) map.scrollWheelZoom.disable();
                        if (map && map.boxZoom && map.boxZoom.disable) map.boxZoom.disable();
                        if (map && map.keyboard && map.keyboard.disable) map.keyboard.disable();
                      } catch (err) { /* ignore */ }
                    }}
                  >
                    {geo.hasPoint && geo.bounds && <MapViewport bounds={geo.bounds} version={mapVersion} />}
                    {geo.hasPoint && (
                      <CircleMarker
                        center={[geo.lat, geo.lng]}
                        radius={8}
                        pathOptions={{ color: '#2563eb', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.7 }}
                      >
                        <Popup>
                          <div>
                            <div><strong>Point</strong></div>
                            <div>{geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}</div>
                            {stationName ? <div>Station: {stationName}</div> : null}
                          </div>
                        </Popup>
                      </CircleMarker>
                    )}
                  </AppMap>
                </div>
              )}
            </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {/* Sampled at */}
                <div>
                  <strong>Sampled At:</strong>{' '}
                  {editable ? (
                    <div className="form-group" style={{ marginTop: 6 }}>
                      <input
                        type="date"
                        value={toLocalInput(sampleEvent.sampled_at)}
                        onChange={(e) => setSampleEvent({ ...sampleEvent, sampled_at: e.target.value })}
                      />
                    </div>
                  ) : (
                    formattedDate
                  )}
                </div>

                {/* Sampler */}
                <div>
                  <strong>Sampler:</strong>{' '}
                  {editable ? (
                    <div className="form-group" style={{ marginTop: 6 }}>
                      <input
                        type="text"
                        value={sampleEvent.sampler_name || ''}
                        onChange={(e) => setSampleEvent({ ...sampleEvent, sampler_name: e.target.value })}
                      />
                    </div>
                  ) : (
                    sampleEvent.sampler_name || '—'
                  )}
                </div>

                {/* Method */}
                <div>
                  <strong>Method:</strong>{' '}
                  {editable ? (
                    <div className="form-group" style={{ marginTop: 6 }}>
                      <select
                        value={sampleEvent.method || ''}
                        onChange={(e) => setSampleEvent({ ...sampleEvent, method: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {Object.entries(METHOD_DISPLAY).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    (METHOD_DISPLAY[sampleEvent.method] || sampleEvent.method || '—')
                  )}
                </div>

                {/* Weather */}
                <div>
                  <strong>Weather:</strong>{' '}
                  {editable ? (
                    <div className="form-group" style={{ marginTop: 6 }}>
                      <select
                        value={sampleEvent.weather || ''}
                        onChange={(e) => setSampleEvent({ ...sampleEvent, weather: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {Object.entries(WEATHER_DISPLAY).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    (WEATHER_DISPLAY[sampleEvent.weather] || sampleEvent.weather || '—')
                  )}
                </div>

                {/* Standard */}
                <div>
                  <strong>Standard:</strong>{' '}
                  {editable ? (
                    <div className="form-group" style={{ marginTop: 6 }}>
                      <select
                        value={sampleEvent.applied_standard_id || ''}
                        onChange={(e) => setSampleEvent({ ...sampleEvent, applied_standard_id: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">Select…</option>
                        {standards.map((s) => {
                          const base = s.code || s.name || `#${s.id}`;
                          const withName = s.name && s.code ? `${s.code} — ${s.name}` : base;
                          const label = s.is_current ? `${withName} (current)` : withName;
                          return (
                            <option key={s.id} value={s.id}>{label}</option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    sampleEvent.applied_standard_code || sampleEvent.applied_standard_name || sampleEvent.applied_standard?.code || sampleEvent.applied_standard?.name || '—'
                  )}
                </div>

                {/* Station */}
                <div>
                  <strong>Station:</strong>{' '}
                  {editable ? (
                    <div className="form-group" style={{ marginTop: 6 }}>
                      <select
                        value={sampleEvent.station_id || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          const sel = stationOptions.find((s) => String(s.id) === String(val));
                          setSampleEvent({
                            ...sampleEvent,
                            station_id: val,
                            station_name: sel?.name || sampleEvent.station_name || undefined,
                            lat: sel?.lat ?? sampleEvent.lat ?? sampleEvent.latitude ?? undefined,
                            lng: sel?.lng ?? sampleEvent.lng ?? sampleEvent.longitude ?? undefined,
                          });
                        }}
                      >
                        <option value="">Select a station…</option>
                        {stationOptions.map((s) => (
                          <option key={s.id} value={s.id}>{s.name || s.code || `Station #${s.id}`}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    stationName
                  )}
                </div>

                {/* Lake Class and Period intentionally omitted from sampling metadata */}

                {/* Notes */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Notes:</strong>{' '}
                  {editable ? (
                    <div className="form-group" style={{ marginTop: 6 }}>
                      <textarea
                        rows={3}
                        value={sampleEvent.notes || ''}
                        onChange={(e) => setSampleEvent({ ...sampleEvent, notes: e.target.value })}
                      />
                    </div>
                  ) : (
                    sampleEvent.notes || '—'
                  )}
                </div>
              </div>
          </div>
        </div>

        {/* Parameters card */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FiThermometer />
              <span>Parameters</span>
            </div>
            {editable && (
              <div className="dashboard-card-actions">
                <button className="pill-btn ghost" onClick={addRow}>
                  <FiPlus /> Add Row
                </button>
              </div>
            )}
          </div>
          <div className="dashboard-card-body">
            <div className="table-wrapper">
              <table className="lv-table">
                <thead>
                  <tr>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Parameter</span></div></th>
                    <th className="lv-th" style={{ width: 120 }}><div className="lv-th-inner"><span className="lv-th-label">Value</span></div></th>
                    <th className="lv-th" style={{ width: 110 }}><div className="lv-th-inner"><span className="lv-th-label">Unit</span></div></th>
                    <th className="lv-th" style={{ width: 120 }}><div className="lv-th-inner"><span className="lv-th-label">Depth (m)</span></div></th>
                    <th className="lv-th" style={{ width: 120 }}><div className="lv-th-inner"><span className="lv-th-label">Pass/Fail</span></div></th>
                    <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Remarks</span></div></th>
                    {editable && <th className="lv-th" style={{ width: 60 }} />}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td className="lv-empty" colSpan={editable ? 7 : 6}>Loading parameters…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td className="lv-empty" colSpan={editable ? 7 : 6}>Failed to load parameters.</td></tr>
                  )}
                  {!loading && !error && rows.map((r, i) => (
                    <tr key={`${sampleEvent.id}-${i}`}>
                      <td>
                        {editable ? (
                          <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                            {parameterCatalog?.length ? (
                              <select
                                value={r.parameter_id ?? ""}
                                onChange={(e) => {
                                  const sel = parameterCatalog.find(p => String(p.id) === e.target.value);
                                  updateRow(i, {
                                    parameter_id: sel?.id ?? "",
                                    code: sel?.code ?? "",
                                    name: sel?.name ?? "",
                                    unit: sel?.unit ?? r.unit ?? "",
                                  });
                                }}
                              >
                                <option value="">Select…</option>
                                {parameterCatalog.map((p) => (
                                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={r.code ? `${r.code} — ${r.name || ""}` : r.name || ""}
                                onChange={(e) => updateRow(i, { name: e.target.value })}
                              />
                            )}
                          </div>
                        ) : (
                          <>{r.code ? `${r.code} — ${r.name || ""}` : r.name || "—"}</>
                        )}
                      </td>
                      <td>
                        {editable ? (
                          <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                            <input
                              type="number"
                              value={r.value ?? ""}
                              onChange={(e) => updateRow(i, { value: e.target.value })}
                            />
                          </div>
                        ) : (
                          <>{r.value ?? "—"}</>
                        )}
                      </td>
                      <td>
                        <>{r.unit || "—"}</>
                      </td>
                      <td>
                        {editable ? (
                          <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                            <input
                              type="number"
                              value={r.depth_m ?? 0}
                              onChange={(e) => updateRow(i, { depth_m: e.target.value })}
                            />
                          </div>
                        ) : (
                          <>{formatDepth(r.depth_m ?? 0)}</>
                        )}
                      </td>
                      <td>{pfLabel(r.pass_fail)}</td>
                      <td>
                        {editable ? (
                          <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                            <input
                              value={r.remarks ?? ""}
                              onChange={(e) => updateRow(i, { remarks: e.target.value })}
                            />
                          </div>
                        ) : (
                          <>{r.remarks || "—"}</>
                        )}
                      </td>
                      {editable && (
                        <td>
                          <button className="pill-btn ghost danger" title="Remove row" onClick={() => removeRow(i)}>
                            <FiTrash2 />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!loading && !error && !rows.length && (
                    <tr><td className="lv-empty" colSpan={editable ? 7 : 6}>No parameters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {/* /modal-scroll-body */}
    </Modal>
  );
}
