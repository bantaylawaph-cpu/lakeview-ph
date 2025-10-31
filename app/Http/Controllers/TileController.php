<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class TileController extends Controller
{
    /**
     * Return Mapbox Vector Tile (PBF) for contours at z/x/y.
     * URL: /api/tiles/contours/{z}/{x}/{y}.pbf
     */
    public function contours(int $z, int $x, int $y)
    {
        // Favor index usage by avoiding COALESCE in spatial predicates; branch by available geometry.
        $sql = <<<'SQL'
WITH bounds AS (
  SELECT ST_TileEnvelope(:z, :x, :y) AS env
),
src AS (
  SELECT c.id, c.elev,
         CASE WHEN (ROUND(c.elev)::int % 50) = 0 THEN 1 ELSE 0 END AS idx,
         c.geom_3857 AS g
  FROM public.contours c, bounds
  WHERE c.geom_3857 IS NOT NULL AND c.geom_3857 && bounds.env
  UNION ALL
  SELECT c.id, c.elev,
         CASE WHEN (ROUND(c.elev)::int % 50) = 0 THEN 1 ELSE 0 END AS idx,
         ST_Transform(c.geom, 3857) AS g
  FROM public.contours c, bounds
  WHERE c.geom_3857 IS NULL AND c.geom IS NOT NULL AND c.geom && ST_Transform(bounds.env, 4326)
),
feats AS (
  SELECT id, elev, idx,
         ST_AsMVTGeom(g, bounds.env, 4096, 64, true) AS geom
  FROM src, bounds
)
SELECT encode(tile, 'base64') AS b64
FROM (
  SELECT ST_AsMVT(feats, 'contours', 4096, 'geom') AS tile FROM feats
) m;
SQL;

        $cacheKey = sprintf('mvt.contours.%d.%d.%d', $z, $x, $y);
        $bytes = Cache::remember($cacheKey, 86400, function () use ($sql, $z, $x, $y) {
            $row = DB::selectOne($sql, ['z' => $z, 'x' => $x, 'y' => $y]);
            if (!$row || !isset($row->b64)) return null;
            return base64_decode($row->b64);
        });

        if (!$bytes) {
            return new Response('', 204);
        }

        return response($bytes, 200)
            ->header('Content-Type', 'application/vnd.mapbox-vector-tile')
            ->header('Cache-Control', 'public, max-age=86400')
            ->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Return GeoJSON FeatureCollection of label points for contours within the given bbox.
     * GET /api/contours/labels?bbox=minLon,minLat,maxLon,maxLat&z=14
     * Only returns data for z >= 14 to reduce clutter.
     */
    public function contourLabels(Request $request)
    {
        $bbox = $request->query('bbox');
        $z = (int) $request->query('z', 0);
        if (!$bbox || $z < 14) {
            return response()->json(['type' => 'FeatureCollection', 'features' => []])
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Cache-Control', 'public, max-age=60');
        }

        $parts = array_map('trim', explode(',', $bbox));
        if (count($parts) !== 4) {
            return response()->json(['type' => 'FeatureCollection', 'features' => []]);
        }
        [$minLon, $minLat, $maxLon, $maxLat] = array_map('floatval', $parts);

        // Build envelope in WGS84; split by geometry to keep index usage
        $sql = <<<'SQL'
WITH bb AS (
  SELECT ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326) AS env
), vis AS (
  SELECT c.id, c.elev,
         CASE WHEN (ROUND(c.elev)::int % 50) = 0 THEN 1 ELSE 0 END AS idx,
         c.geom AS g4326
  FROM public.contours c, bb
  WHERE c.geom IS NOT NULL AND c.geom && bb.env
  UNION ALL
  SELECT c.id, c.elev,
         CASE WHEN (ROUND(c.elev)::int % 50) = 0 THEN 1 ELSE 0 END AS idx,
         ST_Transform(c.geom_3857, 4326) AS g4326
  FROM public.contours c, bb
  WHERE c.geom IS NULL AND c.geom_3857 IS NOT NULL AND c.geom_3857 && ST_Transform(bb.env, 3857)
)
SELECT id, elev,
       ST_AsGeoJSON(label_pt) AS geom,
       CASE WHEN deg > 90 AND deg <= 270 THEN deg - 180 ELSE deg END AS angle
FROM (
  SELECT id, elev, idx, g4326,
         lm,
         COALESCE(NULLIF(ST_LineInterpolatePoint(lm, 0.5), NULL), ST_PointOnSurface(g4326)) AS label_pt,
         DEGREES(
           COALESCE(
             ST_Azimuth(
               ST_LineInterpolatePoint(lm, GREATEST(0.0, LEAST(1.0, 0.5 - 0.01))),
               ST_LineInterpolatePoint(lm, GREATEST(0.0, LEAST(1.0, 0.5 + 0.01)))
             ),
             0
           )
         ) AS deg
  FROM (
    SELECT id, elev, idx, g4326, ST_LineMerge(g4326) AS lm FROM vis
  ) m
) q
WHERE idx = 1
LIMIT 2000;
SQL;

        // Short-lived cache to reduce repeated bbox work during panning at high zooms
        $round = fn(float $v) => round($v, 3);
        $bboxKey = implode(',', [
            $round($minLon), $round($minLat), $round($maxLon), $round($maxLat)
        ]);
        $cacheKey = "contour.labels:z=$z|bbox=$bboxKey";

        $collection = Cache::remember($cacheKey, 60, function () use ($sql, $minLon, $minLat, $maxLon, $maxLat) {
            $rows = DB::select($sql, [
                'minLon' => $minLon,
                'minLat' => $minLat,
                'maxLon' => $maxLon,
                'maxLat' => $maxLat,
            ]);
            $features = [];
            foreach ($rows as $r) {
                if (!$r || empty($r->geom)) continue;
                $geom = json_decode($r->geom, true);
                if (!$geom) continue;
                $features[] = [
                    'type' => 'Feature',
                    'id' => $r->id,
                    'properties' => [
                        'elev' => $r->elev,
                        'angle' => isset($r->angle) ? (float)$r->angle : 0.0
                    ],
                    'geometry' => $geom,
                ];
            }
            return [ 'type' => 'FeatureCollection', 'features' => $features ];
        });

        return response()->json($collection)
            ->header('Access-Control-Allow-Origin', '*')
            ->header('Cache-Control', 'public, max-age=60');
    }
}
