<?php
// Deprecated migration: original user_tenants pivot (kept for historical reference)
// This file is intentionally left with no operations; table replaced by single-tenant model.
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // No-op: pivot removed by 2025_09_27_000001_align_single_tenant_model migration.
    }

    public function down(): void
    {
        // No-op: do not recreate legacy pivot.
    }
};
