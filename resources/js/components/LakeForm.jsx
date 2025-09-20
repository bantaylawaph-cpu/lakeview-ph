import React, { useEffect, useState } from "react";
import Modal from "./Modal";

const EMPTY = {
  id: null,
  name: "",
  alt_name: "",
  region: "",
  province: "",
  municipality: "",
  watershed_id: "",
  class_code: "",
  surface_area_km2: "",
  elevation_m: "",
  mean_depth_m: "",
};

export default function LakeForm({
  open,
  mode = "create",                // "create" | "edit"
  initialValue = EMPTY,
  watersheds = [],
  classOptions = [],
  loading = false,
  onSubmit,                        // (formObject) => void
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm({ ...EMPTY, ...initialValue });
  }, [initialValue, open]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.name?.trim()) return; // minimal guard
    return onSubmit?.(form);
  };

  const denrOptions = Array.isArray(classOptions) ? classOptions : [];

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === "create" ? "Add Lake" : "Edit Lake"}
      ariaLabel="Lake Form"
      width={760}
      footer={
        <div className="lv-modal-actions">
          <button type="button" className="pill-btn ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="pill-btn primary" form="lv-lake-form" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
          </button>
        </div>
      }
    >
      <form id="lv-lake-form" onSubmit={submit} className="lv-grid-2">
        <label className="lv-field">
          <span>Name *</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Alt Name</span>
          <input
            value={form.alt_name}
            onChange={(e) => setForm({ ...form, alt_name: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Region</span>
          <input
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Province</span>
          <input
            value={form.province}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Municipality/City</span>
          <input
            value={form.municipality}
            onChange={(e) => setForm({ ...form, municipality: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Watershed</span>
          <select
            value={form.watershed_id ?? ""}
            onChange={(e) => setForm({ ...form, watershed_id: e.target.value })}
          >
            <option value="">-- None --</option>
            {watersheds.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </label>

        <label className="lv-field">
          <span>DENR Classification</span>
          <select
            value={form.class_code ?? ""}
            onChange={(e) => setForm({ ...form, class_code: e.target.value })}
          >
            <option value="">Unspecified</option>
            {denrOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name ? `${opt.code} - ${opt.name}` : opt.code}
              </option>
            ))}
          </select>
        </label>

        <label className="lv-field">
          <span>Surface Area (km^2)</span>
          <input
            type="number"
            step="0.001"
            value={form.surface_area_km2}
            onChange={(e) => setForm({ ...form, surface_area_km2: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Elevation (m)</span>
          <input
            type="number"
            step="0.001"
            value={form.elevation_m}
            onChange={(e) => setForm({ ...form, elevation_m: e.target.value })}
          />
        </label>

        <label className="lv-field">
          <span>Mean Depth (m)</span>
          <input
            type="number"
            step="0.001"
            value={form.mean_depth_m}
            onChange={(e) => setForm({ ...form, mean_depth_m: e.target.value })}
          />
        </label>
      </form>
    </Modal>
  );
}

