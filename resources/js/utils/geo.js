// resources/js/utils/geo.js
import proj4 from "proj4";
import L from "leaflet";

/**
 * Tolerant flattener: GeoJSON (Polygon/MultiPolygon/Feature/FeatureCollection)
 * → MultiPolygon (polygon-only). Ignores non-polygon features.
 * Throws if no polygonal geometries are found.
 */
export const toMultiPolygon = (geojson) => {
  if (!geojson || typeof geojson !== "object") throw new Error("Invalid GeoJSON");
  const t = (geojson.type || "").toLowerCase();

  const asMP = (g) => {
    if (!g) throw new Error("Feature has no geometry");
    const gt = (g.type || "").toLowerCase();
    if (gt === "polygon") return { type: "MultiPolygon", coordinates: [g.coordinates] };
    if (gt === "multipolygon") return { type: "MultiPolygon", coordinates: g.coordinates };
    return null; // ignore non-polygons
  };

  if (t === "polygon" || t === "multipolygon") return asMP(geojson);

  if (t === "feature") {
    const mp = asMP(geojson.geometry);
    if (!mp) throw new Error("Only Polygon/MultiPolygon geometries are supported.");
    return mp;
  }

  if (t === "featurecollection") {
    const polys = [];
    for (const f of geojson.features || []) {
      const mp = asMP(f?.geometry);
      if (mp) polys.push(...mp.coordinates);
    }
    if (!polys.length) throw new Error("No polygonal geometries found in the file.");
    return { type: "MultiPolygon", coordinates: polys };
  }

  throw new Error("Unsupported GeoJSON type. Provide Polygon/MultiPolygon/Feature/FeatureCollection.");
};

/** Detect EPSG from common GeoJSON crs encodings (name/URN/link/old code). */
export const detectEpsg = (root) => {
  if (!root || typeof root !== "object") return null;
  const crs = root.crs || {};
  const props = crs.properties || {};
  const name = (props.name || crs.name || "").toString();
  const href = (props.href || "").toString();

  // CRS84 → treat as 4326
  if (/CRS84/i.test(name) || /CRS84/i.test(href)) return 4326;

  // "EPSG:4326", "urn:ogc:def:crs:EPSG::32651"
  let m = name.match(/EPSG(?:::|:)\s*(\d{3,5})/i);
  if (m) return parseInt(m[1], 10);

  // Links like "https://epsg.io/32651"
  m = href.match(/epsg\.io\/(\d{3,5})/i);
  if (m) return parseInt(m[1], 10);

  // Old style: { "type": "EPSG", "properties": { "code": 32651 } }
  if (crs.type && /epsg/i.test(crs.type) && typeof props.code === "number") {
    return props.code;
  }
  return null;
};

/** Heuristic: coordinates look like lon/lat degrees? */
export const looksLikeDegrees = (mp) => {
  try {
    let n = 0, ok = 0;
    for (const poly of mp.coordinates || []) {
      for (const ring of poly || []) {
        for (const pt of ring || []) {
          if (!Array.isArray(pt) || pt.length < 2) continue;
          const [x, y] = pt;
          if (typeof x !== "number" || typeof y !== "number") continue;
          n++;
          if (x >= -180 && x <= 180 && y >= -90 && y <= 90) ok++;
          if (n >= 80) break;
        }
        if (n >= 80) break;
      }
      if (n >= 80) break;
    }
    return n > 0 && ok / n > 0.9;
  } catch {
    return false;
  }
};

/**
 * If data is already degree-like but XY are flipped (lat,lon),
 * fix to (lon,lat) for preview.
 */
export const maybeSwapXY = (mp) => {
  try {
    let n = 0, latLonish = 0;
    for (const poly of mp.coordinates || []) {
      for (const ring of poly || []) {
        for (const [x, y] of ring || []) {
          if (typeof x !== "number" || typeof y !== "number") continue;
          n++;
          if (Math.abs(y) > 90 && Math.abs(x) <= 90) latLonish++; // looks like [lat, lon]
          if (n >= 80) break;
        }
        if (n >= 80) break;
      }
      if (n >= 80) break;
    }
    if (n && latLonish / n > 0.6) {
      return {
        type: "MultiPolygon",
        coordinates: mp.coordinates.map(poly =>
          poly.map(ring => ring.map(([x, y, ...rest]) => [y, x, ...rest]))
        ),
      };
    }
  } catch {}
  return mp;
};

/** Minimal proj defs for common cases (extend if you need more). */
export const projDefFor = (epsg) => {
  if (epsg === 4326) return null; // WGS84 degrees
  if (epsg === 3857)
    return "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +units=m +no_defs +type=crs";
  // UTM WGS84 (north)
  if (epsg >= 32601 && epsg <= 32660) {
    const zone = epsg - 32600;
    return `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs +type=crs`;
  }
  // UTM WGS84 (south)
  if (epsg >= 32701 && epsg <= 32760) {
    const zone = epsg - 32700;
    return `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs +type=crs`;
  }
  return null; // unknown: preview will stay as-is (likely off-map if not degrees)
};

/** Reproject MultiPolygon from EPSG:* → 4326 for Leaflet preview. */
export const reprojectMultiPolygonTo4326 = (mp, fromEPSG) => {
  const def = projDefFor(fromEPSG);
  if (!def || !mp?.coordinates) return mp;
  const to = proj4.WGS84;
  return {
    type: "MultiPolygon",
    coordinates: mp.coordinates.map(poly =>
      poly.map(ring =>
        ring.map(([x, y, ...rest]) => {
          const [lon, lat] = proj4(def, to, [x, y]);
          return [lon, lat, ...rest];
        })
      )
    ),
  };
};

/** Guess SRID if none: prefer 4326 if deg-like; else default UTM zone 51N (PH). */
export const autoGuessEpsg = (mp) => (looksLikeDegrees(mp) ? 4326 : 32651);

/**
 * Given a parsed GeoJSON object:
 *  - returns original polygon(s) as MultiPolygon (`uploadGeom`)
 *  - returns a preview geometry in EPSG:4326 (`previewGeom`)
 *  - returns detected/assumed source SRID (`sourceSrid`)
 */
export const normalizeForPreview = (parsed) => {
  const uploadGeom = toMultiPolygon(parsed);
  let sourceSrid = detectEpsg(parsed);
  if (!sourceSrid) sourceSrid = autoGuessEpsg(uploadGeom);

  let previewGeom =
    sourceSrid !== 4326 ? reprojectMultiPolygonTo4326(uploadGeom, sourceSrid) : maybeSwapXY(uploadGeom);

  return { uploadGeom, previewGeom, sourceSrid };
};

/** Leaflet bounds helper for (Multi)Polygon geometry objects. */
export const boundsFromGeom = (geom) => {
  try {
    return L.geoJSON({ type: "Feature", geometry: geom }).getBounds();
  } catch {
    return null;
  }
};
