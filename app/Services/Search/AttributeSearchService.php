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
                    $hasLakeKeywordExact = (bool)preg_match('/^\s*lakes?\s*$/i', $q);
                // Allow place-only queries (e.g., "lakes in Cebu") to match by region/province/municipality
                $sql = <<<SQL
SELECT l.id,
       COALESCE(NULLIF(l.name, ''), NULLIF(l.alt_name, ''), 'Lake') AS name,
       l.class_code, l.region, l.province,
       l.surface_area_km2,
       ST_AsGeoJSON(l.coordinates) AS coordinates_geojson
FROM lakes l
WHERE (
    l.name ILIKE :kwName OR
    l.alt_name ILIKE :kwName OR
    %s
)
SQL;
                $regionCond = $place
                    ? '((l.region::text) ILIKE :place OR (l.province::text) ILIKE :place OR (l.municipality::text) ILIKE :place)'
                    : '((l.region::text) ILIKE :kw OR (l.province::text) ILIKE :kw OR (l.municipality::text) ILIKE :kw)';
                $sql = sprintf($sql, $regionCond);
                // Rank exact name matches first, then fall back to alphabetical
                $sql .= "\nORDER BY CASE WHEN (l.name ILIKE :exact OR l.alt_name ILIKE :exact) THEN 0 ELSE 1 END, name ASC\nLIMIT :limit";
                // Build params only for placeholders present in SQL
                $params = [
                    'exact' => trim($q),
                    'kwName' => $hasLakeKeywordExact ? '%lake%' : $kw,
                    'limit' => $limit,
                ];
                if ($place) {
                    $params['place'] = '%' . $place . '%';
                } else {
                    $params['kw'] = $kw;
                }
                $rows = DB::select($sql, $params);
                return $this->mapper->mapRows($rows, 'lakes', null, $place);
            } elseif ($entity === 'layers') {
                $hasLayerGeom = Schema::hasColumn('layers', 'geom');
                $geomExpr2 = $hasLayerGeom
                    ? "CASE WHEN ly.geom IS NOT NULL THEN ST_AsGeoJSON(ly.geom) ELSE NULL END"
                    : "NULL::text";
                $sql = <<<SQL
SELECT ly.id,
       ly.name AS name,
       ly.description, ly.source,
       {$geomExpr2} AS geom
FROM layers ly
WHERE (
    ly.name ILIKE :kw OR
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
            }

            return [];
        });
    }
}
