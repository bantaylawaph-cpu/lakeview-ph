<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Add nullable Point geometry column (SRID 4326) + GIST index (PostgreSQL / PostGIS)
        DB::statement('ALTER TABLE lakes ADD COLUMN IF NOT EXISTS coordinates geometry(Point,4326) NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS lakes_coordinates_gix ON lakes USING GIST (coordinates)');

        // Backfill from active + public layer centroid when possible (lightweight, skip if already set)
        DB::statement(<<<SQL
            UPDATE lakes l
            SET coordinates = ST_PointOnSurface(ly.geom)
            FROM layers ly
            WHERE ly.body_type = 'lake'
              AND ly.body_id = l.id
              AND ly.is_active = true
              AND ly.visibility = 'public'
              AND l.coordinates IS NULL
              AND ly.geom IS NOT NULL
        SQL);
    }

    public function down(): void
    {
        // Drop index then column
        DB::statement('DROP INDEX IF EXISTS lakes_coordinates_gix');
        DB::statement('ALTER TABLE lakes DROP COLUMN IF EXISTS coordinates');
    }
};
