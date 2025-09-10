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
            "email"    => "required|email|unique:users,email",
            "password" => "required|min:8",
            "name"     => "nullable|string|max:255",
        ]);

        $resolvedName = $data["name"] ?? strtok($data["email"], "@");

        $user = User::create([
            "email"    => $data["email"],
            "password" => Hash::make($data["password"]),
            "name"     => $resolvedName, // users.name is NOT NULL in your DB
        ]);

        // Assign PUBLIC role by default
        if ($public = Role::where("name","public")->first()) {
            UserTenant::create([
                "user_id"   => $user->id,
                "tenant_id" => null,
                "role_id"   => $public->id,
                "is_active" => true,
            ]);
        }

        $token = $user->createToken("lv_token", ["public"])->plainTextToken;

        return response()->json([
            "token" => $token,
            "user"  => [
                "id"    => $user->id,
                "email" => $user->email,
                "name"  => $user->name,
                "role"  => $user->highestRoleName(),
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            "email"    => "required|email",
            "password" => "required",
        ]);

        $user = User::where("email", $credentials["email"])->first();

        if (!$user || !Hash::check($credentials["password"], $user->password)) {
            throw ValidationException::withMessages([
                "email" => ["The provided credentials are incorrect."],
            ]);
        }

        $role = $user->highestRoleName();
        $abilities = match ($role) {
            "superadmin"  => ["superadmin"],
            "org_admin"   => ["org_admin"],
            "contributor" => ["contributor"],
            default       => ["public"],
        };

        // Optional: clear any old tokens
        $user->tokens()->delete();

        $token = $user->createToken("lv_token", $abilities)->plainTextToken;

        return response()->json([
            "token" => $token,
            "user"  => [
                "id"    => $user->id,
                "email" => $user->email,
                "name"  => $user->name,
                "role"  => $role,
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
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(["ok" => true]);
    }
}