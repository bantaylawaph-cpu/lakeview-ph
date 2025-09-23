import React, { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import { api } from "../../lib/api";
import { alertSuccess, alertError } from "../../lib/alerts";
import AppMap from "../AppMap";
import MapViewport from "../MapViewport";
import { Marker, Popup } from "react-leaflet";
import { FiMapPin, FiThermometer, FiPlus, FiTrash2 } from "react-icons/fi";
import L from "leaflet";

const DEFAULT_ICON = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const Pill = ({ children, tone = "muted" }) => (
  <span className={`tag ${tone === "success" ? "success" : tone === "danger" ? "danger" : "muted"}`}>
    {children}
  </span>
);

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
  return s === "pass" ? "Pass" : s === "fail" ? "Fail" : "—";
};

/**
 * OrgWQTestModal
 *
 * Props:
 * - open, onClose
 * - record: sampling event object
 * - canPublish: boolean
 * - onTogglePublish: () => void
 * - editable: boolean  // when true, parameters are editable
 * - onSave: (updatedRecord) => void
 * - parameterCatalog?: [{id, code, name, unit}] (optional; for add-row select)
 */
export default function OrgWQTestModal({
  open,
  onClose,
  record,
  canPublish = false,
  onTogglePublish,
  editable = false,
  onSave,
  parameterCatalog = [],
}) {
  const [draft, setDraft] = useState(record || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDraft(record || null);
  }, [record, open]);

  // When opened with a record id, fetch full event details (includes results + parameter info)
  useEffect(() => {
    let mounted = true;
    if (!open || !record || !record.id) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api(`/admin/sample-events/${encodeURIComponent(record.id)}`);
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
                depth_m: r.depth_m ?? null,
                pass_fail: r.pass_fail ?? null,
                remarks: r.remarks ?? "",
              };
            })
          : [];

        if (!mounted) return;
        // Merge list-row record with full details; prefer detailed fields
        setDraft({
          ...(record || {}),
          ...(data || {}),
          results: normalizedResults,
        });
      } catch (e) {
        if (!mounted) return;
        setError(e);
        // Fallback: keep whatever we had from the list
        setDraft(record || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, record && record.id]);

  // derive geographic values from multiple possible field names
  const geo = useMemo(() => {
    if (!draft) return { hasPoint: false, lat: NaN, lng: NaN, bounds: null };
    const lat = Number(draft.lat ?? draft.latitude ?? draft.latitude_dd ?? draft.latitude_decimal);
    const lng = Number(draft.lng ?? draft.longitude ?? draft.longitude_dd ?? draft.longitude_decimal);
    const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
    const bounds = hasPoint ? [[lat - 0.02, lng - 0.02], [lat + 0.02, lng + 0.02]] : null;
    return { hasPoint, lat, lng, bounds };
  }, [draft]);

  if (!open || !draft) return null;

  const { year, quarter, month, day } = yqmFrom(draft);
  // derive displayable lake name and nicely formatted sampled date
  const lakeName = draft?.lake?.name ?? draft?.lake_name ?? draft?.lake?.display_name ?? "—";
  const lakeClass = draft?.lake?.class_code ?? draft?.lake_class_code ?? draft?.lake?.class ?? null;
  const formattedDate = (() => {
    try {
      return new Date(draft.sampled_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    } catch (e) {
      return new Date(draft.sampled_at).toLocaleDateString();
    }
  })();
  // derive station display name (fall back to coords if no station name)
  const stationName = (() => {
    const n = draft?.station?.name ?? draft?.station_name ?? draft?.station?.display_name;
    if (n) return n;
    if (Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
      try { return `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`; } catch (e) { /* fallthrough */ }
    }
    return "—";
  })();

  // ---- parameter edit helpers ----
  const rows = Array.isArray(draft.results) ? draft.results : [];

  const updateRow = (idx, patch) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setDraft({ ...draft, results: next });
  };

  const removeRow = (idx) => {
    const next = rows.filter((_, i) => i !== idx);
    setDraft({ ...draft, results: next });
  };

  const addRow = () => {
    const firstParam = parameterCatalog?.[0] || {};
    setDraft({
      ...draft,
      results: [
        ...rows,
        {
          parameter_id: firstParam.id ?? "",
          code: firstParam.code ?? "",
          name: firstParam.name ?? "",
          unit: firstParam.unit ?? "",
          value: "",
          depth_m: "",
          remarks: "",
        },
      ],
    });
  };

  const save = () => {
    (async () => {
      try {
        // send updated sampling event to backend
        const payload = {
          lake_id: draft.lake_id,
          station_id: draft.station_id,
          sampled_at: draft.sampled_at,
          sampler_name: draft.sampler_name,
          method: draft.method,
          weather: draft.weather,
          notes: draft.notes,
          applied_standard_id: draft.applied_standard_id,
          status: draft.status,
          latitude: Number.isFinite(geo.lat) ? geo.lat : (draft.lat ?? draft.latitude ?? null),
          longitude: Number.isFinite(geo.lng) ? geo.lng : (draft.lng ?? draft.longitude ?? null),
          measurements: (draft.results || []).map((r) => ({
            parameter_id: r.parameter_id ?? null,
            value: r.value ?? null,
            unit: r.unit ?? null,
            depth_m: r.depth_m ?? null,
            remarks: r.remarks ?? null,
            id: r.id ?? undefined,
          })),
        };

        const res = await api(`/admin/sample-events/${draft.id}`, { method: 'PUT', body: payload });
        const updated = res.data || draft;
        onSave?.(updated);
        await alertSuccess('Saved', 'Sampling event updated successfully.');
        onClose?.();
      } catch (e) {
        await alertError('Save failed', e?.message || 'Please try again.');
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
                const will = draft.status === 'public' ? 'Unpublish' : 'Publish';
                const ok = await (await import('../../lib/alerts')).confirm({ title: `${will} this test?`, confirmButtonText: will });
                if (!ok) return;
                try {
                  await onTogglePublish?.();
                } catch (e) {
                  await (await import('../../lib/alerts')).alertWarning('Toggle failed', e?.message || 'Toggled locally.');
                }
              }}>
                {draft.status === "public" ? "Unpublish" : "Publish"}
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
          <Pill tone={draft.status === "public" ? "success" : "muted"}>
            {draft.status === "public" ? "Published" : "Draft"}
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
            <div className="map-preview" style={{ height: 300, marginBottom: 12 }}>
              <AppMap style={{ height: "100%" }}>
                {geo.hasPoint && geo.bounds && <MapViewport bounds={geo.bounds} />}
                {geo.hasPoint && (
                  <Marker position={[geo.lat, geo.lng]} icon={DEFAULT_ICON}>
                    <Popup>
                      <div>
                        <div><strong>Point</strong></div>
                        <div>{geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}</div>
                        {stationName ? <div>Station: {stationName}</div> : null}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </AppMap>
            </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><strong>Sampled At:</strong> {new Date(draft.sampled_at).toLocaleString()}</div>
              <div><strong>Sampler:</strong> {draft.sampler_name || "—"}</div>
              <div><strong>Method:</strong> {draft.method || "—"}</div>
              <div><strong>Weather:</strong> {draft.weather || "—"}</div>
              <div><strong>Standard:</strong> {draft.applied_standard_code || draft.applied_standard_name || draft.applied_standard?.code || draft.applied_standard?.name || "—"}</div>
              <div><strong>Lake Class:</strong> {lakeClass || "—"}</div>
              <div><strong>Period:</strong> {Number.isFinite(year) ? `${year} · Q${quarter} · M${month} · D${day}` : "—"}</div>
              <div style={{ gridColumn: "1 / -1" }}><strong>Notes:</strong> {draft.notes || "—"}</div>
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
                    <tr key={`${draft.id}-${i}`}>
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
                        {editable ? (
                          <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                            <input
                              value={r.unit ?? ""}
                              onChange={(e) => updateRow(i, { unit: e.target.value })}
                            />
                          </div>
                        ) : (
                          <>{r.unit || "—"}</>
                        )}
                      </td>
                      <td>
                        {editable ? (
                          <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                            <input
                              type="number"
                              value={r.depth_m ?? ""}
                              onChange={(e) => updateRow(i, { depth_m: e.target.value })}
                            />
                          </div>
                        ) : (
                          <>{r.depth_m ?? "—"}</>
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
