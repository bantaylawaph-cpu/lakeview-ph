import React, { useEffect, useMemo, useState } from "react";

/**
 * TableLayout: resizable columns, icon-only actions, pagination
 *
 * Props:
 * - tableId: string (localStorage key for widths)
 * - columns: [{ id, header, accessor?, render?, width?, className? }]
 * - data: array
 * - pageSize: number
 * - actions: [{ label, title, icon, onClick(row), type? }] // type can be 'edit' | 'delete'
 * - resetSignal: number  // increment to reset widths
 */
export default function TableLayout({
  tableId = "lv-table",
  columns = [],
  data = [],
  pageSize = 10,
  actions = [],
  resetSignal = 0,
}) {
  // Normalize columns with ids
  const normalizedCols = useMemo(() => {
    return columns.map((c, i) => ({ id: c.id || c.accessor || `col_${i}`, ...c }));
  }, [columns]);

  // Persist column widths
  const WID_KEY = `${tableId}::widths`;
  const [widths, setWidths] = useState(() => {
    try {
      const raw = localStorage.getItem(WID_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const init = {};
    normalizedCols.forEach((c) => { if (c.width) init[c.id] = c.width; });
    return init;
  });
  useEffect(() => {
    try { localStorage.setItem(WID_KEY, JSON.stringify(widths)); } catch {}
  }, [widths]);
  useEffect(() => { setWidths({}); }, [resetSignal]);

  // Resize handlers
  const startResize = (colId, e) => {
    e.preventDefault(); e.stopPropagation();
    const th = e.target.closest("th");
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
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const getCellContent = (row, col) => {
    if (col.render) return col.render(row._raw ?? row, row);
    if (col.accessor) return row[col.accessor];
    return "";
  };

  return (
    <div className="lv-table-wrap">
      <div className="lv-table-scroller">
        <table className="lv-table">
          <thead>
            <tr>
              {normalizedCols.map((col) => (
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
                {normalizedCols.map((col) => (
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
                <td className="lv-empty" colSpan={normalizedCols.length + (actions?.length ? 1 : 0)}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="lv-table-pager">
        <button className="pill-btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ‹ Prev
        </button>
        <span className="pager-text">Page {page} of {totalPages}</span>
        <button className="pill-btn ghost sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next ›
        </button>
      </div>
    </div>
  );
}
