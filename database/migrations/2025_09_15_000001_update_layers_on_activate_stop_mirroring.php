<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Keep/ensure one-active-per-body partial unique index (idempotent)
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS uq_layers_active_per_body
            ON public.layers (body_type, body_id)
            WHERE is_active
        ");

        // Replace function: remove mirroring into lakes/watersheds
        DB::unprepared(<<<'SQL'
        CREATE OR REPLACE FUNCTION public.layers_on_activate()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW.is_active IS TRUE THEN
            UPDATE layers
               SET is_active = FALSE, updated_at = now()
             WHERE body_type = NEW.body_type
               AND body_id   = NEW.body_id
               AND id       <> NEW.id
               AND is_active = TRUE;
          END IF;

          RETURN NEW;
        END;
        $$;
        SQL);
    }

    public function down(): void
    {
        // Recreate the previous behavior (mirroring) ONLY if you truly want to rollback.
        DB::unprepared(<<<'SQL'
        CREATE OR REPLACE FUNCTION public.layers_on_activate()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW.is_active IS TRUE THEN
            UPDATE layers
               SET is_active = FALSE, updated_at = now()
             WHERE body_type = NEW.body_type
               AND body_id   = NEW.body_id
               AND id       <> NEW.id
               AND is_active = TRUE;

            IF NEW.body_type = 'lake' THEN
              UPDATE lakes SET geom = NEW.geom, updated_at = now()
               WHERE id = NEW.body_id;
            ELSIF NEW.body_type = 'watershed' THEN
              UPDATE watersheds SET geom = NEW.geom, updated_at = now()
               WHERE id = NEW.body_id;
            END IF;
          END IF;

          RETURN NEW;
        END;
        $$;
        SQL);
    }
};
