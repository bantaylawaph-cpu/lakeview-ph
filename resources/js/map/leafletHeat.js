import L from 'leaflet';
import 'leaflet.heat';
import axios from 'axios';

// Ensure the heat layer's canvas 2D context is created with willReadFrequently to avoid
// the getImageData performance warning in browsers. We scope this to canvases whose
// className contains 'leaflet-heatmap-layer' to avoid global side effects.
(() => {
  try {
    if (typeof window !== 'undefined' && typeof HTMLCanvasElement !== 'undefined' && !window.__lvPatchHeatCtx) {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, opts) {
        if (type === '2d') {
          const cls = (this && this.className) ? String(this.className) : '';
          if (cls.includes('leaflet-heatmap-layer')) {
            const merged = { ...(opts || {}), willReadFrequently: true };
            try { return orig.call(this, type, merged); } catch { /* fallthrough */ }
          }
        }
        return orig.call(this, type, opts);
      };
      window.__lvPatchHeatCtx = true;
    }
  } catch {}
})();

export function createHeatLayer(points = []) {
  // points: [ [lat, lon, weight], ... ] — leaflet.heat expects [lat, lon, intensity]
  const layer = L.heatLayer(points, {
    minOpacity: 0.2,
    radius: 18,
    blur: 15,
    maxZoom: 17,
  });
  // Hint the browser that we read pixels frequently to avoid the console notice.
  // This touches internal props of leaflet.heat but is safe in practice.
  layer.once('add', () => {
    try {
      if (layer._canvas && layer._canvas.getContext) {
        const ctx = layer._canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) layer._ctx = ctx;
      }
    } catch {}
  });
  layer.__setData = (pts) => {
    try { layer.setLatLngs(pts || []); } catch {}
  };
  return layer;
}

// Normalize raw population values to [0,1] intensities for Leaflet.heat.
// Uses a robust cap at the 95th percentile and sqrt compression to reduce outlier dominance.
function normalizeHeat(points) {
  // points: [ [lat, lon, value], ... ]
  if (!Array.isArray(points) || points.length === 0) return [];
  const vals = [];
  for (const p of points) {
    const v = Array.isArray(p) ? Number(p[2]) : NaN;
    if (Number.isFinite(v) && v > 0) vals.push(v);
  }
  if (vals.length === 0) return points.map(([lat, lon]) => [lat, lon, 0]);

  vals.sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(vals.length - 1, Math.floor(0.95 * (vals.length - 1))));
  const p95 = vals[idx] || vals[vals.length - 1] || 1;
  const cap = p95 > 0 ? p95 : 1;

  // sqrt compression improves visual contrast for mid-range values
  const compress = (x) => Math.sqrt(Math.max(0, Math.min(1, x)));

  return points.map((p) => {
    const lat = Number(p?.[0]);
    const lon = Number(p?.[1]);
    const val = Number(p?.[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(val)) return null;
    const norm = compress(val / cap);
    return [lat, lon, norm];
  }).filter(Boolean);
}

export async function fetchPopPoints({ lakeId, year = 2025, radiusKm = 2, layerId = null, bbox = null, maxPoints = 6000 }, opts = {}) {
  const params = { lake_id: lakeId, year, radius_km: radiusKm, max_points: maxPoints };
  if (layerId) params.layer_id = layerId;
  if (bbox) params.bbox = bbox;
  const axiosOpts = {};
  if (opts && opts.signal) axiosOpts.signal = opts.signal;
  if (typeof opts?.onProgress === 'function') {
    axiosOpts.onDownloadProgress = (evt) => {
      try {
        const total = evt.total || 0;
        if (total > 0) {
          const percent = Math.max(0, Math.min(1, evt.loaded / total));
          opts.onProgress(percent);
        } else {
          opts.onProgress(null); // indeterminate
        }
      } catch {}
    };
  }
  const { data } = await axios.get('/api/population/points', { params, ...axiosOpts });
  const raw = Array.isArray(data?.points) ? data.points : [];
  return normalizeHeat(raw);
}
