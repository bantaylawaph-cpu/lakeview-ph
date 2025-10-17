<?php

namespace App\Http\Controllers;

use App\Services\Semantic\SemanticSearch;
use App\Services\Search\AnalyticalSearchService;
use App\Services\Search\AttributeSearchService;
use App\Services\Search\SuggestSearchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SearchController extends Controller
{
    public function __construct(
        private SemanticSearch $search,
        private AnalyticalSearchService $analytical,
        private AttributeSearchService $attribute,
        private SuggestSearchService $suggestService,
    ) {}

    public function query(Request $request)
    {
        $q = (string) $request->input('query', '');
        if (trim($q) === '') return response()->json(['error' => 'query is required'], 422);

        // Normalize & options
        $limitParam = (int) $request->input('limit', 20);
        $limit = max(1, min(100, $limitParam));
        $qlc = strtolower(trim($q));

        // Helper: extract place after "in ..."
        $extractPlace = function(string $text): ?string {
            $lc = strtolower($text);
            if (preg_match('/\bin\s+([\p{L}0-9\-\s]+)$/u', $lc, $m)) {
                $place = trim($m[1] ?? '');
                $place = trim($place, ".,!? ");
                return $place !== '' ? $place : null;
            }
            return null;
        };
        $place = $extractPlace($q);

        // Detect entity/table
        $entity = 'lakes';
        if (str_contains($qlc, 'watershed')) $entity = 'watersheds';
        elseif (str_contains($qlc, 'parameter')) $entity = 'parameters';
        elseif (str_contains($qlc, 'layer')) $entity = 'layers';
        elseif (str_contains($qlc, 'flow')) $entity = 'lake_flows';

        // Analytical keywords & top-N
        $hasLargest  = str_contains($qlc, 'largest') || str_contains($qlc, 'biggest') || str_contains($qlc, 'top');
        $hasSmallest = str_contains($qlc, 'smallest');
        $hasDeepest  = str_contains($qlc, 'deepest');
        $hasHighest  = str_contains($qlc, 'highest');
        $hasLowest   = str_contains($qlc, 'lowest');
        $hasLongest  = str_contains($qlc, 'longest');

        $topLimit = null;
        if (preg_match('/top\s+(\d{1,3})/i', $q, $m)) {
            $topLimit = max(1, min(100, (int)($m[1] ?? 0)));
        }
        $finalLimit = $topLimit ?? ($hasLargest || $hasSmallest || $hasDeepest || $hasHighest || $hasLowest || $hasLongest ? 5 : $limit);

        // Unified mapper
        $mapRows = function(array $rows, string $table, ?string $attributeUsed = null) use ($place) {
            return array_map(function($r) use ($table, $attributeUsed) {
                // stdClass -> array
                $row = is_array($r) ? $r : (array) $r;
                $id = $row['id'] ?? ($row['lake_id'] ?? ($row['layer_id'] ?? ($row['parameter_id'] ?? null)));
                $name = $row['name'] ?? ($row['lake_name'] ?? ($row['watershed_name'] ?? ($row['layer_name'] ?? ($row['parameter_name'] ?? null))));
                $geom = $row['geom'] ?? ($row['coordinates_geojson'] ?? null);
                // Add a human-friendly description for lakes if possible
                if ($table === 'lakes') {
                    $normText = function($v) {
                        if ($v === null) return '';
                        if (is_array($v)) return (string) ($v[0] ?? '');
                        if (is_string($v)) {
                            $s = trim($v);
                            if ($s !== '' && ($s[0] === '[' || $s[0] === '{')) {
                                try { $j = json_decode($s, true, 512, JSON_THROW_ON_ERROR); return (string) (($j[0] ?? '') ?: ''); } catch (\Throwable $e) { return $s; }
                            }
                            return $s;
                        }
                        return (string) $v;
                    };
                    $province = $normText($row['province'] ?? null);
                    $region   = $normText($row['region'] ?? null);
                    $locParts = [];
                    if ($province !== '') $locParts[] = $province;
                    if ($region !== '') $locParts[] = $region;
                    $loc = implode(', ', $locParts);
                    // Area handling (prefer precomputed km2/ha if present; else number + unit if provided)
                    $areaNum = null; $unit = null;
                    foreach (['surface_area_km2','area_km2'] as $k) { if (isset($row[$k]) && is_numeric($row[$k])) { $areaNum = (float)$row[$k]; $unit='km²'; break; } }
                    if ($areaNum === null) {
                        foreach (['surface_area_ha','area_ha'] as $k) { if (isset($row[$k]) && is_numeric($row[$k])) { $areaNum = (float)$row[$k]; $unit='ha'; break; } }
                    }
                    if ($areaNum === null && isset($row['area_km2_from_layer']) && is_numeric($row['area_km2_from_layer'])) {
                        $areaNum = (float)$row['area_km2_from_layer']; $unit='km²';
                    }
                    // Analytical metric inclusion (depth/elevation/area/shoreline)
                    $metricText = '';
                    if ($attributeUsed && isset($row['metric_value']) && is_numeric($row['metric_value'])) {
                        $mv = (float) $row['metric_value'];
                        if ($attributeUsed === 'depth') {
                            $metricText = 'with a mean depth of ' . rtrim(rtrim(number_format($mv, 1, '.', ''), '0'), '.') . ' m';
                        } elseif ($attributeUsed === 'elevation') {
                            $metricText = 'with an elevation of ' . rtrim(rtrim(number_format($mv, 1, '.', ''), '0'), '.') . ' m';
                        } elseif ($attributeUsed === 'shoreline_m') {
                            $km = $mv / 1000.0; // metres to km
                            $metricText = 'with a shoreline length of ' . rtrim(rtrim(number_format($km, 1, '.', ''), '0'), '.') . ' km';
                        } elseif ($attributeUsed === 'area_m2') {
                            $km2 = $mv / 1000000.0; // m² to km²
                            $metricText = 'with a surface area of ' . rtrim(rtrim(number_format($km2, 2, '.', ''), '0'), '.') . ' km²';
                        }
                    }
                    $areaText = $areaNum !== null ? (rtrim(rtrim(number_format($areaNum, 2, '.', ''), '0'), '.') . ($unit ? " {$unit}" : '')) : '';
                    $parts = [];
                    if ($loc !== '') $parts[] = sprintf('%s is in %s', $name, $loc); else $parts[] = sprintf('%s is a lake', $name);
                    if ($metricText !== '') {
                        $parts[] = $metricText;
                    } elseif ($areaText !== '') {
                        $parts[] = sprintf('with the surface area of %s', $areaText);
                    }
                    $desc = implode(' ', $parts) . '.';
                    $row['description'] = $desc;
                }
                // Keep original attributes too
                return [
                    'table' => $table,
                    'id' => $id,
                    'name' => $name,
                    'attributes' => $row,
                    'geom' => $geom,
                    'attribute_used' => $attributeUsed,
                ];
            }, $rows);
        };

        // Analytical handling per-entity (lakes/watersheds primarily)
        $isAnalytical = $hasLargest || $hasSmallest || $hasDeepest || $hasHighest || $hasLowest || $hasLongest;
        if ($isAnalytical && in_array($entity, ['lakes','watersheds'], true)) {
            $orderDir = ($hasSmallest || $hasLowest) ? 'ASC' : 'DESC';
            if ($entity === 'lakes') {
                $metric = 'area_m2';
                if ($hasDeepest) $metric = 'depth';
                elseif ($hasHighest || $hasLowest) $metric = 'elevation';
                elseif ($hasLongest) $metric = 'shoreline_m';
                $data = $this->analytical->searchLakes([
                    'place' => $place,
                    'orderDir' => $orderDir,
                    'metric' => $metric,
                    'limit' => $finalLimit,
                ]);
                return response()->json([
                    'data' => $data,
                    'intent' => [ 'code' => 'ANALYTICAL', 'metric' => $metric, 'order' => $orderDir, 'limit' => $finalLimit ],
                    'diagnostics' => [ 'approach' => 'service-analytical', 'entity' => $entity, 'place' => $place ],
                ]);
            } else {
                $data = $this->analytical->searchWatersheds([
                    'place' => $place,
                    'orderDir' => $orderDir,
                    'limit' => $finalLimit,
                ]);
                return response()->json([
                    'data' => $data,
                    'intent' => [ 'code' => 'ANALYTICAL', 'metric' => 'area_m2', 'order' => $orderDir, 'limit' => $finalLimit ],
                    'diagnostics' => [ 'approach' => 'service-analytical', 'entity' => $entity, 'place' => $place ],
                ]);
            }
        }

        // Attribute/fuzzy search by entity using ILIKE
    $kw = '%' . trim($q) . '%';
    $hasLakeKeyword = (bool) preg_match('/\blakes?\b/i', $q);
        // Attribute/fuzzy search via service
        $data = $this->attribute->search($entity, $q, $place, $limit);
        if (!empty($data)) {
            return response()->json([
                'data' => $data,
                'intent' => [ 'code' => 'ATTRIBUTE', 'entity' => $entity ],
                'diagnostics' => [ 'approach' => 'service-attribute', 'place' => $place ],
            ]);
        }

        // If user asked for watersheds but nothing matched, return a small generic list to avoid "nothing shows"
        if ($entity === 'watersheds') {
            $fallback = DB::select(
                'SELECT w.id, w.name AS name, NULL::text AS geom FROM watersheds w ORDER BY w.name ASC LIMIT :limit',
                ['limit' => $limit]
            );
            if (!empty($fallback)) {
                return response()->json([
                    'data' => $mapRows($fallback, 'watersheds', null),
                    'intent' => [ 'code' => 'ATTRIBUTE', 'entity' => 'watersheds', 'note' => 'generic-fallback' ],
                    'diagnostics' => [ 'approach' => 'controller-attribute-fallback' ],
                ]);
            }
        }

        // Fallback: delegate to semantic engine
        $opts = [ 'limit' => $limit ];
        $out = $this->search->search($q, $opts);
        return response()->json([
            'data' => $out['results'] ?? [],
            'intent' => $out['intent'] ?? null,
            'diagnostics' => $out['diagnostics'] ?? null,
        ]);
    }

    /**
     * Lightweight suggestions for typeahead. Mixed entities, minimal fields.
     * GET /api/search/suggest?q=...&limit=8
     */
    public function suggest(Request $request)
    {
        $q = (string) $request->query('q', '');
        $q = trim($q);
        if ($q === '' || mb_strlen($q) < 2) return response()->json(['data' => []]);
        $limitParam = (int) $request->query('limit', 8);
        $limit = max(1, min(20, $limitParam));
        $results = $this->suggestService->suggest($q, $limit);
        return response()->json(['data' => $results]);
    }
}
