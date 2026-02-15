<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Trust Render / proxy headers so rate limiting uses real client IPs
        $middleware->trustProxies(at: '**');

        // Global middleware
        $middleware->append([\App\Http\Middleware\InitAuditContext::class]);
        
        // Retry transient database connection failures (before cleanup)
        $middleware->append([\App\Http\Middleware\RetryDatabaseConnections::class]);
        
        // Cleanup database connections after each request to prevent pool exhaustion
        $middleware->append([\App\Http\Middleware\CleanupDatabaseConnections::class]);

        // Enable lightweight SQL profiling in debug/local only (use env here; config may not be booted yet)
        if (env('APP_DEBUG', false)) {
            $middleware->append([\App\Http\Middleware\QueryProfiler::class]);
        }

        // Route middleware aliases (Kernel.php replacement in Laravel 12)
        $middleware->alias([
            'tenant.scoped' => \App\Http\Middleware\TenantScope::class,
            'role'          => \App\Http\Middleware\EnsureRole::class,
        ]);
    })
    ->withSchedule(function (\Illuminate\Console\Scheduling\Schedule $schedule) {
        // Daily prune at 02:10
        $schedule->command('audit:prune --force')->dailyAt('02:10');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
