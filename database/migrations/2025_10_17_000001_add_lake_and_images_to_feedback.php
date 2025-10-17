<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            if (!Schema::hasColumn('feedback', 'lake_id')) {
                $table->foreignId('lake_id')->nullable()->after('tenant_id')->constrained('lakes')->nullOnDelete();
                $table->index('lake_id');
            }
            if (!Schema::hasColumn('feedback', 'images')) {
                $table->json('images')->nullable()->after('metadata');
            }
        });
    }

    public function down(): void
    {
        Schema::table('feedback', function (Blueprint $table) {
            if (Schema::hasColumn('feedback', 'images')) {
                $table->dropColumn('images');
            }
            if (Schema::hasColumn('feedback', 'lake_id')) {
                $table->dropConstrainedForeignId('lake_id');
            }
        });
    }
};
