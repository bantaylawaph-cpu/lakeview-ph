<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('tenants', 'feature_flags')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->dropColumn('feature_flags');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('tenants', 'feature_flags')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->json('feature_flags')->nullable();
            });
        }
    }
};
