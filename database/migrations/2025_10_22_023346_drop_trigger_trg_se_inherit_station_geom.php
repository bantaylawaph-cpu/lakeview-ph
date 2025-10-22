<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS trg_se_inherit_station_geom ON sampling_events');
        DB::statement('DROP FUNCTION IF EXISTS trg_se_inherit_station_geom() CASCADE');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optionally recreate the trigger if needed, but since geom_point is dropped, leave empty
    }
};
