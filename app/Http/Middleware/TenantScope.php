<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class TenantScope
{
    public function handle(Request $request, Closure $next)
    {
        // Prefer route param {tenant}; fallback ideas can be header or token claims later
        $tenantId = (int) ($request->route('tenant') ?? 0);

        if ($tenantId > 0) {
            // make tenant id available to controllers & policies
            $request->attributes->set('tenant_id', $tenantId);
        }

        return $next($request);
    }
}
