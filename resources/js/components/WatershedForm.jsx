import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { useWindowSize } from "../hooks/useWindowSize";

const EMPTY = {
  id: null,
  name: "",
  description: "",
};

function WatershedForm({
  open,
  mode = "create",
  initialValue = EMPTY,
  loading = false,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY);
  const { width: windowW } = useWindowSize();

  const computeModalWidth = (w) => {
    if (!w) return 600;
    if (w >= 2561) return 1400; // 4k
    if (w >= 1441) return 1080; // Laptop L
    if (w >= 1025) return 860;  // Laptop
    if (w >= 769) return 720;   // Tablet
    // mobile: keep it responsive to viewport rather than fixed pixels
    if (w <= 420) return '92vw';
    return '94vw';
  };

  useEffect(() => {
    const next = { ...EMPTY, ...initialValue };
    next.name = next.name ?? "";
    next.description = next.description ?? "";
    setForm(next);
  }, [initialValue, open]);

  const handleSubmit = (event) => {
    event?.preventDefault?.();
    if (!form.name.trim()) return;
    onSubmit?.({
      ...form,
      name: form.name.trim(),
      description: form.description ? form.description.trim() : "",
    });
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === "create" ? "Add Watershed" : "Edit Watershed"}
      ariaLabel="Watershed Form"
      width={computeModalWidth(windowW)}
      footer={
        <div className="lv-modal-actions" style={{ padding: '12px 16px' }}>
          <button type="button" className="pill-btn ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="pill-btn primary" form="lv-watershed-form" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
          </button>
        </div>
      }
    >
      <form id="lv-watershed-form" onSubmit={handleSubmit} className="lv-grid" style={{ display: 'grid', gap: 16, gridTemplateColumns: windowW <= 768 ? '1fr' : 'repeat(2, 1fr)' }}>
        <label className="lv-field" style={{ gridColumn: "1 / -1" }}>
          <span>Name *</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Watershed name"
          />
        </label>

        <label className="lv-field" style={{ gridColumn: "1 / -1" }}>
          <span>Description</span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Add a brief description"
          />
        </label>
      </form>
    </Modal>
  );
}

export default WatershedForm;
