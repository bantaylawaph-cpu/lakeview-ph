<?php

namespace App\Support\Serializers;

use App\Models\User;

/**
 * Stateless helper that converts a User model (with role & tenant loaded) into
 * the canonical API payload shape used by /auth/login and /auth/me.
 *
 * This introduces no behavior change; it simply centralizes the array shape so
 * future adjustments happen in one place.
 */
class UserSerializer
{
    /**
     * Return standardized array for API responses.
     */
    public static function toArray(User $user): array
    {
        return [
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'role_id'    => $user->role_id,
            'role'       => $user->role?->name,
            'role_scope' => $user->role?->scope,
            'tenant_id'  => $user->tenant_id,
            'tenant'     => $user->tenant?->name,
            'is_active'  => $user->is_active,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }
}
