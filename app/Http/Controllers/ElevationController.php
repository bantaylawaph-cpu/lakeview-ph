<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ElevationController extends Controller
{
    /**
     * POST /api/elevation/profile
     * Body: { geometry: GeoJSON LineString, sampleDistance?: number (meters), maxSamples?: number }
     * Returns: { points: [{distance_m, elevation_m|null, lat, lon}], summary: {...}, sample_distance_m }
     */
    public function profile(Request $request)
    {
        $geom = $request->input('geometry');
        $sampleDistance = (float) ($request->input('sampleDistance') ?? $request->input('sample_distance') ?? 30);
        $maxSamples = (int) ($request->input('maxSamples') ?? $request->input('max_samples') ?? 1500);

        if (!$geom) {
            return response()->json(['error' => 'Missing geometry'], 422);
        }

        // Accept either array/object or JSON string
        if (is_string($geom)) {
            $decoded = json_decode($geom, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $geom = $decoded;
            }
        }

        if (!is_array($geom) || ($geom['type'] ?? null) !== 'LineString' || !isset($geom['coordinates']) || !is_array($geom['coordinates'])) {
            return response()->json(['error' => 'Geometry must be a GeoJSON LineString'], 422);
        }

        // Basic coordinate sanity check
        $coords = $geom['coordinates'];
        if (count($coords) < 2) {
            return response()->json(['error' => 'LineString must have at least two points'], 422);
        }

        // Guardrails
        if ($sampleDistance <= 0) $sampleDistance = 30.0;
        if ($maxSamples < 2) $maxSamples = 2;
        if ($maxSamples > 5000) $maxSamples = 5000; // hard cap

        // Build SQL and evaluate in PostGIS
        // Optimized approach: preselect intersecting tiles once, then use LATERAL for per-point value lookups.
        // Assumptions: de_ph rasters are SRID 4326, mostly 256x256 tiles, with a GiST index on ST_ConvexHull(rast).
        $sql = <<<'SQL'
WITH input AS (
    SELECT ST_SetSRID(ST_GeomFromGeoJSON(:gj)::geometry, 4326) AS g
), L AS (
    SELECT g, ST_Length(g::geography) AS meters FROM input
), P AS (
    SELECT g, meters,
           GREATEST(2, LEAST(:maxSamples::int, CEIL(meters / :step)::int + 1)) AS n
    FROM L
), series AS (
    SELECT i, (i::double precision - 1) / (p.n - 1) AS t, p.g, p.meters
    FROM P p, generate_series(1, (SELECT n FROM P)) AS s(i)
), pts AS (
    SELECT i, t, meters, ST_LineInterpolatePoint(g, t) AS pt4326
    FROM series
), tiles AS (
    -- Prefilter tiles that intersect the line once; leverages the GiST index
    SELECT r.rid, r.rast
    FROM public.de_ph r, input
    WHERE ST_Intersects(r.rast, input.g)
), samp AS (
    SELECT
        p.i,
        p.t,
        p.meters,
        ST_X(p.pt4326) AS lon,
        ST_Y(p.pt4326) AS lat,
        v.elev
    FROM pts p
    LEFT JOIN LATERAL (
        SELECT ST_Value(r.rast, 1, p.pt4326) AS elev
        FROM tiles r
        WHERE ST_Intersects(r.rast, p.pt4326)
        LIMIT 1
    ) v ON true
)
SELECT i, t, lon, lat, elev,
       (t * meters) AS distance_m
FROM samp
ORDER BY i;
SQL;

        try {
            // Add a short statement timeout to avoid long-running queries piling up
            try { DB::statement("SET LOCAL statement_timeout = '8000ms'"); } catch (\Throwable $e) {}
            // Ensure GDAL drivers and out-db rasters are enabled for this session (harmless if in-DB)
            try { DB::statement("SET LOCAL postgis.gdal_enabled_drivers = 'ENABLE_ALL'"); } catch (\Throwable $e) {}
            try { DB::statement("SET LOCAL postgis.enable_outdb_rasters = 'on'"); } catch (\Throwable $e) {}
            $rows = DB::select($sql, [
                'gj' => json_encode($geom),
                'step' => $sampleDistance,
                'maxSamples' => $maxSamples,
            ]);
        } catch (\Throwable $e) {
            Log::error('Elevation profile query failed', ['error' => $e->getMessage()]);
            // Surface error for easier local debugging; you can hide message in prod if desired
            return response()->json(['error' => 'Query failed', 'detail' => $e->getMessage()], 500);
        }

        $points = [];
        $min = null; $max = null; $gain = 0.0; $loss = 0.0; $lastElev = null; $lastDist = null;
        foreach ($rows as $r) {
            $elev = isset($r->elev) ? (is_numeric($r->elev) ? (float)$r->elev : null) : null;
            $dist = isset($r->distance_m) ? (float)$r->distance_m : 0.0;
            $lat = isset($r->lat) ? (float)$r->lat : null;
            $lon = isset($r->lon) ? (float)$r->lon : null;

            $points[] = [
                'distance_m' => $dist,
                'elevation_m' => $elev,
                'lat' => $lat,
                'lon' => $lon,
            ];

            if ($elev !== null) {
                $min = $min === null ? $elev : min($min, $elev);
                $max = $max === null ? $elev : max($max, $elev);
                if ($lastElev !== null) {
                    $delta = $elev - $lastElev;
                    if ($delta > 0) $gain += $delta;
                    elseif ($delta < 0) $loss += abs($delta);
                }
                $lastElev = $elev;
            } else {
                // break the ascent/descent continuity on nulls
                $lastElev = null;
            }
            $lastDist = $dist;
        }

        $length = $lastDist ?? 0.0;

        return response()->json([
            'points' => $points,
            'summary' => [
                'length_m' => $length,
                'min_elev_m' => $min,
                'max_elev_m' => $max,
                'total_ascent_m' => round($gain, 2),
                'total_descent_m' => round($loss, 2),
            ],
            'sample_distance_m' => $sampleDistance,
        ]);
    }
}
