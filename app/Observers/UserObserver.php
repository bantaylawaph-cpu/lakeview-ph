<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Cache;

class UserObserver
{
    public function created(User $user): void
    {
        // Counted roles: public, contributor, org_admin
        $this->forgetAdminUsers();
        if ($user->tenant_id) {
            $this->forgetOrgMembers((int) $user->tenant_id);
        }
    }

    public function updated(User $user): void
    {
        $origRoleId = $user->getOriginal('role_id');
        $origTenant = $user->getOriginal('tenant_id');

        $roleChanged = $origRoleId !== $user->role_id;
        $tenantChanged = $origTenant !== $user->tenant_id;

        if ($roleChanged) {
            $this->forgetAdminUsers();
        }
        if ($tenantChanged || $roleChanged) {
            if ($origTenant) $this->forgetOrgMembers((int) $origTenant);
            if ($user->tenant_id) $this->forgetOrgMembers((int) $user->tenant_id);
        }
    }

    public function deleted(User $user): void
    {
        $this->forgetAdminUsers();
        if ($user->tenant_id) $this->forgetOrgMembers((int) $user->tenant_id);
    }

    protected function forgetAdminUsers(): void
    {
        try { Cache::forget('kpi:admin:users'); } catch (\Throwable $e) {}
    }

    protected function forgetOrgMembers(int $tenantId): void
    {
        try { Cache::forget("kpi:org:$tenantId:members"); } catch (\Throwable $e) {}
    }
}
