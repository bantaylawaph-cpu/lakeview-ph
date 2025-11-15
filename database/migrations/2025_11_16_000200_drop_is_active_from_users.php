<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'is_active')) {
            // Drop dependent indexes if they exist
            try { DB::statement('DROP INDEX IF EXISTS idx_users_tenant_role_active;'); } catch (Throwable $e) {}
            try { DB::statement('DROP INDEX IF EXISTS users_is_active_idx;'); } catch (Throwable $e) {}
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_active')->default(true)->after('tenant_id');
            });
            // Recreate performance index if columns exist
            try { DB::statement('CREATE INDEX IF NOT EXISTS idx_users_tenant_role_active ON users (tenant_id, role_id, is_active);'); } catch (Throwable $e) {}
        }
    }
};
