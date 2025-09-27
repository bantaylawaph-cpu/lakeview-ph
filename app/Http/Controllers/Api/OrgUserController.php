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
    // GET /api/org/{tenant}/users?roles=contributor,org_admin&per_page=15
    public function index(Request $request, int $tenant)
    {
        $roleNames = array_filter(array_map('trim', explode(',', (string)$request->query('roles', 'contributor,org_admin'))));
        if (empty($roleNames)) {
            $roleNames = [Role::CONTRIBUTOR, Role::ORG_ADMIN];
        }

        $users = User::query()
            ->where('tenant_id', $tenant)
            ->whereHas('role', function ($q) use ($roleNames) {
                $q->whereIn('name', $roleNames);
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

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
        $user->is_active = true;
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
            'is_active' => ['sometimes','boolean'],
        ]);

        if ($user->tenant_id !== $tenant) {
            return response()->json(['message' => 'User not in tenant'], 404);
        }

        if (array_key_exists('name', $data)) $user->name = $data['name'];
        if (array_key_exists('email', $data)) $user->email = $data['email'];
        if (!empty($data['password'])) $user->password = Hash::make($data['password']);
        if (array_key_exists('is_active', $data)) $user->is_active = (bool)$data['is_active'];
        $user->save();

        return response()->json(['message' => 'Updated','user' => $user->fresh(['role'])]);
    }

    // DELETE /api/org/{tenant}/users/{user}
    public function destroy(Request $request, int $tenant, User $user)
    {
        $actor = $request->user();
        $this->authorizeTenantUser($actor, $tenant, $user);

        if ($user->tenant_id !== $tenant) {
            return response()->json(['message' => 'User not in tenant'], 404);
        }

        // Option: demote instead of delete? For now just delete.
        $user->delete();
        return response()->json(['message' => 'User removed']);
    }

    private function authorizeTenantUser(?User $actor, int $tenant, User $target): void
    {
        if (!$actor) abort(403);
        if ($actor->isSuperAdmin()) return; // full access
        if ($actor->isOrgAdmin() && $actor->tenant_id === $tenant) return; // manage their own tenant
        abort(403);
    }
}
