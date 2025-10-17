<?php

namespace App\Services\Search;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SuggestSearchService
{
    public function suggest(string $q, int $limit): array
    {
        $qTrim = trim($q);
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
            foreach ($rows as $r) {
                $results[] = ['entity' => 'lakes', 'id' => $r->id, 'label' => $r->name, 'subtitle' => null];
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

            return $results;
        });
    }
}
