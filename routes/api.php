<?php

use Illuminate\Support\Facades\Route;
// use Illuminate\Support\Facades\DB;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\LakeController;
use App\Http\Controllers\WatershedController;
use App\Http\Controllers\Api\LayerController as ApiLayerController;
use App\Http\Controllers\Api\OptionsController;
use App\Http\Controllers\EmailOtpController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\UserController;       // superadmin, site-wide
use App\Http\Controllers\Api\OrgUserController;     // org_admin, tenant-scoped

/*
|--------------------------------------------------------------------------
| Auth + OTP
|--------------------------------------------------------------------------
*/
use App\Http\Controllers\Api\Admin\ParameterController as AdminParameterController;
use App\Http\Controllers\Api\Admin\ParameterThresholdController as AdminParameterThresholdController;
use App\Http\Controllers\Api\Admin\WqStandardController as AdminWqStandardController;
use App\Http\Controllers\Api\Admin\WaterQualityClassController as AdminWaterQualityClassController;
use App\Http\Controllers\Api\Admin\StationController as AdminStationController;
use App\Http\Controllers\Api\Admin\SamplingEventController as AdminSamplingEventController;
use App\Http\Controllers\Api\Admin\SamplingEventController;
Route::prefix('auth')->group(function () {
    // Registration OTP
    Route::post('/register/request-otp', [EmailOtpController::class, 'registerRequestOtp'])->middleware('throttle:6,1');
    Route::post('/register/verify-otp',  [EmailOtpController::class, 'registerVerifyOtp'])->middleware('throttle:12,1');

    // Forgot Password OTP
    Route::post('/forgot/request-otp',   [EmailOtpController::class, 'forgotRequestOtp'])->middleware('throttle:6,1');
    Route::post('/forgot/verify-otp',    [EmailOtpController::class, 'forgotVerifyOtp'])->middleware('throttle:12,1');
    Route::post('/forgot/reset',         [EmailOtpController::class, 'forgotReset'])->middleware('throttle:6,1');

    // Resend
    Route::post('/otp/resend',           [EmailOtpController::class, 'resend'])->middleware('throttle:6,1');

    // Core auth
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me',      [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

/*
|--------------------------------------------------------------------------
| Super Admin (site-wide)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum','role:superadmin'])->prefix('admin')->group(function () {
    Route::get('/whoami', fn() => ['ok' => true]);

    // Tenants
    Route::get('/tenants',               [TenantController::class, 'index']);
    Route::post('/tenants',              [TenantController::class, 'store']);
    Route::get('/tenants/{tenant}',      [TenantController::class, 'show'])->whereNumber('tenant');
    Route::put('/tenants/{tenant}',      [TenantController::class, 'update'])->whereNumber('tenant');
    Route::delete('/tenants/{tenant}',   [TenantController::class, 'destroy'])->whereNumber('tenant');
    Route::post('/tenants/{id}/restore', [TenantController::class, 'restore'])->whereNumber('id');

    // Org admin management for a tenant
    Route::get('/tenants/{tenant}/admins',   [TenantController::class, 'admins']);
    Route::post('/tenants/{tenant}/admins',  [TenantController::class, 'assignAdmin']);
    Route::delete('/tenants/{tenant}/admins/{user}', [TenantController::class, 'removeAdmin']);

    // Users (site-wide)
    Route::get('/users',            [UserController::class, 'index']);
    Route::post('/users',           [UserController::class, 'store']);
    Route::get('/users/{user}',     [UserController::class, 'show'])->whereNumber('user');
    Route::put('/users/{user}',     [UserController::class, 'update'])->whereNumber('user');
    Route::delete('/users/{user}',  [UserController::class, 'destroy'])->whereNumber('user');
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

/*
|--------------------------------------------------------------------------
| Organization Admin (tenant-scoped)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum','tenant.scoped','role:org_admin'])
    ->prefix('org/{tenant}')
    ->whereNumber('tenant')
    ->group(function () {
        Route::get('/whoami', fn() => ['ok' => true]);

        // Manage users inside this org
        Route::get('/users',                 [OrgUserController::class, 'index']);
        Route::post('/users',                [OrgUserController::class, 'store']);
        Route::get('/users/{user}',          [OrgUserController::class, 'show'])->whereNumber('user');
        Route::put('/users/{user}',          [OrgUserController::class, 'update'])->whereNumber('user');
        Route::delete('/users/{user}',       [OrgUserController::class, 'destroy'])->whereNumber('user');
    });

/*
|--------------------------------------------------------------------------
| Contributor (tenant-scoped)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum','tenant.scoped','role:contributor'])
    ->prefix('contrib/{tenant}')
    ->whereNumber('tenant')
    ->group(function () {
        Route::get('/whoami', fn() => ['ok' => true]);
        // tenant-scoped contribution endpoints here
    });

/*
|--------------------------------------------------------------------------
| Public & shared read endpoints
|--------------------------------------------------------------------------
*/
Route::get('/lakes',            [LakeController::class, 'index']);
Route::get('/lakes/{lake}',     [LakeController::class, 'show'])->whereNumber('lake');
Route::get('/public/lakes-geo', [LakeController::class, 'publicGeo']);

Route::get('/watersheds', [WatershedController::class, 'index']);

// Options
Route::get('/options/lakes',      [OptionsController::class, 'lakes']);
Route::get('/options/watersheds', [OptionsController::class, 'watersheds']);
Route::get('/options/roles',      [OptionsController::class, 'roles']);

/*
|--------------------------------------------------------------------------
| Layers
|--------------------------------------------------------------------------
*/
Route::get('/public/layers', [ApiLayerController::class, 'publicIndex']); // implement to return only public-visible layers

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/layers',           [ApiLayerController::class, 'index']);
    Route::get('/layers/active',    [ApiLayerController::class, 'active']);

    Route::post('/layers',          [ApiLayerController::class, 'store'])->middleware('role:superadmin');
    Route::patch('/layers/{id}',    [ApiLayerController::class, 'update'])->middleware('role:superadmin')->whereNumber('id');
    Route::delete('/layers/{id}',   [ApiLayerController::class, 'destroy'])->middleware('role:superadmin')->whereNumber('id');
});

/*
|--------------------------------------------------------------------------
| Lakes write endpoints (restricted)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:superadmin'])->group(function () {
    Route::post('/lakes',           [LakeController::class, 'store']);
    Route::put('/lakes/{lake}',     [LakeController::class, 'update'])->whereNumber('lake');
    Route::delete('/lakes/{lake}',  [LakeController::class, 'destroy'])->whereNumber('lake');
});
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

});