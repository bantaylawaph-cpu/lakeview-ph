<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * GET /api/admin/audit-logs
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role?->name, [Role::SUPERADMIN, Role::ORG_ADMIN])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $pp = max(1, min((int)$request->query('per_page', 25), 100));
    $qb = AuditLog::query()->with(['actor:id,name,role_id','actor.role:id,name','tenant:id,name']);

        if ($user->isOrgAdmin()) {
            $qb->where('tenant_id', $user->tenant_id);
        }

        if ($mt = $request->query('model_type')) { $qb->where('model_type', $mt); }
        if ($mid = $request->query('model_id')) { $qb->where('model_id', $mid); }
        if ($act = $request->query('action')) { $qb->where('action', $act); }
        if ($aid = $request->query('actor_id')) { $qb->where('actor_id', $aid); }
        if ($user->isSuperAdmin() && ($tid = $request->query('tenant_id'))) { $qb->where('tenant_id', $tid); }
        if ($from = $request->query('date_from')) { $qb->whereDate('event_at', '>=', $from); }
        if ($to = $request->query('date_to')) { $qb->whereDate('event_at', '<=', $to); }

        $qb->orderByDesc('event_at');

        $paginator = $qb->paginate($pp);
        $paginator->getCollection()->transform(function (AuditLog $log) {
            // Determine if actor is superadmin (avoid N+1 by relying on loaded relation)
            $actorName = $log->actor?->name;
            $actorRole = $log->actor?->role?->name; // may be null if relation not eager loaded; lightweight guard
            $tenantName = ($actorRole === \App\Models\Role::SUPERADMIN) ? '' : ($log->tenant?->name ?? '');
            return [
                'id' => $log->id, // keep id for modal fetch
                'event_at' => optional($log->event_at)->toIso8601String(),
                'actor_name' => $actorName,
                'tenant_name' => $tenantName,
                'action' => $log->action,
                'model_type' => $log->model_type,
                'model_id' => $log->model_id,
                'diff_keys' => $log->diff_keys,
                'before' => $log->before,
                'after' => $log->after,
            ];
        });

        return response()->json($paginator);
    }

    /**
     * GET /api/admin/audit-logs/{id}
     */
    public function show(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role?->name, [Role::SUPERADMIN, Role::ORG_ADMIN])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
    $log = AuditLog::with(['actor:id,name','tenant:id,name'])->findOrFail($id);
        if ($user->isOrgAdmin() && $log->tenant_id !== $user->tenant_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $actorRole = $log->actor?->role?->name;
        $tenantName = ($actorRole === \App\Models\Role::SUPERADMIN) ? '' : ($log->tenant?->name ?? '');
        return response()->json(['data' => [
            'id' => $log->id,
            'event_at' => optional($log->event_at)->toIso8601String(),
            'actor_name' => $log->actor?->name,
            'tenant_name' => $tenantName,
            'action' => $log->action,
            'before' => $log->before,
            'after' => $log->after,
        ]]);
    }
}
