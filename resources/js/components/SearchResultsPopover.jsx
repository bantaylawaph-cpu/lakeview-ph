import React from 'react';
import { FiSearch } from 'react-icons/fi';
import { ensureUnit, normalizeNumStr, shiftDecimalStr } from '../utils/conversions';

export default function SearchResultsPopover({ open, results, loading, error, onClose, onSelect }) {
  if (!open) return null;
  // Try to align with the search bar by reading its DOM rect
  let left = 56, top = 56, width = 420;
  try {
    const bar = document.querySelector('.search-bar');
    if (bar) {
      const r = bar.getBoundingClientRect();
      left = Math.round(r.left);
      top = Math.round(r.bottom) + 8;
      const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1024;
      width = Math.max(240, Math.min(Math.round(r.width), vw - left - 12));
    }
  } catch {}
  const availableH = (typeof window !== 'undefined') ? Math.max(160, window.innerHeight - top - 24) : 420;
  return (
    <div className="modern-scrollbar" style={{ position: 'fixed', top, left, zIndex: 1100, background: '#fff', color: '#111827', borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.18)', width, maxHeight: Math.min(420, availableH), overflowY: 'auto' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
        <FiSearch size={14} style={{ color: '#374151' }} />
        <strong style={{ fontSize: 12, letterSpacing: 0.3, color: '#374151' }}>Search results</strong>
        {/* Removed close button; use SearchBar clear (×) instead */}
      </div>
      {loading && <div style={{ padding: 12, fontSize: 13, color: '#374151' }}>Searching…</div>}
      {error && !loading && <div style={{ padding: 12, fontSize: 13, color: '#b91c1c' }}>{String(error)}</div>}
      {!loading && !error && Array.isArray(results) && results.length === 0 && (
        <div style={{ padding: 12, fontSize: 13, color: '#6B7280' }}>No results found.</div>
      )}
      <div>
        {(results || []).map((r, idx) => {
          const attrs = r.attributes || r; // support both unified and flat
          const name = r.name || attrs.name || attrs.lake_name || `Result ${idx+1}`;
          const entity = (r.table || r.entity || '').toString();

          const asText = (v) => Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
          // Normalize potential JSON-encoded arrays/objects or arrays into readable text
          const normText = (v) => {
            if (v == null) return '';
            if (Array.isArray(v)) {
              return v.map((x) => (x == null ? '' : String(x))).filter(Boolean).join(', ');
            }
            if (typeof v === 'string') {
              const s = v.trim();
              if (s && (s[0] === '[' || s[0] === '{')) {
                try {
                  const j = JSON.parse(s);
                  if (Array.isArray(j)) return j.filter(Boolean).map(String).join(', ');
                  if (j && typeof j === 'object') return Object.values(j).filter(Boolean).map(String).join(', ');
                } catch {}
              }
              return s;
            }
            return String(v);
          };
          const region = (() => { const t = normText(attrs.region); return t ? String(t) : ''; })();
          const province = (() => { const t = normText(attrs.province); return t ? String(t) : ''; })();
          // Build location: province, region (omit missing)
          const locParts = [];
          if (province) locParts.push(province);
          if (region) locParts.push(region);
          const loc = locParts.join(', ');

          // Numeric helpers
          const num = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };
          const classCode = attrs.class_code || attrs.water_class || null;
          const depth = num(attrs.max_depth ?? attrs.depth);
          const elev = num(attrs.elevation ?? attrs.max_elevation);
          const firstDefined = (...vals) => vals.find((v) => v !== undefined && v !== null);
          // ---- Area formatting (show in km² with ha in parentheses) ----

          // Determine km² and ha strings from available fields
          const km2Src = firstDefined(attrs.surface_area_km2, attrs.area_km2);
          const haSrc = firstDefined(attrs.surface_area_ha, attrs.area_ha);
          let km2Str = km2Src != null ? normalizeNumStr(asText(km2Src)) : '';
          let haStr = haSrc != null ? normalizeNumStr(asText(haSrc)) : '';
          if (!km2Str && haStr) {
            km2Str = shiftDecimalStr(haStr, -2);
          }
          if (!haStr && km2Str) {
            haStr = shiftDecimalStr(km2Str, +2);
          }
          const areaText = km2Str ? `${km2Str} km²${haStr ? ` (${haStr} ha)` : ''}` : '';

          // Depth (prefer explicit text, else raw value; add 'm' if missing)
          const depthRawPref = firstDefined(
            attrs.mean_depth_text,
            attrs.average_depth_text,
            attrs.avg_depth_text,
            attrs.depth_text,
            attrs.mean_depth,
            attrs.average_depth,
            attrs.avg_depth,
            attrs.depth
          );
          const depthTextBase = depthRawPref != null ? String(asText(depthRawPref)) : '';
          const depthText = depthTextBase ? ensureUnit(depthTextBase, 'm') : '';

          // Elevation (prefer explicit text, else raw value; add 'm' if missing)
          const elevRawPref = firstDefined(
            attrs.elevation_text,
            attrs.surface_elevation_text,
            attrs.elevation,
            attrs.surface_elevation,
            attrs.max_elevation,
            attrs.elevation_m
          );
          const elevTextBase = elevRawPref != null ? String(asText(elevRawPref)) : '';
          const elevText = elevTextBase ? ensureUnit(elevTextBase, 'm') : '';

          const makeLakeSentence = () => {
              // Format: "<name> is in <province, region> with the surface area of <area>, average depth of <depth>, and surface elevation of <elev>"
              const parts = [];
              if (loc) parts.push(`${name} is in ${loc}`);
              else parts.push(`${name} is a lake`);
            const details = [];
            if (areaText) details.push(`the surface area of ${areaText}`);
            if (depthText) details.push(`an average depth of ${depthText}`);
            if (elevText) details.push(`a surface elevation of ${elevText}`);

            // If this is an analytical result, ensure the metric value is shown even if
            // explicit fields are missing.
            const attributeUsed = r.attribute_used || attrs.attribute_used || '';
            const metricValue = (attrs.metric_value !== undefined && attrs.metric_value !== null)
              ? attrs.metric_value
              : (r.metric_value !== undefined && r.metric_value !== null ? r.metric_value : null);
            if (attributeUsed && metricValue != null) {
              const metricValText = String(asText(metricValue));
              if (attributeUsed === 'depth' && !depthText) {
                details.push(`a depth of ${ensureUnit(metricValText, 'm')}`);
              } else if (attributeUsed === 'elevation' && !elevText) {
                details.push(`a surface elevation of ${ensureUnit(metricValText, 'm')}`);
              } else if (attributeUsed === 'area_m2' && !areaText) {
                // Convert m² metric into km² with ha in parentheses as requested
                const m2Str = normalizeNumStr(metricValText);
                const km2FromM2 = shiftDecimalStr(m2Str, -6);
                const haFromM2 = shiftDecimalStr(m2Str, -4);
                const areaAnalyticText = km2FromM2 ? `${km2FromM2} km²${haFromM2 ? ` (${haFromM2} ha)` : ''}` : '';
                if (areaAnalyticText) details.push(`the surface area of ${areaAnalyticText}`);
              } else if (attributeUsed === 'shoreline_m') {
                details.push(`a shoreline length of ${ensureUnit(metricValText, 'm')}`);
              }
            }
              if (details.length === 1) parts.push(`with ${details[0]}`);
              else if (details.length > 1) parts.push(`with ${details.slice(0, -1).join(', ')}, and ${details[details.length - 1]}`);
              return parts.join(' ') + '.';
          };

          const makeGenericSentence = () => {
            const detailParts = [];
            if (loc) detailParts.push(loc);
            if (attrs.category) detailParts.push(String(attrs.category));
            if (attrs.source) detailParts.push(String(attrs.source));
            const suffix = detailParts.length ? ` — ${detailParts.join(' • ')}` : '';
            return `${name}${suffix}`;
          };

            // For lakes, always prefer our client-side sentence using raw values to avoid rounding.
            const sentence = entity === 'lakes' ? makeLakeSentence() : makeGenericSentence();

          return (
            <button key={idx}
              onClick={() => onSelect && onSelect(r)}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: '12px 14px', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontWeight: 700, color: '#111827' }}>{name}</div>
                {entity && <span style={{ fontSize: 11, opacity: 0.6, textTransform: 'capitalize', color: '#6B7280' }}>{entity}</span>}
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginTop: 2, lineHeight: 1.35 }}>{sentence}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
