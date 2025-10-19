<?php

namespace App\Services\Search;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AttributeSearchService
{
    public function __construct(private SearchResultMapper $mapper) {}

    public function search(string $entity, string $q, ?string $place, int $limit): array
    {
        $cacheKey = sprintf('attr:%s:%s:%s:%d', $entity, md5($q), md5((string)$place), $limit);
        return Cache::remember($cacheKey, now()->addMinutes(2), function () use ($entity, $q, $place, $limit) {
            $kw = '%' . trim($q) . '%';
            $rows = [];
            if ($entity === 'lakes') {
                $hasLakeKeyword = (bool)preg_match('/\blakes?\b/i', $q);
                $sql = <<<SQL
SELECT l.id,
       COALESCE(NULLIF(l.name, ''), NULLIF(l.alt_name, ''), 'Lake') AS name,
       l.class_code, l.region, l.province,
       (CASE WHEN ly.geom IS NOT NULL THEN ST_Area(ly.geom::geography)/1000000.0 ELSE NULL END) AS area_km2_from_layer,
       ST_AsGeoJSON(l.coordinates) AS coordinates_geojson
FROM lakes l
LEFT JOIN layers ly ON ly.body_type='lake' AND ly.body_id=l.id AND ly.is_active=true AND ly.visibility='public'
WHERE (
    l.name ILIKE :kwName OR
    l.alt_name ILIKE :kwName OR
    (:useRegionMatch = 1 AND ((l.region::text) ILIKE :kw OR (l.province::text) ILIKE :kw OR (l.municipality::text) ILIKE :kw))
)
SQL;
                if ($place) {
                    $sql .= "\nAND ((l.region::text) ILIKE :place OR (l.province::text) ILIKE :place OR (l.municipality::text) ILIKE :place)";
                }
                $sql .= "\nORDER BY name ASC\nLIMIT :limit";
                $params = [
                    'kw' => $kw,
                    'kwName' => $hasLakeKeyword ? '%lake%' : $kw,
                    'useRegionMatch' => $place ? 0 : 1,
                    'limit' => $limit,
                ] + ($place ? ['place' => '%' . $place . '%'] : []);
                $rows = DB::select($sql, $params);
                return $this->mapper->mapRows($rows, 'lakes', null, $place);
            } elseif ($entity === 'watersheds') {
                $sql = <<<SQL
SELECT w.id,
       COALESCE(w.name, ly.name) AS name,
       CASE WHEN ly.geom IS NOT NULL THEN ST_AsGeoJSON(ly.geom) ELSE NULL END AS geom
FROM watersheds w
LEFT JOIN layers ly ON ly.body_type='watershed' AND ly.body_id=w.id AND ly.is_active=true AND ly.visibility='public'
WHERE (
    w.name ILIKE :kw OR
    COALESCE(w.description,'') ILIKE :kw OR
    COALESCE(ly.name, ly.name) ILIKE :kw
)
SQL;
                if ($place) {
                    $sql .= "\nAND (w.name ILIKE :place OR COALESCE(w.description,'') ILIKE :place)";
                }
                $sql .= "\nORDER BY name ASC\nLIMIT :limit";
                $params = ['kw' => $kw, 'limit' => $limit] + ($place ? ['place' => '%' . $place . '%'] : []);
                $rows = DB::select($sql, $params);
                return $this->mapper->mapRows($rows, 'watersheds', null, $place);
            } elseif ($entity === 'layers') {
                $sql = <<<SQL
SELECT ly.id,
       ly.name AS name,
       ly.category, ly.description, ly.source,
       CASE WHEN ly.geom IS NOT NULL THEN ST_AsGeoJSON(ly.geom) ELSE NULL END AS geom
FROM layers ly
WHERE (
    ly.name ILIKE :kw OR
    ly.category ILIKE :kw OR
    ly.description ILIKE :kw OR
    ly.source ILIKE :kw
)
ORDER BY name ASC
LIMIT :limit
SQL;
                $params = ['kw' => $kw, 'limit' => $limit];
                $rows = DB::select($sql, $params);
                return $this->mapper->mapRows($rows, 'layers', null, $place);
            } elseif ($entity === 'parameters') {
                $hasAliases = Schema::hasTable('parameter_aliases');
                if ($hasAliases) {
                    $sql = <<<SQL
SELECT DISTINCT p.id,
       p.name AS name,
       p.category, p.unit
FROM parameters p
LEFT JOIN parameter_aliases pa ON pa.parameter_id = p.id
WHERE (
    p.name ILIKE :kw OR p.code ILIKE :kw OR
    COALESCE(p.category,'') ILIKE :kw OR
    COALESCE(p.unit,'') ILIKE :kw OR
    COALESCE(pa.alias,'') ILIKE :kw
)
ORDER BY name ASC
LIMIT :limit
SQL;
                } else {
                    $sql = <<<SQL
SELECT DISTINCT p.id,
       p.name AS name,
       p.category, p.unit
FROM parameters p
WHERE (
    p.name ILIKE :kw OR p.code ILIKE :kw OR
    COALESCE(p.category,'') ILIKE :kw OR
    COALESCE(p.unit,'') ILIKE :kw
)
ORDER BY name ASC
LIMIT :limit
SQL;
                }
                $params = ['kw' => $kw, 'limit' => $limit];
                $rows = DB::select($sql, $params);
                return $this->mapper->mapRows($rows, 'parameters', null, $place);
            } elseif ($entity === 'lake_flows') {
                // Make plural "flows" also match singular word parts like inflow/outflow
                $kw2 = '%' . preg_replace('/flows/i', 'flow', trim($q)) . '%';
                $sql = <<<SQL
SELECT f.id,
       COALESCE(NULLIF(f.name,''), NULLIF(f.alt_name,''), CONCAT(f.flow_type, ' flow')) AS name,
       f.flow_type,
       f.source,
    f.lake_id,
       l.name AS lake_name,
       ST_AsGeoJSON(f.coordinates) AS coordinates_geojson,
       f.latitude, f.longitude
FROM lake_flows f
LEFT JOIN lakes l ON l.id = f.lake_id
WHERE (
    COALESCE(f.name, '') ILIKE :kw OR COALESCE(f.name,'') ILIKE :kw2 OR
    COALESCE(f.alt_name, '') ILIKE :kw OR COALESCE(f.alt_name,'') ILIKE :kw2 OR
    COALESCE(f.source, '') ILIKE :kw OR COALESCE(f.source,'') ILIKE :kw2 OR
    f.flow_type ILIKE :kw OR f.flow_type ILIKE :kw2 OR
    COALESCE(l.name,'') ILIKE :kw OR COALESCE(l.name,'') ILIKE :kw2
)
ORDER BY name ASC
LIMIT :limit
SQL;
                $params = ['kw' => $kw, 'kw2' => $kw2, 'limit' => $limit];
                $rows = DB::select($sql, $params);
                return $this->mapper->mapRows($rows, 'lake_flows', null, $place);
            }

            return [];
        });
    }
}
