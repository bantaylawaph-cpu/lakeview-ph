<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Enable pgvector (PostgreSQL only)
        try {
            $driver = DB::getDriverName();
            if ($driver === 'pgsql') {
                DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
            }
        } catch (\Throwable $e) {
            // ignore if not supported (e.g., local sqlite for tests)
        }

        // Create canonical intents table
        DB::statement(<<<SQL
            CREATE TABLE IF NOT EXISTS semantic_intents (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                description TEXT NOT NULL,
                example_queries TEXT[] NOT NULL,
                embedding vector(384),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        SQL);

        // Index for vector search (ivfflat requires row count and ANALYZE; we can start with a simple index later)
        try {
            DB::statement('CREATE INDEX IF NOT EXISTS semantic_intents_embedding_idx ON semantic_intents USING ivfflat (embedding vector_cosine_ops)');
        } catch (\Throwable $e) {
            // ivfflat may fail if pgvector compiled without ivfflat; fallback: none
        }
    }

    public function down(): void
    {
        try { DB::statement('DROP TABLE IF EXISTS semantic_intents'); } catch (\Throwable $e) {}
        // keep extension
    }
};
