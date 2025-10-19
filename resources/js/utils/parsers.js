// Centralized spatial file parsing helpers for the Layer Wizard
// Supports: .geojson/.json, .kml, .zip (shapefile), .gpkg (GeoPackage)

import { kml as kmlToGeoJSON } from "@tmcw/togeojson";
import shp from "shpjs";
import { parseGpkgToGeoJSON, GPKG_MAX_SIZE } from "./gpkg";

// Returns a normalized GeoJSON object (Feature or FeatureCollection)
// Throws an Error on invalid inputs.
export async function parseSpatialFile(file) {
  if (!file) throw new Error("No file provided");
  const name = String(file.name || "");
  const lower = name.toLowerCase();

  if (lower.endsWith(".gpkg")) {
    if (typeof file.size === "number" && file.size > GPKG_MAX_SIZE) {
      const mb = Math.round(GPKG_MAX_SIZE / (1024 * 1024));
      throw new Error(`GeoPackage too large for in-browser parsing (max ~${mb}MB).`);
    }
    return await parseGpkgToGeoJSON(file);
  }

  if (lower.endsWith(".kml")) {
    const text = await file.text();
    const dom = new DOMParser().parseFromString(text, "text/xml");
    return kmlToGeoJSON(dom);
  }

  if (lower.endsWith(".zip")) {
    const buf = await file.arrayBuffer();
    let gj = await shp(buf);
    if (!gj || typeof gj !== "object") throw new Error("Invalid shapefile contents");
    if (!gj.type && !gj.features) {
      const all = [];
      for (const key of Object.keys(gj)) {
        const layer = gj[key];
        if (layer && Array.isArray(layer.features)) all.push(...layer.features);
      }
      gj = { type: "FeatureCollection", features: all };
    }
    return gj;
  }

  if (lower.endsWith(".geojson") || lower.endsWith(".json")) {
    const text = await file.text();
    return JSON.parse(text);
  }

  throw new Error("Only .geojson, .json, .kml, .zip (shapefile), or .gpkg are supported.");
}

export const ACCEPTED_EXT_REGEX = /\.(geojson|json|kml|zip|gpkg)$/i;
