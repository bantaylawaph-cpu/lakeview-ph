<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Retry database queries that fail due to transient connection issues.
 * 
 * Catches connection timeout/failure exceptions and retries up to 2 times
 * with exponential backoff before returning 503 Service Unavailable.
 */
class RetryDatabaseConnections
{
    protected const MAX_RETRIES = 2;
    protected const RETRY_DELAY_MS = 100;
    
    public function handle(Request $request, Closure $next)
    {
        $attempt = 0;
        $lastException = null;
        
        while ($attempt <= self::MAX_RETRIES) {
            try {
                // Attempt the request
                return $next($request);
            } catch (\Illuminate\Database\QueryException $e) {
                $lastException = $e;
                
                // Check if it's a connection issue (timeout, connection refused, etc)
                $isConnectionError = $this->isConnectionError($e);
                
                if (!$isConnectionError || $attempt >= self::MAX_RETRIES) {
                    // Not a connection error OR max retries exhausted
                    throw $e;
                }
                
                // Log retry attempt
                Log::warning("DB connection failed, retrying (attempt " . ($attempt + 1) . "/" . self::MAX_RETRIES . ")", [
                    'error' => $e->getMessage(),
                    'path' => $request->path(),
                    'method' => $request->method(),
                ]);
                
                // Disconnect to force new connection on retry
                try {
                    DB::disconnect();
                } catch (\Throwable $disconnectError) {
                    // Ignore disconnect errors
                }
                
                // Exponential backoff: wait before retry
                $delay = self::RETRY_DELAY_MS * pow(2, $attempt);
                usleep($delay * 1000);
                
                $attempt++;
            }
        }
        
        // If we get here, all retries failed
        Log::error("DB connection failed after " . self::MAX_RETRIES . " retries", [
            'error' => $lastException?->getMessage(),
            'path' => $request->path(),
        ]);
        
        return response()->json([
            'message' => 'Database temporarily unavailable. Please try again in a moment.',
            'retry_after' => 5,
        ], 503)
        ->header('Retry-After', '5');
    }
    
    /**
     * Check if exception is a transient connection error that can be retried.
     */
    protected function isConnectionError(\Illuminate\Database\QueryException $e): bool
    {
        $message = strtolower($e->getMessage());
        
        $connectionErrors = [
            'connection timeout',
            'timeout expired',
            'connection refused',
            'connection reset',
            'could not connect',
            'no connection',
            'connection lost',
            'server has gone away',
            'broken pipe',
        ];
        
        foreach ($connectionErrors as $pattern) {
            if (str_contains($message, $pattern)) {
                return true;
            }
        }
        
        return false;
    }
}
