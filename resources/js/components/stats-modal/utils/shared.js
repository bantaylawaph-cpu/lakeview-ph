// Shared helpers to reduce duplication across stats modal components.

// Resolve lake display name from options
export const lakeName = (lakeOptions = [], lakeId) => {
  if (!lakeId) return '';
  try {
    if (String(lakeId) === 'custom') return 'Custom dataset';
    return lakeOptions.find((x) => String(x.id) === String(lakeId))?.name || String(lakeId);
  } catch {
    return String(lakeId);
  }
};

// Resolve lake class code/name from options
export const lakeClass = (lakeOptions = [], lakeId) => {
  if (!lakeId) return '';
  try {
    const f = lakeOptions.find((x) => String(x.id) === String(lakeId));
    return f?.class_code || f?.class || f?.water_class || f?.classification || '';
  } catch {
    return '';
  }
};

// Base line chart options for dark background time/line charts
export const baseLineChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { color: '#fff', boxWidth: 8, font: { size: 10 } } },
    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}` } },
  },
  scales: {
    x: { ticks: { color: '#fff', maxRotation: 0, autoSkip: true, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
    y: { ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.15)' } },
  },
});

// Plugin: draw year labels below grouped bar ranges when provided meta information.
export const yearLabelPlugin = {
  id: 'yearLabelPlugin',
  afterDraw: (chart, _args, pluginOptions) => {
    try {
      const meta = pluginOptions?.meta || (chart.options && chart.options.plugins && chart.options.plugins.yearLabelPlugin && chart.options.plugins.yearLabelPlugin.meta);
      if (!meta) return;
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      if (!ctx || !chartArea) return;

      const yearOrder = Array.isArray(meta.yearOrder) ? meta.yearOrder : (meta.yearIndexMap ? Object.keys(meta.yearIndexMap) : []);
      const yearIndexMap = meta.yearIndexMap || {};

      // determine category count from first visible dataset
      const firstMeta = chart.getDatasetMeta(0);
      const categoryCount = (firstMeta && Array.isArray(firstMeta.data)) ? firstMeta.data.length : 0;
      if (!categoryCount) return;

      ctx.save();
      const color = pluginOptions?.color || '#fff';
      const fontSize = pluginOptions?.fontSize || 11;
      const insidePadding = pluginOptions?.paddingInside ?? 14; // draw inside chart area, just above x-axis
      const bg = pluginOptions?.bg || null; // e.g., 'rgba(0,0,0,0.35)'
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      for (const y of yearOrder) {
        const idxs = yearIndexMap[String(y)] || [];
        if (!idxs.length) continue;

        for (let ci = 0; ci < categoryCount; ci++) {
          let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
          idxs.forEach((i) => {
            const dsMeta = chart.getDatasetMeta(i);
            if (!dsMeta || !Array.isArray(dsMeta.data) || dsMeta.hidden) return;
            const el = dsMeta.data[ci];
            if (!el) return;
            const left = typeof el.left === 'number' ? el.left : (typeof el.x === 'number' && typeof el.width === 'number' ? (el.x - el.width / 2) : null);
            const right = typeof el.right === 'number' ? el.right : (typeof el.x === 'number' && typeof el.width === 'number' ? (el.x + el.width / 2) : null);
            if (left != null) min = Math.min(min, left);
            if (right != null) max = Math.max(max, right);
          });
          if (min === Number.POSITIVE_INFINITY || max === Number.NEGATIVE_INFINITY) continue;
          const center = (min + max) / 2;
          const yPos = chartArea.bottom - insidePadding;

          if (bg) {
            const text = String(y);
            const w = ctx.measureText(text).width + 6;
            const h = fontSize + 2;
            ctx.save();
            ctx.fillStyle = bg;
            ctx.fillRect(center - w / 2, yPos - h + 3, w, h);
            ctx.restore();
          }
          ctx.fillText(String(y), center, yPos);
        }
      }

      ctx.restore();
    } catch (e) {
      // non-fatal: do not break chart rendering
    }
  }
};

// Parse threshold standards presence from dataset labels
// Supports labels like "<Std> – Min/Max" or "<Lake> – <Std> – Min/Max"
export const parseThresholdStandardsFromDatasets = (datasets = []) => {
  const map = new Map();
  datasets.forEach((d) => {
    const label = d?.label || '';
    const parts = String(label).split(' – ');
    let std = null; let kind = null;
    if (parts.length === 2) { [std, kind] = parts; }
    else if (parts.length === 3) { [, std, kind] = parts; }
    if (!std || !kind) return;
    if (!/^Min$/i.test(kind) && !/^Max$/i.test(kind)) return;
    const rec = map.get(std) || { code: std, min: null, max: null };
    if (/^Min$/i.test(kind)) rec.min = 1;
    if (/^Max$/i.test(kind)) rec.max = 1;
    map.set(std, rec);
  });
  return Array.from(map.values());
};

// Normalize depth points to {x, y} objects and disable parsing safely
export const normalizeDepthDatasets = (datasets = []) => {
  const normalizePoint = (pt) => {
    if (pt == null) return null;
    if (typeof pt === 'number') {
      const x = Number(pt);
      return Number.isFinite(x) ? { x, y: 0 } : null;
    }
    if (typeof pt === 'object') {
      const x = Number(pt.x ?? pt.value ?? NaN);
      const y = Number(pt.y ?? pt.depth ?? NaN);
      return (Number.isFinite(x) && Number.isFinite(y)) ? { x, y } : null;
    }
    return null;
  };
  return datasets.map((ds) => {
    const raw = Array.isArray(ds.data) ? ds.data : [];
    const mapped = raw.map(normalizePoint).filter((p) => p !== null);
    return { ...ds, data: mapped, parsing: false };
  }).filter((ds) => Array.isArray(ds.data) && ds.data.length);
};
