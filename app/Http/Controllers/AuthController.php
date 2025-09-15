<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\UserTenant;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            "email"                 => "required|email|unique:users,email",
            "password"              => "required|min:8|confirmed",
            "password_confirmation" => "required",
            "name"                  => "nullable|string|max:255",
            "occupation"            => "nullable|string|in:student,researcher,gov_staff,ngo_worker,fisherfolk,local_resident,faculty,consultant,tourist,other",
            "occupation_other"      => "nullable|string|max:255|required_if:occupation,other",
        ]);

        $resolvedName = $data["name"] ?? strtok($data["email"], "@");

        $user = User::create([
            "email"             => $data["email"],
            "password"          => Hash::make($data["password"]),
            "name"              => $resolvedName,
            "occupation"        => $data["occupation"] ?? null,
            "occupation_other"  => ($data["occupation"] ?? null) === "other" ? ($data["occupation_other"] ?? null) : null,
        ]);

        // Assign PUBLIC role
        if ($public = Role::where("name", "public")->first()) {
            UserTenant::create([
                "user_id"   => $user->id,
                "tenant_id" => null,
                "role_id"   => $public->id,
                "is_active" => true,
            ]);
        }

        // $token = $user->createToken("lv_token", ["public"], now()->addDays(30))->plainTextToken;

        return response()->json([
            'message' => 'Account created. Please log in.',
            "user"  => [
                "id"                => $user->id,
                "email"             => $user->email,
                "name"              => $user->name,
                "role"              => $user->highestRoleName(),
                "occupation"        => $user->occupation,
                "occupation_other"  => $user->occupation_other,
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            "email"    => "required|email",
            "password" => "required",
            "remember" => "sometimes|boolean",
        ]);

        $user = User::where("email", $credentials["email"])->first();

        if (!$user || !Hash::check($credentials["password"], $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401);
        }

        $role = $user->highestRoleName();
        $abilities = match ($role) {
            "superadmin"  => ["superadmin"],
            "org_admin"   => ["org_admin"],
            "contributor" => ["contributor"],
            default       => ["public"],
        };

        $remember = (bool)($credentials["remember"] ?? false);
        $expiry = $remember ? now()->addDays(30) : now()->addHours(2);

        // Clear old tokens if you want single-session
        $user->tokens()->delete();

        $token = $user->createToken("lv_token", $abilities, $expiry)->plainTextToken;

        return response()->json([
            "token" => $token,
            "user"  => [
                "id"    => $user->id,
                "email" => $user->email,
                "name"  => $user->name,
                "role"  => $role,
                "occupation" => $user->occupation,
                "occupation_other" => $user->occupation_other,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $u = $request->user();
        return response()->json([
            "id"    => $u->id,
            "email" => $u->email,
            "name"  => $u->name,
            "role"  => $u->highestRoleName(),
            "occupation" => $u->occupation,
            "occupation_other" => $u->occupation_other,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(["ok" => true]);
    }
}
