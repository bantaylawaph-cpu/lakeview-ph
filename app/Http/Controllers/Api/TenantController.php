<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\UserRoleAuditLogger;
use Illuminate\Validation\ValidationException;

class TenantController extends Controller
{
    /**
     * GET /api/admin/tenants
     * ?q=  (search by name/slug/domain)
     * ?with_deleted=1  (include soft-deleted)
     * ?per_page=15
     */
    public function index(Request $request)
    {
        $q           = trim((string) $request->query('q', ''));
        $perPage     = max(1, min((int) $request->query('per_page', 15), 200));
        $withDeleted = (bool) $request->query('with_deleted', false);

        $qb = Tenant::query()
            ->when($withDeleted, fn($w) => $w->withTrashed())
            ->when($q !== '', function ($w) use ($q) {
                $p = "%{$q}%";
                $w->where(function ($x) use ($p) {
                    $x->where('name', 'ILIKE', $p)
                      ->orWhere('slug', 'ILIKE', $p)
                      ->orWhere('domain', 'ILIKE', $p);
                });
            })
            ->orderBy('name');

        $paginator = $qb->paginate($perPage);

        $paginator->getCollection()->transform(function (Tenant $t) {
            return $this->tenantResource($t);
        });

        return response()->json($paginator);
    }

    /**
     * GET /api/admin/tenants/{tenant}
     */
    public function show(Request $request, Tenant $tenant)
    {
        $this->authorizeTenantAccess($request, $tenant);
        return response()->json(['data' => $tenant]);
    }

    /**
     * POST /api/admin/tenants
     */
    public function store(Request $request)
    {
        $this->requireSuperAdmin($request);
        $data = $request->validate(['name' => 'required|string|max:255', 'description' => 'nullable|string']);
        $tenant = Tenant::create($data);
        return response()->json(['data' => $tenant], 201);
    }

    /**
     * PUT /api/admin/tenants/{tenant}
     */
    public function update(Request $request, Tenant $tenant)
    {
        $this->requireSuperAdmin($request);
        $data = $request->validate(['name' => 'sometimes|string|max:255', 'description' => 'nullable|string']);
        $tenant->fill($data);
        $tenant->save();
        return response()->json(['data' => $tenant]);
    }

    /**
     * DELETE /api/admin/tenants/{tenant}
     * Soft-deletes the tenant.
     */
    public function destroy(Request $request, Tenant $tenant)
    {
        $this->requireSuperAdmin($request);
        // Decide cascade handling: we prevent delete if users still attached
        $usersCount = $tenant->users()->count();
        if ($usersCount > 0) {
            throw ValidationException::withMessages(['tenant' => ['Cannot delete a tenant while users still belong to it. Move or delete users first.']]);
        }
        $tenant->delete();
        return response()->json([], 204);
    }

    // List organization admins for a tenant
    public function admins(Request $request, Tenant $tenant)
    {
        $this->authorizeTenantAccess($request, $tenant, requireAdmin: true);
        $admins = User::where('tenant_id', $tenant->id)
            ->whereHas('role', fn($q) => $q->where('name', Role::ORG_ADMIN))
            ->orderBy('name')
            ->get(['id','name','email','is_active','tenant_id','role_id']);
        return response()->json(['data' => $admins]);
    }

    // Assign a user (existing) as organization admin.
    public function assignAdmin(Request $request, Tenant $tenant)
    {
        $this->authorizeTenantAccess($request, $tenant, requireAdmin: true);
        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id'
        ]);
    $user = User::findOrFail($data['user_id']);
    $original = $user->only(['role_id','tenant_id']);
        if ($user->tenant_id !== $tenant->id) {
            // If user currently belongs to another tenant and has tenant-scoped role, block.
            if ($user->tenant_id && $user->role && $user->role->scope === 'tenant' && $user->tenant_id !== $tenant->id) {
                throw ValidationException::withMessages(['user_id' => ['User already belongs to another organization.']]);
            }
            $user->tenant_id = $tenant->id; // Move user if was public or system scoped.
        }
        $orgAdminRoleId = Role::where('name', Role::ORG_ADMIN)->value('id');
        $user->role_id = $orgAdminRoleId;
        $user->save();

        UserRoleAuditLogger::log($user, $original, $request->user(), 'Assigned as organization admin');
        return response()->json(['data' => $user]);
    }

    // Remove admin role from a user (demote to contributor or public)
    public function removeAdmin(Request $request, Tenant $tenant, User $user)
    {
        $this->authorizeTenantAccess($request, $tenant, requireAdmin: true);
        if ($user->tenant_id !== $tenant->id) {
            return response()->json(['message' => 'User does not belong to this tenant.'], 422);
        }
        if ($user->role?->name !== Role::ORG_ADMIN) {
            return response()->json(['message' => 'User is not an organization admin.'], 422);
        }
        $contributorRoleId = Role::where('name', Role::CONTRIBUTOR)->value('id');
        $original = $user->only(['role_id','tenant_id']);
        $user->role_id = $contributorRoleId; // Demote but keep tenant membership
        $user->save();
        UserRoleAuditLogger::log($user, $original, $request->user(), 'Removed organization admin role');
        return response()->json(['data' => $user]);
    }

    protected function authorizeTenantAccess(Request $request, Tenant $tenant, bool $requireAdmin = false): void
    {
        $user = $request->user();
        if (!$user) abort(401);
        $roleName = $user->role?->name;
        if ($roleName === Role::SUPERADMIN) return; // always allowed
        if ($user->tenant_id !== $tenant->id) abort(403, 'Forbidden for this tenant');
        if ($requireAdmin && $roleName !== Role::ORG_ADMIN) abort(403, 'Organization admin role required');
    }

    protected function requireSuperAdmin(Request $request): void
    {
        $role = $request->user()?->role?->name;
        if ($role !== Role::SUPERADMIN) abort(403, 'Super administrator role required');
    }

    /* ----------------------------------------
     | Resource formatter
     |-----------------------------------------*/
    private function tenantResource(Tenant $t): array
    {
        return [
            'id'            => $t->id,
            'name'          => $t->name,
            'slug'          => $t->slug,
            'domain'        => $t->domain,
            'type'          => $t->type,
            'phone'         => $t->phone,
            'address'       => $t->address,
            'contact_email' => $t->contact_email,
            'active'        => (bool) $t->active,
            'metadata'      => $t->metadata,
            'deleted_at'    => optional($t->deleted_at)->toIso8601String(),
            'created_at'    => optional($t->created_at)->toIso8601String(),
            'updated_at'    => optional($t->updated_at)->toIso8601String(),
        ];
    }
}
