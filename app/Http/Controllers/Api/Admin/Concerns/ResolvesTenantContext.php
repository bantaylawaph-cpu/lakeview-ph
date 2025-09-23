<?php

namespace App\Http\Controllers\Api\Admin\Concerns;

use Illuminate\Http\Request;

trait ResolvesTenantContext
{
    /**
     * Resolve an active tenant membership for the current user.
     *
     * @param  Request  $request
     * @param  array    $allowedRoles  Role names allowed to perform the action (e.g. ['org_admin']).
     * @param  int|null $tenantId      Tenant to match. When null we try to infer a single membership.
     * @param  bool     $require       When true, abort(403) if no membership is found.
     *
     * @return array{tenant_id:int|null, role:string|null, has_membership:bool, is_superadmin:bool}
     */
    protected function resolveTenantMembership(Request $request, array $allowedRoles, ?int $tenantId = null, bool $require = true): array
    {
        $user = $request->user();

        $roleNames = array_unique(array_merge($allowedRoles, ['superadmin']));

        $roles = $user->roles()
            ->wherePivot('is_active', true)
            ->whereIn('roles.name', $roleNames)
            ->get();

        $tenantId = $tenantId !== null ? (int) $tenantId : null;

        $match = null;

        if ($tenantId !== null) {
            $match = $roles->first(function ($role) use ($tenantId) {
                $pivotTenant = $role->pivot->tenant_id;
                if ($role->name === 'superadmin') {
                    return true;
                }
                if ($pivotTenant === null) {
                    return false;
                }
                return (int) $pivotTenant === $tenantId;
            });
        } elseif ($roles->count() === 1) {
            $match = $roles->first();
            if ($match->pivot->tenant_id === null && $match->name !== 'superadmin') {
                $match = null; // organization-less membership requires explicit tenant id
            }
        } elseif ($roles->count() > 1) {
            abort(422, 'organization_id is required when multiple memberships exist.');
        }

        if ($match) {
            $resolvedTenant = $match->pivot->tenant_id !== null
                ? (int) $match->pivot->tenant_id
                : $tenantId;

            if ($resolvedTenant === null && $match->name !== 'superadmin') {
                abort(422, 'organization_id is required for this action.');
            }

            return [
                'tenant_id' => $resolvedTenant,
                'role' => $match->name,
                'has_membership' => $match->name !== 'superadmin' || $match->pivot->tenant_id !== null,
                'is_superadmin' => $match->name === 'superadmin',
            ];
        }

        $superadmin = $roles->firstWhere('name', 'superadmin');
        if ($superadmin) {
            return [
                'tenant_id' => $tenantId,
                'role' => 'superadmin',
                'has_membership' => false,
                'is_superadmin' => true,
            ];
        }

        if ($tenantId === null && !$require) {
            return [
                'tenant_id' => null,
                'role' => null,
                'has_membership' => false,
                'is_superadmin' => false,
            ];
        }

        if ($tenantId !== null && !$require) {
            return [
                'tenant_id' => $tenantId,
                'role' => null,
                'has_membership' => false,
                'is_superadmin' => false,
            ];
        }

        abort(403, 'Forbidden');
    }
}
