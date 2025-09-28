<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Backfill base, public, active layers from lakes.geom where no active layer exists
        if (!Schema::hasColumn('lakes', 'geom')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        WITH missing AS (
          SELECT l.id AS lake_id
          FROM public.lakes l
          WHERE l.geom IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM public.layers x
              WHERE x.body_type = 'lake'
                AND x.body_id   = l.id
                AND x.is_active = TRUE
            )
        )
        INSERT INTO public.layers (
          body_type, body_id, uploaded_by,
          name, type, category, srid,
          visibility, is_active, status, version, notes, source_type,
          geom, created_at, updated_at
        )
        SELECT
          'lake'               AS body_type,
          l.id                 AS body_id,
          NULL                 AS uploaded_by,
          COALESCE(l.name, CONCAT('Lake #', l.id)) || ' – Base' AS name,
          'base'               AS type,
          NULL                 AS category,
          4326                 AS srid,
          'public'             AS visibility,
          TRUE                 AS is_active,
          'ready'              AS status,
          1                    AS version,
          'Backfilled from lakes.geom' AS notes,
          'geojson'            AS source_type,
          CASE
            WHEN ST_SRID(l.geom) = 4326 THEN ST_Multi(ST_CollectionExtract(ST_ForceCollection(ST_MakeValid(l.geom)), 3))
            ELSE ST_Transform(ST_Multi(ST_CollectionExtract(ST_ForceCollection(ST_MakeValid(l.geom)), 3)), 4326)
          END                  AS geom,
          now(), now()
        FROM public.lakes l
        JOIN missing m ON m.lake_id = l.id;
        SQL);
    }

    public function down(): void
    {
        // If you need to rollback, delete only the backfilled rows we just created
        DB::statement("
          DELETE FROM public.layers
          WHERE notes = 'Backfilled from lakes.geom'
        ");
    }
};
