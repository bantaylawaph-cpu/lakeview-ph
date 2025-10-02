<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AuditMigrateUserRoleChanges extends Command
{
    protected $signature = 'audit:migrate-user-role-changes {--dry-run : Show counts only} {--limit=5000}';
    protected $description = 'Copy legacy user_tenant_changes rows into audit_logs (role_tenant_changed action).';

    public function handle(): int
    {
        if (!Schema::hasTable('user_tenant_changes')) {
            $this->warn('user_tenant_changes table not found.');
            return self::SUCCESS;
        }
        if (!Schema::hasTable('audit_logs')) {
            $this->error('audit_logs table missing. Run migrations first.');
            return self::FAILURE;
        }

        $dry = (bool)$this->option('dry-run');
        $limit = (int)$this->option('limit');

        $already = DB::table('audit_logs')->where('action', 'role_tenant_changed')->count();
        $legacyCount = DB::table('user_tenant_changes')->count();
        $this->info("Legacy rows: {$legacyCount}; Already migrated: {$already}");

        if ($dry) { return self::SUCCESS; }

        $remaining = $legacyCount - $already;
        if ($remaining <= 0) {
            $this->info('Nothing to migrate.');
            return self::SUCCESS;
        }

        $batch = DB::table('user_tenant_changes')
            ->orderBy('id')
            ->offset($already)
            ->limit($limit)
            ->get();

        $insert = [];
        foreach ($batch as $row) {
            $before = [
                'role_id' => $row->old_role_id,
                'tenant_id' => $row->old_tenant_id,
            ];
            $after = [
                'role_id' => $row->new_role_id,
                'tenant_id' => $row->new_tenant_id,
            ];
            $diffKeys = [];
            foreach ($before as $k => $v) {
                if (($before[$k] ?? null) != ($after[$k] ?? null)) { $diffKeys[] = $k; }
            }
            $hash = hash('sha256', json_encode(['role_tenant_changed',$row->user_id,$before,$after,$row->actor_id]));
            $insert[] = [
                'event_at' => $row->created_at ?? now(),
                'actor_id' => $row->actor_id,
                'tenant_id' => $row->new_tenant_id ?? $row->old_tenant_id,
                'model_type' => \App\Models\User::class,
                'model_id' => (string)$row->user_id,
                'action' => 'role_tenant_changed',
                'request_id' => null,
                'ip_address' => null,
                'user_agent' => null,
                'before' => json_encode($before),
                'after' => json_encode($after),
                'diff_keys' => json_encode($diffKeys),
                'meta' => json_encode(['reason' => $row->reason]),
                'hash' => $hash,
            ];
        }

        DB::table('audit_logs')->insert($insert);
        $this->info('Migrated batch: ' . count($insert));

        return self::SUCCESS;
    }
}
