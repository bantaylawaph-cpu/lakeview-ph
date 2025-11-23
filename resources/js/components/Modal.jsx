import React, { useEffect, useState, useRef } from "react";
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
  trapFocus = true,
  closeOnEsc = true,
  closeOnOverlay = true,
  initialFocusRef,
  overlayZIndex = 10000,
}) {
  // Keep the modal mounted while playing the fade-out animation
  const [shouldRender, setShouldRender] = useState(open);
  const [isClosing, setIsClosing] = useState(false);
  const cardRef = useRef(null);
  const lastActiveRef = useRef(null);

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

  // Focus management & trap
  useEffect(() => {
    if (open) {
      lastActiveRef.current = document.activeElement;
      // Lock body scroll while any modal is open
      try { document.body.classList.add('lv-modal-open'); } catch {}
      // defer to allow DOM paint
      setTimeout(() => {
        try {
          if (initialFocusRef?.current) {
            initialFocusRef.current.focus();
            return;
          }
          if (cardRef.current) {
            const focusables = cardRef.current.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusables.length) {
              const el = Array.from(focusables).find(el => !el.hasAttribute('disabled')) || focusables[0];
              el && el.focus();
            }
          }
        } catch {}
      }, 30);
    } else if (!open && lastActiveRef.current) {
      // restore focus after close animation completes
      setTimeout(() => {
        try { lastActiveRef.current.focus(); } catch {}
      }, animationDuration + 10);
      // Unlock body scroll (best-effort; if another modal still open they can re-add class)
      try { document.body.classList.remove('lv-modal-open'); } catch {}
    }
  }, [open, animationDuration, initialFocusRef]);

  useEffect(() => {
    if (!trapFocus || !open) return;
    const handleKey = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose?.();
      }
      if (e.key === 'Tab') {
        if (!cardRef.current) return;
        const focusables = cardRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [trapFocus, open, onClose, closeOnEsc]);

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`lv-modal-overlay ${isClosing ? "fade-out" : "fade-in"}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      // Close on overlay click (mouseup -> click) to avoid click-through to background.
      // Do not close the modal if the user is performing a text selection (highlighting),
      // which can emit click events on the overlay when selection ends outside the modal.
      onClick={(e) => {
        try {
          const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection().toString() : '';
          if (sel && sel.length > 0) {
            // User was selecting text; ignore this click so modal doesn't close.
            e.stopPropagation();
            return;
          }
        } catch {}
        if (closeOnOverlay && e.target === e.currentTarget) {
          e.stopPropagation();
          e.preventDefault();
          onClose?.();
        }
      }}
      // Prevent mousedown from propagating so underlying elements don't receive pointer events
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
        }
      }}
      style={{
        ["--lv-modal-anim"]: `${animationDuration}ms`,
        zIndex: overlayZIndex,
      }}
    >
      <div
        ref={cardRef}
        className={`lv-modal-card ${cardClassName} ${isClosing ? "fade-out" : "fade-in"}`}
        onClick={(e) => e.stopPropagation()}
        style={{ width, maxWidth: "95vw", maxHeight: '95vh', display: 'flex', flexDirection: 'column', ...style }}
      >
        {header && (
          <div className="lv-modal-header">
            <h3 className="lv-modal-title">{title}</h3>
            <button className="lv-icon-btn" type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClose?.(); }} aria-label="Close dialog">
              <FiX />
            </button>
          </div>
        )}
  <div className={`lv-modal-body ${bodyClassName}`} style={{ overflowY: 'auto', flex: '1 1 auto', maxHeight: 'calc(100vh - 180px)' }}>{children}</div>

        {footer && <div className="lv-modal-footer" style={footerStyle}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
