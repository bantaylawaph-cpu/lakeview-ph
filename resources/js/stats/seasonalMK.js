// Seasonal Mann–Kendall (SMK) utilities with PAGASA Wet/Dry seasons
// - Seasons: Wet = Jun–Nov (same calendar year), Dry = Dec–May (crosses years)
// - Season-year convention:
//   * Wet-YYYY covers Jun–Nov of YYYY
//   * Dry-YYYY covers Dec of (YYYY-1) and Jan–May of YYYY
// - Aggregation within a season-year: median of available monthly values
// - Include season-year if it has >= 1 valid monthly value

// Lightweight normal CDF loader with local fallback (Abramowitz–Stegun erf approx)
let _normalCdfFn = null;
async function getNormalCdf() {
  if (_normalCdfFn) return _normalCdfFn;
  try {
    const mod = await import('@stdlib/stats-base-dists-normal-cdf');
    const fn = mod?.default || mod;
    // Detect signature and wrap if needed
    try {
      const test = fn(0);
      if (Number.isFinite(test) && test > 0 && test < 1) {
        _normalCdfFn = fn;
      } else {
        const wrapped = (x) => fn(x, 0, 1);
        const t2 = wrapped(0);
        if (Number.isFinite(t2) && t2 > 0 && t2 < 1) {
          _normalCdfFn = wrapped;
        } else {
          throw new Error('unsupported cdf export');
        }
      }
    } catch {
      _normalCdfFn = null;
    }
    if (_normalCdfFn) return _normalCdfFn;
  } catch {}
  // Local approximation
  _normalCdfFn = (x) => {
    const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
    const sign = x < 0 ? -1 : 1;
    const z = Math.abs(x)/Math.SQRT2;
    const t = 1/(1+p*z);
    const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-z*z);
    const erf = sign * y;
    return 0.5 * (1 + erf);
  };
  return _normalCdfFn;
}

const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const PAGASA = {
  // returns 'wet' | 'dry'
  seasonOf(date) {
    const m = date.getMonth(); // 0-11
    // Wet: Jun(5)–Nov(10)
    if (m >= 5 && m <= 10) return 'wet';
    return 'dry'; // Dec–May
  },
  // season-year as defined in header
  seasonYearOf(date) {
    const y = date.getFullYear();
    const m = date.getMonth(); // 0-11
    if (m === 11) return y + 1; // Dec belongs to next year's Dry
    // Jan–May => same year; Jun–Nov => same year
    return y;
  },
};

// Group raw monthly values ({date, value}) by {season, seasonYear}
// aggregator: median of available months per season-year
export function buildSeasonSeriesFromMonthly(monthlyPoints, { scheme = PAGASA } = {}){
  // seasonBuckets: key = `${season}-${year}` -> array of values
  const buckets = new Map();
  for (const p of (monthlyPoints || [])){
    const d = p?.date instanceof Date ? p.date : (p?.date ? new Date(p.date) : null);
    const v = Number(p?.value);
    if (!d || !isFiniteNum(v)) continue;
    const s = scheme.seasonOf(d);
    const sy = scheme.seasonYearOf(d);
    const key = `${s}-${sy}`;
    const arr = buckets.get(key) || [];
    arr.push(v);
    buckets.set(key, arr);
  }
  // Aggregate by median; include if >=1 value
  const seasonSeries = { wet: [], dry: [] };
  for (const [key, arr] of buckets.entries()){
    if (!arr.length) continue;
    const [season, syStr] = key.split('-');
    const y = Number(syStr);
    const sorted = arr.slice().sort((a,b)=>a-b);
    const n = sorted.length;
    const med = (n % 2) ? sorted[(n-1)/2] : (sorted[n/2 - 1] + sorted[n/2]) / 2;
    seasonSeries[season]?.push({ year: y, value: med, count: n });
  }
  // Sort by year
  seasonSeries.wet.sort((a,b)=>a.year-b.year);
  seasonSeries.dry.sort((a,b)=>a.year-b.year);
  return seasonSeries;
}

// Compute MK S and Var for a single seasonal series [{year, value}]
function mkSingleSeason(series){
  const n = series.length;
  if (n < 2) return { n, S: 0, Var: 0 };
  // S
  let S = 0;
  for (let i=0;i<n-1;i++){
    for (let j=i+1;j<n;j++){
      const diff = series[j].value - series[i].value;
      if (diff > 0) S += 1; else if (diff < 0) S -= 1;
    }
  }
  // Var with tie correction based on value ties
  // Build tie groups on values
  const vals = series.map(p=>p.value).slice().sort((a,b)=>a-b);
  let tieSum = 0;
  let i=0;
  while(i<vals.length){
    let j=i+1; while(j<vals.length && Math.abs(vals[j]-vals[i])<1e-12) j++;
    const t = j - i;
    if (t > 1) tieSum += t*(t-1)*(2*t+5);
    i = j;
  }
  const Var = (n*(n-1)*(2*n+5) - tieSum) / 18;
  return { n, S, Var: Math.max(0, Var) };
}

// Seasonal Mann–Kendall across seasons (sum S and Var)
export async function seasonalMK(seasonSeries){
  const parts = [];
  const wet = Array.isArray(seasonSeries?.wet) ? seasonSeries.wet : [];
  const dry = Array.isArray(seasonSeries?.dry) ? seasonSeries.dry : [];
  if (wet.length >= 2) parts.push(mkSingleSeason(wet));
  if (dry.length >= 2) parts.push(mkSingleSeason(dry));
  const S = parts.reduce((s,p)=>s + p.S, 0);
  const Var = parts.reduce((s,p)=>s + p.Var, 0);
  let Z = 0;
  if (Var > 0){
    if (S > 0) Z = (S - 1)/Math.sqrt(Var);
    else if (S < 0) Z = (S + 1)/Math.sqrt(Var);
    else Z = 0;
  }
  const F = await getNormalCdf();
  const pTwo = Var > 0 ? (2 * (1 - F(Math.abs(Z)))) : 1;
  const direction = (pTwo < 0.05) ? (Z > 0 ? 'Increasing' : (Z < 0 ? 'Decreasing' : 'No trend')) : 'No trend';
  const nWet = wet.length, nDry = dry.length;
  const notes = [];
  if (nWet < 3 || nDry < 3) notes.push('Limited seasons: results may be weak');
  if ((nWet + nDry) < 5) notes.push('Short overall record: results may be weak');
  return { S, Var, Z, p_value: Math.max(0, Math.min(1, pTwo)), direction, nWet, nDry, notes };
}

// Sen’s slope (combined across seasons): median of pairwise slopes within each season
export function sensSlopeCombined(seasonSeries){
  const slopes = [];
  const addSlopes = (arr)=>{
    const n = arr.length;
    for (let i=0;i<n-1;i++){
      for (let j=i+1;j<n;j++){
        const dy = arr[j].value - arr[i].value;
        const dt = (arr[j].year - arr[i].year); // years between same season across years
        if (dt !== 0) slopes.push(dy/dt);
      }
    }
  };
  if (Array.isArray(seasonSeries?.wet)) addSlopes(seasonSeries.wet);
  if (Array.isArray(seasonSeries?.dry)) addSlopes(seasonSeries.dry);
  if (!slopes.length) return { slope: 0, intercept: NaN, slopes: [] };
  const srt = slopes.slice().sort((a,b)=>a-b);
  const n = srt.length;
  const slope = (n % 2) ? srt[(n-1)/2] : (srt[n/2 - 1] + srt[n/2]) / 2;
  // Intercept via Theil–Sen: median of (y - slope * t) using all aggregated season points
  const pts = [ ...(seasonSeries?.wet || []), ...(seasonSeries?.dry || []) ];
  const regr = pts.map(p => p.value - slope * p.year).filter(isFiniteNum).sort((a,b)=>a-b);
  const m = regr.length;
  const intercept = m ? ((m % 2) ? regr[(m-1)/2] : (regr[m/2 - 1] + regr[m/2]) / 2) : NaN;
  return { slope, intercept, slopes: srt };
}

// Build monthly points from LakeView events, parameter and station filters
export function monthlyPointsFromEvents(events, { selectedParam, selectedStations = [] }){
  const pts = [];
  const add = (d, v) => pts.push({ date: d, value: v });
  for (const ev of (Array.isArray(events) ? events : [])){
    const d = ev?.sampled_at ? new Date(ev.sampled_at) : null;
    if (!d || isNaN(d)) continue;
    const sName = ev?.station?.name || ev?.station_name || '';
    if (selectedStations?.length && !selectedStations.includes(sName)) continue;
    const results = Array.isArray(ev?.results) ? ev.results : [];
    for (const r of results){
      const p = r?.parameter;
      if (!p) continue;
      const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
      if (!match) continue;
      const v = Number(r.value);
      if (!isFiniteNum(v)) continue;
      add(d, v);
    }
  }
  // Collapse to monthly medians first (robust to multiple samples per month)
  const monthKey = (dt)=> `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
  const byMonth = new Map();
  for (const p of pts){
    const k = monthKey(p.date);
    const arr = byMonth.get(k) || [];
    arr.push(p.value);
    byMonth.set(k, arr);
  }
  const monthly = [];
  for (const [k, arr] of byMonth.entries()){
    const [y, m] = k.split('-').map(Number);
    const sorted = arr.slice().sort((a,b)=>a-b);
    const n = sorted.length;
    const med = (n % 2) ? sorted[(n-1)/2] : (sorted[n/2 - 1] + sorted[n/2]) / 2;
    monthly.push({ date: new Date(y, m-1, 15), value: med }); // 15th as center-of-month
  }
  // Sort
  monthly.sort((a,b)=> a.date - b.date);
  return monthly;
}

// Helper to produce overlay values aligned to chart labels
import { bucketSortKey as _bucketSortKey } from '../components/stats-modal/utils/chartUtils.js';

export function buildOverlayForLabels({ labels, bucket, slopePerYear, intercept }){
  if (!labels || !labels.length || !isFiniteNum(slopePerYear) || !isFiniteNum(intercept)) return Array(labels?.length || 0).fill(null);
  const parseLabelToDecimalYear = (label)=>{
    // label patterns: YYYY, YYYY-Q#, YYYY-MM
    const m = /^([0-9]{4})(?:-(?:Q([1-4])|([0-9]{2})))?$/.exec(label);
    if (!m) return null;
    const y = Number(m[1]);
    if (m[2]) { // quarter
      const q = Number(m[2]);
      return y + (q-1)/4; // start of quarter
    }
    if (m[3]) { // month
      const mo = Number(m[3]);
      return y + (mo-1)/12; // start of month
    }
    return y; // year
  };
  return labels.map(lab => {
    const t = parseLabelToDecimalYear(lab);
    if (t == null) return null;
    return intercept + slopePerYear * t;
  });
}

// High-level: compute SMK + Sen and overlay from events and current selection
export async function computeSMKFromEvents({ events, selectedParam, selectedStations, labels, bucket, alpha = 0.05 }){
  const monthly = monthlyPointsFromEvents(events, { selectedParam, selectedStations });
  const seasonSeries = buildSeasonSeriesFromMonthly(monthly, {});
  const mk = await seasonalMK(seasonSeries);
  const sen = sensSlopeCombined(seasonSeries);
  const overlay = buildOverlayForLabels({ labels, bucket, slopePerYear: sen.slope, intercept: sen.intercept });
  const significant = mk.p_value < alpha;
  const status = significant ? (mk.Z > 0 ? 'Increasing' : (mk.Z < 0 ? 'Decreasing' : 'No trend')) : 'No trend';
  return {
    seasonSeries,
    mk,
    sen,
    overlay,
    alpha,
    status,
  };
}

// Export helpers for unit testing
export function computeSMKFromSeasonSeries(seasonSeries){
  return seasonalMK(seasonSeries);
}
