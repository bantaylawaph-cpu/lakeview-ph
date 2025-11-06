<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Logging\Log as LogContract;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Lightweight per-request SQL profiler for local debugging.
 * - Totals query count and time
 * - Logs top N slow queries with bindings
 * Enabled only when app.debug=true to avoid prod overhead.
 */
class QueryProfiler
{
    public function handle(Request $request, Closure $next)
    {
        // Only profile in debug/local to avoid any prod overhead
        if (!config('app.debug')) {
            return $next($request);
        }

        $queries = [];
        $totalSqlMs = 0.0;

    DB::listen(function ($query) use (&$queries, &$totalSqlMs) {
            $sql = $query->sql;
            $time = (float) ($query->time ?? 0.0);
            $totalSqlMs += $time;

            // Best-effort binding interpolation for readability
            $bindings = $query->bindings ?? [];
            $sqlReadable = $sql;
            try {
                foreach ($bindings as $b) {
                    $repl = is_numeric($b) ? (string) $b : ("'" . str_replace("'", "''", (string) $b) . "'");
                    $sqlReadable = preg_replace('/\?/', $repl, $sqlReadable, 1);
                }
            } catch (\Throwable $e) {
                // ignore
            }

            $queries[] = [
                'time' => $time,
                'sql' => $sqlReadable,
            ];
        });

        $start = microtime(true);
        $response = $next($request);
        $elapsedMs = (microtime(true) - $start) * 1000.0;

        // Only log for API routes to keep noise low
        if (str_starts_with($request->path(), 'api/')) {
            // Sort by slowest
            usort($queries, fn($a, $b) => ($b['time'] <=> $a['time']));
            $top = array_slice($queries, 0, 5);

            $summary = [
                'method' => $request->getMethod(),
                'path'   => '/' . $request->path(),
                'status' => method_exists($response, 'getStatusCode') ? $response->getStatusCode() : null,
                'elapsed_ms' => round($elapsedMs, 2),
                'db' => [
                    'count' => count($queries),
                    'total_ms' => round($totalSqlMs, 2),
                    'top' => array_map(function ($q) {
                        // truncate very long SQL for logs
                        $sql = $q['sql'];
                        if (strlen($sql) > 500) {
                            $sql = substr($sql, 0, 500) . '...';
                        }
                        return [ 'ms' => round($q['time'], 2), 'sql' => $sql ];
                    }, $top),
                ],
            ];

            Log::info('QueryProfiler', $summary);
        }

        return $response;
    }
}
