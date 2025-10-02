<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
    if (DB::getDriverName() !== 'pgsql') {
      return; // skip on non-Postgres (e.g., sqlite tests)
    }
    DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION public.pop_mvt_tile_by_year(
  p_z integer, p_x integer, p_y integer,
  p_lake_id bigint, p_radius_km numeric, p_year smallint, p_layer_id bigint DEFAULT NULL
) RETURNS bytea LANGUAGE plpgsql AS $$
DECLARE
  v_tbl text := pop_table_for_year(p_year);
  v_schema text; v_table text; v_qname text;
  v_ring geometry; v_mvt bytea;
BEGIN
  IF v_tbl IS NULL THEN RETURN NULL; END IF;
  IF position('.' IN v_tbl) > 0 THEN
    v_schema := split_part(v_tbl,'.',1); v_table := split_part(v_tbl,'.',2);
    v_qname := format('%I.%I', v_schema, v_table);
  ELSE
    v_qname := format('%I', v_tbl);
  END IF;

  SELECT fn_lake_ring_resolved(p_lake_id, p_radius_km, p_layer_id) INTO v_ring;
  IF v_ring IS NULL THEN RETURN NULL; END IF;

  EXECUTE format($SQL$
    WITH env AS (SELECT ST_TileEnvelope($1,$2,$3) AS g3857),
    env4326 AS (SELECT ST_Transform(g3857,4326) g4326 FROM env),
    tiles AS (
      SELECT ST_Clip(rast,(SELECT g4326 FROM env4326)) rast
      FROM %s r
      WHERE ST_Intersects(r.rast,(SELECT g4326 FROM env4326)) AND ST_Intersects(r.rast,$4)
    ),
    pts AS (
      SELECT (pp).geom::geometry(Point,4326) g4326,
             NULLIF((pp).val::float8, ST_BandNoDataValue(rast,1)) pop
      FROM tiles CROSS JOIN LATERAL ST_PixelAsPoints(rast,1) pp
      WHERE (pp).val IS NOT NULL
    ),
    clipped AS (
      SELECT g4326, pop FROM pts
      WHERE pop IS NOT NULL AND ST_Intersects(g4326,$4)
    ),
    mvtgeom AS (
      SELECT ST_AsMVTGeom(ST_Transform(g4326,3857),(SELECT g3857 FROM env),4096,64,TRUE) geom, pop
      FROM clipped
    )
    SELECT ST_AsMVT(mvtgeom,'pop',4096,'geom') FROM mvtgeom
  $SQL$, v_qname)
  INTO v_mvt USING p_z,p_x,p_y,v_ring;

  RETURN v_mvt;
END$$;
SQL);
    }

    public function down(): void
    {
    if (DB::getDriverName() !== 'pgsql') {
      return;
    }
    DB::unprepared('DROP FUNCTION IF EXISTS public.pop_mvt_tile_by_year(integer, integer, integer, bigint, numeric, smallint, bigint)');
    }
};
