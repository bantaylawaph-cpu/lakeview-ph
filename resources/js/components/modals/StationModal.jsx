import React, { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import Modal from "../Modal";

export default function StationModal({
  open,
  onClose,
  lakeId,
  stations = [],
  editing = null,
  onCreate,
  onUpdate,
  onDelete,
  canManage = true,
}) {
  const empty = { id: null, name: "", lat: "", lng: "", description: "" };
  const [form, setForm] = useState(editing ? { ...editing } : empty);

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
      <div className="dashboard-content" style={{ padding: 16 }}>
        <div className="org-form">
          <div className="form-group" style={{ minWidth: 240 }}>
            <label>Station Name *</label>
            <input value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Latitude *</label>
            <input type="number" value={form.lat} onChange={(e) => setForm((x) => ({ ...x, lat: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Longitude *</label>
            <input type="number" value={form.lng} onChange={(e) => setForm((x) => ({ ...x, lng: e.target.value }))} />
          </div>
        </div>

        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <table className="lv-table">
            <thead>
              <tr>
                <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Name</span></div></th>
                <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Lat</span></div></th>
                <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Lng</span></div></th>
                <th className="lv-th"><div className="lv-th-inner"><span className="lv-th-label">Description</span></div></th>
                <th className="lv-th" style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{Number.isFinite(Number(s.lat)) ? Number(s.lat).toFixed(6) : '—'}</td>
                  <td>{Number.isFinite(Number(s.lng)) ? Number(s.lng).toFixed(6) : '—'}</td>
                  <td>{s.description || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="pill-btn ghost" onClick={() => canManage && setForm({ ...s })} title="Edit" disabled={!canManage}><FiEdit2 /></button>
                      <button className="pill-btn ghost danger" onClick={() => canManage && onDelete?.(s.id)} title="Delete" disabled={!canManage}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {stations.length === 0 && (
                <tr><td colSpan={5} style={{ color: "#6b7280" }}>No stations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
