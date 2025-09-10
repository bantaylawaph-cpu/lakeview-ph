<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        if ($user->hasRole($roles)) {
            return $next($request);
        }
        return response()->json(['message' => 'Forbidden'], 403);
    }
}