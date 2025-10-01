import React, { useEffect, useState } from "react";
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
  header = true,
  cardClassName = "",
  bodyClassName = "",
  style = {},
  footerStyle = {},
  animationDuration = 200,
  overlayZIndex = 10000,
}) {
  // Keep the modal mounted while playing the fade-out animation
  const [shouldRender, setShouldRender] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    if (shouldRender) {
      setIsClosing(true);
      const t = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, animationDuration);
      return () => clearTimeout(t);
    }
  }, [open, shouldRender, animationDuration]);

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`lv-modal-overlay ${isClosing ? "fade-out" : "fade-in"}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      style={{
        // provide duration via CSS variable for flexibility
        ["--lv-modal-anim"]: `${animationDuration}ms`,
        zIndex: overlayZIndex,
      }}
    >
      <div
        className={`lv-modal-card ${cardClassName} ${isClosing ? "fade-out" : "fade-in"}`}
        style={{ width, maxWidth: "95vw", maxHeight: '95vh', display: 'flex', flexDirection: 'column', ...style }}
      >
        {header && (
          <div className="lv-modal-header">
            <h3 className="lv-modal-title">{title}</h3>
            <button className="lv-icon-btn" onClick={onClose} aria-label="Close dialog">
              <FiX />
            </button>
          </div>
        )}

  <div className={`lv-modal-body ${bodyClassName}`} style={{ overflowY: 'auto', flex: '1 1 auto' }}>{children}</div>

        {footer && <div className="lv-modal-footer" style={footerStyle}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
