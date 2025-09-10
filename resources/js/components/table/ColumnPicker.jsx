import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * ColumnPicker with optional portal-to-body popover
 *
 * Props:
 * - columns: [{ id, header }]
 * - visible: { [id]: boolean }
 * - onChange: (map) => void
 * - triggerRender: (openFn, buttonRef) => ReactNode
 * - portalToBody?: boolean
 */
export default function ColumnPicker({
  columns,
  visible,
  onChange,
  triggerRender,
  portalToBody = false,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const openMenu = () => {
    setOpen(true);
    if (portalToBody && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.right - 240 }); // 240px ~ menu width
    }
  };
  const close = () => setOpen(false);

  // Outside click
  useEffect(() => {
    const h = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target) && !btnRef.current?.contains(e.target)) close();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ESC to close
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const menu = (
    <div
      ref={menuRef}
      className="lv-colpick-menu"
      style={portalToBody ? { position: "fixed", top: pos.top, left: pos.left, zIndex: 5000 } : undefined}
      role="dialog"
      aria-label="Columns"
    >
      <div className="lv-colpick-title">Columns</div>
      <div className="lv-colpick-list">
        {columns.map((c) => (
          <label key={c.id} className="lv-colpick-item">
            <input
              type="checkbox"
              checked={visible[c.id] !== false}
              onChange={() => onChange({ ...visible, [c.id]: !visible[c.id] })}
            />
            <span>{typeof c.header === "string" ? c.header : c.id}</span>
          </label>
        ))}
      </div>
      <div className="lv-colpick-actions">
        <button className="pill-btn ghost sm" onClick={close}>Close</button>
      </div>
    </div>
  );

  return (
    <div className="lv-colpick">
      {triggerRender ? triggerRender(openMenu, btnRef) : <button ref={btnRef} onClick={openMenu}>Columns</button>}
      {open && (portalToBody ? createPortal(menu, document.body) : menu)}
    </div>
  );
}
