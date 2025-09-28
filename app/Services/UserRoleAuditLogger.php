<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class UserRoleAuditLogger
{
    /**
     * Log a role / tenant change for a user.
     *
     * @param User $user The user after modification
     * @param array $original Original attributes array from $user->getOriginal()
     * @param User|null $actor The acting authenticated user (nullable for system tasks)
     * @param string|null $reason Free-form reason
     */
    public static function log(User $user, array $original, ?User $actor, ?string $reason = null): void
    {
        // Determine old/new values safely
        $oldTenantId = $original['tenant_id'] ?? null;
        $oldRoleId   = $original['role_id'] ?? null;
        $newTenantId = $user->tenant_id;
        $newRoleId   = $user->role_id;

        // Only log if something meaningful changed
        if ($oldTenantId == $newTenantId && $oldRoleId == $newRoleId) {
            return;
        }

        DB::table('user_tenant_changes')->insert([
            'user_id'        => $user->id,
            'actor_id'       => $actor?->id,
            'old_tenant_id'  => $oldTenantId,
            'new_tenant_id'  => $newTenantId,
            'old_role_id'    => $oldRoleId,
            'new_role_id'    => $newRoleId,
            'reason'         => $reason,
            'created_at'     => now(),
        ]);
    }
}
