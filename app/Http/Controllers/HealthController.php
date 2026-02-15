<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/**
 * Health check endpoints for monitoring database and cache connectivity.
 */
class HealthController extends Controller
{
    /**
     * Basic liveness check - app is running.
     * GET /health/live
     */
    public function live()
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
        ]);
    }
    
    /**
     * Readiness check - app + database + cache are healthy.
     * GET /health/ready
     */
    public function ready()
    {
        $checks = [];
        $overall = 'ok';
        $startTime = microtime(true);
        
        // 1. Database check
        try {
            $dbStart = microtime(true);
            DB::connection()->getPdo();
            $dbTime = round((microtime(true) - $dbStart) * 1000, 2);
            $checks['database'] = [
                'status' => 'ok',
                'response_time_ms' => $dbTime,
            ];
        } catch (\Throwable $e) {
            $checks['database'] = [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
            $overall = 'error';
        }
        
        // 2. Cache check
        try {
            $cacheStart = microtime(true);
            $testKey = 'health:cache:test';
            Cache::put($testKey, 'ok', 5);
            $value = Cache::get($testKey);
            $cacheTime = round((microtime(true) - $cacheStart) * 1000, 2);
            $checks['cache'] = [
                'status' => $value === 'ok' ? 'ok' : 'error',
                'driver' => config('cache.default'),
                'response_time_ms' => $cacheTime,
            ];
        } catch (\Throwable $e) {
            $checks['cache'] = [
                'status' => 'error',
                'error' => $e->getMessage(),
                'driver' => config('cache.default'),
            ];
            $overall = 'error';
        }
        
        $totalTime = round((microtime(true) - $startTime) * 1000, 2);
        
        return response()->json([
            'status' => $overall,
            'checks' => $checks,
            'total_time_ms' => $totalTime,
            'timestamp' => now()->toIso8601String(),
        ], $overall === 'ok' ? 200 : 503);
    }
    
    /**
     * Database connection pool stats.
     * GET /health/db-pool
     */
    public function dbPool()
    {
        try {
            // Query PostgreSQL connection stats
            $stats = DB::select("
                SELECT 
                    count(*) as total,
                    count(*) filter (where state = 'active') as active,
                    count(*) filter (where state = 'idle') as idle,
                    count(*) filter (where state = 'idle in transaction') as idle_in_transaction,
                    count(*) filter (where wait_event_type is not null) as waiting,
                    max(extract(epoch from (now() - query_start))) as longest_query_sec
                FROM pg_stat_activity 
                WHERE datname = current_database()
                  AND pid != pg_backend_pid()
                  AND usename NOT LIKE 'supabase%'
            ");
            
            $stat = $stats[0] ?? null;
            
            return response()->json([
                'status' => 'ok',
                'pool' => [
                    'total_connections' => (int)($stat->total ?? 0),
                    'active' => (int)($stat->active ?? 0),
                    'idle' => (int)($stat->idle ?? 0),
                    'idle_in_transaction' => (int)($stat->idle_in_transaction ?? 0),
                    'waiting' => (int)($stat->waiting ?? 0),
                    'longest_query_seconds' => round((float)($stat->longest_query_sec ?? 0), 2),
                ],
                'health' => [
                    'status' => $this->assessPoolHealth($stat),
                    'warnings' => $this->getPoolWarnings($stat),
                ],
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 503);
        }
    }
    
    /**
     * Assess overall pool health.
     */
    protected function assessPoolHealth($stat): string
    {
        if (!$stat) return 'unknown';
        
        $waiting = (int)($stat->waiting ?? 0);
        $idleInTx = (int)($stat->idle_in_transaction ?? 0);
        $longestQuery = (float)($stat->longest_query_sec ?? 0);
        
        // Critical issues
        if ($waiting > 5 || $idleInTx > 3 || $longestQuery > 30) {
            return 'critical';
        }
        
        // Warning issues
        if ($waiting > 2 || $idleInTx > 1 || $longestQuery > 10) {
            return 'warning';
        }
        
        return 'healthy';
    }
    
    /**
     * Get pool warning messages.
     */
    protected function getPoolWarnings($stat): array
    {
        if (!$stat) return [];
        
        $warnings = [];
        $waiting = (int)($stat->waiting ?? 0);
        $idleInTx = (int)($stat->idle_in_transaction ?? 0);
        $longestQuery = (float)($stat->longest_query_sec ?? 0);
        
        if ($waiting > 5) {
            $warnings[] = "High wait count ($waiting) - connection pool may be saturated";
        } elseif ($waiting > 2) {
            $warnings[] = "Elevated wait count ($waiting) - monitor for pool exhaustion";
        }
        
        if ($idleInTx > 3) {
            $warnings[] = "Many idle-in-transaction connections ($idleInTx) - possible connection leaks";
        } elseif ($idleInTx > 1) {
            $warnings[] = "Some idle-in-transaction connections ($idleInTx) - monitor for leaks";
        }
        
        if ($longestQuery > 30) {
            $warnings[] = "Very long query detected (" . round($longestQuery, 1) . "s) - possible blocking or runaway query";
        } elseif ($longestQuery > 10) {
            $warnings[] = "Slow query detected (" . round($longestQuery, 1) . "s) - may need optimization";
        }
        
        return $warnings;
    }
}
