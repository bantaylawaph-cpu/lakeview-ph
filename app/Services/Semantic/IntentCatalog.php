<?php

namespace App\Services\Semantic;

use Illuminate\Support\Facades\DB;

class IntentCatalog
{
    public function upsertIntent(string $code, string $description, array $examples, ?array $embedding): void
    {
        DB::transaction(function () use ($code, $description, $examples, $embedding) {
            $exists = DB::selectOne('SELECT id FROM semantic_intents WHERE code = ?', [$code]);

            // Convert examples to TEXT[] using JSON input
            $examplesJson = json_encode(array_values($examples), JSON_UNESCAPED_UNICODE);
            $examplesSql  = '(SELECT array_agg(val) FROM json_array_elements_text(?::json) AS val)';

            if ($exists) {
                if ($embedding) {
                    DB::update(
                        "UPDATE semantic_intents SET description = ?, example_queries = ${examplesSql}, embedding = ?::vector, updated_at = NOW() WHERE code = ?",
                        [
                            $description,
                            $examplesJson,
                            $this->toVectorString($embedding),
                            $code,
                        ]
                    );
                } else {
                    DB::update(
                        "UPDATE semantic_intents SET description = ?, example_queries = ${examplesSql}, embedding = NULL, updated_at = NOW() WHERE code = ?",
                        [
                            $description,
                            $examplesJson,
                            $code,
                        ]
                    );
                }
            } else {
                if ($embedding) {
                    DB::insert(
                        "INSERT INTO semantic_intents (code, description, example_queries, embedding) VALUES (?, ?, ${examplesSql}, ?::vector)",
                        [
                            $code,
                            $description,
                            $examplesJson,
                            $this->toVectorString($embedding),
                        ]
                    );
                } else {
                    DB::insert(
                        "INSERT INTO semantic_intents (code, description, example_queries, embedding) VALUES (?, ?, ${examplesSql}, NULL)",
                        [
                            $code,
                            $description,
                            $examplesJson,
                        ]
                    );
                }
            }
        });
    }

    /**
     * Given a query embedding, return top-N intents by cosine similarity.
     */
    public function topIntentsByEmbedding(array $queryEmbedding, int $limit = 3): array
    {
        if (empty($queryEmbedding)) return [];
        $vec = $this->toVectorString($queryEmbedding);
        // Use bound parameter with ::vector cast
        $rows = DB::select(
            "SELECT code, description, example_queries, 1 - (embedding <=> ?::vector) AS similarity\n" .
            "FROM semantic_intents\n" .
            "WHERE embedding IS NOT NULL\n" .
            "ORDER BY embedding <=> ?::vector ASC\n" .
            "LIMIT ${limit}",
            [ $vec, $vec ]
        );
        return array_map(function($r){
            return [
                'code' => $r->code,
                'description' => $r->description,
                'similarity' => (float) $r->similarity,
            ];
        }, $rows);
    }

    private function toVectorString(array $embedding): string
    {
        // Convert PHP array to pgvector string literal expected by ::vector cast: [e1,e2,...]
        return '[' . implode(',', array_map(fn($v)=> rtrim(rtrim(number_format((float)$v, 12, '.', ''), '0'), '.'), $embedding)) . ']';
    }
}
