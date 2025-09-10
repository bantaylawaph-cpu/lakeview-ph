<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    protected function redirectTo($request): ?string
    {
        // For APIs and AJAX, don't redirect — return 401 JSON.
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }
        // If you actually have a web login page, you could return route('login') here.
        return null;
    }
}
