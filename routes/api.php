<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']); // public
    Route::post('/login',    [AuthController::class, 'login']);    // public

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me',    [AuthController::class, 'me']);
        Route::post('/logout',[AuthController::class, 'logout']);
    });
});

// Example protected API groups (wire later as you build)
Route::middleware(['auth:sanctum','role:superadmin'])->prefix('admin')->group(function () {
    Route::get('/whoami', fn() => ['ok'=>true]); // placeholder
});

Route::middleware(['auth:sanctum','role:org_admin'])->prefix('org')->group(function () {
    Route::get('/whoami', fn() => ['ok'=>true]);
});

Route::middleware(['auth:sanctum','role:contributor'])->prefix('contrib')->group(function () {
    Route::get('/whoami', fn() => ['ok'=>true]);
});
