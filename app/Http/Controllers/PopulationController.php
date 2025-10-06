<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class PopulationController extends Controller
{
    /** Resolve dataset (id + table_name) for a year using catalog (prefers default) */
    private function resolveDataset(int $year): ?array
    {
        try {
            $row = DB::selectOne('SELECT id, table_name FROM pop_dataset_catalog WHERE year = ? AND is_enabled = TRUE ORDER BY is_default DESC, id DESC LIMIT 1', [$year]);
            if ($row && $row->table_name) {
                return ['id' => (int)$row->id, 'table' => $row->table_name];
            }
        } catch (\Throwable $e) {}
        return null;
    }
    private function resolveDatasetTable(int $year): ?string { return $this->resolveDataset($year)['table'] ?? null; }

    /** Safely quote a possibly unqualified table name */
    private function qname(string $table): string
    {
        if (str_contains($table, '.')) return $table; // assume already schema-qualified
        return '"' . str_replace('"', '""', $table) . '"';
    }

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

        // Legacy function removed: compute directly from catalog table via summary stats
        try {
            $ds = $this->resolveDataset($year);
            if (!$ds) {
                return response()->json([
                    'lake_id' => $lakeId,
                    'year' => $year,
                    'radius_km' => $radiusKm,
                    'layer_id' => $layerId,
                    'estimate' => null,
                    'status' => 'no_dataset'
                ], 404);
            }
            $datasetId = $ds['id'];
            $table = $ds['table'];
            $ringRow = null;
            try { $ringRow = DB::selectOne('SELECT public.fn_lake_ring_resolved(?, ?, ?) AS g', [$lakeId, $radiusKm, $layerId]); } catch (\Throwable $ringE) {}
            if (!$ringRow || !$ringRow->g) {
                return response()->json([
                    'lake_id' => $lakeId,
                    'year' => $year,
                    'radius_km' => $radiusKm,
                    'layer_id' => $layerId,
                    'estimate' => null,
                    'status' => 'no_ring'
                ], 422);
            }

            $method = 'raster_counts:ds=' . $datasetId . '|layer=' . ($layerId !== null ? $layerId : 'active');
            // Attempt cache lookup
            $cache = null;
            try {
                $cache = DB::selectOne('SELECT estimate, computed_at FROM pop_estimate_cache WHERE lake_id=? AND year=? AND radius_km=? AND method=? LIMIT 1', [
                    $lakeId, $year, $radiusKm, $method
                ]);
            } catch (\Throwable $ce) {}

            if ($cache && isset($cache->estimate)) {
                return response()->json([
                    'lake_id'   => $lakeId,
                    'year'      => $year,
                    'radius_km' => $radiusKm,
                    'layer_id'  => $layerId ? (int)$layerId : null,
                    'estimate'  => (int) round((float)$cache->estimate),
                    'source'    => 'worldpop',
                    'product'   => 'counts_1km',
                    'method'    => $method,
                    'cached'    => true,
                    'status'    => 'ok',
                ]);
            }

            $qname = $this->qname($table);
            $manual = DB::selectOne(
                "WITH ring AS (SELECT ?::geometry AS g), tiles AS (
                    SELECT ST_Clip(rast, (SELECT g FROM ring)) rast
                    FROM $qname r
                    WHERE ST_Intersects(r.rast, (SELECT g FROM ring))
                ), stats AS (
                    SELECT ST_SummaryStatsAgg(rast,1,true) s FROM tiles
                ) SELECT COALESCE(SUM((s).sum),0) AS pop FROM stats",
                [$ringRow->g]
            );
            $pop = (int) round((float) ($manual?->pop ?? 0));

            // Upsert into cache
            try {
                DB::statement(
                    'INSERT INTO pop_estimate_cache (lake_id, year, radius_km, estimate, method) VALUES (?,?,?,?,?)
                     ON CONFLICT (lake_id, year, radius_km, method) DO UPDATE SET estimate = EXCLUDED.estimate, computed_at = now()',
                    [$lakeId, $year, $radiusKm, $pop, $method]
                );
            } catch (\Throwable $ie) {
                Log::notice('Estimate cache upsert failed', [ 'err' => $ie->getMessage(), 'lake_id' => $lakeId, 'year' => $year ]);
            }

            return response()->json([
                'lake_id'   => $lakeId,
                'year'      => $year,
                'radius_km' => $radiusKm,
                'layer_id'  => $layerId ? (int)$layerId : null,
                'estimate'  => $pop,
                'source'    => 'worldpop',
                'product'   => 'counts_1km',
                'method'    => $method,
                'cached'    => false,
                'status'    => 'ok',
            ]);
        } catch (\Throwable $e) {
            Log::warning('Population estimate failed (catalog+cache)', [
                'lake_id' => $lakeId,
                'radius_km' => $radiusKm,
                'year' => $year,
                'layer_id' => $layerId,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'lake_id' => $lakeId,
                'radius_km' => $radiusKm,
                'year' => $year,
                'layer_id' => $layerId,
                'estimate' => null,
                'status' => 'error',
                'error' => 'estimate_failed',
                'message' => 'Population estimate could not be computed.'
            ], 500);
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
            Log::warning('Population tile failed', [
                'lake_id' => $lakeId,
                'radius_km' => $radiusKm,
                'year' => $year,
                'layer_id' => $layerId,
                'z' => $z,
                'x' => $x,
                'y' => $y,
                'error' => $e->getMessage(),
            ]);
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
            $t = $this->resolveDatasetTable($year);
            if (!$t) return response()->json(['points' => [], 'warning' => 'no_dataset']);

            // Cache ring geometry (EWKT) to avoid repeated function calls
            $ringCacheKey = sprintf('ring:v1:%d:%.3f:%s', $lakeId, $radiusKm, $layerId ? (int)$layerId : 0);
            $ringEWKT = Cache::remember($ringCacheKey, 3600, function () use ($lakeId, $radiusKm, $layerId) {
                try {
                    $row = DB::selectOne('SELECT ST_AsEWKT(public.fn_lake_ring_resolved(?, ?, ?)) AS g', [$lakeId, $radiusKm, $layerId]);
                    return $row?->g ?: null;
                } catch (\Throwable $e) { return null; }
            });
            if (!$ringEWKT) return response()->json(['points' => [], 'warning' => 'no_ring']);

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

            $qname = $this->qname($t);

            // Short TTL points cache (60s) keyed by bbox + params + limit
            $bboxKey = $bbox ? substr(sha1($bbox), 0, 16) : 'nobbox';
            $ptsCacheKey = sprintf('poppts:v1:%d:%d:%.3f:%s:%d:%s', $lakeId, $year, $radiusKm, $layerId ? (int)$layerId : 0, $maxPts, $bboxKey);
            $cached = Cache::get($ptsCacheKey);
            if ($cached) {
                return response()->json(array_merge($cached, ['cached' => true]));
            }

            $sql = "WITH ring AS (
                SELECT ST_GeomFromEWKT(?::text) AS g
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
            ), cnt AS (
              SELECT COUNT(*) AS n FROM clipped
            ), sampled AS (
              SELECT g, pop FROM clipped, cnt
              WHERE random() < LEAST(1.0, (?::float / NULLIF(cnt.n,1)))
              LIMIT ?
            )
            SELECT ST_Y(g) AS lat, ST_X(g) AS lon, pop FROM sampled";
            $rows = DB::select($sql, array_merge([$ringEWKT], $bindings, [$maxPts, $maxPts]));
            $points = array_map(fn($r) => [ (float)$r->lat, (float)$r->lon, (float)$r->pop ], $rows);

            // Basic stats based on sample for optional client normalization skip
            $vals = array_map(fn($p) => $p[2], $points);
            $count = count($vals);
            $p95 = null; $maxVal = null;
            if ($count > 0) {
                sort($vals);
                $idx = (int) floor(0.95 * ($count - 1));
                $p95 = $vals[$idx] ?? $vals[$count - 1];
                $maxVal = $vals[$count - 1];
            }
            $payload = [
                'points' => $points,
                'stats' => [
                    'count' => $count,
                    'p95_raw' => $p95,
                    'max_raw' => $maxVal,
                    'approx' => true,
                ],
            ];
            Cache::put($ptsCacheKey, $payload, 60); // 60s TTL
            return response()->json(array_merge($payload, ['cached' => false]));
        } catch (\Throwable $e) {
            Log::warning('Population points failed', [
                'lake_id' => $lakeId,
                'radius_km' => $radiusKm,
                'year' => $year,
                'layer_id' => $layerId,
                'bbox' => $bbox,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['points' => [], 'error' => 'points_failed', 'message' => 'Population points query failed.'], 500);
        }
    }

    /**
     * GET /api/population/dataset-years
     * Returns list of years that have an enabled default population dataset.
     * Response: { years: [2025, 2020, ...] }
     */
    public function datasetYears()
    {
        try {
            $rows = DB::select('SELECT DISTINCT year FROM pop_dataset_catalog WHERE is_enabled = TRUE AND is_default = TRUE ORDER BY year DESC');
            $years = array_map(fn($r) => (int)$r->year, $rows);
            return response()->json(['years' => $years]);
        } catch (\Throwable $e) {
            Log::warning('Failed to list population dataset years', ['error' => $e->getMessage()]);
            return response()->json(['years' => []], 500);
        }
    }
}
