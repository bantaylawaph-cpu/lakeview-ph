// Lightweight Nominatim client for fetching lake geometries (GeoJSON)
// Notes:
// - For low-volume, client-side use. Consider proxying via backend with caching for production.
// - Nominatim usage policy: be gentle, include a clear Referer, and cache responses.

const _cache = new Map(); // key -> { ts, data }
const TTL = 24 * 60 * 60 * 1000; // 24h cache

function cacheGet(key) {
  const v = _cache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > TTL) { _cache.delete(key); return null; }
  return v.data;
}
function cacheSet(key, data) { _cache.set(key, { ts: Date.now(), data }); }

function normalizeName(name = "") {
  return String(name || "").trim();
}

function buildSearchUrl({ q, countryCodes = "ph", limit = 5 }) {
  const usp = new URLSearchParams({
    format: "geojson",
    polygon_geojson: "1",
    addressdetails: "1",
    namedetails: "1",
    q,
    limit: String(limit)
  });
  if (countryCodes) usp.append("countrycodes", countryCodes);
  return `https://nominatim.openstreetmap.org/search?${usp.toString()}`;
}

function isWaterFeature(props = {}) {
  // Heuristics: prefer lakes/reservoirs/water
  const cls = String(props.class || props["@class"] || "").toLowerCase();
  const typ = String(props.type || props["@type"] || "").toLowerCase();
  const cat = `${cls}:${typ}`;
  if (cls === "water" || cls === "natural" || cls === "landuse") {
    if (typ.includes("lake")) return true;
    if (typ.includes("reservoir")) return true;
    if (typ.includes("water")) return true;
    if (typ.includes("riverbank")) return true;
  }
  // fallback: namedetails/category waterbody
  if (props.extratags && (props.extratags.water || props.extratags.waterway)) return true;
  // loose fallback
  return /water|lake|reservoir|river/i.test(cat);
}

function pickBestFeature(features = [], wantedName = "") {
  if (!Array.isArray(features) || !features.length) return null;
  const polys = features.filter(f => f && f.geometry && /Polygon/i.test(f.geometry.type || ""));
  if (!polys.length) return null;
  const w = wantedName.toLowerCase();
  // Score features: name match + water-ness + area (approx by coords length)
  const scored = polys.map(f => {
    const p = f.properties || {};
    const nm = String(p.display_name || p.name || "").toLowerCase();
    const nameScore = w && nm.includes(w) ? 10 : 0;
    const waterScore = isWaterFeature(p) ? 5 : 0;
    // Rough complexity as proxy for size
    let sizeScore = 0;
    try {
      const g = f.geometry;
      if (g.type === 'Polygon') sizeScore = (g.coordinates?.[0]?.length || 0) / 100;
      if (g.type === 'MultiPolygon') sizeScore = (g.coordinates?.reduce((s, poly)=> s + (poly?.[0]?.length || 0), 0) || 0) / 100;
    } catch {}
    return { f, score: nameScore + waterScore + sizeScore };
  });
  scored.sort((a,b) => b.score - a.score);
  return scored[0]?.f || polys[0];
}

/**
 * Search Nominatim for a lake geometry by name.
 * Returns a GeoJSON Feature (Polygon/MultiPolygon) or null.
 */
export async function searchLakeGeometry({ name, countryHint = "Philippines", countryCodes = "ph", limit = 5 } = {}) {
  const clean = normalizeName(name);
  if (!clean) return null;
  // Try with country appended for better precision
  const queries = [`${clean}, ${countryHint}`.trim(), clean];
  for (const q of queries) {
    const key = `search:${q}|cc=${countryCodes}|lim=${limit}`;
    const cached = cacheGet(key);
    if (cached !== undefined && cached !== null) {
      if (!cached) continue; // cached miss
      return cached;
    }
    const url = buildSearchUrl({ q, countryCodes, limit });
    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) { cacheSet(key, null); continue; }
      const data = await res.json();
      const feat = pickBestFeature(data?.features || [], clean);
      if (feat) { cacheSet(key, feat); return feat; }
      cacheSet(key, null);
    } catch (_) {
      cacheSet(key, null);
    }
  }
  return null;
}
