<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Add optimized index on sampling_events.lake_id for EXISTS correlated subqueries.
     * The existing composite index idx_se_lake_status_date (lake_id, status, sampled_at DESC)
     * may not be optimal for simple EXISTS checks like:
     * WHERE EXISTS (SELECT 1 FROM sampling_events WHERE lake_id = lakes.id)
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // CONCURRENTLY avoids locking the table during index creation
            DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_se_lake_id_only ON sampling_events (lake_id) WHERE lake_id IS NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_se_lake_id_only');
        }
    }
};
