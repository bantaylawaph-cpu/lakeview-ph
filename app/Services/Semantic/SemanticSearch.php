<?php

namespace App\Services\Semantic;

use Illuminate\Support\Facades\DB;

class SemanticSearch
{
    public function __construct(
        private EmbeddingClient $embed,
        private IntentCatalog $catalog,
    ) {}

    /**
     * Contract: takes a free-text query, returns array [results, intent, diagnostics]
     */
    public function search(string $query, array $options = []): array
    {
        $limit = max(1, min(100, (int)($options['limit'] ?? 20)));
        $embedding = $this->embed->embed($query);
        $intent = null; $diagnostics = ['approach' => 'semantic'];

        if ($embedding) {
            $candidates = $this->catalog->topIntentsByEmbedding($embedding, 3);
            $diagnostics['intentCandidates'] = $candidates;
            $min = (float) config('semantic.intent_min_similarity', 0.62);
            if ($candidates && $candidates[0]['similarity'] >= $min) {
                $intent = $candidates[0]['code'];
            }
        }

        if (!$intent) {
            // Fallback: trivial heuristics
            $diagnostics['approach'] = 'fallback-rules';
            $lc = strtolower($query);
            if (str_contains($lc, 'largest') || str_contains($lc, 'biggest')) $intent = 'LAKE_LARGEST_BY_AREA';
            elseif (str_contains($lc, 'class')) $intent = 'LAKE_BY_CLASS';
            elseif (str_contains($lc, 'located') || str_contains($lc, 'in ')) $intent = 'LAKE_IN_REGION';
            else $intent = 'LAKE_NAME_MATCH';
        }

        [$sql, $params] = $this->compileSql($intent, $query, $limit, $options);
        $rows = DB::select($sql, $params);

        return [
            'results' => $rows,
            'intent' => [ 'code' => $intent ],
            'diagnostics' => $diagnostics,
        ];
    }

    private function compileSql(string $intent, string $query, int $limit, array $options): array
    {
        // NOTE: Adjust column names here to fit actual schema. Using lakes.* + computed area and geojson when possible.
        switch ($intent) {
            case 'LAKE_LARGEST_BY_AREA':
                $sql = <<<SQL
                    SELECT l.*, ST_Area(ly.geom::geography) AS area_m2, ST_AsGeoJSON(l.coordinates) AS coordinates_geojson
                    FROM lakes l
                    LEFT JOIN layers ly ON ly.body_type = 'lake' AND ly.body_id = l.id AND ly.is_active = true AND ly.visibility = 'public'
                    WHERE ly.geom IS NOT NULL
                    ORDER BY area_m2 DESC NULLS LAST
                    LIMIT :limit
                SQL;
                return [$sql, ['limit' => $limit]];

            case 'LAKE_BY_CLASS':
                // Extract class like "class c" or "Class C"
                $m = [];
                $cls = null;
                if (preg_match('/class\s*([abcde])/i', $query, $m)) { $cls = strtoupper($m[1]); }
                $where = $cls ? 'l.class_code = :cls' : 'l.class_code IS NOT NULL';
                $sql = "SELECT l.*, ST_AsGeoJSON(l.coordinates) AS coordinates_geojson FROM lakes l WHERE {$where} ORDER BY l.name ASC LIMIT :limit";
                return [$sql, array_filter(['limit' => $limit, 'cls' => $cls], fn($v)=> $v!==null)];

            case 'LAKE_IN_REGION':
                // Extract region/province keywords, default to using gazetteer table `admin_areas` with name + geom
                $place = $this->extractPlace($query);
                if ($place && DB::getSchemaBuilder()->hasTable('admin_areas')) {
                    $sql = <<<SQL
                        WITH target AS (
                          SELECT geom FROM admin_areas WHERE LOWER(name) = LOWER(:place) LIMIT 1
                        )
                        SELECT l.*, ST_AsGeoJSON(l.coordinates) AS coordinates_geojson
                        FROM lakes l
                        JOIN target t ON true
                        JOIN layers ly ON ly.body_type='lake' AND ly.body_id=l.id AND ly.is_active=true AND ly.visibility='public'
                        WHERE ly.geom IS NOT NULL AND ST_Intersects(ly.geom, t.geom)
                        ORDER BY l.name ASC
                        LIMIT :limit
                    SQL;
                    return [$sql, ['place' => $place, 'limit' => $limit]];
                } else {
                    // fallback to name contains
                    $sql = "SELECT l.* FROM lakes l WHERE l.name ILIKE :kw ORDER BY l.name ASC LIMIT :limit";
                    return [$sql, ['kw' => '%'.trim($query).'%','limit'=>$limit]];
                }

            case 'LAKE_NAME_MATCH':
            default:
                $sql = "SELECT l.*, ST_AsGeoJSON(l.coordinates) AS coordinates_geojson FROM lakes l WHERE l.name ILIKE :kw OR l.alt_name ILIKE :kw ORDER BY l.name ASC LIMIT :limit";
                return [$sql, ['kw' => '%'.trim($query).'%','limit'=>$limit]];
        }
    }

    private function extractPlace(string $query): ?string
    {
        // Very simple extraction: take text after "in " or "located in "
        $lc = strtolower($query);
        foreach ([ 'located in ', 'in ' ] as $needle) {
            $pos = strpos($lc, $needle);
            if ($pos !== false) {
                $place = trim(substr($query, $pos + strlen($needle)));
                $place = preg_replace('/[\.?]$/', '', $place);
                if ($place !== '') return $place;
            }
        }
        return null;
    }
}
