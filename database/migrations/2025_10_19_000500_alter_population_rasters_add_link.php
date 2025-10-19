<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('population_rasters') && !Schema::hasColumn('population_rasters', 'link')) {
            Schema::table('population_rasters', function (Blueprint $table) {
                $table->string('link', 2048)->nullable()->after('notes');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('population_rasters') && Schema::hasColumn('population_rasters', 'link')) {
            Schema::table('population_rasters', function (Blueprint $table) {
                $table->dropColumn('link');
            });
        }
    }
};
