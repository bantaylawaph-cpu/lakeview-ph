import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiColumns } from "react-icons/fi";

/**
 * TableLayout: resizable columns, icon-only actions, pagination
 *
 * Props:
 * - tableId: string (localStorage key for widths)
 * - columns: [{ id, header, accessor?, render?, width?, className?, disableToggle?, defaultHidden?, alwaysVisible? }]
 * - data: array
 * - pageSize: number
 * - actions: [{ label, title, icon, onClick(row), type? }] // type can be 'edit' | 'delete'
 * - resetSignal: number  // increment to reset widths / hidden state
 * - columnPicker: boolean | { label?: string, defaultHidden?: string[], locked?: string[] }
 * - toolbar: React.ReactNode | { left?: React.ReactNode, right?: React.ReactNode }
 */
export default function TableLayout({
  tableId = "lv-table",
  columns = [],
  data = [],
  pageSize = 10,
  actions = [],
  resetSignal = 0,
  columnPicker = false,
  toolbar = null,
}) {
  const enableColumnPicker = !!columnPicker;
  const columnPickerConfig = typeof columnPicker === "object" && columnPicker !== null ? columnPicker : {};
  const columnPickerLabel = columnPickerConfig.label || "Columns";

  const normalizedCols = useMemo(() => {
    return columns.map((c, i) => ({ id: c.id || c.accessor || `col_${i}`, ...c }));
  }, [columns]);

  const manualLockedSet = useMemo(() => {
    return new Set(Array.isArray(columnPickerConfig.locked) ? columnPickerConfig.locked : []);
  }, [columnPickerConfig]);

  const configDefaultHiddenSet = useMemo(() => {
    return new Set(Array.isArray(columnPickerConfig.defaultHidden) ? columnPickerConfig.defaultHidden : []);
  }, [columnPickerConfig]);

  const lockedSet = useMemo(() => {
    const lockedIds = new Set();
    normalizedCols.forEach((col) => {
      if (manualLockedSet.has(col.id) || col.disableToggle || col.alwaysVisible) {
        lockedIds.add(col.id);
      }
    });
    if (!lockedIds.size && normalizedCols.length) {
      lockedIds.add(normalizedCols[0].id);
    }
    return lockedIds;
  }, [normalizedCols, manualLockedSet]);

  const hideableColumns = useMemo(() => normalizedCols.filter((col) => !lockedSet.has(col.id)), [normalizedCols, lockedSet]);

  const defaultHiddenIds = useMemo(() => {
    if (!enableColumnPicker) return [];
    const ids = new Set(configDefaultHiddenSet);
    hideableColumns.forEach((col) => {
      if (col.defaultHidden) ids.add(col.id);
    });
    return hideableColumns.filter((col) => ids.has(col.id)).map((col) => col.id);
  }, [hideableColumns, configDefaultHiddenSet, enableColumnPicker]);

  const HID_KEY = `${tableId}::hidden-cols`;

  const computeInitialHidden = useCallback(() => {
    if (!enableColumnPicker) return [];
    if (typeof window === "undefined") return [...defaultHiddenIds];
    try {
      const raw = localStorage.getItem(HID_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const validIds = new Set(hideableColumns.map((col) => col.id));
          const filtered = parsed.filter((id) => validIds.has(id));
          if (filtered.length) {
            return filtered;
          }
        }
      }
    } catch {}
    return [...defaultHiddenIds];
  }, [enableColumnPicker, defaultHiddenIds, HID_KEY, hideableColumns]);

  const [hidden, setHidden] = useState(computeInitialHidden);
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  useEffect(() => {
    if (!enableColumnPicker) return;
    setHidden((prev) => {
      const next = computeInitialHidden();
      if (prev.length === next.length && prev.every((id, idx) => id === next[idx])) {
        return prev;
      }
      return next;
    });
  }, [computeInitialHidden, enableColumnPicker]);

  useEffect(() => {
    if (!enableColumnPicker) return;
    setHidden((prev) => {
      const validIds = new Set(hideableColumns.map((col) => col.id));
      const cleaned = prev.filter((id) => validIds.has(id));
      const defaults = defaultHiddenIds.filter((id) => !cleaned.includes(id));
      if (cleaned.length === prev.length && defaults.length === 0) {
        return prev;
      }
      return [...cleaned, ...defaults];
    });
  }, [hideableColumns, defaultHiddenIds, enableColumnPicker]);

  useEffect(() => {
    if (!enableColumnPicker) return;
    setHidden([...defaultHiddenIds]);
  }, [resetSignal, enableColumnPicker, defaultHiddenIds]);

  useEffect(() => {
    if (!enableColumnPicker) return;
    try {
      localStorage.setItem(HID_KEY, JSON.stringify(hidden));
    } catch {}
  }, [hidden, enableColumnPicker, HID_KEY]);

  const visibleColumnSet = useMemo(() => {
    const set = new Set();
    normalizedCols.forEach((col) => {
      if (!enableColumnPicker) {
        set.add(col.id);
      } else if (lockedSet.has(col.id) || !hiddenSet.has(col.id)) {
        set.add(col.id);
      }
    });
    if (!set.size && normalizedCols.length) {
      set.add(normalizedCols[0].id);
    }
    return set;
  }, [normalizedCols, enableColumnPicker, hiddenSet, lockedSet]);

  const displayColumns = useMemo(() => normalizedCols.filter((col) => visibleColumnSet.has(col.id)), [normalizedCols, visibleColumnSet]);

  // Persist column widths
  const WID_KEY = `${tableId}::widths`;
  const [widths, setWidths] = useState(() => {
    try {
      const raw = localStorage.getItem(WID_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const init = {};
    normalizedCols.forEach((c) => {
      if (c.width) init[c.id] = c.width;
    });
    return init;
  });

  useEffect(() => {
    try {
      localStorage.setItem(WID_KEY, JSON.stringify(widths));
    } catch {}
  }, [widths, WID_KEY]);

  useEffect(() => {
    setWidths({});
  }, [resetSignal]);

  const pickerRef = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!enableColumnPicker) {
      setPickerOpen(false);
      return;
    }
    if (!pickerOpen) return;
    const handleClick = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setPickerOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [pickerOpen, enableColumnPicker]);

  const hideableIds = useMemo(() => new Set(hideableColumns.map((col) => col.id)), [hideableColumns]);

  const handleToggleColumn = useCallback(
    (colId) => {
      if (!hideableIds.has(colId)) return;
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(colId)) {
          next.delete(colId);
          if (hideableColumns.length - next.size <= 1) {
            return prev;
          }
          return Array.from(next);
        }
        next.add(colId);
        return Array.from(next);
      });
    },
    [hideableColumns.length, hideableIds]
  );

  const defaultHiddenSet = useMemo(() => new Set(defaultHiddenIds), [defaultHiddenIds]);
  const isDefaultHiddenState = hidden.length === defaultHiddenIds.length && hidden.every((id) => defaultHiddenSet.has(id));
  const showColumnPicker = enableColumnPicker && hideableColumns.length > 0;

  const startResize = (colId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.target.closest("th");
    if (!th) return;
    const startX = e.clientX;
    const startWidth = parseInt(getComputedStyle(th).width, 10);
    const min = 96;
    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      const nw = Math.max(min, startWidth + delta);
      setWidths((w) => ({ ...w, [colId]: nw }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const getCellContent = (row, col) => {
    if (col.render) return col.render(row._raw ?? row, row);
    if (col.accessor) return row[col.accessor];
    return "";
  };

  const columnPickerControl = showColumnPicker ? (
    <div className="lv-colpick" ref={pickerRef}>
      <button
        type="button"
        className="pill-btn ghost sm lv-colpick-toggle"
        onClick={() => setPickerOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={pickerOpen}
      >
        <FiColumns />
        <span>{columnPickerLabel}</span>
      </button>
      {pickerOpen && (
        <div className="lv-colpick-menu">
          <div className="lv-colpick-title">Columns</div>
          <div className="lv-colpick-list">
            {hideableColumns.map((col) => (
              <label key={col.id} className="lv-colpick-item">
                <input
                  type="checkbox"
                  checked={!hiddenSet.has(col.id)}
                  onChange={() => handleToggleColumn(col.id)}
                />
                <span>{col.header}</span>
              </label>
            ))}
          </div>
          <div className="lv-colpick-actions">
            <button
              type="button"
              className="pill-btn ghost sm"
              onClick={() => setHidden([])}
              disabled={hidden.length === 0}
            >
              Show all
            </button>
            <button
              type="button"
              className="pill-btn ghost sm"
              onClick={() => setHidden([...defaultHiddenIds])}
              disabled={isDefaultHiddenState}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  const toolbarSlots = useMemo(() => {
    if (!toolbar) return { left: null, right: null };
    if (React.isValidElement(toolbar)) {
      return { left: toolbar, right: null };
    }
    if (typeof toolbar === "object") {
      return {
        left: Object.prototype.hasOwnProperty.call(toolbar, "left") ? toolbar.left ?? null : null,
        right: Object.prototype.hasOwnProperty.call(toolbar, "right") ? toolbar.right ?? null : null,
      };
    }
    return { left: toolbar, right: null };
  }, [toolbar]);

  const showToolbarRow = Boolean(toolbarSlots.left || toolbarSlots.right || columnPickerControl);

  return (
    <div className="lv-table-wrap">
      {showToolbarRow && (
        <div className="lv-table-toolbar">
          <div className="lv-toolbar-left">{toolbarSlots.left}</div>
          <div className="lv-toolbar-right">
            {toolbarSlots.right}
            {columnPickerControl}
          </div>
        </div>
      )}

      <div className="lv-table-scroller">
        <table className="lv-table">
          <thead>
            <tr>
              {displayColumns.map((col) => (
                <th
                  key={col.id}
                  className={`lv-th ${col.className || ""}`}
                  style={{ width: widths[col.id] ? `${widths[col.id]}px` : undefined }}
                >
                  <div className="lv-th-inner">
                    <span className="lv-th-label">{col.header}</span>
                    <span className="lv-resizer" onMouseDown={(e) => startResize(col.id, e)} />
                  </div>
                </th>
              ))}
              {actions?.length ? (
                <th className="lv-th lv-th-actions sticky-right">
                  <div className="lv-th-inner">
                    <span className="lv-th-label">Actions</span>
                  </div>
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {paged.map((row, idx) => (
              <tr key={row.id ?? idx}>
                {displayColumns.map((col) => (
                  <td
                    key={col.id}
                    className={`lv-td ${col.className || ""}`}
                    style={{ width: widths[col.id] ? `${widths[col.id]}px` : undefined }}
                  >
                    {getCellContent(row, col)}
                  </td>
                ))}
                {actions?.length ? (
                  <td className="lv-td sticky-right lv-td-actions">
                    <div className="lv-actions-inline">
                      {actions.map((act, i) => (
                        <button
                          key={i}
                          className={`icon-btn simple ${act.type === "delete" ? "danger" : act.type === "edit" ? "accent" : ""}`}
                          title={act.title || act.label}
                          onClick={() => act.onClick?.(row._raw ?? row)}
                          aria-label={act.title || act.label}
                        >
                          {act.icon}
                        </button>
                      ))}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}

            {!paged.length && (
              <tr>
                <td className="lv-empty" colSpan={displayColumns.length + (actions?.length ? 1 : 0)}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="lv-table-pager">
        <button className="pill-btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          {"< Prev"}
        </button>
        <span className="pager-text">Page {page} of {totalPages}</span>
        <button className="pill-btn ghost sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          {"Next >"}
        </button>
      </div>
    </div>
  );
}

