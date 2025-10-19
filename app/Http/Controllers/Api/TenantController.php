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
     * ?q=  (search by name/slug)
     * ?with_deleted=1  (include soft-deleted)
     * ?per_page=15
     */
    public function index(Request $request)
    {
        $q            = trim((string) $request->query('q', ''));
        $perPage      = max(1, min((int) $request->query('per_page', 15), 200));
        $withDeleted  = (bool) $request->query('with_deleted', false);
        // Active filter (supports either 'active' or 'is_active')
        $activeParam  = $request->query('active');
        if ($activeParam === null) { $activeParam = $request->query('is_active'); }
        $activeFilter = null;
        if ($activeParam !== null) {
            // Accept true/false, '1'/'0', 'true'/'false'
            $activeFilter = filter_var($activeParam, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }

        // Advanced filter params (mirroring adminUsers pattern)
        $fName        = trim((string) $request->query('name', ''));
        $fType        = trim((string) $request->query('type', ''));
        $fPhone       = trim((string) $request->query('phone', ''));
        $fAddress     = trim((string) $request->query('address', ''));
        $fContact     = trim((string) $request->query('contact_email', ''));
        $createdFrom  = $request->query('created_from');
        $createdTo    = $request->query('created_to');
        $updatedFrom  = $request->query('updated_from');
        $updatedTo    = $request->query('updated_to');

        $qb = Tenant::query()
            ->when($withDeleted, fn($w) => $w->withTrashed())
            ->when($activeFilter !== null, fn($w) => $w->where('active', $activeFilter))
            // Global free-text q across name/slug
            ->when($q !== '', function ($w) use ($q) {
                $p = "%{$q}%";
                $w->where(function ($x) use ($p) {
                    $x->where('name', 'ILIKE', $p)
                      ->orWhere('slug', 'ILIKE', $p);
                });
            })
            // Field-specific filters (AND conditions)
            ->when($fName !== '', fn($w) => $w->where('name', 'ILIKE', "%{$fName}%"))
            ->when($fType !== '', fn($w) => $w->where('type', 'ILIKE', "%{$fType}%"))
            ->when($fPhone !== '', fn($w) => $w->where('phone', 'ILIKE', "%{$fPhone}%"))
            ->when($fAddress !== '', fn($w) => $w->where('address', 'ILIKE', "%{$fAddress}%"))
            ->when($fContact !== '', fn($w) => $w->where('contact_email', 'ILIKE', "%{$fContact}%"))
            // Date range filters (inclusive)
            ->when($createdFrom, function ($w) use ($createdFrom) { if (is_string($createdFrom) && strlen($createdFrom) === 10) { $w->whereDate('created_at', '>=', $createdFrom); } })
            ->when($createdTo, function ($w) use ($createdTo) { if (is_string($createdTo) && strlen($createdTo) === 10) { $w->whereDate('created_at', '<=', $createdTo); } })
            ->when($updatedFrom, function ($w) use ($updatedFrom) { if (is_string($updatedFrom) && strlen($updatedFrom) === 10) { $w->whereDate('updated_at', '>=', $updatedFrom); } })
            ->when($updatedTo, function ($w) use ($updatedTo) { if (is_string($updatedTo) && strlen($updatedTo) === 10) { $w->whereDate('updated_at', '<=', $updatedTo); } })
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
        $data = $request->validate([
            'name'          => 'required|string|max:255|unique:tenants,name',
            'type'          => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'phone'         => 'nullable|string|max:255',
            'address'       => 'nullable|string|max:500',
            'active'        => 'sometimes|boolean',
        ]);
        $tenant = Tenant::create($data);
        return response()->json(['data' => $this->tenantResource($tenant)], 201);
    }

    /**
     * PUT /api/admin/tenants/{tenant}
     */
    public function update(Request $request, Tenant $tenant)
    {
        $this->requireSuperAdmin($request);
        $data = $request->validate([
            'name'          => 'sometimes|string|max:255|unique:tenants,name,' . $tenant->id,
            'type'          => 'sometimes|nullable|string|max:255',
            'contact_email' => 'sometimes|nullable|email|max:255',
            'phone'         => 'sometimes|nullable|string|max:255',
            'address'       => 'sometimes|nullable|string|max:500',
            'active'        => 'sometimes|boolean',
        ]);
        $tenant->fill($data);
        $tenant->save();
        return response()->json(['data' => $this->tenantResource($tenant)]);
    }

    /**
     * DELETE /api/admin/tenants/{tenant}
     * Soft-deletes the tenant.
     */
    public function destroy(Request $request, Tenant $tenant)
    {
        $this->requireSuperAdmin($request);
        $force = (bool) $request->query('force', false);
        // Always block delete when users still attached (safer by default)
        $usersCount = $tenant->users()->count();
        if ($usersCount > 0) {
            throw ValidationException::withMessages(['tenant' => ['Cannot delete: users still belong to this organization. Detach users first.']]);
        }
        if ($force) {
            // Hard delete (bypass soft delete) as requested for admin Force Delete
            $tenant->forceDelete();
        } else {
            // Soft-delete fallback (not exposed in UI but kept for safety)
            $tenant->delete();
        }
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

    /**
     * PATCH /api/org/{tenant}/tenant
     * Allow an org_admin (scoped to tenant) or superadmin to update only the tenant name.
     */
    public function orgScopedRename(Request $request, $tenant)
    {
        // Ensure we have a Tenant model (manual resolve to control error messaging)
        $tenantModel = $tenant instanceof Tenant ? $tenant : Tenant::findOrFail((int)$tenant);
        // Must be tenant admin (org_admin) or superadmin already allowed by authorizeTenantAccess
        $this->authorizeTenantAccess($request, $tenantModel, requireAdmin: true);
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:tenants,name,' . $tenantModel->id,
        ]);
        $old = $tenantModel->only(['name']);
        $tenantModel->name = $data['name'];
        $tenantModel->save();
        // Minimal resource payload for UI update
        return response()->json([
            'data' => [
                'id' => $tenantModel->id,
                'name' => $tenantModel->name,
                'updated_at' => optional($tenantModel->updated_at)->toIso8601String(),
                'previous_name' => $old['name']
            ]
        ]);
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
            'type'          => $t->type,
            'phone'         => $t->phone,
            'address'       => $t->address,
            'contact_email' => $t->contact_email,
            'active'        => (bool) $t->active,
            'deleted_at'    => optional($t->deleted_at)->toIso8601String(),
            'created_at'    => optional($t->created_at)->toIso8601String(),
            'updated_at'    => optional($t->updated_at)->toIso8601String(),
        ];
    }
}
