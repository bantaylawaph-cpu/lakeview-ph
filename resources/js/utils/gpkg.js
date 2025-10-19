// resources/js/utils/gpkg.js
// Lightweight client-side parser for GeoPackage (.gpkg) using the browser UMD build
// Focus: extract Polygon/MultiPolygon features and produce a FeatureCollection
// Notes:
// - Requires sql-wasm.wasm to be served from /sql-wasm.wasm (copied in postinstall)
// - Requires geopackage.min.js to be served from /geopackage.min.js (copied in postinstall)
// - Intended for single-lake packages; if multiple polygons exist, we include them all

// Max file size to parse client-side (bytes). Larger files should be rejected in UI.
export const GPKG_MAX_SIZE = 30 * 1024 * 1024; // 30 MB

let gpkgReadyPromise = null;
function loadGeoPackageUMD() {
  if (typeof window !== 'undefined' && window.GeoPackage) return Promise.resolve(window.GeoPackage);
  if (gpkgReadyPromise) return gpkgReadyPromise;
  gpkgReadyPromise = new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.src = '/geopackage.min.js';
      script.async = true;
      script.onload = () => {
        try {
          const GP = window.GeoPackage;
          if (!GP) return reject(new Error('Failed to load GeoPackage browser library.'));
          // Point sql.js to fetch the wasm from the site root
          // Always point to the copied wasm at site root
          GP.setSqljsWasmLocateFile?.(() => '/sql-wasm.wasm');
          resolve(GP);
        } catch (e) {
          reject(e);
        }
      };
      script.onerror = () => reject(new Error('Failed to load /geopackage.min.js'));
      document.head.appendChild(script);
    } catch (e) {
      reject(e);
    }
  });
  return gpkgReadyPromise;
}

/**
 * Parse a .gpkg File into a GeoJSON FeatureCollection containing only
 * Polygon/MultiPolygon features. Returns { type: 'FeatureCollection', features: [...] }.
 * Also attempts to read SRID from the table's SRS and, if found, attaches
 * a crs hint to the root object ({ crs: { type: 'name', properties: { name: 'EPSG:xxxx' } } }).
 */
export async function parseGpkgToGeoJSON(file) {
  if (!file) throw new Error("No file provided.");
  const GP = await loadGeoPackageUMD();
  const arrayBuffer = await file.arrayBuffer();
  const u8 = new Uint8Array(arrayBuffer);
  // Support multiple UMD API shapes across versions
  const openFn = (GP && (
    GP.GeoPackageManager?.open ||
    GP.GeoPackageAPI?.open ||
    GP.open
  )) || null;
  if (typeof openFn !== 'function') {
    throw new Error('GeoPackage browser library not initialized (no open() found on GeoPackageManager/GeoPackageAPI). Make sure /geopackage.min.js is loaded.');
  }
  const gp = await openFn(u8);
  try {
  const featureTables = gp.getFeatureTables();
    if (!featureTables || featureTables.length === 0) {
      throw new Error("No feature layers found in the GeoPackage.");
    }

    // Collect polygon features from all feature tables
    let allFeatures = [];
    let detectedEpsg = null;

    for (const table of featureTables) {
      const featureDao = gp.getFeatureDao(table);
      // Prefer built-in GeoJSON iterator if available, else manually convert rows
      if (typeof gp.queryForGeoJSONFeatures === 'function') {
        const rs = gp.queryForGeoJSONFeatures(table);
        for (const feat of rs) {
          const gtype = feat?.geometry?.type;
          if (gtype === "Polygon" || gtype === "MultiPolygon") {
            allFeatures.push(feat);
          }
        }
        rs.close?.();
      } else if (typeof gp.queryForGeoJSONFeaturesInTable === 'function') {
        const rs = gp.queryForGeoJSONFeaturesInTable(table);
        for (const feat of rs) {
          const gtype = feat?.geometry?.type;
          if (gtype === 'Polygon' || gtype === 'MultiPolygon') {
            allFeatures.push(feat);
          }
        }
        rs.close?.();
      } else {
        const srs = featureDao?.srs;
        const iter = featureDao.queryForEach?.();
        if (iter && typeof iter[Symbol.iterator] === 'function') {
          // Resolve row->GeoJSON converter across variants
          const parseRow = GP?.GeoPackage?.parseFeatureRowIntoGeoJSON || GP?.parseFeatureRowIntoGeoJSON;
          if (typeof parseRow !== 'function') {
            throw new Error('GeoPackage browser library missing parseFeatureRowIntoGeoJSON');
          }
          for (const row of iter) {
            const featureRow = featureDao.getRow(row);
            const feat = parseRow(featureRow, srs);
            feat.type = 'Feature';
            const gtype = feat?.geometry?.type;
            if (gtype === 'Polygon' || gtype === 'MultiPolygon') {
              allFeatures.push(feat);
            }
          }
        }
      }

      // Try SRID detection from the table SRS (best-effort)
      try {
        const srs = featureDao?.srs;
        const org = srs?.organization || srs?.organization_name || srs?.organizationName;
        const code = srs?.organization_coordsys_id ?? srs?.organizationCoordsysId ?? srs?.srs_id ?? srs?.srsId;
        if (!detectedEpsg && org && /epsg/i.test(String(org)) && typeof code === "number") {
          detectedEpsg = code;
        }
      } catch (_) {}
    }

    if (!allFeatures.length) {
      throw new Error("No Polygon/MultiPolygon geometries found in the GeoPackage.");
    }

    const fc = { type: "FeatureCollection", features: allFeatures };
    if (detectedEpsg && Number.isInteger(detectedEpsg)) {
      // Add a CRS hint to help our normalizeForPreview detect EPSG
      fc.crs = { type: "name", properties: { name: `EPSG:${detectedEpsg}` } };
    }
    return fc;
  } finally {
    try { gp.close?.(); } catch (_) {}
  }
}
