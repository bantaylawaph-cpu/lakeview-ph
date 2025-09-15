<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Carbon\Carbon;

class EnforceTokenTTL
{
    public function handle(Request $request, Closure $next): Response
{
    $user = $request->user();
    if ($user && method_exists($user, 'currentAccessToken')) {
        $token = $user->currentAccessToken();

        if ($token) {
            // 1) If token has an explicit expires_at, respect it.
            if (!is_null($token->expires_at)) {
                if (now()->greaterThan($token->expires_at)) {
                    $token->delete();
                    return response()->json(['message' => 'Token expired'], 401);
                }
                // If not expired yet, allow request; skip TTL check entirely.
                return $next($request);
            }

            // 2) Otherwise, fall back to global TTL (if configured)
            $ttl = (int) config('auth.token_ttl_minutes', env('TOKEN_TTL_MINUTES', 1440)); // default 24h
            if ($ttl > 0 && $token->created_at) {
                if (Carbon::parse($token->created_at)->diffInMinutes(now()) > $ttl) {
                    $token->delete();
                    return response()->json(['message' => 'Token expired'], 401);
                }
            }
        }
    }

    return $next($request);
}

}

