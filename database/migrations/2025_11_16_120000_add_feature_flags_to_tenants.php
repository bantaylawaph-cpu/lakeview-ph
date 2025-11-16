<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('tenants')) return; // safety
        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'feature_flags')) {
                $table->json('feature_flags')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('tenants')) return;
        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'feature_flags')) {
                $table->dropColumn('feature_flags');
            }
        });
    }
};
