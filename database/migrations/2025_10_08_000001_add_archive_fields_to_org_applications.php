<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('org_applications')) {
            Schema::table('org_applications', function (Blueprint $table) {
                if (!Schema::hasColumn('org_applications', 'archived_at')) {
                    $table->timestamp('archived_at')->nullable()->after('accepted_at');
                }
                if (!Schema::hasColumn('org_applications', 'archived_reason')) {
                    $table->string('archived_reason')->nullable()->after('archived_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('org_applications')) {
            Schema::table('org_applications', function (Blueprint $table) {
                if (Schema::hasColumn('org_applications', 'archived_reason')) {
                    $table->dropColumn('archived_reason');
                }
                if (Schema::hasColumn('org_applications', 'archived_at')) {
                    $table->dropColumn('archived_at');
                }
            });
        }
    }
};
