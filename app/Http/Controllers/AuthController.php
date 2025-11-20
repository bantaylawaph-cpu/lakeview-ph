<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Support\Serializers\UserSerializer;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            // Enforce strong password: >=8, 1 uppercase, 1 digit, 1 special
            'password' => ['required','string','min:8','regex:/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/'],
            'tenant_id' => 'nullable|integer|exists:tenants,id',
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter, one number and one special character.'
        ]);

        $roleName = $data['tenant_id'] ? Role::CONTRIBUTOR : Role::PUBLIC;
        $roleId = Role::where('name', $roleName)->value('id');

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'tenant_id' => $data['tenant_id'] ?? null,
            'role_id' => $roleId,
        ]);

        return response()->json(['data' => $user], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string'
        ]);
        $user = User::where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['The provided credentials are incorrect.']]);
        }
        // Note: account active/inactive status deprecated; do not block login here.
        $token = $user->createToken('api')->plainTextToken;
        // Eager load role & tenant for consistency with /auth/me
        $user->loadMissing(['role:id,name,scope','tenant:id,name']);
        return response()->json(['token' => $token, 'data' => UserSerializer::toArray($user)]);
    }

    /** Return the authenticated user (sanitized) */
    public function me(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $user->loadMissing(['role:id,name,scope', 'tenant:id,name']);
        return response()->json(UserSerializer::toArray($user));
    }

    /** Revoke current token */
    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $token = $user->currentAccessToken();
            // Only delete if this is a persistent personal access token (TransientToken lacks delete())
            if ($token && method_exists($token, 'delete')) {
                $token->delete();
            }
        }
        return response()->json(['message' => 'Logged out']);
    }
}
