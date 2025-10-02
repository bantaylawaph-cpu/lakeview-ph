<?php
namespace App\Http\Middleware;

use App\Support\Audit\AuditContext;
use Closure;
use Illuminate\Http\Request;

class InitAuditContext
{
    public function handle(Request $request, Closure $next)
    {
        // Bootstrap with whatever is currently known; actor may be null here if auth:sanctum not yet executed.
        $u = $request->user();
        AuditContext::bootstrap($u?->id, $u?->tenant_id);
        return $next($request);
    }
}
