<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Additional composite indexes to accelerate common filtering & keyset pagination patterns.
        // NOTE: Using standard CREATE INDEX (not CONCURRENTLY) for simplicity; run during low traffic window if large tables.
        try { DB::statement("CREATE INDEX IF NOT EXISTS sampling_events_org_status_sampled_id_idx ON sampling_events (organization_id, status, sampled_at DESC, id DESC)"); } catch (\Throwable $e) {}
        try { DB::statement("CREATE INDEX IF NOT EXISTS sampling_events_org_sampled_id_idx ON sampling_events (organization_id, sampled_at DESC, id DESC)"); } catch (\Throwable $e) {}
        try { DB::statement("CREATE INDEX IF NOT EXISTS sampling_events_public_sampled_id_idx ON sampling_events (sampled_at DESC, id DESC) WHERE status = 'public'"); } catch (\Throwable $e) {}
        try { DB::statement("CREATE INDEX IF NOT EXISTS layers_created_id_idx ON layers (created_at DESC, id DESC)"); } catch (\Throwable $e) {}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try { DB::statement("DROP INDEX IF EXISTS sampling_events_org_status_sampled_id_idx"); } catch (\Throwable $e) {}
        try { DB::statement("DROP INDEX IF EXISTS sampling_events_org_sampled_id_idx"); } catch (\Throwable $e) {}
        try { DB::statement("DROP INDEX IF EXISTS sampling_events_public_sampled_id_idx"); } catch (\Throwable $e) {}
        try { DB::statement("DROP INDEX IF EXISTS layers_created_id_idx"); } catch (\Throwable $e) {}
    }
};
