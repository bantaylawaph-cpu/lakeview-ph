<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('tenants')) {
            return;
        }

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'slug')) {
                $table->string('slug')->nullable()->unique()->after('name');
            }
            if (!Schema::hasColumn('tenants', 'domain')) {
                $table->string('domain')->nullable()->unique()->after('slug');
            }
            if (!Schema::hasColumn('tenants', 'contact_email')) {
                $table->string('contact_email')->nullable()->after('domain');
            }
            if (!Schema::hasColumn('tenants', 'metadata')) {
                $table->jsonb('metadata')->nullable()->after('address');
            }
            if (!Schema::hasColumn('tenants', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        if (Schema::hasColumn('tenants', 'email')) {
            DB::statement("UPDATE tenants SET contact_email = email WHERE contact_email IS NULL");
            Schema::table('tenants', function (Blueprint $table) {
                $table->dropColumn('email');
            });
        }

        $tenants = DB::table('tenants')->select('id', 'name', 'slug')->orderBy('id')->get();
        $used = DB::table('tenants')
            ->whereNotNull('slug')
            ->pluck('slug')
            ->map(fn ($slug) => strtolower($slug))
            ->toArray();

        foreach ($tenants as $tenant) {
            if (!empty($tenant->slug)) {
                continue;
            }

            $base = Str::slug($tenant->name ?? '') ?: 'tenant-' . $tenant->id;
            $candidate = $base;
            $suffix = 1;
            while (in_array(strtolower($candidate), $used, true)) {
                $candidate = $base . '-' . $suffix;
                $suffix++;
            }

            DB::table('tenants')->where('id', $tenant->id)->update(['slug' => $candidate]);
            $used[] = strtolower($candidate);
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('tenants')) {
            return;
        }

        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'email')) {
                $table->string('email')->nullable()->after('type');
            }
        });

        DB::statement("UPDATE tenants SET email = contact_email WHERE email IS NULL");

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'contact_email')) {
                $table->dropColumn('contact_email');
            }
            if (Schema::hasColumn('tenants', 'domain')) {
                $table->dropColumn('domain');
            }
            if (Schema::hasColumn('tenants', 'slug')) {
                $table->dropColumn('slug');
            }
            if (Schema::hasColumn('tenants', 'metadata')) {
                $table->dropColumn('metadata');
            }
            if (Schema::hasColumn('tenants', 'deleted_at')) {
                $table->dropColumn('deleted_at');
            }
        });
    }
};
