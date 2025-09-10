import React, { useEffect, useRef, useState } from "react";
import { FiSearch, FiFilter, FiSettings, FiRotateCcw, FiRefreshCw, FiDownload, FiPlus } from "react-icons/fi";
import ColumnPicker from "./ColumnPicker";

/**
 * Reusable table toolbar (non-sticky by default)
 *
 * Props:
 * - tableId: string (required)  // used for per-table persistence
 * - search: { value, onChange, placeholder }
 * - filters: [{ id, label, type: 'select'|'multiselect'|'date', value, onChange, options }]
 * - columnPicker: { columns, visibleMap, onVisibleChange }
 * - onResetWidths: () => void
 * - onRefresh: () => void
 * - onExport: () => void
 * - onAdd: () => void
 * - onToggleFilters: () => void                 // toggles the advanced FilterPanel
 * - filtersBadgeCount: number                   // shows active advanced filters count
 */
export default function TableToolbar({
  tableId,
  search = { value: "", onChange: () => {}, placeholder: "Search…" },
  filters = [],
  columnPicker,
  onResetWidths,
  onRefresh,
  onExport,
  onAdd,
  onToggleFilters,
  filtersBadgeCount = 0,
}) {
  const SEARCH_KEY = `${tableId}::search`;
  const FILT_KEY   = `${tableId}::filters`;

  // Debounced search input (300ms)
  const [localQuery, setLocalQuery] = useState(search.value || "");
  useEffect(() => setLocalQuery(search.value || ""), [search.value]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (localQuery !== search.value) search.onChange?.(localQuery);
      try { localStorage.setItem(SEARCH_KEY, localQuery); } catch {}
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuery]);

  // Persist simple filters (write-through)
  useEffect(() => {
    const pack = {};
    filters.forEach(f => { pack[f.id] = f.value; });
    try { localStorage.setItem(FILT_KEY, JSON.stringify(pack)); } catch {}
  }, [JSON.stringify(filters.map(f => ({ id: f.id, value: f.value })))]);

  // Keyboard: focus search on "/"
  const inputRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "/") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="org-toolbar" role="region" aria-label="Table toolbar">
      {/* Search */}
      <div className="org-search" role="search">
        <FiSearch className="toolbar-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          placeholder={search.placeholder || "Search…"}
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          aria-label="Search table"
        />
        {!!localQuery && (
          <button
            type="button"
            className="pill-btn ghost"
            onClick={() => setLocalQuery("")}
            title="Clear"
            aria-label="Clear search"
            style={{ height: 28, padding: "0 8px", marginLeft: 6 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Basic filters (config-driven) */}
      {filters.map((f) => {
        if (f.type === "multiselect") {
          return (
            <div key={f.id} className="org-filter" title={f.label}>
              <FiFilter className="toolbar-icon" aria-hidden="true" />
              <select
                multiple
                value={Array.isArray(f.value) ? f.value : []}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                  f.onChange?.(vals);
                }}
                aria-label={f.label}
                style={{ minWidth: 200, height: 36 }}
              >
                {f.options?.map(opt => (
                  <option key={opt.value ?? opt} value={opt.value ?? opt}>
                    {opt.label ?? opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        if (f.type === "date") {
          return (
            <div key={f.id} className="org-filter" title={f.label}>
              <FiFilter className="toolbar-icon" aria-hidden="true" />
              <input
                type="date"
                value={f.value || ""}
                onChange={(e) => f.onChange?.(e.target.value || null)}
                aria-label={f.label}
                style={{ minWidth: 180 }}
              />
            </div>
          );
        }
        // default: single select
        return (
          <div key={f.id} className="org-filter" title={f.label}>
            <FiFilter className="toolbar-icon" aria-hidden="true" />
            <select
              value={f.value ?? ""}
              onChange={(e) => f.onChange?.(e.target.value)}
              aria-label={f.label}
            >
              {(f.options || []).map(opt => (
                <option key={opt.value ?? opt} value={opt.value ?? opt}>
                  {opt.label ?? opt}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {/* Right actions */}
      <div className="org-actions-right" role="group" aria-label="Table actions">
        {onToggleFilters && (
          <button
            className="pill-btn ghost"
            onClick={onToggleFilters}
            title="Advanced filters"
            aria-label="Advanced filters"
          >
            <FiFilter /><span className="hide-sm">Filters</span>
            {filtersBadgeCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: "#111827",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "0 6px",
                  fontSize: 12,
                  lineHeight: "18px",
                  height: 18,
                  display: "inline-flex",
                  alignItems: "center"
                }}
                aria-label={`${filtersBadgeCount} active filters`}
                title={`${filtersBadgeCount} active filters`}
              >
                {filtersBadgeCount}
              </span>
            )}
          </button>
        )}

        {onResetWidths && (
          <button className="pill-btn ghost" onClick={onResetWidths} title="Reset column widths" aria-label="Reset column widths">
            <FiRotateCcw /><span className="hide-sm">Reset</span>
          </button>
        )}

        {columnPicker && (
          <ColumnPicker
            columns={columnPicker.columns}
            visible={columnPicker.visibleMap}
            onChange={columnPicker.onVisibleChange}
            triggerRender={(open, btnRef) => (
              <button ref={btnRef} className="pill-btn ghost" onClick={open} title="Choose columns" aria-label="Choose columns">
                <FiSettings /><span className="hide-sm">Columns</span>
              </button>
            )}
            portalToBody
          />
        )}

        {onRefresh && (
          <button className="pill-btn ghost" onClick={onRefresh} title="Refresh table" aria-label="Refresh table">
            <FiRefreshCw /><span className="hide-sm">Refresh</span>
          </button>
        )}

        {onExport && (
          <button className="pill-btn ghost" onClick={onExport} title="Export CSV" aria-label="Export CSV">
            <FiDownload /><span className="hide-sm">Export</span>
          </button>
        )}

        {onAdd && (
          <button className="pill-btn primary" onClick={onAdd} title="Add new" aria-label="Add new">
            <FiPlus /><span className="hide-sm">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
