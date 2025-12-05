<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class OrgUserController extends Controller
{
    // GET /api/org/{tenant}/users?roles=contributor,org_admin&per_page=15&q=search&sort_by=name&sort_dir=asc
    public function index(Request $request, int $tenant)
    {
        $roleNames = array_filter(array_map('trim', explode(',', (string)$request->query('roles', 'contributor,org_admin'))));
        if (empty($roleNames)) {
            $roleNames = [Role::CONTRIBUTOR, Role::ORG_ADMIN];
        }

        $query = User::query()
            ->where('tenant_id', $tenant)
            ->whereHas('role', function ($q) use ($roleNames) {
                $q->whereIn('name', $roleNames);
            });

        // Search support
        $search = trim($request->query('q', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        // Sorting support
        $sortBy = $request->query('sort_by', 'name');
        $sortDir = strtolower($request->query('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSorts = ['id', 'name', 'email', 'created_at', 'updated_at'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('name', 'asc');
        }

        $users = $query->with('role')->paginate($request->integer('per_page', 15));

        return response()->json($users);
    }

    // GET /api/org/{tenant}/users/{user}
    public function show(Request $request, int $tenant, User $user)
    {
        $this->authorizeTenantUser($request->user(), $tenant, $user);
        if ($user->tenant_id !== $tenant) {
            return response()->json(['message' => 'User not in tenant'], 404);
        }
        $user->load(['role']);
        return response()->json($user);
    }

    // POST /api/org/{tenant}/users
    public function store(Request $request, int $tenant)
    {
        $actor = $request->user();
        if (!$actor || !$actor->isOrgAdmin() || $actor->tenant_id !== $tenant) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name' => ['required','string','max:255'],
            'email' => ['required','email','max:255'],
            'password' => ['nullable','string','min:8'],
            'occupation' => ['nullable','string','max:255'],
            'occupation_other' => ['nullable','string','max:255'],
        ]);

        $user = User::firstWhere('email', $data['email']);
        if (!$user) {
            $user = new User([
                'name' => $data['name'],
                'email' => $data['email'],
            ]);
            $user->password = Hash::make($data['password'] ?? str()->random(16));
        }

        $contributorRoleId = Role::where('name', Role::CONTRIBUTOR)->value('id');
        if (!$contributorRoleId) {
            return response()->json(['message' => 'Seed roles first.'], 422);
        }

        $user->role_id = $contributorRoleId; // force contributor
        $user->tenant_id = $tenant;
        $user->occupation = $data['occupation'] ?? null;
        $user->occupation_other = $data['occupation_other'] ?? null;
        $user->save();

        return response()->json([
            'message' => 'User added as contributor.',
            'user' => $user->fresh(['role']),
        ], 201);
    }

    // PUT /api/org/{tenant}/users/{user}
    public function update(Request $request, int $tenant, User $user)
    {
        $actor = $request->user();
        $this->authorizeTenantUser($actor, $tenant, $user);

        $data = $request->validate([
            'name' => ['sometimes','string','max:255'],
            'email' => ['sometimes','email','max:255', Rule::unique('users','email')->ignore($user->id)],
            'password' => ['sometimes','nullable','string','min:8'],
            'occupation' => ['sometimes','nullable','string','max:255'],
            'occupation_other' => ['sometimes','nullable','string','max:255'],
        ]);

        if ($user->tenant_id !== $tenant) {
            return response()->json(['message' => 'User not in tenant'], 404);
        }

        if (array_key_exists('name', $data)) $user->name = $data['name'];
        if (array_key_exists('email', $data)) $user->email = $data['email'];
        if (!empty($data['password'])) $user->password = Hash::make($data['password']);
        if (array_key_exists('occupation', $data)) $user->occupation = $data['occupation'];
        if (array_key_exists('occupation_other', $data)) $user->occupation_other = $data['occupation_other'];
        $user->save();

        return response()->json(['message' => 'Updated','user' => $user->fresh(['role'])]);
    }

    // DELETE /api/org/{tenant}/users/{user}
    // Remove user from organization (demote to public, preserve account & data)
    public function destroy(Request $request, int $tenant, User $user)
    {
        $actor = $request->user();
        $this->authorizeTenantUser($actor, $tenant, $user);

        if ($user->tenant_id !== $tenant) {
            return response()->json(['message' => 'User not in tenant'], 404);
        }

        // Prevent self-removal
        if ($user->id === $actor->id) {
            return response()->json(['message' => 'Cannot remove yourself from the organization'], 422);
        }

        // Prevent removing last org admin
        if ($user->isOrgAdmin()) {
            $adminCount = User::where('tenant_id', $tenant)
                ->whereHas('role', fn($q) => $q->where('name', Role::ORG_ADMIN))
                ->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'Cannot remove the last organization administrator. Transfer admin role first.'], 422);
            }
        }

        // Get public role
        $publicRoleId = Role::where('name', Role::PUBLIC)->value('id');
        if (!$publicRoleId) {
            return response()->json(['message' => 'Public role not found. Please run database seeders.'], 500);
        }

        // Remove from organization (demote to public, preserve account)
        $user->role_id = $publicRoleId;
        $user->tenant_id = null;
        $user->save();

        return response()->json([
            'message' => 'User removed from organization. Their account and data contributions have been preserved.',
            'user' => $user->fresh(['role'])
        ]);
    }

    private function authorizeTenantUser(?User $actor, int $tenant, User $target): void
    {
        if (!$actor) abort(403);
        if ($actor->isSuperAdmin()) return; // full access
        if ($actor->isOrgAdmin() && $actor->tenant_id === $tenant) return; // manage their own tenant
        abort(403);
    }
}
