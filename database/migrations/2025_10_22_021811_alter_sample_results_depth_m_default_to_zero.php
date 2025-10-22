<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing null depth_m to 0
        DB::table('sample_results')->whereNull('depth_m')->update(['depth_m' => 0]);

        Schema::table('sample_results', function (Blueprint $table) {
            $table->double('depth_m')->default(0)->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sample_results', function (Blueprint $table) {
            $table->double('depth_m')->nullable()->change();
        });
    }
};
