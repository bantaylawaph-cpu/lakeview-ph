import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { yearLabelPlugin } from './shared';

// Ensure required elements/plugins are available when rendering offscreen
try { ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend); } catch {}
try { ChartJS.register(yearLabelPlugin); } catch {}

function deepClone(obj) {
  try { return JSON.parse(JSON.stringify(obj ?? {})); } catch { return {}; }
}

function buildLightOptions(srcOpts = {}) {
  const clone = deepClone(srcOpts);

  const set = (obj, path, val) => {
    const segs = path.split('.');
    let cur = obj;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i];
      if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
      cur = cur[k];
    }
    cur[segs[segs.length - 1]] = val;
  };

  // Legend / titles
  set(clone, 'plugins.legend.labels.color', '#111');
  if (clone?.plugins?.title) set(clone, 'plugins.title.color', '#111');
  if (clone?.plugins?.yearLabelPlugin) set(clone, 'plugins.yearLabelPlugin.color', '#111');

  // Scales
  clone.scales = clone.scales || {};
  const scaleKeys = Object.keys(clone.scales).length ? Object.keys(clone.scales) : ['x', 'y'];
  scaleKeys.forEach((k) => {
    const s = clone.scales[k] || (clone.scales[k] = {});
    s.ticks = { ...(s.ticks || {}), color: '#111' };
    s.grid = { ...(s.grid || {}), color: '#e5e7eb' }; // gray-200
    if (s.title) s.title = { ...(s.title || {}), color: '#111' };
  });

  // Export should not rely on layout changes
  clone.responsive = false;
  clone.maintainAspectRatio = false;
  clone.animation = false;
  return clone;
}

// Returns a data URL for the chart image. Uses offscreen canvas with a white background.
export function exportChartToDataUrl(inst, { format = 'image/png', scale = 1, background = '#ffffff' } = {}) {
  if (!inst) return '';
  try {
    // Compute canvas dimensions using rendered size and DPR
    const srcCanvas = inst.canvas;
    const dpr = inst.currentDevicePixelRatio || (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    const cssW = inst.width || (srcCanvas ? srcCanvas.clientWidth : 0) || 1000;
    const cssH = inst.height || (srcCanvas ? srcCanvas.clientHeight : 0) || 600;
    const pxW = Math.max(1, Math.round(cssW * dpr * (scale || 1)));
    const pxH = Math.max(1, Math.round(cssH * dpr * (scale || 1)));

  const off = document.createElement('canvas');
  off.width = pxW;
  off.height = pxH;

    const data = deepClone(inst.config?.data || inst.data || {});

    // Respect user-toggled legend visibility: only export visible datasets
    try {
      const ds = Array.isArray(data?.datasets) ? data.datasets : [];
      if (ds.length && typeof inst.getDatasetMeta === 'function') {
        const visible = [];
        for (let i = 0; i < ds.length; i++) {
          const metaHidden = inst.getDatasetMeta(i)?.hidden;
          const dataHidden = ds[i]?.hidden;
          const hidden = (metaHidden === true) || (metaHidden == null && dataHidden === true);
          if (!hidden) visible.push(ds[i]);
        }
        data.datasets = visible;
      }
    } catch {}
    const type = inst.config?.type || 'line';
    const lightOptions = buildLightOptions(inst.options || {});

    // Ensure legends for bar charts include lake datasets and thresholds
    try {
      if (String(type).toLowerCase() === 'bar') {
        lightOptions.plugins = lightOptions.plugins || {};
        lightOptions.plugins.legend = lightOptions.plugins.legend || {};
        lightOptions.plugins.legend.display = true;
        // Do not filter legend items; show both lake bars and threshold lines
        if (lightOptions.plugins.legend.labels) {
          const prev = lightOptions.plugins.legend.labels;
          const { filter, ...rest } = prev;
          lightOptions.plugins.legend.labels = { ...rest };
        }
      }
    } catch {}

    // Background painter
    const bgWhitePlugin = {
      id: 'bgWhiteExport',
      beforeDraw: (chart) => {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.fillStyle = background || '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      },
    };

    const tmp = new ChartJS(off.getContext('2d'), {
      type,
      data,
      options: lightOptions,
      plugins: [bgWhitePlugin],
    });
    tmp.update('none');
    const url = off.toDataURL(format);
    tmp.destroy();
    return url;
  } catch (e) {
    try {
      return inst.toBase64Image ? inst.toBase64Image() : inst.canvas?.toDataURL('image/png');
    } catch {
      return '';
    }
  }
}

export function downloadDataUrl(url, filename = 'chart.png') {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportAndDownload(inst, filename, opts = {}) {
  let url = exportChartToDataUrl(inst, opts);
  // Fallback in case of unusual blank/short data URLs
  if (!url || url.length < 2000) {
    try { url = inst.toBase64Image ? inst.toBase64Image() : inst.canvas?.toDataURL('image/png'); } catch {}
  }
  downloadDataUrl(url, filename);
}

export function exportCsvFromChart(chartRefOrInstance, filename = 'chart.csv') {
  try {
    const inst = chartRefOrInstance?.current || chartRefOrInstance;
    const data = inst?.data || inst?.config?.data;
    const labels = Array.isArray(data?.labels) ? data.labels : [];
    const allDatasets = Array.isArray(data?.datasets) ? data.datasets : [];

    const isHidden = (idx) => {
      try {
        const metaHidden = typeof inst?.getDatasetMeta === 'function' ? inst.getDatasetMeta(idx)?.hidden : undefined;
        const dataHidden = allDatasets?.[idx]?.hidden;
        return (metaHidden === true) || (metaHidden == null && dataHidden === true);
      } catch {
        return false;
      }
    };

    // Determine chart type shape: time series vs depth profile
    const isDepthProfile = (() => {
      if (labels && labels.length) return false;
      // If any dataset has points like {x: number, y: number}, treat as depth profile
      for (const ds of allDatasets) {
        const arr = Array.isArray(ds?.data) ? ds.data : [];
        for (const pt of arr) {
          if (pt && typeof pt === 'object' && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
            return true;
          }
        }
      }
      return false;
    })();

    const rows = [];

    if (!isDepthProfile) {
      // Time Series CSV: Bucket + one column per series (exclude Min/Max overlays)
      let datasets = [];
      for (let i = 0; i < allDatasets.length; i++) {
        if (isHidden(i)) continue;
        const ds = allDatasets[i];
        const lbl = String(ds?.label || '').toLowerCase();
        if (lbl === 'min' || lbl === 'max') continue;
        if (ds && ds.type === 'line' && (lbl.includes('min') || lbl.includes('max'))) continue;
        datasets.push(ds);
      }

      const header = ['Bucket', ...datasets.map((d) => String(d?.label || 'Series'))];
      rows.push(header.join(','));
      for (let i = 0; i < labels.length; i++) {
        const bucket = labels[i];
        const vals = datasets.map((d) => {
          const v = Array.isArray(d?.data) ? d.data[i] : null;
          const num = Number(v);
          return Number.isFinite(num) ? String(num) : '';
        });
        rows.push([String(bucket), ...vals].join(','));
      }
    } else {
      // Depth Profile CSV: Rows per depth, columns per month
      const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const isMonth = (s) => monthOrder.includes(s);
      const monthFromLabel = (lbl) => {
        const m = String(lbl || '').match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i);
        return m ? m[1] : null;
      };

      // Collect values by month and depth
      const depths = new Set();
      const monthSet = new Set();
      const values = new Map(); // key: `${month}` -> Map(depth -> value)

      for (let i = 0; i < allDatasets.length; i++) {
        if (isHidden(i)) continue;
        const ds = allDatasets[i];
        const lbl = String(ds?.label || '');
        const isThreshold = (ds && ds.type === 'line') || /\b(min|max)\b/i.test(lbl);
        if (isThreshold) continue;
        const month = monthFromLabel(lbl);
        if (!month || !isMonth(month)) continue;
        monthSet.add(month);
        const arr = Array.isArray(ds?.data) ? ds.data : [];
        for (const pt of arr) {
          if (!pt || typeof pt !== 'object') continue;
          const x = Number(pt.x), y = String(pt.y);
          if (!Number.isFinite(x)) continue;
          depths.add(y);
          const map = values.get(month) || new Map();
          map.set(y, x);
          values.set(month, map);
        }
      }

      const depthList = Array.from(depths).sort((a, b) => Number(a) - Number(b));
      const monthList = monthOrder.filter((m) => monthSet.has(m));

      // Header: Depth (m) + months
      const header = ['Depth (m)', ...monthList];
      rows.push(header.join(','));

      // Rows per depth
      for (const d of depthList) {
        const label = d === '0' ? '0' : String(d);
        const vals = monthList.map((m) => {
          const v = values.get(m)?.get(String(d));
          const num = Number(v);
          return Number.isFinite(num) ? String(num) : '';
        });
        rows.push([label, ...vals].join(','));
      }
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    // silent
  }
}

export default {
  exportChartToDataUrl,
  downloadDataUrl,
  exportAndDownload,
};
