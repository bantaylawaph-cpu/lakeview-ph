import React, { useEffect, useState } from "react";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import Modal from "../Modal";
import { alertError } from "../../utils/alerts";
import { extractErrorMessage } from "../../utils/errors";

/**
 * StationModal
 * - Frontend-only CRUD for stations linked to the selected lake.
 * - Uses forms.css styles via .org-form + .form-group.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - lakeId: number | string | null
 *  - stations: Array<{ id, name, lat, lng, description? }>
 *  - editing: station | null            // when provided, pre-fills the form
 *  - onCreate: (station) => void        // { name, lat, lng, description, lake_id? }
 *  - onUpdate: (station) => void        // { id, name, lat, lng, description, lake_id? }
 *  - onDelete: (id) => void
 */
export default function StationModal({
  open,
  onClose,
  lakeId,
  stations = [],
  editing = null,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [form, setForm] = useState(
    editing
      ? { ...editing }
      : { id: null, name: "", lat: "", lng: "", description: "" }
  );

  useEffect(() => {
    setForm(
      editing
        ? { ...editing }
        : { id: null, name: "", lat: "", lng: "", description: "" }
    );
  }, [editing, open]);

  const valid =
    form.name?.trim() &&
    form.lat !== "" &&
    form.lng !== "" &&
    !Number.isNaN(Number(form.lat)) &&
    !Number.isNaN(Number(form.lng));

  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;

    const payload = {
      ...form,
      lake_id: lakeId ? Number(lakeId) : null,
      lat: Number(form.lat),
      lng: Number(form.lng),
    };

    try {
      setBusy(true);
      if (editing) {
        await onUpdate?.(payload);
      } else {
        await onCreate?.(payload);
      }
      onClose?.();
    } catch (err) {
      alertError("Station error", extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (busy) return;
    try {
      setBusy(true);
      await onDelete?.(id);
    } catch (err) {
      alertError("Station error", extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Station" : "New Station"}
      width={860}
      footer={
        <div
          className="lv-modal-actions"
          style={{ display: "flex", justifyContent: "space-between", width: "100%" }}
        >
          <button className="pill-btn ghost" onClick={onClose}>
            <FiX /> Close
          </button>
          <button className="pill-btn primary" onClick={save} disabled={!valid || busy}>
            {editing ? "Save" : "Create"}
          </button>
        </div>
      }
    >
      <div className="dashboard-content" style={{ padding: 16 }}>
        {/* Editor */}
        <div className="org-form">
          <div className="form-group" style={{ minWidth: 240 }}>
            <label>Station Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((x) => ({ ...x, description: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label>Latitude *</label>
            <input
              type="number"
              value={form.lat}
              onChange={(e) => setForm((x) => ({ ...x, lat: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Longitude *</label>
            <input
              type="number"
              value={form.lng}
              onChange={(e) => setForm((x) => ({ ...x, lng: e.target.value }))}
            />
          </div>
        </div>

        {/* List */}
        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <table className="lv-table">
            <thead>
              <tr>
                <th className="lv-th">
                  <div className="lv-th-inner">
                    <span className="lv-th-label">Name</span>
                  </div>
                </th>
                <th className="lv-th">
                  <div className="lv-th-inner">
                    <span className="lv-th-label">Lat</span>
                  </div>
                </th>
                <th className="lv-th">
                  <div className="lv-th-inner">
                    <span className="lv-th-label">Lng</span>
                  </div>
                </th>
                <th className="lv-th">
                  <div className="lv-th-inner">
                    <span className="lv-th-label">Description</span>
                  </div>
                </th>
                <th className="lv-th" style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{Number(s.lat).toFixed(6)}</td>
                  <td>{Number(s.lng).toFixed(6)}</td>
                  <td>{s.description || "—"}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        className="pill-btn ghost"
                        onClick={() => setForm({ ...s })}
                        title="Edit"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="pill-btn ghost danger"
                        onClick={() => handleDelete(s.id)}
                        title="Delete"
                        disabled={busy}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {stations.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "#6b7280" }}>
                    No stations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
