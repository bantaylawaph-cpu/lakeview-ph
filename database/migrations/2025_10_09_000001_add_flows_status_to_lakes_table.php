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
        Schema::table('lakes', function (Blueprint $table) {
            // Tri-state for flows: unknown | none | present
            $table->enum('flows_status', ['unknown', 'none', 'present'])->default('unknown')->index();
        });

        // Backfill: any lake that has at least one flow becomes 'present'
        DB::statement(<<<SQL
            UPDATE lakes
            SET flows_status = 'present'
            WHERE EXISTS (
                SELECT 1 FROM lake_flows lf WHERE lf.lake_id = lakes.id
            )
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lakes', function (Blueprint $table) {
            $table->dropColumn('flows_status');
        });
    }
};
