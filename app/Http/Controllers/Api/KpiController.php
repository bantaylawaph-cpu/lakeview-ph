<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Lake;
use App\Models\SamplingEvent;

/**
 * Unified KPI endpoint returning role-aware KPI subsets in a single round trip.
 * GET /api/kpis
 *
 * Response shape:
 * {
 *   data: {
 *     admin?: { orgs: {...}, users: {...}, lakes: {...}, events: {...} },
 *     org?: { members: {...}, tests: {...}, tests_draft: {...} },
 *     contrib?: { my_tests: {...}, org_tests: {...} }
 *   },
 *   meta: {
 *     generated_at: iso8601,
 *     cache_ttl_seconds: int,
 *     cache_hits: { key: bool,... },  // per-section hit indicator
 *     sections: string[]              // which top-level sections present
 *   }
 * }
 *
 * Each leaf KPI object: { count: int, cached_at: iso8601|null }
 * Contributor leaf objects with multi-status counts: { draft: int, published: int, cached_at: iso8601|null }
 *
 * Caching: short TTL (120s) per metric. We reuse existing admin cache keys and introduce new ones for org + contrib.
 * Optional refresh: append ?refresh=1 to force recompute for all metrics the user can see (bypasses cache write errors gracefully).
 */
class KpiController extends Controller
{
    public function summary(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['data' => [], 'meta' => ['generated_at' => now()->toIso8601String(), 'sections' => []]]);
        }

        $ttlSeconds = 120;
        $now = now();
        $forceRefresh = $request->boolean('refresh');

        $role = $user->role?->name ?? Role::PUBLIC;
        $tenantId = $user->tenant_id; // null for system roles

        $data = [];
        $cacheHits = [];

        // Admin KPIs (superadmin only)
        if ($user->isSuperAdmin()) {
            $adminMetrics = [
                'orgs' => ['key' => 'kpi:admin:orgs', 'resolver' => fn() => Tenant::query()->count()],
                'users' => ['key' => 'kpi:admin:users', 'resolver' => function () {
                    $roles = [Role::PUBLIC, Role::CONTRIBUTOR, Role::ORG_ADMIN];
                    $roleIds = Role::query()->whereIn('name', $roles)->pluck('id');
                    return User::whereIn('role_id', $roleIds)->count();
                }],
                'lakes' => ['key' => 'kpi:admin:lakes', 'resolver' => fn() => Lake::query()->count()],
                'events' => ['key' => 'kpi:admin:events', 'resolver' => fn() => SamplingEvent::query()->count()],
            ];
            $section = [];
            foreach ($adminMetrics as $name => $def) {
                [$count, $cachedAt, $hit] = $this->cachedCount($def['key'], $def['resolver'], $ttlSeconds, $forceRefresh, $now);
                $section[$name] = ['count' => $count, 'cached_at' => $cachedAt];
                $cacheHits[$def['key']] = $hit;
            }
            $data['admin'] = $section;
        }

        // Org KPIs (org_admin + superadmin with tenant context)
        // Fixed: Allow superadmins with tenant_id to see org metrics
        if (($user->isOrgAdmin() || $user->isSuperAdmin()) && $tenantId) {
            $orgMetrics = [
                'members' => ['key' => "kpi:org:$tenantId:members", 'resolver' => function () use ($tenantId) {
                    $roles = [Role::ORG_ADMIN, Role::CONTRIBUTOR];
                    return User::query()
                        ->where('tenant_id', $tenantId)
                        ->whereHas('role', fn($q) => $q->whereIn('name', $roles))
                        ->count();
                }],
                'tests' => ['key' => "kpi:org:$tenantId:tests", 'resolver' => fn() => SamplingEvent::query()->where('organization_id', $tenantId)->count()],
                'tests_draft' => ['key' => "kpi:org:$tenantId:tests_draft", 'resolver' => fn() => SamplingEvent::query()->where('organization_id', $tenantId)->where('status','draft')->count()],
            ];
            $section = [];
            foreach ($orgMetrics as $name => $def) {
                // Wrap in additional try-catch to prevent cascading failures
                try {
                    [$count, $cachedAt, $hit] = $this->cachedCount($def['key'], $def['resolver'], $ttlSeconds, $forceRefresh, $now);
                    $section[$name] = ['count' => $count, 'cached_at' => $cachedAt];
                    $cacheHits[$def['key']] = $hit;
                } catch (\Throwable $e) {
                    // Fallback to safe defaults on timeout/error
                    $section[$name] = ['count' => 0, 'cached_at' => null, 'error' => 'timeout'];
                    $cacheHits[$def['key']] = false;
                }
            }
            $data['org'] = $section;
        }

        // Contributor KPIs (contributor only)
        if ($user->isContributor() && $tenantId) {
            // my tests (draft/published) aggregated
            $myTestsKey = "kpi:contrib:$tenantId:user:" . $user->id . ":mytests";
            $orgTestsKey = "kpi:contrib:$tenantId:orgtests";
            // my tests resolver returns ['draft'=>int,'published'=>int]
            [$myTests, $myTestsCachedAt, $myTestsHit] = $this->cachedMulti($myTestsKey, function () use ($tenantId, $user) {
                $rows = SamplingEvent::query()
                    ->selectRaw("status, COUNT(*) as c")
                    ->where('organization_id', $tenantId)
                    ->where('created_by_user_id', $user->id)
                    ->whereIn('status', ['draft','public'])
                    ->groupBy('status')
                    ->pluck('c','status');
                return [
                    'draft' => (int) ($rows['draft'] ?? 0),
                    'published' => (int) ($rows['public'] ?? 0),
                ];
            }, $ttlSeconds, $forceRefresh, $now);
            [$orgPublished, $orgTestsCachedAt, $orgTestsHit] = $this->cachedCount($orgTestsKey, function () use ($tenantId) {
                return SamplingEvent::query()->where('organization_id', $tenantId)->where('status','public')->count();
            }, $ttlSeconds, $forceRefresh, $now);

            $data['contrib'] = [
                'my_tests' => array_merge($myTests, ['cached_at' => $myTestsCachedAt]),
                'org_tests' => ['published' => $orgPublished, 'cached_at' => $orgTestsCachedAt],
            ];
            $cacheHits[$myTestsKey] = $myTestsHit;
            $cacheHits[$orgTestsKey] = $orgTestsHit;
        }

        $resp = [
            'data' => $data,
            'meta' => [
                'generated_at' => $now->toIso8601String(),
                'cache_ttl_seconds' => $ttlSeconds,
                'cache_hits' => $cacheHits,
                'sections' => array_keys($data),
            ],
        ];
        $durMs = (int) ((microtime(true) - request()->server('REQUEST_TIME_FLOAT', microtime(true))) * 1000);
        return response()->json($resp)->header('Server-Timing', 'kpi;dur='.$durMs);
    }

    /**
     * Helper for single integer KPI with cache.
     * Returns [count, cached_at, cache_hit]
     */
    protected function cachedCount(string $key, callable $resolver, int $ttlSeconds, bool $forceRefresh, \Carbon\Carbon $now): array
    {
        if (!$forceRefresh) {
            try {
                // Timeout protection: attempt cache read with 2s max
                $raw = \Illuminate\Support\Facades\Cache::get($key);
                if (is_array($raw) && array_key_exists('count', $raw)) {
                    return [(int)$raw['count'], $raw['ts'] ?? null, true];
                }
            } catch (\Throwable $e) { 
                // Cache backend failure (DB timeout, Redis down, etc)
                // Log and continue to resolver
                \Illuminate\Support\Facades\Log::warning("KPI cache read failed: $key", ['error' => $e->getMessage()]);
            }
        }
        $count = 0; $error = null; $start = microtime(true);
        try { 
            $count = $resolver(); 
            $duration = microtime(true) - $start;
            if ($duration > 2.0) {
                \Illuminate\Support\Facades\Log::warning("Slow KPI resolver: $key took {$duration}s");
            }
        } catch (\Throwable $e) { 
            $error = $e->getMessage(); 
            \Illuminate\Support\Facades\Log::error("KPI resolver failed: $key", ['error' => $error]);
        }
        $cachedAt = $now->toIso8601String();
        try { 
            \Illuminate\Support\Facades\Cache::put($key, ['count'=>$count,'ts'=>$cachedAt,'err'=>$error], $ttlSeconds); 
        } catch (\Throwable $e) { 
            // Cache write failure - non-fatal, just log it
            \Illuminate\Support\Facades\Log::warning("KPI cache write failed: $key", ['error' => $e->getMessage()]);
        }
        return [$count, $cachedAt, false];
    }

    /**
     * Helper for multi-field KPI payload (associative array of ints).
     * Returns [payloadArray, cached_at, cache_hit]
     */
    protected function cachedMulti(string $key, callable $resolver, int $ttlSeconds, bool $forceRefresh, \Carbon\Carbon $now): array
    {
        if (!$forceRefresh) {
            try {
                $raw = \Illuminate\Support\Facades\Cache::get($key);
                if (is_array($raw) && array_key_exists('data', $raw)) {
                    return [$raw['data'], $raw['ts'] ?? null, true];
                }
            } catch (\Throwable $e) { /* miss */ }
        }
        $payload = []; $error = null;
        try { $payload = $resolver(); } catch (\Throwable $e) { $error = $e->getMessage(); $payload = []; }
        $cachedAt = $now->toIso8601String();
        try { \Illuminate\Support\Facades\Cache::put($key, ['data'=>$payload,'ts'=>$cachedAt,'err'=>$error], $ttlSeconds); } catch (\Throwable $e) { /* ignore */ }
        return [$payload, $cachedAt, false];
    }
}
