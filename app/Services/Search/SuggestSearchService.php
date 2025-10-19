<?php

namespace App\Services\Search;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SuggestSearchService
{
    public function suggest(string $q, int $limit): array
    {
        $qTrim = trim($q);
        // Short-circuit: disable suggestions unless explicitly enabled via env
        if (!env('LV_SUGGEST_ENABLED', false)) {
            return [];
        }
        if ($qTrim === '' || mb_strlen($qTrim) < 2) return [];

        $cacheKey = sprintf('suggest:%s:%d', md5($qTrim), $limit);
        return Cache::remember($cacheKey, now()->addMinutes(2), function () use ($qTrim, $limit) {
            $kw = '%' . $qTrim . '%';
            $tokens = preg_split('/[^\p{L}0-9]+/u', strtolower($qTrim), -1, PREG_SPLIT_NO_EMPTY);
            $lastToken = $tokens ? end($tokens) : '';
            $kwp = ($lastToken !== '') ? ($lastToken . '%') : ($qTrim . '%');
            $prefixOnly = ($lastToken !== '' && mb_strlen($lastToken) <= 3);
            $hasLakeWord = false;
            foreach ($tokens as $t) { if ($t === 'lake' || $t === 'lakes') { $hasLakeWord = true; break; } }
            $kwLake = '%lake%';
            $kwpLake = 'lake%';

            $sqlLakes = <<<SQL
SELECT l.id,
       COALESCE(NULLIF(l.name, ''), NULLIF(l.alt_name, ''), 'Lake') AS name,
       'lakes' AS entity,
       NULL::text AS subtitle,
       CASE
          WHEN l.name ILIKE :kwp OR l.alt_name ILIKE :kwp OR (:hasLake::boolean AND (l.name ILIKE :kwpLake OR l.alt_name ILIKE :kwpLake)) THEN 0
         WHEN (l.region::text) ILIKE :kwp OR (l.province::text) ILIKE :kwp THEN 1
          WHEN l.name ILIKE :kw OR l.alt_name ILIKE :kw OR (l.region::text) ILIKE :kw OR (l.province::text) ILIKE :kw OR (:hasLake::boolean AND (l.name ILIKE :kwLake OR l.alt_name ILIKE :kwLake)) THEN 2
         ELSE 3
       END AS rank
FROM lakes l
WHERE (
    l.name ILIKE :kw OR
    l.alt_name ILIKE :kw OR
    (l.region::text) ILIKE :kw OR
    (l.province::text) ILIKE :kw OR
    (:hasLake::boolean AND (l.name ILIKE :kwLake OR l.alt_name ILIKE :kwLake))
)
ORDER BY rank ASC, name ASC
LIMIT :limit
SQL;
            $extra = '';
            $params = ['kw' => $kw, 'kwp' => $kwp, 'kwLake' => $kwLake, 'kwpLake' => $kwpLake, 'hasLake' => $hasLakeWord ? 1 : 0, 'limit' => $limit];
            if ($prefixOnly) {
                $extra .= " AND (l.name ILIKE :kwp OR l.alt_name ILIKE :kwp OR (l.region::text) ILIKE :kwp OR (l.province::text) ILIKE :kwp OR (:hasLake::boolean AND (l.name ILIKE :kwpLake OR l.alt_name ILIKE :kwpLake)))";
            }
            if ($hasLakeWord) {
                $extra .= " AND (COALESCE(l.name,'') ILIKE '%lake%' OR COALESCE(l.alt_name,'') ILIKE '%lake%')";
            }
            if ($extra !== '') { $sqlLakes = str_replace("ORDER BY", $extra . "\nORDER BY", $sqlLakes); }
            $rows = DB::select($sqlLakes, $params);
            $results = [];
            $seen = [];
            foreach ($rows as $r) {
                $key = strtolower('lakes|'.($r->name ?? ''));
                if (!isset($seen[$key])) { $seen[$key] = true; $results[] = ['entity' => 'lakes', 'id' => $r->id, 'label' => $r->name, 'subtitle' => null]; }
            }

            // Municipality suggestions (distinct values from lakes table)
            if (count($results) < $limit) {
                $munLimit = max(1, $limit - count($results));
                $sqlMun = <<<SQL
SELECT DISTINCT l.municipality AS name
FROM lakes l
WHERE l.municipality IS NOT NULL AND l.municipality <> '' AND (
    %s
)
ORDER BY name ASC
LIMIT :limit
SQL;
                $munCond = $prefixOnly ? 'l.municipality ILIKE :kwp' : '(l.municipality ILIKE :kwp OR l.municipality ILIKE :kw)';
                $munSql = sprintf($sqlMun, $munCond);
                $munParams = $prefixOnly ? ['kwp' => $kwp, 'limit' => $munLimit] : ['kw' => $kw, 'kwp' => $kwp, 'limit' => $munLimit];
                $munRows = DB::select($munSql, $munParams);
                foreach ($munRows as $mr) {
                    $label = $mr->name;
                    if ($label) {
                        $key = strtolower('municipalities|'.$label);
                        if (!isset($seen[$key])) { $seen[$key] = true; $results[] = ['entity' => 'municipalities', 'id' => null, 'label' => $label, 'subtitle' => 'Municipality']; }
                        if (count($results) >= $limit) break;
                    }
                }
            }

            // Watershed suggestions (by name)
            if (count($results) < $limit) {
                $wsLimit = max(1, $limit - count($results));
                $sqlWs = <<<SQL
SELECT w.id, w.name
FROM watersheds w
WHERE %s
ORDER BY w.name ASC
LIMIT :limit
SQL;
                $wsCond = $prefixOnly ? 'w.name ILIKE :kwp' : '(w.name ILIKE :kwp OR w.name ILIKE :kw)';
                $wsSql = sprintf($sqlWs, $wsCond);
                $wsParams = $prefixOnly ? ['kwp' => $kwp, 'limit' => $wsLimit] : ['kw' => $kw, 'kwp' => $kwp, 'limit' => $wsLimit];
                $wsRows = DB::select($wsSql, $wsParams);
                foreach ($wsRows as $wr) {
                    $key = strtolower('watersheds|'.($wr->name ?? ''));
                    if (!isset($seen[$key])) { $seen[$key] = true; $results[] = ['entity' => 'watersheds', 'id' => $wr->id, 'label' => $wr->name, 'subtitle' => 'Watershed']; }
                    if (count($results) >= $limit) break;
                }
            }

            // Lake flows suggestions (by name/source/type)
            if (count($results) < $limit) {
                $flLimit = max(1, $limit - count($results));
                $sqlFl = <<<SQL
SELECT f.id,
       COALESCE(NULLIF(f.name,''), NULLIF(f.alt_name,''), CONCAT(f.flow_type, ' flow')) AS name,
       f.flow_type
FROM lake_flows f
WHERE (
    %s
)
ORDER BY name ASC
LIMIT :limit
SQL;
                $flCond = $prefixOnly
                    ? "(COALESCE(f.name,'') ILIKE :kwp OR COALESCE(f.alt_name,'') ILIKE :kwp OR f.flow_type ILIKE :kwp OR COALESCE(f.source,'') ILIKE :kwp)"
                    : "(COALESCE(f.name,'') ILIKE :kwp OR COALESCE(f.name,'') ILIKE :kw OR COALESCE(f.alt_name,'') ILIKE :kwp OR COALESCE(f.alt_name,'') ILIKE :kw OR f.flow_type ILIKE :kwp OR f.flow_type ILIKE :kw OR COALESCE(f.source,'') ILIKE :kwp OR COALESCE(f.source,'') ILIKE :kw)";
                $flSql = sprintf($sqlFl, $flCond);
                $flParams = $prefixOnly ? ['kwp' => $kwp, 'limit' => $flLimit] : ['kw' => $kw, 'kwp' => $kwp, 'limit' => $flLimit];
                $flRows = DB::select($flSql, $flParams);
                foreach ($flRows as $fr) {
                    $subtitle = $fr->flow_type ? ucfirst($fr->flow_type) . ' flow' : 'Flow';
                    $key = strtolower('lake_flows|'.($fr->name ?? ''));
                    if (!isset($seen[$key])) { $seen[$key] = true; $results[] = ['entity' => 'lake_flows', 'id' => $fr->id, 'label' => $fr->name, 'subtitle' => $subtitle]; }
                    if (count($results) >= $limit) break;
                }
            }

            $qlc = strtolower($qTrim);
            if (count($results) > 0 && (str_contains($qlc, 'largest') || str_contains($qlc, 'deepest') || str_contains($qlc, 'highest') || str_contains($qlc, 'lowest'))) {
                array_unshift($results, [
                    'entity' => 'hint',
                    'id' => null,
                    'label' => 'Press Enter to run analytical search',
                    'subtitle' => null,
                ]);
                $results = array_slice($results, 0, $limit);
            }

            // Keyword prioritization: if user typed watershed/flow, reorder by those entities first while preserving uniqueness
            $qlc = strtolower($qTrim);
            $wantFlows = str_contains($qlc, 'flow');
            $wantWatersheds = str_contains($qlc, 'watershed');
            if ($wantFlows || $wantWatersheds) {
                $prio = [];
                $rest = [];
                foreach ($results as $r) {
                    $ent = $r['entity'] ?? '';
                    if ($wantFlows && $ent === 'lake_flows') { $prio[] = $r; continue; }
                    if ($wantWatersheds && $ent === 'watersheds') { $prio[] = $r; continue; }
                    $rest[] = $r;
                }
                $results = array_slice(array_merge($prio, $rest), 0, $limit);
            }
            return $results;
        });
    }
}
