<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Composite descending indexes to support keyset pagination and lake-scoped filtering.
        try {
            DB::statement('CREATE INDEX IF NOT EXISTS lake_flows_updated_at_id_idx ON lake_flows (updated_at DESC, id DESC)');
        } catch (Throwable $e) {}
        try {
            DB::statement('CREATE INDEX IF NOT EXISTS lake_flows_lake_updated_at_id_idx ON lake_flows (lake_id, updated_at DESC, id DESC)');
        } catch (Throwable $e) {}
    }

    public function down(): void
    {
        try { DB::statement('DROP INDEX IF EXISTS lake_flows_lake_updated_at_id_idx'); } catch (Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS lake_flows_updated_at_id_idx'); } catch (Throwable $e) {}
    }
};
