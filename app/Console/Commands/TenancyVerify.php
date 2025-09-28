<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Role;

class TenancyVerify extends Command
{
    protected $signature = 'tenancy:verify {--json : Output JSON only}';
    protected $description = 'Verify role/tenant integrity and audit trail consistency.';

    public function handle(): int
    {
        $json = (bool)$this->option('json');

        $roleMap = Role::query()->pluck('scope', 'name'); // name => scope
        $tenantScoped = $roleMap->filter(fn($s)=>$s==='tenant')->keys()->all();
        $systemScoped = $roleMap->filter(fn($s)=>$s==='system')->keys()->all();

        // Collect issues
        $issues = [];

        // 1. Tenant-scoped roles with null tenant_id
        if (!empty($tenantScoped)) {
            $rows = DB::table('users')
                ->join('roles','roles.id','=','users.role_id')
                ->whereIn('roles.name', $tenantScoped)
                ->whereNull('users.tenant_id')
                ->select('users.id','users.email','roles.name as role')
                ->limit(100)
                ->get();
            if ($rows->count() > 0) {
                $issues['tenant_scoped_without_tenant'] = $rows->toArray();
            }
        }

        // 2. System-scoped roles with non-null tenant_id
        if (!empty($systemScoped)) {
            $rows = DB::table('users')
                ->join('roles','roles.id','=','users.role_id')
                ->whereIn('roles.name', $systemScoped)
                ->whereNotNull('users.tenant_id')
                ->select('users.id','users.email','roles.name as role','users.tenant_id')
                ->limit(100)
                ->get();
            if ($rows->count() > 0) {
                $issues['system_scoped_with_tenant'] = $rows->toArray();
            }
        }

        // 3. Users with null role_id
        $nullRole = DB::table('users')->whereNull('role_id')->select('id','email','tenant_id')->limit(100)->get();
        if ($nullRole->count() > 0) {
            $issues['users_missing_role'] = $nullRole->toArray();
        }

        // 4. Audit trail new_role_id mismatch (role no longer exists)
        if (DB::getSchemaBuilder()->hasTable('user_tenant_changes')) {
            $columns = DB::getSchemaBuilder()->getColumnListing('user_tenant_changes');
            $timestampCol = in_array('changed_at', $columns) ? 'changed_at' : (in_array('created_at',$columns) ? 'created_at' : null);
            $select = ['utc.id','utc.user_id','utc.old_role_id','utc.new_role_id'];
            if ($timestampCol) { $select[] = 'utc.' . $timestampCol . ' as changed_at'; }
            $orphans = DB::table('user_tenant_changes as utc')
                ->leftJoin('roles as r1','r1.id','=','utc.old_role_id')
                ->leftJoin('roles as r2','r2.id','=','utc.new_role_id')
                ->where(function($q){
                    $q->whereNull('utc.new_role_id')->orWhereNull('r2.id');
                })
                ->select($select)
                ->limit(100)
                ->get();
            if ($orphans->count() > 0) {
                $issues['audit_orphan_roles'] = $orphans->toArray();
            }
        }

        // Summarize
        $status = empty($issues) ? 'OK' : 'ISSUES_FOUND';
        $summary = [
            'status' => $status,
            'tenant_scoped_roles' => $tenantScoped,
            'system_scoped_roles' => $systemScoped,
            'issue_keys' => array_keys($issues),
            'issues' => $issues,
        ];

        if ($json) {
            $this->line(json_encode($summary, JSON_PRETTY_PRINT));
        } else {
            $this->info('Tenancy Verification: ' . $status);
            if ($status === 'OK') {
                $this->line(' - All checks passed.');
            } else {
                foreach ($issues as $key => $set) {
                    $this->error(" - {$key}: " . count($set) . ' sample rows');
                }
            }
        }

        return $status === 'OK' ? self::SUCCESS : self::FAILURE;
    }
}
