<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_watersheds_name ON public.watersheds (name)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_wqc_name ON public.water_quality_classes (name)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_lakes_name ON public.lakes (name)');
        } else {
            Schema::table('watersheds', function (Blueprint $table) {
                if (!Schema::hasColumn('watersheds', 'name')) return; // guard
                $table->index('name', 'idx_watersheds_name');
            });
            Schema::table('water_quality_classes', function (Blueprint $table) {
                if (!Schema::hasColumn('water_quality_classes', 'name')) return;
                $table->index('name', 'idx_wqc_name');
            });
            Schema::table('lakes', function (Blueprint $table) {
                if (!Schema::hasColumn('lakes', 'name')) return;
                $table->index('name', 'idx_lakes_name');
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS idx_lakes_name');
            DB::statement('DROP INDEX IF EXISTS idx_wqc_name');
            DB::statement('DROP INDEX IF EXISTS idx_watersheds_name');
        } else {
            Schema::table('lakes', function (Blueprint $table) { $table->dropIndex('idx_lakes_name'); });
            Schema::table('water_quality_classes', function (Blueprint $table) { $table->dropIndex('idx_wqc_name'); });
            Schema::table('watersheds', function (Blueprint $table) { $table->dropIndex('idx_watersheds_name'); });
        }
    }
};
