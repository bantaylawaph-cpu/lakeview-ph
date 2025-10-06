<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('org_applications') && !Schema::hasColumn('org_applications', 'accepted_at')) {
            Schema::table('org_applications', function (Blueprint $table) {
                $table->timestamp('accepted_at')->nullable()->after('status');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('org_applications') && Schema::hasColumn('org_applications', 'accepted_at')) {
            Schema::table('org_applications', function (Blueprint $table) {
                $table->dropColumn('accepted_at');
            });
        }
    }
};
