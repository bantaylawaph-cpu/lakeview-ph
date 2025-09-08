import React, { useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

/**
 * TableLayout
 * - Dark-mode friendly text colors
 * - Ellipsis for long cells + full value on hover (title)
 * - Action buttons show ICON + TEXT
 * - Optional column.render(row) for custom cells
 */
export default function TableLayout({ columns, data = [], pageSize = 10, actions }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const boundedPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (boundedPage - 1) * pageSize;

  const currentData = useMemo(
    () => data.slice(startIndex, startIndex + pageSize),
    [data, startIndex, pageSize]
  );

  return (
    <div className="table-wrapper">
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
            {actions && <th className="th-actions">Actions</th>}
          </tr>
        </thead>

        <tbody>
          {currentData.length > 0 ? (
            currentData.map((row, rIdx) => (
              <tr key={rIdx}>
                {columns.map((col, cIdx) => {
                  const value = col.render
                    ? col.render(row)
                    : Array.isArray(row[col.accessor])
                      ? row[col.accessor].join(", ")
                      : row[col.accessor];

                  const text = value ?? "—";
                  return (
                    <td key={cIdx} title={typeof text === "string" ? text : undefined}>
                      <div className="cell-ellipsis">
                        {text}
                      </div>
                    </td>
                  );
                })}

                {actions && (
                  <td className="table-actions">
                    <div className="actions-row">
                      {actions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          type="button"
                          className={`action-btn ${action.type || "default"}`}
                          onClick={() => action.onClick?.(row)}
                          title={action.label}
                        >
                          {action.icon && <span className="btn-icon">{action.icon}</span>}
                          <span className="btn-text">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="no-data">
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button
          type="button"
          className="page-btn"
          disabled={boundedPage === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <FiChevronLeft />
          <span>Prev</span>
        </button>

        <span className="page-indicator">
          Page {boundedPage} of {totalPages}
        </span>

        <button
          type="button"
          className="page-btn"
          disabled={boundedPage === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          <span>Next</span>
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
}