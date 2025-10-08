import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import Modal from "../Modal";

export default function StationModal({
  open,
  onClose,
  lakeId,
  editing = null,
  onCreate,
  onUpdate,
  canManage = true,
}) {
  const empty = { id: null, name: "", lat: "", lng: "", description: "" };
  const [form, setForm] = useState(editing ? { ...editing } : empty);
  const [coordMode, setCoordMode] = useState('manual');

  useEffect(() => {
    setForm(editing ? { ...editing } : empty);
  }, [editing, open]);

  const valid = Boolean(
    form.name?.trim() && form.lat !== "" && form.lng !== "" &&
      Number.isFinite(Number(form.lat)) && Number.isFinite(Number(form.lng))
  );

  const save = () => {
    if (!canManage) return onClose?.();
    const payload = { ...form, lake_id: lakeId ? Number(lakeId) : null, lat: Number(form.lat), lng: Number(form.lng) };
    if (editing) onUpdate?.(payload);
    else onCreate?.(payload);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Station" : "New Station"}
      width={860}
      style={{ maxHeight: '85vh' }}
      footer={
        <div className="lv-modal-actions" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <button className="pill-btn ghost" onClick={onClose}><FiX /> Close</button>
          <button className="pill-btn primary" onClick={save} disabled={!valid}>{editing ? "Save" : "Create"}</button>
        </div>
      }
    >
      <div className="dashboard-content" style={{ padding: 12 }}>
        <div className="org-form" style={{ gap: 12 }}>
          <div className="form-group" style={{ minWidth: 240, flex: '1 1 320px' }}>
            <label>Station Name *</label>
            <input value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} />
          </div>
          <div className="form-group" style={{ flex: '1 1 240px' }}>
            <label>Description</label>
            <input value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} />
          </div>

          <div style={{ flexBasis: '100%', marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14 }}>Coordinates</strong>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="radio" name="coord-mode-station" value="manual" checked={coordMode === 'manual'} onChange={() => setCoordMode('manual')} /> Manual
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="radio" name="coord-mode-station" value="map" checked={coordMode === 'map'} onChange={() => setCoordMode('map')} /> Pin Drop
              </label>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Required</span>
            </div>
          </div>

          {coordMode === 'manual' ? (
            <>
              <div className="form-group" style={{ flex: '1 1 160px' }}>
                <label>Latitude *</label>
                <input type="number" value={form.lat} onChange={(e) => setForm((x) => ({ ...x, lat: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: '1 1 160px' }}>
                <label>Longitude *</label>
                <input type="number" value={form.lng} onChange={(e) => setForm((x) => ({ ...x, lng: e.target.value }))} />
              </div>
            </>
          ) : (
            <div style={{ width: '100%', marginTop: 8 }}>
              <MiniPickMap value={form} onChange={(vals) => setForm((f) => ({ ...f, ...vals }))} />
            </div>
          )}
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
          if (!markerRef.current) markerRef.current = L.marker([lat, lng]).addTo(map);
          else markerRef.current.setLatLng([lat, lng]);
          onChange?.({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
        });

        if (value.lat && value.lng) {
          markerRef.current = L.marker([value.lat, value.lng]).addTo(map);
          map.setView([value.lat, value.lng], 12);
        }
      })();

      return () => { mounted = false; try { if (mapRef.current) mapRef.current.remove(); } catch {} };
    }, []); // eslint-disable-line

    useEffect(() => {
      if (!mapRef.current) return;
      const lat = value.lat; const lng = value.lng;
      if (lat && lng) {
        if (!markerRef.current) markerRef.current = (async () => { const L = await import('leaflet'); return L.marker([lat, lng]).addTo(mapRef.current); })();
        else markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 12);
      }
    }, [value.lat, value.lng]);

    return <div ref={ref} style={{ height: 320, border: '1px solid #d1d5db', borderRadius: 6 }} />;
  }
