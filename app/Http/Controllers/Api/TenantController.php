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
        // Per-page capped at 100 for performance
        $perPage      = max(1, min((int) $request->query('per_page', 15), 100));
        $withDeleted  = (bool) $request->query('with_deleted', false);
        // Active filter (supports either 'active' or 'is_active')
        // Status (active) deprecated: ignore active/is_active filters

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
            // active filter removed
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

        // Transform including core contact fields (status deprecated; omit 'active')
        $paginator->getCollection()->transform(fn (Tenant $t) => [
            'id'            => $t->id,
            'name'          => $t->name,
            'slug'          => $t->slug,
            'type'          => $t->type,
            'phone'         => $t->phone,
            'address'       => $t->address,
            'contact_email' => $t->contact_email,
            'deleted_at'    => optional($t->deleted_at)->toIso8601String(),
            'created_at'    => optional($t->created_at)->toIso8601String(),
            'updated_at'    => optional($t->updated_at)->toIso8601String(),
        ]);

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
        // Soft delete only; prevent if users still attached
        if ($tenant->users()->count() > 0) {
            throw ValidationException::withMessages(['tenant' => ['Cannot delete: users still belong to this organization. Detach users first.']]);
        }
        $tenant->delete();
        // Basic audit log (extend with dedicated audit model if needed)
        \Log::info('Tenant soft deleted', ['tenant_id' => $tenant->id, 'actor' => $request->user()?->id]);
        // Return 204 (no content) to align with REST semantics; tests expect assertNoContent()
        return response()->json([], 204);
    }

    /**
     * POST /api/admin/tenants/{id}/restore
     * Restore a previously soft-deleted tenant.
     */
    public function restore(Request $request, $id)
    {
        $this->requireSuperAdmin($request);
        $tenant = Tenant::withTrashed()->findOrFail((int)$id);
        if (!$tenant->trashed()) {
            throw ValidationException::withMessages(['tenant' => ['Tenant is not deleted.']]);
        }
        $tenant->restore();
        \Log::info('Tenant restored', ['tenant_id' => $tenant->id, 'actor' => $request->user()?->id]);
        return response()->json(['data' => $this->tenantResource($tenant)], 200);
    }

    /**
     * DELETE /api/admin/tenants/{tenant}/hard
     * Trigger asynchronous hard delete via queue.
     */
    public function hardDelete(Request $request, $tenant)
    {
        $this->requireSuperAdmin($request);
        // Resolve including trashed records
        $tenantModel = Tenant::withTrashed()->findOrFail((int)$tenant);
        if (!$tenantModel->trashed()) {
            // Require soft delete first for safety
            throw ValidationException::withMessages(['tenant' => ['Hard delete requires tenant to be soft-deleted first.']]);
        }
        $reason = trim((string) $request->input('reason', ''));
        \App\Jobs\TenantHardDeleteJob::dispatch($tenantModel->id, $request->user()->id, $reason);
        return response()->json(['status' => 'queued'], 202);
    }

    /**
     * GET /api/admin/tenants/{tenant}/audit
     * Return recent audit log entries for this tenant model changes.
     */
    public function audit(Request $request, Tenant $tenant)
    {
        $this->requireSuperAdmin($request); // limit audit visibility for now
        // Query last 50 audit entries for this tenant model, join users for actor info
        $raw = DB::table('audit_logs as a')
            ->leftJoin('users as u', 'u.id', '=', 'a.actor_id')
            ->where('a.model_type', Tenant::class)
            ->where('a.model_id', (string)$tenant->id)
            ->orderByDesc('a.event_at')
            ->limit(50)
            ->get([
                'a.id','a.event_at','a.actor_id','a.action','a.diff_keys',
                DB::raw("COALESCE(u.name, '') as actor_name"),
                DB::raw("COALESCE(u.email, '') as actor_email")
            ]);

        // Normalize + parse diff_keys if JSON
        $rows = $raw->map(function ($r) {
            $diff = $r->diff_keys;
            $parsed = null;
            if (is_string($diff) && $diff !== '') {
                $trim = ltrim($diff);
                if ($trim[0] === '{' || $trim[0] === '[') {
                    try { $parsed = json_decode($diff, true, 512, JSON_THROW_ON_ERROR); } catch (\Throwable $e) { $parsed = null; }
                } else {
                    // treat comma-separated list
                    $parts = array_filter(array_map('trim', explode(',', $diff)));
                    if ($parts) $parsed = $parts;
                }
            }
            return [
                'id'          => $r->id,
                'event_at'    => $r->event_at,
                'action'      => $r->action,
                'actor_id'    => $r->actor_id,
                'actor_name'  => $r->actor_name ?: null,
                'actor_email' => $r->actor_email ?: null,
                'diff'        => $parsed,
            ];
        });
        return response()->json(['data' => $rows]);
    }

    // List organization admins for a tenant
    public function admins(Request $request, Tenant $tenant)
    {
        $this->authorizeTenantAccess($request, $tenant, requireAdmin: true);
        $admins = User::where('tenant_id', $tenant->id)
            ->whereHas('role', fn($q) => $q->where('name', Role::ORG_ADMIN))
            ->orderBy('name')
            ->get(['id','name','email','tenant_id','role_id']);
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
     * GET /api/org/{tenant}/tenant
     * Return tenant details for org_admin (scoped) or superadmin.
     */
    public function orgScopedShow(Request $request, $tenant)
    {
        $tenantModel = $tenant instanceof Tenant ? $tenant : Tenant::findOrFail((int)$tenant);
        $this->authorizeTenantAccess($request, $tenantModel, requireAdmin: true);
        return response()->json(['data' => $this->tenantResource($tenantModel)]);
    }

    /**
     * PATCH /api/org/{tenant}/tenant
     * Allow an org_admin (scoped) or superadmin to update tenant core details.
     * Fields are optional; only provided keys are updated.
     */
    public function orgScopedUpdate(Request $request, $tenant)
    {
        $tenantModel = $tenant instanceof Tenant ? $tenant : Tenant::findOrFail((int)$tenant);
        $this->authorizeTenantAccess($request, $tenantModel, requireAdmin: true);
        $data = $request->validate([
            'name'          => 'sometimes|required|string|max:255|unique:tenants,name,' . $tenantModel->id,
            'type'          => 'sometimes|nullable|string|max:255',
            'contact_email' => 'sometimes|nullable|email|max:255',
            'phone'         => 'sometimes|nullable|string|max:255',
            'address'       => 'sometimes|nullable|string|max:500',
        ]);
        $old = $tenantModel->only(['name','type','contact_email','phone','address']);
        $tenantModel->fill($data);
        $tenantModel->save();
        $resource = $this->tenantResource($tenantModel);
        $resource['changed'] = array_keys($data);
        $resource['previous'] = $old;
        return response()->json(['data' => $resource]);
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
            'deleted_at'    => optional($t->deleted_at)->toIso8601String(),
            'created_at'    => optional($t->created_at)->toIso8601String(),
            'updated_at'    => optional($t->updated_at)->toIso8601String(),
        ];
    }
}
