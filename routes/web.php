<?php

use Illuminate\Support\Facades\Route;

// Named login route for guest redirects (Laravel default)
// Points to your SPA shell so the frontend router can handle /login
Route::view('/login', 'app')->name('login');

// Lightweight health check (no DB) for load testing & uptime probes
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'time' => now(),
        'app' => config('app.name'),
    ], 200);
});

Route::get('/{any}', function () {
    return view('app'); // your main blade file that mounts React
})->where('any', '^(?!api).*$');
