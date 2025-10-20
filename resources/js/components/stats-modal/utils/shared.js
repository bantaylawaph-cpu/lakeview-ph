// Shared helpers to reduce duplication across stats modal components.

// Resolve lake display name from options
export const lakeName = (lakeOptions = [], lakeId) => {
  if (!lakeId) return '';
  try {
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
