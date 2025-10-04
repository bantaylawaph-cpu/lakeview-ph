<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use Illuminate\Support\Facades\Schema;
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

        // Exclude SampleResult rows (database-only details) from listing totals and pages
        if (class_exists(\App\Models\SampleResult::class)) {
            $qb->where('model_type', '!=', \App\Models\SampleResult::class);
        }

        if ($user->isOrgAdmin()) {
            $qb->where('tenant_id', $user->tenant_id);
        }

        if ($mt = $request->query('model_type')) { $qb->where('model_type', $mt); }
        if ($mid = $request->query('model_id')) { $qb->where('model_id', $mid); }
        if ($act = $request->query('action')) { $qb->where('action', $act); }
        if ($aid = $request->query('actor_id')) { $qb->where('actor_id', $aid); }
        // server-side name/role filters to match frontend inputs
        if ($an = $request->query('actor_name')) {
            $qb->whereHas('actor', function ($q) use ($an) {
                $q->where('name', 'like', '%' . $an . '%');
            });
        }
        if ($role = $request->query('role')) {
            $qb->whereHas('actor.role', function ($q) use ($role) {
                $q->where('name', $role);
            });
        }
        if ($user->isSuperAdmin() && ($tid = $request->query('tenant_id'))) { $qb->where('tenant_id', $tid); }
        if ($from = $request->query('date_from')) { $qb->whereDate('event_at', '>=', $from); }
        if ($to = $request->query('date_to')) { $qb->whereDate('event_at', '<=', $to); }

        $qb->orderByDesc('event_at');

    $paginator = $qb->paginate($pp);

        // First pass: build collection & gather unresolved entity names
        $collection = $paginator->getCollection();
        $needLookup = []; // [ modelType => [ids...] ]
        $candidateKeys = config('audit.identity_fields', []);
        $fallbackKeys = array_unique(array_merge($candidateKeys, [
            'name','title','label','lake_name','alt_name','subject','description','parameter_name','code','identifier','slug','email','username','full_name','org_name','company_name','tenant_name','message','content'
        ]));

        // Helper to extract inline name from before/after snapshots
        $inlineName = function (AuditLog $log) use ($fallbackKeys) {
            $before = $log->before ?? [];
            $after = $log->after ?? [];
            // User special case with first+last
            if (str_ends_with($log->model_type, '\\User')) {
                $fn = $after['first_name'] ?? $before['first_name'] ?? '';
                $ln = $after['last_name'] ?? $before['last_name'] ?? '';
                $full = trim($fn.' '.$ln);
                if ($full !== '') { return $full; }
            }
            foreach ($fallbackKeys as $k) {
                $v = $after[$k] ?? $before[$k] ?? null;
                if (is_string($v) && trim($v) !== '') { return trim($v); }
            }
            return null;
        };

        // Pass 1: detect which logs need external lookup
        foreach ($collection as $log) {
            if (!$log instanceof AuditLog) { continue; }
            $name = $inlineName($log);
            if ($name) { $log->resolved_entity_name = $name; continue; }
            // No inline name; queue lookup if model class exists
            if (class_exists($log->model_type)) {
                $needLookup[$log->model_type][] = $log->model_id; // keep as string
            }
        }

        // Pre-scan: for SamplingEvent logs on this page, capture lake_id from before/after snapshots (helps for deleted events)
        $samplingEventLakeIdFromPayload = [];
        foreach ($collection as $log) {
            if ($log instanceof AuditLog && $log->model_type === \App\Models\SamplingEvent::class) {
                $before = $log->before ?? [];
                $after = $log->after ?? [];
                $lid = $after['lake_id'] ?? $before['lake_id'] ?? null;
                if ($lid) {
                    $samplingEventLakeIdFromPayload[(string)$log->model_id] = (int)$lid;
                }
            }
        }

        // Batch lookup per model_type (avoid N+1). We select only likely name columns.
        $nameMap = []; // key: "FQCN::id" => name
        foreach ($needLookup as $fqcn => $ids) {
            try {
                $ids = array_values(array_unique($ids));
                // Special handling for SamplingEvent: resolve to Lake name
                if ($fqcn === \App\Models\SamplingEvent::class) {
                    // 1) Inline lake_id from payload (covers deleted events)
                    $inlineLakeIds = [];
                    foreach ($ids as $eid) {
                        if (isset($samplingEventLakeIdFromPayload[(string)$eid])) {
                            $inlineLakeIds[(string)$eid] = $samplingEventLakeIdFromPayload[(string)$eid];
                        }
                    }
                    // 2) For remaining IDs, fetch events -> lake_id from DB (covers existing events)
                    $remainingIds = array_values(array_diff($ids, array_keys($inlineLakeIds)));
                    $evRows = [];
                    if (!empty($remainingIds)) {
                        $evRows = \App\Models\SamplingEvent::query()->select(['id','lake_id'])->whereIn('id', $remainingIds)->get();
                    } else {
                        $evRows = collect();
                    }
                    // Collect all lake IDs
                    $lakeIds = [];
                    foreach ($inlineLakeIds as $eidStr => $lid) { $lakeIds[] = (int)$lid; }
                    $lakeIds = array_merge($lakeIds, $evRows->pluck('lake_id')->filter()->all());
                    $lakeIds = array_values(array_unique(array_map('intval', $lakeIds)));
                    $lakeNames = [];
                    if (!empty($lakeIds)) {
                        $ls = \App\Models\Lake::query()->select(['id','name','alt_name'])->whereIn('id', $lakeIds)->get();
                        foreach ($ls as $l) {
                            $lakeNames[$l->id] = (is_string($l->alt_name) && trim($l->alt_name)!=='' ? trim($l->alt_name) : (is_string($l->name) ? trim($l->name) : null));
                        }
                    }
                    // Map names for inline-derived lake_ids
                    foreach ($inlineLakeIds as $eidStr => $lid) {
                        $nm = $lakeNames[$lid] ?? null;
                        if ($nm) { $nameMap[$fqcn.'::'.$eidStr] = $nm; }
                    }
                    // Map names for DB-fetched events
                    foreach ($evRows as $ev) {
                        $nm = $lakeNames[$ev->lake_id] ?? null;
                        if ($nm) { $nameMap[$fqcn.'::'.$ev->id] = $nm; }
                    }
                    continue; // handled
                }

                /** @var \Illuminate\Database\Eloquent\Model $model */
                $model = new $fqcn();
                $table = $model->getTable();
                // Determine existing columns among candidates
                $candidateCols = ['id','name','title','label','alt_name','lake_name','full_name','first_name','last_name','code','slug'];
                $existing = [];
                foreach ($candidateCols as $c) { if (Schema::hasColumn($table, $c)) { $existing[] = $c; } }
                if (empty($existing)) { continue; }
                $rows = $fqcn::query()->select($existing)->whereIn('id', $ids)->get();
                foreach ($rows as $row) {
                    $nm = null;
                    foreach (['alt_name','name','title','label','lake_name','code','slug'] as $pref) {
                        if (isset($row->$pref) && is_string($row->$pref) && trim($row->$pref) !== '') { $nm = trim($row->$pref); break; }
                    }
                    if (!$nm && (isset($row->first_name) || isset($row->last_name))) {
                        $nm = trim(($row->first_name ?? '').' '.($row->last_name ?? '')) ?: null;
                    }
                    if ($nm) { $nameMap[$fqcn.'::'.$row->id] = $nm; }
                }
            } catch (\Throwable $e) {
                // Swallow lookup errors; keep graceful
            }
        }

        // Transform payload
        $collection->transform(function (AuditLog $log) use ($nameMap) {
            $actorName = $log->actor?->name;
            $actorRole = $log->actor?->role?->name;
            $tenantName = ($actorRole === \App\Models\Role::SUPERADMIN) ? '' : ($log->tenant?->name ?? '');
            $entityName = $log->resolved_entity_name ?? ($nameMap[$log->model_type.'::'.$log->model_id] ?? null);
            return [
                'id' => $log->id,
                'event_at' => optional($log->event_at)->toIso8601String(),
                'actor_name' => $actorName,
                'actor_role' => $actorRole,
                'tenant_id' => $log->tenant_id,
                'tenant_name' => $tenantName,
                'action' => $log->action,
                'model_type' => $log->model_type,
                'model_id' => $log->model_id,
                'entity_name' => $entityName,
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
    $log = AuditLog::with(['actor:id,name,role_id','actor.role:id,name','tenant:id,name'])->findOrFail($id);
        if ($user->isOrgAdmin() && $log->tenant_id !== $user->tenant_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $actorRole = $log->actor?->role?->name;
        $tenantName = ($actorRole === \App\Models\Role::SUPERADMIN) ? '' : ($log->tenant?->name ?? '');
        // Inline name resolution (reuse logic from index simplified)
        $entityName = null;
        $before = $log->before ?? [];
        $after = $log->after ?? [];
        if (str_ends_with($log->model_type, '\\User')) {
            $fn = $after['first_name'] ?? $before['first_name'] ?? '';
            $ln = $after['last_name'] ?? $before['last_name'] ?? '';
            $entityName = trim($fn.' '.$ln) ?: null;
        }
        if (!$entityName) {
            foreach (config('audit.identity_fields', []) as $k) {
                $v = $after[$k] ?? $before[$k] ?? null;
                if (is_string($v) && trim($v) !== '') { $entityName = trim($v); break; }
            }
        }
        return response()->json(['data' => [
            'id' => $log->id,
            'event_at' => optional($log->event_at)->toIso8601String(),
            'actor_name' => $log->actor?->name,
            'actor_role' => $actorRole,
            'tenant_id' => $log->tenant_id,
            'tenant_name' => $tenantName,
            'action' => $log->action,
            'model_type' => $log->model_type,
            'model_id' => $log->model_id,
            'entity_name' => $entityName,
            'diff_keys' => $log->diff_keys,
            'before' => $log->before,
            'after' => $log->after,
        ]]);
    }
}
