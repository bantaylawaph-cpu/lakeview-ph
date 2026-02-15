<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Ensure database connections are closed after each request to prevent leaks.
 * 
 * Problem: With pgBouncer transaction pooling, leaked connections exhaust the pool,
 * causing "connection timeout" errors for new requests.
 * 
 * Solution: Explicitly disconnect after each request completes.
 */
class CleanupDatabaseConnections
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        
        // After response is ready, disconnect all database connections
        try {
            foreach (DB::getConnections() as $name => $connection) {
                DB::disconnect($name);
            }
        } catch (\Throwable $e) {
            // Log but don't fail the response
            Log::warning('Failed to cleanup DB connections', ['error' => $e->getMessage()]);
        }
        
        return $response;
    }
    
    public function terminate(Request $request, $response)
    {
        // Additional cleanup in terminate for long-running requests
        try {
            DB::disconnect();
        } catch (\Throwable $e) {
            // Silent - response already sent
        }
    }
}
