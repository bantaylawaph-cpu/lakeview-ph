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
// Internal: approximate 95th percentile using sampling for large arrays (>1500)
function approxP95(values) {
  const n = values.length;
  if (n === 0) return 1;
  if (n < 1500) {
    const sorted = values.slice().sort((a,b)=>a-b);
    return sorted[Math.floor(0.95 * (sorted.length - 1))] || sorted[sorted.length-1] || 1;
  }
  // Reservoir sample up to 1024 values
  const k = 1024;
  const sample = [];
  for (let i=0;i<n;i++) {
    const v = values[i];
    if (!Number.isFinite(v) || v <= 0) continue;
    if (sample.length < k) sample.push(v); else {
      const j = Math.floor(Math.random() * (i+1));
      if (j < k) sample[j] = v;
    }
  }
  if (sample.length === 0) return 1;
  sample.sort((a,b)=>a-b);
  return sample[Math.floor(0.95 * (sample.length - 1))] || sample[sample.length-1] || 1;
}

function normalizeHeat(points) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const vals = [];
  for (const p of points) {
    const v = Array.isArray(p) ? Number(p[2]) : NaN;
    if (Number.isFinite(v) && v > 0) vals.push(v);
  }
  if (vals.length === 0) return points.map(([lat, lon]) => [lat, lon, 0]);
  const p95 = approxP95(vals);
  const cap = p95 > 0 ? p95 : 1;
  const compress = (x) => Math.sqrt(Math.max(0, Math.min(1, x)));
  return points.map((p) => {
    const lat = Number(p?.[0]);
    const lon = Number(p?.[1]);
    const val = Number(p?.[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(val)) return null;
    return [lat, lon, compress(val / cap)];
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
  const normalized = normalizeHeat(raw);
  return { raw, normalized };
}

// Progressive fetching: first a small quick sample, then full dataset.
// options: same as fetchPopPoints plus smallPoints (default 1200)
// callbacks: { onIntermediate(intensityPoints), onFinal(intensityPoints) }
export function fetchPopPointsProgressive(params, callbacks = {}, opts = {}) {
  const { smallPoints = 1200 } = params;
  const controller = new AbortController();
  const outerSignal = opts.signal;
  function linkSignal(abortable) {
    if (outerSignal) {
      if (outerSignal.aborted) abortable.abort();
      else outerSignal.addEventListener('abort', () => abortable.abort(), { once: true });
    }
  }
  linkSignal(controller);

  const run = (async () => {
    try {
      const small = await fetchPopPoints({ ...params, maxPoints: smallPoints }, { signal: controller.signal });
      callbacks.onIntermediate?.(small);
      if (controller.signal.aborted) return;
      if (smallPoints >= (params.maxPoints || 6000)) {
        callbacks.onFinal?.(small);
        return;
      }
      const full = await fetchPopPoints({ ...params }, { signal: controller.signal });
      if (!controller.signal.aborted) callbacks.onFinal?.(full);
    } catch (e) {
      if (!controller.signal.aborted) callbacks.onError?.(e);
    }
  })();
  return { abort: () => controller.abort(), promise: run };
}
