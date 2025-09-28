<?php

namespace App\Http\Controllers\Api\Admin\Concerns;

use Illuminate\Http\Request;
use App\Models\Role;

trait ResolvesTenantContext
{
    /**
     * Resolve active tenant & role for current user.
     * @return array{tenant_id:int|null, role:string|null, is_superadmin:bool}
     */
    protected function resolveTenantContext(Request $request, ?int $tenantId = null): array
    {
        $user = $request->user();
        if (!$user) {
            return ['tenant_id' => null, 'role' => null, 'is_superadmin' => false];
        }

        $roleName = $user->role?->name;
        $isSuper = $roleName === Role::SUPERADMIN;

        // Superadmin can impersonate a tenant via explicit parameter
        if ($isSuper) {
            return [
                'tenant_id' => $tenantId,
                'role' => $roleName,
                'is_superadmin' => true,
            ];
        }

        // Tenant-scoped roles must have user->tenant_id
        return [
            'tenant_id' => $user->tenant_id,
            'role' => $roleName,
            'is_superadmin' => false,
        ];
    }

    /**
     * Resolve and validate tenant membership for the current request.
     *
     * Inputs:
     *  - $allowedRoles: roles that are allowed for this action (e.g., ['org_admin','contributor'])
     *  - $tenantId: optional explicit tenant/organization id to scope/validate against
     *  - $requireTenant: when true, require a concrete tenant_id for non-superadmin users
     *
     * Returns:
     *  - [ tenant_id:int|null, role:string|null, is_superadmin:bool, has_membership:bool ]
     */
    protected function resolveTenantMembership(Request $request, array $allowedRoles, ?int $tenantId = null, bool $requireTenant = true): array
    {
        $ctx = $this->resolveTenantContext($request, $tenantId);
        $role = $ctx['role'] ?? null;
        $isSuper = (bool)($ctx['is_superadmin'] ?? false);

        // Superadmin: always allowed. If a specific tenant was requested, pass it through; otherwise null means "all".
        if ($isSuper) {
            return [
                'tenant_id' => $ctx['tenant_id'],
                'role' => $role,
                'is_superadmin' => true,
                'has_membership' => false,
            ];
        }

        // Must be authenticated and have an allowed role
        if (!$role) {
            abort(401, 'Unauthenticated');
        }
        if (!in_array($role, $allowedRoles, true)) {
            abort(403, 'Forbidden');
        }

        $userTenantId = $ctx['tenant_id'];

        // If a tenant was explicitly provided, it must match the user's tenant
        if ($tenantId !== null && $userTenantId !== null && $tenantId !== $userTenantId) {
            abort(403, 'Forbidden');
        }

        if ($requireTenant && $userTenantId === null) {
            abort(422, 'organization_id is required.');
        }

        return [
            // Prefer the actual user's tenant; fall back to provided tenant when userTenantId is null and not required
            'tenant_id' => $userTenantId ?? $tenantId,
            'role' => $role,
            'is_superadmin' => false,
            'has_membership' => $userTenantId !== null,
        ];
    }
}
