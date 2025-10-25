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
                // Guard against environments where layers.geom does not exist (e.g., fresh schema without geometry column)
                DB::statement(<<<SQL
                        DO $$
                        BEGIN
                            IF EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_schema = 'public' AND table_name = 'layers' AND column_name = 'geom'
                            ) THEN
                                UPDATE lakes l
                                SET coordinates = ST_PointOnSurface(ly.geom)
                                FROM layers ly
                                WHERE ly.body_type = 'lake'
                                    AND ly.body_id = l.id
                                    AND ly.is_active = true
                                    AND ly.visibility = 'public'
                                    AND l.coordinates IS NULL
                                    AND ly.geom IS NOT NULL;
                            END IF;
                        END $$;
                SQL);
    }

    public function down(): void
    {
        // Drop index then column
        DB::statement('DROP INDEX IF EXISTS lakes_coordinates_gix');
        DB::statement('ALTER TABLE lakes DROP COLUMN IF EXISTS coordinates');
    }
};
