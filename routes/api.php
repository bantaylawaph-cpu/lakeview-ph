<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LakeController;
use App\Http\Controllers\WatershedController;
use App\Http\Controllers\Api\LayerController as ApiLayerController;
use App\Http\Controllers\Api\OptionsController;
use App\Http\Controllers\Api\Admin\ParameterController as AdminParameterController;
use App\Http\Controllers\Api\Admin\ParameterThresholdController as AdminParameterThresholdController;
use App\Http\Controllers\Api\Admin\WqStandardController as AdminWqStandardController;
use App\Http\Controllers\Api\Admin\WaterQualityClassController as AdminWaterQualityClassController;
use App\Http\Controllers\Api\Admin\StationController as AdminStationController;
use App\Http\Controllers\Api\Admin\SamplingEventController as AdminSamplingEventController;
use App\Http\Controllers\Api\Admin\SamplingEventController;
use App\Http\Controllers\Api\StatsController;
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']); // public
    Route::post('/login',    [AuthController::class, 'login']);    // public

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me',      [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->prefix('admin')->group(function () {
    Route::get('/whoami', fn() => ['ok' => true]);

    Route::get('water-quality-classes', [AdminWaterQualityClassController::class, 'index']);
    Route::apiResource('parameters', AdminParameterController::class);
    Route::apiResource('parameter-thresholds', AdminParameterThresholdController::class)->except(['create', 'edit']);
    Route::apiResource('wq-standards', AdminWqStandardController::class)->except(['create', 'edit']);
    Route::apiResource('stations', AdminStationController::class)->except(['create', 'edit']);
    Route::apiResource('sample-events', AdminSamplingEventController::class)
        ->parameters(['sample-events' => 'samplingEvent'])
        ->except(['create', 'edit']);
    // Toggle publish state for a sampling event
    Route::post('sample-events/{samplingEvent}/toggle-publish', [AdminSamplingEventController::class, 'togglePublish']);

    // Lightweight tenants list for admin dropdowns
    Route::get('/tenants', function () {
        $rows = \App\Models\Tenant::query()->select(['id', 'name'])->orderBy('name')->get();
        return response()->json(['data' => $rows]);
    });
});

Route::middleware(['auth:sanctum','role:org_admin'])->prefix('org')->group(function () {
    Route::get('/whoami', fn() => ['ok' => true]);
});

Route::middleware(['auth:sanctum','role:contributor'])->prefix('contrib')->group(function () {
    Route::get('/whoami', fn() => ['ok' => true]);
});

// Lakes
Route::get('/lakes',            [LakeController::class, 'index']);
Route::get('/lakes/{lake}',     [LakeController::class, 'show']);
Route::post('/lakes',           [LakeController::class, 'store']);
Route::put('/lakes/{lake}',     [LakeController::class, 'update']);   // or PATCH
Route::delete('/lakes/{lake}',  [LakeController::class, 'destroy']);
Route::get('/public/lakes-geo', [LakeController::class, 'publicGeo']); // public FeatureCollection

// Watersheds
Route::get('/watersheds', [WatershedController::class, 'index']); // for dropdowns
Route::get('/watersheds/{watershed}', [WatershedController::class, 'show']);
Route::post('/watersheds', [WatershedController::class, 'store']);
Route::put('/watersheds/{watershed}', [WatershedController::class, 'update']);
Route::delete('/watersheds/{watershed}', [WatershedController::class, 'destroy']);

// Layers (single canonical controller)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/layers',           [ApiLayerController::class, 'index']);   // ?body_type=lake&body_id=1&include=bounds
    Route::get('/layers/active',    [ApiLayerController::class, 'active']);  // active for a body
    Route::post('/layers',          [ApiLayerController::class, 'store']);   // superadmin only (enforced in controller)
    Route::patch('/layers/{id}',    [ApiLayerController::class, 'update']);  // superadmin only (enforced in controller)
    Route::delete('/layers/{id}',   [ApiLayerController::class, 'destroy']); // superadmin only (enforced in controller)
});

// NEW: Public listing of layers, always filtered to visibility=public (no auth).
// Usage: GET /api/public/layers?body_type=lake|watershed&body_id=123
Route::get('/public/layers', [ApiLayerController::class, 'publicIndex']);
Route::get('/public/layers/{id}', [ApiLayerController::class, 'publicShow']);

// Public Water Quality Sampling Events (published only)
Route::get('/public/sample-events', [SamplingEventController::class, 'publicIndex']); // ?lake_id=..&organization_id=..&limit=10
Route::get('/public/sample-events/{samplingEvent}', [SamplingEventController::class, 'publicShow']);

// Slim options for dropdowns (id + name), with optional ?q=
Route::get('/options/lakes',      [OptionsController::class, 'lakes']);
Route::get('/options/watersheds', [OptionsController::class, 'watersheds']);
Route::get('/options/parameters', [OptionsController::class, 'parameters']);
Route::get('/options/wq-standards', [OptionsController::class, 'standards']);
Route::get('/options/water-quality-classes', [OptionsController::class, 'waterQualityClasses']);
Route::get('/options/regions', [OptionsController::class, 'regions']);
Route::get('/options/provinces', [OptionsController::class, 'provinces']);
Route::get('/options/municipalities', [OptionsController::class, 'municipalities']);

// Statistics endpoints (public for now; consider auth later)
Route::post('/stats/t-test', [StatsController::class, 'tTest']);


