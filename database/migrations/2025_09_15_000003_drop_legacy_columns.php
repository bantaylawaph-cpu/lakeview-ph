<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Drop columns that are no longer needed (Postgres only)
        if (DB::getDriverName() === 'pgsql') {
            if (Schema::hasTable('lakes')) {
                DB::statement("ALTER TABLE public.lakes  DROP COLUMN IF EXISTS geom");
                DB::statement("ALTER TABLE public.lakes  DROP COLUMN IF EXISTS max_depth_m");
            }
            if (Schema::hasTable('layers')) {
                DB::statement("ALTER TABLE public.layers DROP COLUMN IF EXISTS file_hash");
                DB::statement("ALTER TABLE public.layers DROP COLUMN IF EXISTS file_size_bytes");
                DB::statement("ALTER TABLE public.layers DROP COLUMN IF EXISTS metadata");
            }
        }
    }

    public function down(): void
    {
        // Recreate columns if you need to rollback (Postgres only)
        if (DB::getDriverName() === 'pgsql') {
            if (Schema::hasTable('lakes')) {
                DB::statement("ALTER TABLE public.lakes  ADD COLUMN IF NOT EXISTS geom geometry(MultiPolygon, 4326)");
                DB::statement("ALTER TABLE public.lakes  ADD COLUMN IF NOT EXISTS max_depth_m double precision");
            }
            if (Schema::hasTable('layers')) {
                DB::statement("ALTER TABLE public.layers ADD COLUMN IF NOT EXISTS file_hash text");
                DB::statement("ALTER TABLE public.layers ADD COLUMN IF NOT EXISTS file_size_bytes bigint");
                DB::statement("ALTER TABLE public.layers ADD COLUMN IF NOT EXISTS metadata jsonb");
            }
        }
    }
};
