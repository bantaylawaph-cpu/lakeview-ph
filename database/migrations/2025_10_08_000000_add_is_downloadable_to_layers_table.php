<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('layers', function (Blueprint $table) {
            $table->boolean('is_downloadable')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('layers', function (Blueprint $table) {
            if (Schema::hasColumn('layers', 'is_downloadable')) {
                $table->dropColumn('is_downloadable');
            }
        });
    }
};
