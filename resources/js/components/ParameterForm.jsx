import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { useWindowSize } from "../hooks/useWindowSize";

const EMPTY = {
  code: "",
  name: "",
  unit: "",
  evaluation_type: "",
  desc: "",
};

export default function ParameterForm({
  open,
  mode = "create",               // "create" | "edit"
  initialValue = EMPTY,
  unitOptions = [],
  loading = false,
  onSubmit,                        // (formObject) => void
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY);
  const { width: windowW } = useWindowSize();

  useEffect(() => {
    const normalized = { ...EMPTY, ...(initialValue || {}) };
    setForm(normalized);
  }, [initialValue, open]);

  const submit = async (e) => {
    e?.preventDefault?.();
    const payload = {
      code: String(form.code || "").trim(),
      name: String(form.name || "").trim(),
      unit: form.unit || null,
      evaluation_type: form.evaluation_type || null,
      desc: (form.desc || "").trim() || null,
    };
    if (!payload.code || !payload.name) return; // minimal guard
    return onSubmit?.(payload);
  };

  const computeModalWidth = (w) => {
    if (!w) return 720;
    if (w >= 2561) return 1400; // 4k
    if (w >= 1441) return 1080; // Laptop L
    if (w >= 1025) return 860;  // Laptop
    if (w >= 769) return 720;   // Tablet
    // mobile: keep it responsive to viewport rather than fixed pixels
    if (w <= 420) return '92vw';
    return '94vw';
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === "create" ? "Add Water Quality Parameter" : `Edit parameter: ${form.code}`}
      ariaLabel="Parameter Form"
      width={computeModalWidth(windowW)}
      footer={
        <div className="lv-modal-actions" style={{ padding: '12px 16px' }}>
          <button type="button" className="pill-btn ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="pill-btn primary" form="lv-parameter-form" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
          </button>
        </div>
      }
    >
      <form
        id="lv-parameter-form"
        onSubmit={submit}
        className="lv-grid"
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: '1fr',
          gridAutoRows: 'minmax(48px, auto)',
          maxWidth: '100%',
          padding: '8px',
        }}
      >
        <label className="lv-field" style={{ width: '100%' }}>
          <span>Code *</span>
          <input
            required
            placeholder="e.g. DO"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            disabled={mode === 'edit'}
            style={{ width: '100%' }}
          />
        </label>

        <label className="lv-field" style={{ width: '100%' }}>
          <span>Name *</span>
          <input
            required
            placeholder="Dissolved Oxygen"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ width: '100%' }}
          />
        </label>

        <label className="lv-field" style={{ width: '100%' }}>
          <span>Unit</span>
          <select
            value={form.unit || ""}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            style={{ width: '100%' }}
          >
            <option value="">Select unit</option>
            {unitOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label className="lv-field" style={{ width: '100%' }}>
          <span>Evaluation</span>
          <select
            value={form.evaluation_type || ""}
            onChange={(e) => setForm({ ...form, evaluation_type: e.target.value })}
            style={{ width: '100%' }}
          >
            <option value="">Not set</option>
            <option value="Max (≤)">Max (≤)</option>
            <option value="Min (≥)">Min (≥)</option>
            <option value="Range">Range (between)</option>
          </select>
        </label>

        <label className="lv-field" style={{ width: '100%' }}>
          <span>Description</span>
          <textarea
            placeholder="Add description"
            value={form.desc || ""}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            rows={4}
            style={{ resize: 'vertical', width: '100%' }}
          />
        </label>
      </form>
    </Modal>
  );
}
