<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('tenants')) {
            // Avoid duplicate creation if index already exists (name from previous deploys may differ)
            try {
                DB::statement("CREATE INDEX IF NOT EXISTS tenants_name_slug_idx ON tenants USING btree (name, slug)");
            } catch (\Throwable $e) {
                // fallback silent
            }
        }
    }
    public function down(): void
    {
        if (Schema::hasTable('tenants')) {
            try { DB::statement("DROP INDEX IF EXISTS tenants_name_slug_idx"); } catch (\Throwable $e) {}
        }
    }
};
