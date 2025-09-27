<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql' && Schema::hasTable('layers')) {
            DB::statement("ALTER TABLE layers DROP CONSTRAINT IF EXISTS chk_layers_visibility");
            DB::statement("UPDATE layers SET visibility = 'admin' WHERE visibility IN ('organization', 'organization_admin')");
            DB::statement("ALTER TABLE layers ADD CONSTRAINT chk_layers_visibility CHECK (visibility IN ('admin','public'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql' && Schema::hasTable('layers')) {
            DB::statement("ALTER TABLE layers DROP CONSTRAINT IF EXISTS chk_layers_visibility");
            DB::statement("ALTER TABLE layers ADD CONSTRAINT chk_layers_visibility CHECK (visibility IN ('admin','public','organization','organization_admin'))");
        }
    }
};
