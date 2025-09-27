<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class PopulationController extends Controller
{
    /**
     * GET /api/population/estimate
     * Query params: lake_id (int, required), radius_km (float, default 2.0), year (int, default 2025), layer_id (int|null)
     * Returns JSON with estimated population using pop_estimate_counts_by_year_cached.
     */
    public function estimate(Request $request)
    {
        $validated = $request->validate([
            'lake_id'   => 'required|integer|min:1',
            'radius_km' => 'numeric|min:0.1|max:50',
            'year'      => 'integer|min:1900|max:3000',
            'layer_id'  => 'nullable|integer|min:1',
        ]);

        $lakeId   = (int) ($validated['lake_id'] ?? 0);
        $radiusKm = isset($validated['radius_km']) ? (float) $validated['radius_km'] : 2.0;
        $year     = isset($validated['year']) ? (int) $validated['year'] : 2025;
        $layerId  = $validated['layer_id'] ?? null;

        try {
            $sql = 'SELECT public.pop_estimate_counts_by_year_cached(?, ?, ?, ?) AS pop';
            $bindings = [$lakeId, $radiusKm, $year, $layerId];
            $row = DB::selectOne($sql, $bindings);
            $pop = $row?->pop;

            // Round to nearest integer for UI display
            $estimate = is_null($pop) ? null : (int) round((float) $pop);

            return response()->json([
                'lake_id'   => $lakeId,
                'year'      => $year,
                'radius_km' => $radiusKm,
                'layer_id'  => $layerId ? (int) $layerId : null,
                'estimate'  => $estimate,
                'source'    => 'worldpop',
                'product'   => 'counts_1km',
                'method'    => $layerId ? 'raster_counts:year:layer' : 'raster_counts:year:active',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Failed to compute estimate',
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /api/tiles/pop/{z}/{x}/{y}
     * Serves an MVT tile for population points clipped to lake ring buffer.
     * Query params: lake_id (int, required), radius_km (float, default 2.0), year (int, default 2025), layer_id (int|null)
     */
    public function tile($z, $x, $y, Request $request)
    {
        $validated = $request->validate([
            'lake_id'   => 'required|integer|min:1',
            'radius_km' => 'numeric|min:0.1|max:50',
            'year'      => 'integer|min:1900|max:3000',
            'layer_id'  => 'nullable|integer|min:1',
        ]);

        $lakeId   = (int) ($validated['lake_id'] ?? 0);
        $radiusKm = isset($validated['radius_km']) ? (float) $validated['radius_km'] : 2.0;
        $year     = isset($validated['year']) ? (int) $validated['year'] : 2025;
        $layerId  = $validated['layer_id'] ?? null;

        try {
            $sql = 'SELECT public.pop_mvt_tile_by_year(?, ?, ?, ?, ?, ?, ?) AS tile';
            $bindings = [
                (int) $z,
                (int) $x,
                (int) $y,
                $lakeId,
                $radiusKm,
                $year,
                $layerId,
            ];
            $row = DB::selectOne($sql, $bindings);
            $tile = $row?->tile;

            if (!$tile) {
                return response('', Response::HTTP_NO_CONTENT, [
                    'Content-Type' => 'application/vnd.mapbox-vector-tile',
                    'Content-Encoding' => 'identity',
                    'Cache-Control' => 'public, max-age=60',
                ]);
            }

            return response($tile, Response::HTTP_OK, [
                'Content-Type' => 'application/vnd.mapbox-vector-tile',
                'Content-Encoding' => 'identity',
                'Cache-Control' => 'public, max-age=3600',
            ]);
        } catch (\Throwable $e) {
            return response('Tile error', Response::HTTP_INTERNAL_SERVER_ERROR, [
                'Content-Type' => 'text/plain',
            ]);
        }
    }

    /**
     * GET /api/population/points
     * Query params: lake_id (int, required), radius_km (float, default 2), year (int, default 2025), layer_id (int|null),
     * optional bbox (minLon,minLat,maxLon,maxLat) to limit points for performance.
     * Returns JSON: { points: [ [lat, lon, weight], ... ] }
     */
    public function points(Request $request)
    {
        $validated = $request->validate([
            'lake_id'   => 'required|integer|min:1',
            'radius_km' => 'numeric|min:0.1|max:50',
            'year'      => 'integer|min:1900|max:3000',
            'layer_id'  => 'nullable|integer|min:1',
            'bbox'      => 'nullable|string', // minLon,minLat,maxLon,maxLat
            'max_points'=> 'nullable|integer|min:100|max:20000',
        ]);

        $lakeId   = (int) ($validated['lake_id'] ?? 0);
        $radiusKm = isset($validated['radius_km']) ? (float) $validated['radius_km'] : 2.0;
        $year     = isset($validated['year']) ? (int) $validated['year'] : 2025;
        $layerId  = $validated['layer_id'] ?? null;
        $maxPts   = isset($validated['max_points']) ? (int) $validated['max_points'] : 6000;
        $bbox     = $validated['bbox'] ?? null;

        try {
            // Resolve table for year
            $tbl = DB::selectOne('SELECT public.pop_table_for_year(?) AS t', [$year]);
            $t = $tbl?->t;
            if (!$t) return response()->json(['points' => []]);

            // Parse bbox if present
            $bboxGeomSQL = null;
            $bindings = [];
            if ($bbox) {
                $parts = array_map('trim', explode(',', $bbox));
                if (count($parts) === 4) {
                    [$minLon, $minLat, $maxLon, $maxLat] = $parts;
                    $bboxGeomSQL = 'ST_MakeEnvelope(?, ?, ?, ?, 4326)';
                    array_push($bindings, (float)$minLon, (float)$minLat, (float)$maxLon, (float)$maxLat);
                }
            }

            // Compose SQL dynamic with fully-qualified table name if needed
            $qname = $t;
            if (!str_contains($t, '.')) {
                $qname = '"' . str_replace('"', '""', $t) . '"';
            }

            $sql = "WITH ring AS (
                SELECT public.fn_lake_ring_resolved(?, ?, ?) AS g
            ), env AS (
                SELECT " . ($bboxGeomSQL ?: 'NULL::geometry') . " AS g
            ), tiles AS (
              SELECT ST_Clip(rast, COALESCE((SELECT g FROM env), (SELECT g FROM ring))) rast
              FROM $qname r
              WHERE ST_Intersects(r.rast, (SELECT g FROM ring))
                AND ( (SELECT g FROM env) IS NULL OR ST_Intersects(r.rast, (SELECT g FROM env)) )
            ), pts AS (
              SELECT (pp).geom::geometry(Point,4326) AS g,
                     NULLIF((pp).val::float8, ST_BandNoDataValue(rast,1)) AS pop
              FROM tiles CROSS JOIN LATERAL ST_PixelAsPoints(rast,1) pp
              WHERE (pp).val IS NOT NULL
            ), clipped AS (
              SELECT g, pop FROM pts WHERE pop IS NOT NULL AND ST_Intersects(g, (SELECT g FROM ring))
            ), sampled AS (
              SELECT g, pop FROM clipped
              ORDER BY random()
              LIMIT ?
            )
            SELECT ST_Y(g) AS lat, ST_X(g) AS lon, pop FROM sampled";

            $rows = DB::select($sql, array_merge([$lakeId, $radiusKm, $layerId], $bindings, [$maxPts]));
            $points = array_map(fn($r) => [ (float)$r->lat, (float)$r->lon, (float)$r->pop ], $rows);
            return response()->json(['points' => $points]);
        } catch (\Throwable $e) {
            return response()->json(['points' => [], 'error' => $e->getMessage()], 500);
        }
    }
}
