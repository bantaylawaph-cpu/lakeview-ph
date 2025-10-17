<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // GiST index on geometry for layers (only if column exists)
        if (Schema::hasColumn('layers', 'geom')) {
            DB::statement("CREATE INDEX IF NOT EXISTS idx_layers_geom_gist ON layers USING GIST (geom);");
        }
        // Trigram indexes to speed up ILIKE searches (requires pg_trgm extension)
        DB::statement("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

        // Lakes - common columns
        if (Schema::hasTable('lakes')) {
            if (Schema::hasColumn('lakes', 'name')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_lakes_name_trgm ON lakes USING GIN (name gin_trgm_ops);");
            }
            if (Schema::hasColumn('lakes', 'alt_name')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_lakes_alt_name_trgm ON lakes USING GIN (alt_name gin_trgm_ops);");
            }
            if (Schema::hasColumn('lakes', 'region')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_lakes_region_trgm ON lakes USING GIN ((region::text) gin_trgm_ops);");
            }
            if (Schema::hasColumn('lakes', 'province')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_lakes_province_trgm ON lakes USING GIN ((province::text) gin_trgm_ops);");
            }
        }

        // Watersheds
        if (Schema::hasTable('watersheds')) {
            if (Schema::hasColumn('watersheds', 'name')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_watersheds_name_trgm ON watersheds USING GIN (name gin_trgm_ops);");
            }
            if (Schema::hasColumn('watersheds', 'description')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_watersheds_desc_trgm ON watersheds USING GIN (COALESCE(description,'') gin_trgm_ops);");
            }
        }

        // Layers
        if (Schema::hasTable('layers')) {
            if (Schema::hasColumn('layers', 'name')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_layers_name_trgm ON layers USING GIN (name gin_trgm_ops);");
            }
            if (Schema::hasColumn('layers', 'layer_name')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_layers_layer_name_trgm ON layers USING GIN (layer_name gin_trgm_ops);");
            }
            if (Schema::hasColumn('layers', 'category')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_layers_category_trgm ON layers USING GIN (category gin_trgm_ops);");
            }
            if (Schema::hasColumn('layers', 'source')) {
                DB::statement("CREATE INDEX IF NOT EXISTS idx_layers_source_trgm ON layers USING GIN (source gin_trgm_ops);");
            }
        }
    }

    public function down(): void
    {
    DB::statement("DROP INDEX IF EXISTS idx_layers_geom_gist;");
    DB::statement("DROP INDEX IF EXISTS idx_lakes_name_trgm;");
    DB::statement("DROP INDEX IF EXISTS idx_lakes_alt_name_trgm;");
    DB::statement("DROP INDEX IF EXISTS idx_lakes_region_trgm;");
    DB::statement("DROP INDEX IF EXISTS idx_lakes_province_trgm;");
    DB::statement("DROP INDEX IF EXISTS idx_watersheds_name_trgm;");
    DB::statement("DROP INDEX IF EXISTS idx_watersheds_desc_trgm;");
    DB::statement("DROP INDEX IF EXISTS idx_layers_name_trgm;");
    DB::statement("DROP INDEX IF EXISTS idx_layers_layer_name_trgm;");
    DB::statement("DROP INDEX IF EXISTS idx_layers_category_trgm;");
    DB::statement("DROP INDEX IF EXISTS idx_layers_source_trgm;");
        // Note: don't drop extension in down to avoid impacting other uses
    }
};
