import React from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 720,
  ariaLabel = "Dialog",
}) {
  if (!open) return null;

  return createPortal(
    <div className="lv-modal-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="lv-modal-card" style={{ width, maxWidth: "95vw" }}>
        <div className="lv-modal-header">
          <h3 className="lv-modal-title">{title}</h3>
          <button className="lv-icon-btn" onClick={onClose} aria-label="Close dialog">
            <FiX />
          </button>
        </div>

        <div className="lv-modal-body">{children}</div>

        {footer && <div className="lv-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
