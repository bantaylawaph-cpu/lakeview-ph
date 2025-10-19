<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Only proceed if running on PostgreSQL AND the pgvector extension is already installed.
        $driver = null; $hasVector = false;
        try { $driver = DB::getDriverName(); } catch (\Throwable $e) { $driver = null; }
        if ($driver === 'pgsql') {
            try {
                $row = DB::selectOne("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS installed");
                $hasVector = (bool) (($row->installed ?? false));
            } catch (\Throwable $e) {
                $hasVector = false;
            }
        }

        if (! $hasVector) {
            // Skip semantic_intents when vector extension isn't available.
            return;
        }

        // Create canonical intents table (safe when vector extension is present)
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

        // Avoid creating ivfflat index here to prevent transactional failures on hosts without that opclass.
        // You can add the index manually in environments that support it:
        // CREATE INDEX semantic_intents_embedding_idx ON semantic_intents USING ivfflat (embedding vector_cosine_ops);
    }

    public function down(): void
    {
        try { DB::statement('DROP TABLE IF EXISTS semantic_intents'); } catch (\Throwable $e) {}
        // keep extension
    }
};
