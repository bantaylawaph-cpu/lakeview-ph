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
            if ($token && $token->created_at) {
                $ttl = (int) config('auth.token_ttl_minutes', env('TOKEN_TTL_MINUTES', 1440)); // default 24h
                if ($ttl > 0) {
                    $created = Carbon::parse($token->created_at);
                    if ($created->diffInMinutes(now()) > $ttl) {
                        // Expire token and reject
                        $token->delete();
                        return response()->json(['message' => 'Token expired'], 401);
                    }
                }
            }
        }

        return $next($request);
    }
}

