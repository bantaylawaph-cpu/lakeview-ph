// resources/js/components/layers/BodySelect.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchLakeOptions,
  fetchWatershedOptions,
} from "../../lib/layers";

/**
 * Reusable selector for a "body" (Lake or Watershed)
 *
 * Props:
 * - bodyType:        'lake' | 'watershed'
 * - bodyId:          string|number (controlled value)
 * - onChange(id):    callback when selection (or manual ID) changes
 * - label?:          string (default derived from bodyType)
 * - searchable?:     boolean (default true) – shows a small search box for options
 * - allowManualId?:  boolean (default true) – shows a numeric ID input fallback
 * - required?:       boolean
 * - disabled?:       boolean
 * - autoFocus?:      boolean
 * - placeholder?:    string (placeholder for select)
 * - className?:      string (container class)
 */
export default function BodySelect({
  bodyType,
  bodyId,
  onChange,
  label,
  searchable = true,
  allowManualId = true,
  required = false,
  disabled = false,
  autoFocus = false,
  placeholder,
  className = "",
}) {
  const [options, setOptions] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const resolvedLabel = label || (bodyType === "watershed" ? "Watershed" : "Lake");
  const selectPlaceholder =
    placeholder || `Choose a ${bodyType === "watershed" ? "watershed" : "lake"}…`;

  const loader = useMemo(
    () => (bodyType === "watershed" ? fetchWatershedOptions : fetchLakeOptions),
    [bodyType]
  );

  // fetch options on mount & when bodyType changes (and when q debounces)
  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      setLoading(true);
      setErr("");
      try {
        const rows = await loader(q.trim());
        if (!cancelled) setOptions(rows);
      } catch (e) {
        if (!cancelled) {
          setOptions([]);
          setErr(e?.message || "Failed to load options");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // debounce search a bit for better UX
    const t = setTimeout(doFetch, q ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [loader, q]);

  const handleSelect = (e) => {
    const val = e.target.value;
    onChange?.(val ? Number(val) : "");
  };

  const handleManual = (e) => {
    const val = e.target.value;
    // allow empty; on numeric, coerce to Number
    onChange?.(val === "" ? "" : Number(val));
  };

  return (
    <div className={`form-group bodyselect ${className}`}>
        <label>{resolvedLabel}</label>

        {searchable && (
        <input
            type="text"
            className="bodyselect-search"
            placeholder={`Search ${resolvedLabel.toLowerCase()}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={disabled}
            autoFocus={autoFocus}
        />
        )}

        <div className="bs-fields">
        <select
            value={bodyId ?? ""}
            onChange={(e) => onChange?.(e.target.value ? Number(e.target.value) : "")}
            disabled={disabled || loading || options.length === 0}
            required={required}
            className="bs-select"
        >
            <option value="">{loading ? "Loading…" : selectPlaceholder}</option>
            {options.map((o) => (
            <option key={`${bodyType}-${o.id}`} value={o.id}>
                #{o.id} — {o.name}
            </option>
            ))}
        </select>

        {allowManualId && (
            <div className="bs-manual">
            <small>Or type ID</small>
            <input
                type="number"
                inputMode="numeric"
                min="1"
                value={bodyId === "" || bodyId == null ? "" : bodyId}
                onChange={(e) => onChange?.(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Numeric ID"
                disabled={disabled}
            />
            </div>
        )}
        </div>

        {err && <div className="alert-note" style={{ marginTop: 8 }}>{err}</div>}
    </div>
    );

}
