import React from "react";
import Modal from "../Modal";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} ariaLabel="Confirmation Dialog" width={520}
      footer={
        <div className="lv-modal-actions">
          <button className="pill-btn ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button className="pill-btn delete" onClick={onConfirm} disabled={loading}>
            {loading ? "Working…" : confirmText}
          </button>
        </div>
      }
    >
      <p style={{ lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}
