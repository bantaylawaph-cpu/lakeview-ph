<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Support\Serializers\UserSerializer;

class UserSettingsController extends Controller
{
    /**
     * Update the authenticated user's basic settings (name and/or password).
     */
    public function update(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $data = $request->validate([
            'name' => ['sometimes','string','max:255'],
            'current_password' => ['required_with:password','string'],
            'password' => ['sometimes','string','min:8','confirmed'], // expects password_confirmation
        ]);

        // If changing password, verify current password
        if (array_key_exists('password', $data)) {
            if (!isset($data['current_password']) || !Hash::check($data['current_password'], $user->password)) {
                return response()->json(['errors' => ['current_password' => ['Current password is incorrect.']]], 422);
            }
            $user->password = Hash::make($data['password']);
        }

        if (array_key_exists('name', $data)) {
            $user->name = $data['name'];
        }

        $dirty = $user->isDirty();
        if ($dirty) $user->save();

        // Reload role & tenant for consistent serializer output
        $user->loadMissing(['role:id,name,scope','tenant:id,name']);
        return response()->json([
            'updated' => $dirty,
            'data' => UserSerializer::toArray($user)
        ]);
    }
}
