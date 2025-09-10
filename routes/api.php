<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LakeController;
use App\Http\Controllers\WatershedController;
use App\Http\Controllers\Api\LayerController;
use App\Http\Controllers\Api\OptionsController;


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

// Lakes
Route::get('/lakes', [LakeController::class, 'index']);
Route::get('/lakes/{lake}', [LakeController::class, 'show']);
Route::post('/lakes', [LakeController::class, 'store']);
Route::put('/lakes/{lake}', [LakeController::class, 'update']);   // or PATCH
Route::delete('/lakes/{lake}', [LakeController::class, 'destroy']);

// Watersheds
Route::get('/watersheds', [WatershedController::class, 'index']); // for dropdown

// Layers
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/layers',            [LayerController::class, 'index']);       // ?body_type=lake&body_id=1&include=bounds
    Route::get('/layers/active',     [LayerController::class, 'active']);      // active for a body
    Route::post('/layers',           [LayerController::class, 'store']);       // superadmin only
    Route::patch('/layers/{id}',     [LayerController::class, 'update']);      // superadmin only
    Route::delete('/layers/{id}',    [LayerController::class, 'destroy']);     // superadmin only
});

// Slim options for dropdowns (id + name), with optional ?q=
Route::get('/options/lakes',       [OptionsController::class, 'lakes']);
Route::get('/options/watersheds',  [OptionsController::class, 'watersheds']);
