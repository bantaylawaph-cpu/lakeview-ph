<?php

namespace App\Http\Controllers\Api\Org;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;

class WhoamiController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();

        $roles = $user->roles()
            ->wherePivot('is_active', true)
            ->whereIn('roles.name', ['org_admin', 'contributor'])
            ->get();

        if ($roles->isEmpty()) {
            abort(403, 'No active organization membership.');
        }

        $grouped = $roles->groupBy(function ($role) {
            return $role->pivot->tenant_id ? (int) $role->pivot->tenant_id : null;
        });

        $tenantIds = $grouped->keys()
            ->filter(fn ($id) => $id !== null)
            ->map(fn ($id) => (int) $id)
            ->values();

        $tenants = $tenantIds->isNotEmpty()
            ? Tenant::whereIn('id', $tenantIds)->get()->keyBy('id')
            : collect();

        $memberships = $grouped->map(function ($roles, $tenantId) use ($tenants) {
            $sorted = $roles->sortByDesc(function ($role) {
                return $role->name === 'org_admin' ? 2 : 1;
            });

            $primary = $sorted->first();
            $id = $tenantId !== null ? (int) $tenantId : null;
            $tenant = $id !== null ? $tenants->get($id) : null;

            return [
                'organization_id' => $id,
                'organization_name' => $tenant?->name,
                'role' => $primary->name,
            ];
        })->values();

        $active = null;
        if ($memberships->count() === 1) {
            $candidate = $memberships->first();
            if ($candidate['organization_id'] !== null) {
                $active = $candidate;
            }
        }

        return response()->json([
            'data' => [
                'active_membership' => $active,
                'memberships' => $memberships,
            ],
        ]);
    }
}

