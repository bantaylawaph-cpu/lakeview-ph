<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('lakes')) {
            Schema::table('lakes', function (Blueprint $table) {
                if (!Schema::hasColumn('lakes', 'class_code')) {
                    $table->string('class_code')->nullable()->after('mean_depth_m');
                }
            });

            if (DB::getDriverName() === 'pgsql') {
                DB::statement("ALTER TABLE lakes DROP CONSTRAINT IF EXISTS fk_lakes_class_code");
                Schema::table('lakes', function (Blueprint $table) {
                    $table->foreign('class_code', 'fk_lakes_class_code')
                        ->references('code')->on('water_quality_classes')
                        ->onUpdate('cascade')
                        ->onDelete('set null');
                });
                DB::statement('CREATE INDEX IF NOT EXISTS idx_lakes_class ON lakes (class_code)');
            }
        }

        if (Schema::hasTable('lakes') && Schema::hasTable('water_quality_classes')) {
            $hasDefaultClass = DB::table('water_quality_classes')->where('code', 'C')->exists();
            if ($hasDefaultClass) {
                DB::table('lakes')->whereNull('class_code')->update(['class_code' => 'C']);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('lakes') && DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS idx_lakes_class');
            Schema::table('lakes', function (Blueprint $table) {
                try { $table->dropForeign('fk_lakes_class_code'); } catch (Throwable $e) {}
            });
        }
    }
};
