<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Ensure roles table has canonical rows
        $roles = [
            ['name' => 'public', 'scope' => 'system'],
            ['name' => 'contributor', 'scope' => 'tenant'],
            ['name' => 'org_admin', 'scope' => 'tenant'],
            ['name' => 'superadmin', 'scope' => 'system'],
        ];
        foreach ($roles as $r) {
            DB::table('roles')->updateOrInsert(['name' => $r['name']], ['scope' => $r['scope'], 'updated_at' => now(), 'created_at' => now()]);
        }

        // 1a. (Postgres) Temporarily disable trigger enforcing role/tenant scope so we can safely normalize
        if (DB::getDriverName() === 'pgsql') {
            DB::statement(<<<'SQL'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_user_role_scope') THEN
        EXECUTE 'ALTER TABLE public.users DISABLE TRIGGER trg_enforce_user_role_scope';
    END IF;
END$$;
SQL);
        }

        // 1b. Pre-clean data: ensure system-scope roles never carry a tenant (merged: kept main logic; original feature branch had deferred note)
        $systemRoleIds = DB::table('roles')->whereIn('name', ['public','superadmin'])->pluck('id')->all();
        if (!empty($systemRoleIds) && Schema::hasTable('users')) {
            if (Schema::hasColumn('users', 'role_id') && Schema::hasColumn('users', 'tenant_id')) {
                DB::table('users')->whereIn('role_id', $systemRoleIds)->whereNotNull('tenant_id')->update(['tenant_id' => null]);
            }
            if (Schema::hasColumn('users', 'role') && Schema::hasColumn('users', 'tenant_id')) {
                DB::table('users')->whereIn('role', ['public','superadmin'])->whereNotNull('tenant_id')->update(['tenant_id' => null]);
            }
        }

        // 2. Add role_id if missing
        if (!Schema::hasColumn('users', 'role_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('role_id')->nullable()->after('updated_at'); // temporarily nullable for backfill
            });
        }

        // 3. Backfill role_id from legacy string column `role` if it exists (after adding role_id)
        if (Schema::hasColumn('users', 'role')) {
            $map = DB::table('roles')->pluck('id', 'name');
            DB::table('users')->select('id', 'role')->orderBy('id')->chunk(500, function ($chunk) use ($map) {
                foreach ($chunk as $u) {
                    $rid = $map[$u->role] ?? $map['public'] ?? null;
                    if ($rid) {
                        DB::table('users')->where('id', $u->id)->update(['role_id' => $rid]);
                    }
                }
            });
        }

        // 4. Any users without role_id -> public
        $publicId = DB::table('roles')->where('name', 'public')->value('id');
        DB::table('users')->whereNull('role_id')->update(['role_id' => $publicId]);

        // 5. Add tenant_id if missing (defensive; live DB already has it) - ensure BEFORE we attempt any tenant_id update logic
        if (!Schema::hasColumn('users', 'tenant_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('tenant_id')->nullable()->after('role_id')->constrained('tenants')->nullOnDelete();
            });
        }

        // 5a. Now that tenant_id exists, pre-clean data: null tenant for system-scope roles
        $systemRoleIds = DB::table('roles')->whereIn('name', ['public','superadmin'])->pluck('id')->all();
        if (!empty($systemRoleIds) && Schema::hasTable('users') && Schema::hasColumn('users', 'tenant_id')) {
            if (Schema::hasColumn('users', 'role_id')) {
                DB::table('users')->whereIn('role_id', $systemRoleIds)->whereNotNull('tenant_id')->update(['tenant_id' => null]);
            }
            if (Schema::hasColumn('users', 'role')) {
                DB::table('users')->whereIn('role', ['public','superadmin'])->whereNotNull('tenant_id')->update(['tenant_id' => null]);
            }
        }

        // 6. Add is_active if missing
        if (!Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_active')->default(true)->after('tenant_id');
            });
        }

        // 7. Drop legacy string role column if present
        if (Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('role');
            });
        }

        // 8. Create audit table if not exists (portable timestamps)
        if (!Schema::hasTable('user_tenant_changes')) {
            Schema::create('user_tenant_changes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('old_tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->foreignId('new_tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->foreignId('old_role_id')->nullable()->constrained('roles')->nullOnDelete();
                $table->foreignId('new_role_id')->nullable()->constrained('roles')->nullOnDelete();
                $table->text('reason')->nullable();
                // Use standard timestamps and ignore updated_at (never updated)
                $table->timestamp('created_at')->useCurrent();
                $table->index(['user_id', 'created_at']);
            });
        }

        // 9. Drop user_tenants pivot if exists
        if (Schema::hasTable('user_tenants')) {
            Schema::drop('user_tenants');
        }

        // 10. Ensure useful indexes (idempotent checks light)
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'tenant_id')) {
                $table->index('tenant_id', 'users_tenant_id_idx');
            }
            if (Schema::hasColumn('users', 'role_id')) {
                $table->index('role_id', 'users_role_id_idx');
            }
            if (Schema::hasColumn('users', 'is_active')) {
                $table->index('is_active', 'users_is_active_idx');
            }
        });

        // Ensure any tenant-scoped role users have tenant_id; fallback -> set role to public if invalid
        $tenantScopedIds = DB::table('roles')->whereIn('name', ['contributor','org_admin'])->pluck('id')->all();
        if (!empty($tenantScopedIds) && Schema::hasColumn('users', 'tenant_id') && Schema::hasColumn('users', 'role_id')) {
            $affected = DB::table('users')->whereIn('role_id', $tenantScopedIds)->whereNull('tenant_id')->get();
            foreach ($affected as $a) {
                // Demote to public to avoid trigger violations
                DB::table('users')->where('id', $a->id)->update(['role_id' => $publicId]);
            }
        }

        // 11. Re-enable trigger if we disabled it
        if (DB::getDriverName() === 'pgsql') {
            DB::statement(<<<'SQL'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_user_role_scope') THEN
        EXECUTE 'ALTER TABLE public.users ENABLE TRIGGER trg_enforce_user_role_scope';
    END IF;
END$$;
SQL);
        }
    }

    public function down(): void
    {
        // This down is best-effort; it won't recreate multi-tenant pivot semantics.
        if (Schema::hasTable('user_tenant_changes')) {
            Schema::drop('user_tenant_changes');
        }
        if (!Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('role')->nullable()->after('email');
            });
            // Backfill from role_id
            $map = DB::table('roles')->pluck('name', 'id');
            $users = DB::table('users')->select('id', 'role_id')->get();
            foreach ($users as $u) {
                $name = $map[$u->role_id] ?? 'public';
                DB::table('users')->where('id', $u->id)->update(['role' => $name]);
            }
        }
        if (Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        }
        // Keep role_id & tenant_id (no full rollback of model change)
    }
};
