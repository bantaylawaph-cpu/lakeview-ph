<?php

namespace App\Services\Search;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AnalyticalSearchService
{
    public function __construct(private SearchResultMapper $mapper) {}

    public function searchLakes(array $opts): array
    {
        $place = $opts['place'] ?? null;
        $orderDir = strtoupper($opts['orderDir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $metric = $opts['metric'] ?? 'area_m2';
        $limit = max(1, min(100, (int)($opts['limit'] ?? 5)));

        $cacheKey = sprintf('analytical:lakes:%s:%s:%s', $metric, $orderDir, md5((string)$place) . ":$limit");
        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($place, $orderDir, $metric, $limit) {
            $params = ['limit' => $limit];
            if ($place) $params['place'] = '%' . $place . '%';

            if ($metric === 'area_m2') {
                $sql = <<<SQL
SELECT l.id,
       COALESCE(NULLIF(l.name, ''), NULLIF(l.alt_name, ''), 'Lake') AS name,
       l.region, l.province,
       ST_AsGeoJSON(l.coordinates) AS coordinates_geojson,
       ST_Area(ly.geom::geography) AS metric_value
FROM lakes l
LEFT JOIN layers ly ON ly.body_type='lake' AND ly.body_id=l.id AND ly.is_active=true AND ly.visibility='public'
WHERE ly.geom IS NOT NULL
SQL;
            } elseif ($metric === 'shoreline_m') {
                $sql = <<<SQL
SELECT l.id,
       COALESCE(NULLIF(l.name, ''), NULLIF(l.alt_name, ''), 'Lake') AS name,
       l.region, l.province,
       ST_AsGeoJSON(l.coordinates) AS coordinates_geojson,
       ST_Perimeter(ly.geom::geography) AS metric_value
FROM lakes l
LEFT JOIN layers ly ON ly.body_type='lake' AND ly.body_id=l.id AND ly.is_active=true AND ly.visibility='public'
WHERE ly.geom IS NOT NULL
SQL;
            } else {
                $col = $metric === 'depth' ? 'l.mean_depth_m' : 'l.elevation_m';
                $sql = <<<SQL
SELECT l.id,
       COALESCE(NULLIF(l.name, ''), NULLIF(l.alt_name, ''), 'Lake') AS name,
       l.region, l.province,
       ST_AsGeoJSON(l.coordinates) AS coordinates_geojson,
       {$col} AS metric_value
FROM lakes l
WHERE {$col} IS NOT NULL
SQL;
            }
            if ($place) {
                $sql .= "\nAND ((l.region::text) ILIKE :place OR (l.province::text) ILIKE :place)";
            }
            $sql .= "\nORDER BY metric_value {$orderDir} NULLS LAST\nLIMIT :limit";
            $rows = DB::select($sql, $params);
            return $this->mapper->mapRows($rows, 'lakes', $metric, $place);
        });
    }

    public function searchWatersheds(array $opts): array
    {
        $place = $opts['place'] ?? null;
        $orderDir = strtoupper($opts['orderDir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $limit = max(1, min(100, (int)($opts['limit'] ?? 5)));

        $cacheKey = sprintf('analytical:watersheds:%s:%s', md5((string)$place), $limit . ":$orderDir");
        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($place, $orderDir, $limit) {
            $params = ['limit' => $limit];
            if ($place) $params['place'] = '%' . $place . '%';

            $sql = <<<SQL
SELECT w.id,
       w.name AS name,
       ST_AsGeoJSON(ly.geom) AS geom,
       ST_Area(ly.geom::geography) AS metric_value
FROM watersheds w
LEFT JOIN layers ly ON ly.body_type='watershed' AND ly.body_id=w.id AND ly.is_active=true AND ly.visibility='public'
WHERE ly.geom IS NOT NULL
SQL;
            if ($place) {
                $sql .= "\nAND (w.name ILIKE :place OR COALESCE(w.description,'') ILIKE :place)";
            }
            $sql .= "\nORDER BY metric_value {$orderDir} NULLS LAST\nLIMIT :limit";
            $rows = DB::select($sql, $params);
            return $this->mapper->mapRows($rows, 'watersheds', 'area_m2', $place);
        });
    }
}
