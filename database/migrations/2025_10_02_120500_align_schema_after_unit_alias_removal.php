<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Only run on PostgreSQL; SQLite/MySQL test/dev should skip
        if (DB::getDriverName() !== 'pgsql') return;

        // 1) REPLACE evaluate_pass_fail() to remove unit dependency
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION public.evaluate_pass_fail() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    t_min numeric;
    t_max numeric;
BEGIN
    -- Try lookup by threshold_id if present
    IF NEW.threshold_id IS NOT NULL THEN
        SELECT min_value, max_value
          INTO t_min, t_max
          FROM parameter_thresholds
         WHERE id = NEW.threshold_id;
    ELSE
        -- Fallback by param + class (unit removed)
        SELECT min_value, max_value
          INTO t_min, t_max
          FROM parameter_thresholds
         WHERE parameter_id = NEW.parameter_id
           AND class_code   = NEW.evaluated_class_code
         LIMIT 1;
    END IF;

    -- If nothing found, leave pass_fail NULL
    IF NOT FOUND THEN
        NEW.pass_fail := NULL;
        RETURN NEW;
    END IF;

    -- Evaluate: pass if within [t_min, t_max] (NULLs treated as open bounds)
    IF (t_min IS NULL OR NEW.value >= t_min)
       AND (t_max IS NULL OR NEW.value <= t_max) THEN
        NEW.pass_fail := 'pass';
    ELSE
        NEW.pass_fail := 'fail';
    END IF;

    NEW.evaluated_at := now();
    RETURN NEW;
END;
$$;
SQL);

        // 2) Drop the unit column from parameter_thresholds
        if (Schema::hasTable('parameter_thresholds')) {
            DB::statement("ALTER TABLE public.parameter_thresholds DROP COLUMN IF EXISTS unit");
        }

        // 3) Drop layers.status (drop its CHECK first) and 4) Drop layers.version
        if (Schema::hasTable('layers')) {
            DB::statement("ALTER TABLE public.layers DROP CONSTRAINT IF EXISTS chk_layers_status");
            DB::statement("ALTER TABLE public.layers DROP COLUMN IF EXISTS status");
            DB::statement("ALTER TABLE public.layers DROP COLUMN IF EXISTS version");
        }

        // 5) Drop parameter_aliases table
        DB::statement("DROP TABLE IF EXISTS public.parameter_aliases CASCADE");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') return;

        // Best-effort restore of previous function signature (with unit filter)
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION public.evaluate_pass_fail() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    t_min numeric;
    t_max numeric;
BEGIN
    IF NEW.threshold_id IS NOT NULL THEN
        SELECT min_value, max_value
          INTO t_min, t_max
          FROM parameter_thresholds
         WHERE id = NEW.threshold_id;
    ELSE
        SELECT min_value, max_value
          INTO t_min, t_max
          FROM parameter_thresholds
         WHERE parameter_id = NEW.parameter_id
           AND class_code   = NEW.evaluated_class_code
           AND (unit = NEW.unit OR unit IS NULL)
         LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        NEW.pass_fail := NULL;
        RETURN NEW;
    END IF;

    IF (t_min IS NULL OR NEW.value >= t_min)
       AND (t_max IS NULL OR NEW.value <= t_max) THEN
        NEW.pass_fail := 'pass';
    ELSE
        NEW.pass_fail := 'fail';
    END IF;

    NEW.evaluated_at := now();
    RETURN NEW;
END;
$$;
SQL);

        // Optionally re-add dropped columns (without constraints) to allow manual cleanup
        if (Schema::hasTable('parameter_thresholds') && !Schema::hasColumn('parameter_thresholds', 'unit')) {
            DB::statement("ALTER TABLE public.parameter_thresholds ADD COLUMN unit text");
        }
        if (Schema::hasTable('layers')) {
            if (!Schema::hasColumn('layers', 'status')) {
                DB::statement("ALTER TABLE public.layers ADD COLUMN status text");
            }
            if (!Schema::hasColumn('layers', 'version')) {
                DB::statement("ALTER TABLE public.layers ADD COLUMN version integer");
            }
            // We intentionally do not recreate chk_layers_status to avoid enforcing unknown values.
        }
        // Note: We do not recreate parameter_aliases; restoring its full schema is out-of-scope.
    }
};
