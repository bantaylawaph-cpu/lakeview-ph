import React, { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import { apiPublic } from "../../lib/api";
import { alertError } from "../../lib/alerts";
import AppMap from "../AppMap";
import MapViewport from "../MapViewport";
import { Marker, Popup } from "react-leaflet";
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

const pfLabel = (v) => {
  const s = (v ?? "").toString().trim().toLowerCase();
  if (s === "pass") return "PASS";
  if (s === "fail") return "FAIL";
  if (s === "not_applicable") return "N/A";
  return "—";
};

export default function PublicWQTestModal({ open, onClose, record, basePath = "/public/sample-events" }) {
  const [sampleEvent, setSampleEvent] = useState(record || null);
  const [loading, setLoading] = useState(false);

  const modalStyle = {
    background: "rgba(30, 60, 120, 0.65)",
    color: "#fff",
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
  };

  useEffect(() => { setSampleEvent(record || null); }, [record, open]);

  // Load full event details when needed
  useEffect(() => {
    let mounted = true;
    if (!open) return;
    const id = record?.id;
    const hasResults = Array.isArray(record?.results) && record.results.length > 0;
    if (!id || hasResults) return;
    (async () => {
      try {
        setLoading(true);
        const res = await apiPublic(`${basePath}/${encodeURIComponent(id)}`);
        const data = res?.data || res || {};
        if (!mounted) return;
        const normalizedResults = Array.isArray(data.results) ? data.results.map((r) => ({
          id: r.id,
          parameter_id: r.parameter_id ?? r.parameter?.id ?? null,
          code: r.parameter?.code ?? r.code ?? "",
          name: r.parameter?.name ?? r.name ?? "",
          unit: r.unit ?? r.parameter?.unit ?? "",
          value: r.value ?? null,
          depth_m: r.depth_m ?? null,
          pass_fail: r.pass_fail ?? null,
          remarks: r.remarks ?? "",
          threshold: r.threshold || null,
        })) : [];
        setSampleEvent({ ...(record || {}), ...(data || {}), results: normalizedResults });
      } catch (e) {
        await alertError('Failed', e?.message || 'Could not load test details');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [open, record?.id]);

  const geo = useMemo(() => {
    const src = sampleEvent || {};
    const lat = Number(src.latitude ?? src.lat ?? src.station?.latitude ?? src.station?.lat);
    const lng = Number(src.longitude ?? src.lon ?? src.station?.longitude ?? src.station?.lon);
    const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
    const bounds = hasPoint ? [[lat - 0.02, lng - 0.02], [lat + 0.02, lng + 0.02]] : null;
    return { hasPoint, lat, lng, bounds };
  }, [sampleEvent]);

  if (!open || !sampleEvent) return null;

  const headerDate = (() => { try { return new Date(sampleEvent.sampled_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return sampleEvent.sampled_at || '—'; } })();
  const sampledAt = (() => { try { return new Date(sampleEvent.sampled_at).toLocaleString(); } catch { return sampleEvent.sampled_at || '—'; } })();
  const lakeName = sampleEvent?.lake?.name ?? sampleEvent?.lake_name ?? '—';
  const stationName = sampleEvent?.station?.name ?? sampleEvent?.station_name ?? ((Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) ? `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}` : '—');
  const orgName = sampleEvent?.organization?.name ?? sampleEvent?.organization_name ?? '—';

  // normalize rows from possible shapes: results, measurements, measurement
  const normalizeRow = (r) => ({
    id: r?.id,
    parameter_id: r?.parameter_id ?? r?.parameter?.id ?? null,
    code: r?.parameter?.code ?? r?.code ?? r?.parameter_code ?? '',
    name: r?.parameter?.name ?? r?.name ?? r?.parameter_name ?? '',
    unit: r?.unit ?? r?.parameter?.unit ?? '',
    value: r?.value ?? null,
    depth_m: r?.depth_m ?? 0,
    pass_fail: r?.pass_fail ?? null,
    remarks: r?.remarks ?? '',
    threshold: r?.threshold ?? null,
  });
  const rawRows = Array.isArray(sampleEvent.results)
    ? sampleEvent.results
    : Array.isArray(sampleEvent.measurements)
      ? sampleEvent.measurements
      : Array.isArray(sampleEvent.measurement)
        ? sampleEvent.measurement
        : [];
  const rows = Array.isArray(rawRows) ? rawRows.map(normalizeRow) : [];

  const formatDepth = (d) => {
    const n = Number(d);
    if (!Number.isFinite(n)) return d ?? '—';
    return n === 0 ? 'Surface' : d;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={1100}
      ariaLabel="Test details"
      cardClassName="liquid-glass"
      bodyClassName=""
      style={modalStyle}
      animationDuration={160}
      overlayZIndex={11000}
      footerStyle={{
        background: 'transparent',
        borderTop: '1px solid rgba(255,255,255,0.18)',
        color: '#fff',
      }}
      title={
        <div style={{ padding: 4, color: '#fff' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{headerDate}</div>
          <div style={{ opacity: 0.95, fontSize: 12, color: '#fff' }}>{stationName}</div>
          <div style={{ opacity: 0.85, fontSize: 12, color: '#fff' }}>{orgName}{lakeName && lakeName !== '—' ? ` • ${lakeName}` : ''}</div>
        </div>
      }
    >
            <div style={{ padding: 8, color: '#fff' }}>
        {/* Location card */}
        <div className="insight-card liquid-glass" style={{ marginBottom: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
          <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Location</h4>
          </div>
          <div style={{ padding: 8 }}>
            <div className="map-preview" style={{ height: 180, marginBottom: 6, borderRadius: 8, overflow: 'hidden' }}>
              <AppMap style={{ height: '100%' }}>
                {geo.hasPoint && geo.bounds && <MapViewport bounds={geo.bounds} />}
                {geo.hasPoint && (
                  <Marker position={[geo.lat, geo.lng]} icon={DEFAULT_ICON}>
                    <Popup>
                      <div>
                        <div><strong>Point</strong></div>
                        <div>{Number(geo.lat).toFixed(6)}, {Number(geo.lng).toFixed(6)}</div>
                        {stationName && stationName !== '—' ? <div>Station: {stationName}</div> : null}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </AppMap>
            </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, color: '#fff' }}>
              <div><strong>Sampled At:</strong> {sampledAt}</div>
              <div><strong>Organization:</strong> {orgName}</div>
              <div><strong>Lake:</strong> {lakeName}</div>
              <div><strong>Station:</strong> {stationName}</div>
              <div><strong>Method:</strong> {sampleEvent?.method ?? sampleEvent?.sampling_method ?? '—'}</div>
              <div><strong>Weather:</strong> {sampleEvent?.weather ?? '—'}</div>
              <div><strong>Standard:</strong> {sampleEvent?.applied_standard_code ?? sampleEvent?.applied_standard_name ?? sampleEvent?.applied_standard?.code ?? sampleEvent?.applied_standard?.name ?? '—'}</div>
            </div>
          </div>
        </div>

        {/* Parameters card */}
        <div className="insight-card liquid-glass" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
          <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Parameters</h4>
          </div>
          <div style={{ padding: 8 }}>
            <div className="table-wrapper" style={{ overflowX: 'hidden' }}>
              <table className="lv-table" style={{ tableLayout: 'fixed', width: '100%', background: 'transparent', color: '#fff' }}>
                <thead>
                  <tr>
                    <th className="lv-th" style={{ background: 'transparent', color: '#fff' }}><div className="lv-th-inner"><span className="lv-th-label">Parameter</span></div></th>
                    <th className="lv-th" style={{ width: 100, background: 'transparent', color: '#fff' }}><div className="lv-th-inner"><span className="lv-th-label">Value</span></div></th>
                    <th className="lv-th" style={{ width: 90, background: 'transparent', color: '#fff' }}><div className="lv-th-inner"><span className="lv-th-label">Unit</span></div></th>
                    <th className="lv-th" style={{ width: 100, background: 'transparent', color: '#fff' }}><div className="lv-th-inner"><span className="lv-th-label">Depth (m)</span></div></th>
                    <th className="lv-th" style={{ width: 90, background: 'transparent', color: '#fff' }}><div className="lv-th-inner"><span className="lv-th-label">Pass/Fail</span></div></th>
                    <th className="lv-th" style={{ background: 'transparent', color: '#fff' }}><div className="lv-th-inner"><span className="lv-th-label">Remarks</span></div></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="lv-empty" colSpan={6}>Loading parameters…</td></tr>
                  ) : (
                    rows.length ? rows.map((r, i) => (
                      <tr key={`${sampleEvent.id}-${i}`} style={{ background: 'transparent', color: '#fff' }}>
                        <td style={{ background: 'transparent', color: '#fff' }}>{r.code ? `${r.code} — ${r.name || ''}` : (r.name || '—')}</td>
                        <td style={{ background: 'transparent', color: '#fff' }}>{r.value ?? '—'}</td>
                        <td style={{ background: 'transparent', color: '#fff' }}>{r.unit || '—'}</td>
                        <td style={{ background: 'transparent', color: '#fff' }}>{formatDepth(r.depth_m ?? 0)}</td>
                        <td style={{ background: 'transparent', color: '#fff' }}>{pfLabel(r.pass_fail)}</td>
                        <td style={{ background: 'transparent', color: '#fff' }}>{r.remarks || '—'}</td>
                      </tr>
                    )) : (
                      <tr><td className="lv-empty" colSpan={6}>No parameters.</td></tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
      </div>
    </Modal>
  );
}
