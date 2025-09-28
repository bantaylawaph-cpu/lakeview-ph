<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    /**
     * Usage in routes:
     *   ->middleware('role:superadmin')
     *   ->middleware('role:org_admin,contributor')
     *   ->middleware('role:org_admin|contributor')
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Eager load current role once
        $user->loadMissing('role');

        // SUPERADMIN always allowed
        if (($user->role?->name) === 'superadmin') {
            return $next($request);
        }

        // Flatten and normalize role args:
        // supports "role:org_admin,contributor" AND "role:org_admin|contributor"
        $list = [];
        foreach ($roles as $arg) {
            foreach (preg_split('/[,\|]/', (string) $arg) as $piece) {
                $piece = trim($piece);
                if ($piece !== '') $list[] = $piece;
            }
        }

        // No roles specified? Allow by default (or deny if you prefer).
        if (empty($list)) {
            return $next($request);
        }

        $current = $user->role?->name;
        if (!in_array($current, $list, true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
