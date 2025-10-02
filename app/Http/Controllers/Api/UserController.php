<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\UserRoleAuditLogger;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * GET /api/admin/users
     */
    public function index(Request $request)
    {
        $q            = trim((string) $request->query('q', ''));
        $pp           = max(1, min((int) $request->query('per_page', 15), 200));
        // Advanced filters coming from adminUsers.jsx
        $fName        = trim((string) $request->query('name', ''));
        $fEmail       = trim((string) $request->query('email', ''));
        $fRole        = trim((string) $request->query('role', ''));
        $createdFrom  = $request->query('created_from'); // expect YYYY-MM-DD
        $createdTo    = $request->query('created_to');   // expect YYYY-MM-DD
        $updatedFrom  = $request->query('updated_from');
        $updatedTo    = $request->query('updated_to');

        $qb = User::query()
            // Global free-text (name OR email)
            ->when($q !== '', function ($w) use ($q) {
                $pattern = "%{$q}%";
                $w->where(function ($x) use ($pattern) {
                    $x->where('name', 'ILIKE', $pattern)
                      ->orWhere('email', 'ILIKE', $pattern);
                });
            })
            // Dedicated field filters (ANDed together)
            ->when($fName !== '', function ($w) use ($fName) {
                $w->where('name', 'ILIKE', "%{$fName}%");
            })
            ->when($fEmail !== '', function ($w) use ($fEmail) {
                $w->where('email', 'ILIKE', "%{$fEmail}%");
            })
            ->when($fRole !== '', function ($w) use ($fRole) {
                $w->whereHas('role', function ($r) use ($fRole) {
                    $r->where('name', $fRole);
                });
            })
            // Date range filters (inclusive). Using whereDate for simplicity.
            ->when($createdFrom, function ($w) use ($createdFrom) {
                // Basic YYYY-MM-DD validation (length 10) before applying
                if (is_string($createdFrom) && strlen($createdFrom) === 10) {
                    $w->whereDate('created_at', '>=', $createdFrom);
                }
            })
            ->when($createdTo, function ($w) use ($createdTo) {
                if (is_string($createdTo) && strlen($createdTo) === 10) {
                    $w->whereDate('created_at', '<=', $createdTo);
                }
            })
            ->when($updatedFrom, function ($w) use ($updatedFrom) {
                if (is_string($updatedFrom) && strlen($updatedFrom) === 10) {
                    $w->whereDate('updated_at', '>=', $updatedFrom);
                }
            })
            ->when($updatedTo, function ($w) use ($updatedTo) {
                if (is_string($updatedTo) && strlen($updatedTo) === 10) {
                    $w->whereDate('updated_at', '<=', $updatedTo);
                }
            })
            ->with(['role','tenant'])
            ->orderBy('name');

        $paginator = $qb->paginate($pp);

        $paginator->getCollection()->transform(function (User $u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role?->name,
                'role_id' => $u->role_id,
                'tenant_id' => $u->tenant_id,
                'tenant' => $u->tenant ? [
                    'id' => $u->tenant->id,
                    'name' => $u->tenant->name,
                ] : null,
                'is_active' => $u->is_active,
                'email_verified_at' => optional($u->email_verified_at)->toIso8601String(),
                'created_at' => optional($u->created_at)->toIso8601String(),
                'updated_at' => optional($u->updated_at)->toIso8601String(),
            ];
        });

        return response()->json($paginator);
    }

    /**
     * GET /api/admin/users/{user}
     */
    public function show(Request $request, User $user)
    {
        $auth = $request->user();
        if (!$auth) {
            abort(401);
        }
        $roleName = $auth->role?->name;
        // Superadmin may view any user; others must be in the same tenant
        if ($roleName !== \App\Models\Role::SUPERADMIN) {
            if (($auth->tenant_id ?? null) === null || (int)$auth->tenant_id !== (int)($user->tenant_id ?? 0)) {
                abort(403, 'Forbidden');
            }
        }
        $user->load(['role','tenant']);
        return response()->json(['data' => $this->resource($user)]);
    }

    /**
     * POST /api/admin/users
     * body: { name?, email, password, password_confirmation, role, tenant_id? }
     */
    public function store(Request $request)
    {
        $auth = $request->user();
        $roleNames = [Role::PUBLIC, Role::CONTRIBUTOR, Role::ORG_ADMIN, Role::SUPERADMIN];

        $data = $request->validate([
            'name' => ['nullable','string','max:255'],
            'email' => ['required','email','max:255','unique:users,email'],
            'password' => ['required','string','min:8','confirmed'],
            'role' => ['required', Rule::in($roleNames)],
            'tenant_id' => ['nullable','integer','exists:tenants,id'],
        ]);

        // Enforce creation context:
        if ($auth && $auth->isOrgAdmin()) {
            // org_admin can only create contributors inside own tenant
            $data['role'] = Role::CONTRIBUTOR;
            $data['tenant_id'] = $auth->tenant_id;
        }

        if (!$auth || $auth->role?->name === Role::PUBLIC) {
            // public self-registration scenario: force public
            $data['role'] = Role::PUBLIC;
            $data['tenant_id'] = null;
        }

        // Scope validation
        $roleRow = Role::where('name', $data['role'])->firstOrFail();
        if ($roleRow->scope === 'tenant' && empty($data['tenant_id'])) {
            return response()->json(['message' => 'tenant_id is required for tenant-scoped role'], 422);
        }
        if ($roleRow->scope === 'system' && !empty($data['tenant_id'])) {
            return response()->json(['message' => 'tenant_id must be null for system role'], 422);
        }

        $user = new User();
        $user->name = $data['name'] ?? strtok($data['email'], '@');
        $user->email = $data['email'];
        $user->password = Hash::make($data['password']);
        $user->role_id = $roleRow->id;
        $user->tenant_id = $data['tenant_id'] ?? null;
        $user->is_active = true;
        $user->save();

        return response()->json(['data' => $this->resource($user->fresh(['role','tenant']))], 201);
    }

    /**
     * PUT /api/admin/users/{user}
     */
    public function update(Request $request, User $user)
    {
        $auth = $request->user();
        $roleNames = [Role::PUBLIC, Role::CONTRIBUTOR, Role::ORG_ADMIN, Role::SUPERADMIN];

        $data = $request->validate([
            'name' => ['nullable','string','max:255'],
            'email' => ['required','email','max:255', Rule::unique('users','email')->ignore($user->id)],
            'password' => ['nullable','string','min:8','confirmed'],
            'role' => ['required', Rule::in($roleNames)],
            'tenant_id' => ['nullable','integer','exists:tenants,id'],
            'is_active' => ['nullable','boolean'],
            'reason' => ['nullable','string','max:500']
        ]);

        $original = $user->only(['role_id','tenant_id']);

        if ($auth && $auth->isOrgAdmin()) {
            // org_admin cannot elevate; forced contributor within same tenant
            $data['role'] = Role::CONTRIBUTOR;
            $data['tenant_id'] = $auth->tenant_id;
        }

        $roleRow = Role::where('name', $data['role'])->firstOrFail();
        if ($roleRow->scope === 'tenant' && empty($data['tenant_id'])) {
            return response()->json(['message' => 'tenant_id is required for tenant-scoped role'], 422);
        }
        if ($roleRow->scope === 'system' && !empty($data['tenant_id'])) {
            return response()->json(['message' => 'tenant_id must be null for system role'], 422);
        }

        $user->name = $data['name'] ?? $user->name;
        $user->email = $data['email'] ?? $user->email;
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->role_id = $roleRow->id;
        $user->tenant_id = $data['tenant_id'] ?? null;
        if (array_key_exists('is_active', $data)) {
            $user->is_active = (bool)$data['is_active'];
        }
        $user->save();

        // Audit log if role or tenant changed
        UserRoleAuditLogger::log($user, $original, $auth, $data['reason'] ?? null);

        if ($original['role_id'] !== $user->role_id) {
            $user->tokens()->delete();
        }

        return response()->json(['data' => $this->resource($user->fresh(['role','tenant']))]);
    }

    /**
     * DELETE /api/admin/users/{user}
     */
    public function destroy(User $user)
    {
        $user->tokens()->delete();
        $user->delete();
        return response()->json([], 204);
    }

    private function resource(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role?->name,
            'role_id' => $u->role_id,
            'tenant_id' => $u->tenant_id,
            'tenant' => $u->tenant ? [
                'id' => $u->tenant->id,
                'name' => $u->tenant->name,
            ] : null,
            'is_active' => $u->is_active,
            'email_verified_at' => optional($u->email_verified_at)->toIso8601String(),
            'created_at' => optional($u->created_at)->toIso8601String(),
            'updated_at' => optional($u->updated_at)->toIso8601String(),
        ];
    }
}
