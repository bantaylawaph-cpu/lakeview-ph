<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    // Superadmin can manage any user; org_admin can manage contributor users in same tenant.
    public function manage(User $actor, User $subject): bool
    {
        if ($actor->isSuperAdmin()) return true;
        if ($actor->isOrgAdmin()) {
            return $actor->tenant_id && $actor->tenant_id === $subject->tenant_id && !$subject->isSuperAdmin();
        }
        return false;
    }

    public function promoteToOrgAdmin(User $actor, User $target): bool
    {
        if ($actor->isSuperAdmin()) return true;
        // org_admin cannot promote others to org_admin; only superadmin
        return false;
    }

    public function demoteOrgAdmin(User $actor, User $target): bool
    {
        if ($actor->isSuperAdmin()) return true;
        // org_admin cannot demote peer org_admins; restricted.
        return false;
    }

    public function deactivate(User $actor, User $target): bool
    {
        return $this->manage($actor, $target);
    }
}
