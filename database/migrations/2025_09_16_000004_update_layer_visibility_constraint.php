<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE public.layers DROP CONSTRAINT IF EXISTS chk_layers_visibility");
        DB::statement("UPDATE public.layers SET visibility = 'admin' WHERE visibility IN ('organization', 'organization_admin')");
        DB::statement("ALTER TABLE public.layers ADD CONSTRAINT chk_layers_visibility CHECK (visibility = ANY (ARRAY['admin'::text, 'public'::text]))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE public.layers DROP CONSTRAINT IF EXISTS chk_layers_visibility");
        DB::statement("ALTER TABLE public.layers ADD CONSTRAINT chk_layers_visibility CHECK (visibility = ANY (ARRAY['admin'::text, 'public'::text, 'organization'::text, 'organization_admin'::text]))");
    }
};
