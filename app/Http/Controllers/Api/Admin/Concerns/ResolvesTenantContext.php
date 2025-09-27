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
}
