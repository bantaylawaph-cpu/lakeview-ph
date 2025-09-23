<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ensure created_at / updated_at exist on stations (some DBs may have been created without timestamps)
        if (Schema::hasTable('stations')) {
            Schema::table('stations', function (Blueprint $table) {
                if (!Schema::hasColumn('stations', 'created_at')) {
                    $table->timestampTz('created_at')->nullable()->after('is_active');
                }
                if (!Schema::hasColumn('stations', 'updated_at')) {
                    $table->timestampTz('updated_at')->nullable()->after('created_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('stations')) {
            Schema::table('stations', function (Blueprint $table) {
                if (Schema::hasColumn('stations', 'updated_at')) {
                    $table->dropColumn('updated_at');
                }
                if (Schema::hasColumn('stations', 'created_at')) {
                    $table->dropColumn('created_at');
                }
            });
        }
    }
};
