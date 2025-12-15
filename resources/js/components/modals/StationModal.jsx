import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import Modal from "../Modal";
import { useWindowSize } from '../../hooks/useWindowSize';
import CoordinatePicker from '../CoordinatePicker';
import { alertSuccess } from '../../lib/alerts';

export default function StationModal({
  open,
  onClose,
  lakeId,
  editing = null,
  onCreate,
  onUpdate,
  canManage = true,
  overlayZIndex = 10000,
}) {
  const empty = { id: null, name: "", lat: "", lng: "", description: "" };
  const [form, setForm] = useState(editing ? { ...editing } : empty);
  const { width: windowW } = useWindowSize();

  // Breakpoint-based modal width and map height
  const modalWidth = (() => {
    if (windowW <= 480) return '94vw';      // Mobile S
    if (windowW <= 640) return '92vw';      // Mobile M/L
    if (windowW <= 768) return 560;         // Tablet portrait
    if (windowW <= 1024) return 640;        // Tablet landscape / small laptop
    if (windowW <= 1280) return 720;        // Laptop
    if (windowW <= 1536) return 760;        // Laptop L
    if (windowW <= 1920) return 800;        // 1080p
    return 860;                             // 4K & larger
  })();
  const pickerHeight = (() => {
    if (windowW <= 480) return 220;
    if (windowW <= 640) return 250;
    if (windowW <= 768) return 280;
    if (windowW <= 1024) return 300;
    if (windowW <= 1280) return 320;
    if (windowW <= 1536) return 340;
    if (windowW <= 1920) return 360;
    return 380;
  })();
  const isMobile = windowW <= 640;

  useEffect(() => {
    setForm(editing ? { ...editing } : empty);
  }, [editing, open]);

  const valid = Boolean(
    form.name?.trim() && form.lat !== "" && form.lng !== "" &&
      Number.isFinite(Number(form.lat)) && Number.isFinite(Number(form.lng))
  );

  const save = async () => {
    if (!canManage) return onClose?.();
    const payload = { ...form, lake_id: lakeId ? Number(lakeId) : null, lat: Number(form.lat), lng: Number(form.lng) };
    try {
      if (editing) {
        await onUpdate?.(payload);
        onClose?.();
        await alertSuccess('Station updated');
      } else {
        await onCreate?.(payload);
        onClose?.();
        await alertSuccess('Station created');
      }
    } catch (e) {
      // swallow - parent handlers should surface errors; keep behavior simple here
      onClose?.();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Station" : "New Station"}
      width={modalWidth}
      style={{ maxHeight: '85vh' }}
      bodyClassName="modern-scrollbar"
      overlayZIndex={overlayZIndex}
      footer={
        <div className="lv-modal-actions" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <button className="pill-btn ghost" onClick={onClose}><FiX /> Close</button>
          <button className="pill-btn primary" onClick={save} disabled={!valid}>{editing ? "Save" : "Create"}</button>
        </div>
      }
    >
      <div className="dashboard-content" style={{ padding: 12 }}>
        <div
          className="org-form"
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            alignItems: 'start'
          }}
        >
          <div className="form-group" style={{ minWidth: 220 }}>
            <label>Station Name *</label>
            <input value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} />
          </div>
          <div className="form-group" style={{ minWidth: 220 }}>
            <label>Description</label>
            <input value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1/-1', marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14 }}>Coordinates</strong>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Required</span>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gridColumn: '1/-1'
            }}
          >
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Latitude *</label>
              <input type="number" value={form.lat} onChange={(e) => setForm((x) => ({ ...x, lat: e.target.value }))} />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Longitude *</label>
              <input type="number" value={form.lng} onChange={(e) => setForm((x) => ({ ...x, lng: e.target.value }))} />
            </div>
          </div>
          <div style={{ gridColumn: '1/-1', marginTop: 4 }}>
            <CoordinatePicker
              form={{ lat: form.lat, lon: form.lng }}
              setForm={(updater) => {
                if (typeof updater === 'function') {
                  const res = updater({ lat: form.lat, lon: form.lng });
                  setForm((f) => ({ ...f, lat: res?.lat ?? f.lat, lng: res?.lon ?? f.lng }));
                } else if (updater && typeof updater === 'object') {
                  setForm((f) => ({ ...f, lat: updater.lat ?? f.lat, lng: updater.lon ?? f.lng }));
                }
              }}
              mapHeight={pickerHeight}
              showLakeLayer={true}
              lakeId={lakeId}
            />
          </div>
        </div>

      </div>
    </Modal>
  );
}

  function MiniPickMap({ value = {}, onChange }) {
    const ref = React.useRef(null);
    const mapRef = React.useRef(null);
  const markerRef = React.useRef(null);

    useEffect(() => {
      let mounted = true;
      (async () => {
        const L = await import('leaflet');
        if (!mounted || !ref.current) return;
        if (ref.current._leaflet_id) return;
        const map = L.map(ref.current, { center: [value.lat || 12.8797, value.lng || 121.7740], zoom: 6 });
        mapRef.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);

        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          if (!markerRef.current) markerRef.current = L.circleMarker([lat, lng], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(map);
          else markerRef.current.setLatLng([lat, lng]);
          onChange?.({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
        });

        if (value.lat && value.lng) {
          markerRef.current = L.circleMarker([value.lat, value.lng], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(map);
          // Keep current zoom level when centering the map. Using panTo will recenter without changing zoom
          map.panTo([value.lat, value.lng]);
        }
      })();

      return () => { mounted = false; try { if (mapRef.current) mapRef.current.remove(); } catch {} };
    }, []); // eslint-disable-line

    useEffect(() => {
      if (!mapRef.current) return;
      const lat = value.lat; const lng = value.lng;
      if (lat && lng) {
        (async () => {
          const L = await import('leaflet');
          if (!markerRef.current) markerRef.current = L.circleMarker([lat, lng], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(mapRef.current);
          else markerRef.current.setLatLng([lat, lng]);
          // Don't force a zoom change when updating the marker — just pan to the new center
          mapRef.current.panTo([lat, lng]);
        })();
      }
    }, [value.lat, value.lng]);

    return <div ref={ref} style={{ height: 320, border: '1px solid #d1d5db', borderRadius: 6 }} />;
  }
