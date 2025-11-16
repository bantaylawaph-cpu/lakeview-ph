<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('tenants') && Schema::hasColumn('tenants', 'active')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->dropColumn('active');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tenants') && !Schema::hasColumn('tenants', 'active')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->boolean('active')->default(true);
            });
        }
    }
};
