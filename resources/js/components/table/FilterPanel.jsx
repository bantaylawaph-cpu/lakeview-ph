import React from "react";

/**
 * Collapsible "Advanced Filters" panel
 *
 * Props:
 * - open: boolean
 * - fields: [
 *     { id, label, type: 'text'|'select'|'multiselect'|'number-range'|'date-range'|'boolean',
 *       value, onChange, options? }
 *   ]
 * - onClearAll?: () => void
 */
export default function FilterPanel({ open, fields = [], onClearAll }) {
  if (!open) return null;

  return (
    <div className="advanced-filters" role="region" aria-label="Advanced filters">
      <div className="advanced-filters-header">
        <strong>Filters</strong>
        {onClearAll && (
          <button className="pill-btn ghost sm" onClick={onClearAll} aria-label="Clear filters">
            Clear all
          </button>
        )}
      </div>

      <div className="advanced-filters-grid">
        {fields.map((f) => {
          if (f.type === "text") {
            return (
              <label key={f.id} className="af-field">
                <span>{f.label}</span>
                <input type="text" value={f.value || ""} onChange={(e) => f.onChange?.(e.target.value)} />
              </label>
            );
          }

          if (f.type === "select") {
            return (
              <label key={f.id} className="af-field">
                <span>{f.label}</span>
                <select value={f.value ?? ""} onChange={(e) => f.onChange?.(e.target.value)}>
                  {(f.options || []).map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                      {opt.label ?? opt}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          if (f.type === "multiselect") {
            return (
              <label key={f.id} className="af-field">
                <span>{f.label}</span>
                <select
                  multiple
                  value={Array.isArray(f.value) ? f.value : []}
                  onChange={(e) => {
                    const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                    f.onChange?.(vals);
                  }}
                >
                  {(f.options || []).map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                      {opt.label ?? opt}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          if (f.type === "number-range") {
            const [min, max] = Array.isArray(f.value) ? f.value : [null, null];
            return (
              <div key={f.id} className="af-field">
                <span>{f.label}</span>
                <div className="af-range">
                  <input
                    type="number"
                    step="any"
                    placeholder="Min"
                    value={min ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      f.onChange?.([v, max]);
                    }}
                  />
                  <span className="af-range-sep">–</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Max"
                    value={max ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      f.onChange?.([min, v]);
                    }}
                  />
                </div>
              </div>
            );
          }

          if (f.type === "date-range") {
            const [from, to] = Array.isArray(f.value) ? f.value : [null, null];
            return (
              <div key={f.id} className="af-field">
                <span>{f.label}</span>
                <div className="af-range">
                  <input
                    type="date"
                    value={from ?? ""}
                    onChange={(e) => f.onChange?.([e.target.value || null, to])}
                  />
                  <span className="af-range-sep">–</span>
                  <input
                    type="date"
                    value={to ?? ""}
                    onChange={(e) => f.onChange?.([from, e.target.value || null])}
                  />
                </div>
              </div>
            );
          }

          if (f.type === "boolean") {
            return (
              <label key={f.id} className="af-field af-boolean">
                <input
                  type="checkbox"
                  checked={!!f.value}
                  onChange={(e) => f.onChange?.(e.target.checked)}
                />
                <span>{f.label}</span>
              </label>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
