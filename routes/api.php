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
use App\Http\Controllers\Api\UserSettingsController;
use App\Http\Controllers\FeedbackController; // user feedback
use App\Http\Controllers\Api\Admin\FeedbackController as AdminFeedbackController; // admin feedback mgmt

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
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\PopulationController;
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

    // Feedback management
    Route::get('/feedback',         [AdminFeedbackController::class, 'index']);
    Route::get('/feedback/{feedback}', [AdminFeedbackController::class, 'show'])->whereNumber('feedback');
    Route::patch('/feedback/{feedback}', [AdminFeedbackController::class, 'update'])->whereNumber('feedback');
    Route::post('/feedback/bulk-update', [AdminFeedbackController::class, 'bulkUpdate']);

    // Tenants
    Route::get('/tenants',               [TenantController::class, 'index']);
    Route::post('/tenants',              [TenantController::class, 'store']);
    Route::get('/tenants/{tenant}',      [TenantController::class, 'show'])->whereNumber('tenant');
    Route::put('/tenants/{tenant}',      [TenantController::class, 'update'])->whereNumber('tenant');
    Route::delete('/tenants/{tenant}',   [TenantController::class, 'destroy'])->whereNumber('tenant');
    Route::post('/tenants/{id}/restore', [TenantController::class, 'restore'])->whereNumber('id');

    // Org admin management for a tenant
    Route::get('/tenants/{tenant}/admins',   [TenantController::class, 'admins'])->name('tenants.admins');
    Route::post('/tenants/{tenant}/admins',  [TenantController::class, 'assignAdmin'])->name('tenants.assignAdmin');
    Route::delete('/tenants/{tenant}/admins/{user}', [TenantController::class, 'removeAdmin'])->name('tenants.removeAdmin');

    // Users (site-wide)
    Route::get('/users',            [UserController::class, 'index']);
    Route::post('/users',           [UserController::class, 'store']);
    // show route moved below to allow org_admin read access as well
    Route::put('/users/{user}',     [UserController::class, 'update'])->whereNumber('user');
    Route::delete('/users/{user}',  [UserController::class, 'destroy'])->whereNumber('user');

    // Water Quality & related admin resources (except stations and sample-events which have broader access)
    Route::get('water-quality-classes', [AdminWaterQualityClassController::class, 'index']);
    Route::apiResource('parameters', AdminParameterController::class);
    Route::apiResource('parameter-thresholds', AdminParameterThresholdController::class)->except(['create', 'edit']);
    Route::apiResource('wq-standards', AdminWqStandardController::class)->except(['create', 'edit']);
    // sample-events routes are declared below with role:superadmin,org_admin,contributor

    // Lightweight tenant list for dropdowns
    Route::get('/tenants-list', function () {
        $rows = \App\Models\Tenant::query()->select(['id', 'name'])->orderBy('name')->get();
        return response()->json(['data' => $rows]);
    });

    // Admin KPIs (small, fast counts used by dashboard)
    Route::get('/kpis/orgs', [\App\Http\Controllers\Api\Admin\KpiController::class, 'orgs']);
    Route::get('/kpis/users', [\App\Http\Controllers\Api\Admin\KpiController::class, 'users']);

    // Audit logs (superadmin only here; org_admin has implicit scoping below if added later)
    Route::get('/audit-logs', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'index']);
    Route::get('/audit-logs/{id}', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'show'])->whereNumber('id');
});

// Allow org_admin to read user details via admin path too (tenant-scoped by controller)
Route::middleware(['auth:sanctum','role:superadmin,org_admin'])->prefix('admin')->group(function () {
    Route::get('/users/{user}',     [UserController::class, 'show'])->whereNumber('user');
});

// Stations: allow org_admin and contributor (read), org_admin (write), superadmin (all)
Route::prefix('admin')->middleware(['auth:sanctum','role:superadmin,org_admin,contributor'])->group(function () {
    Route::get('stations',             [AdminStationController::class, 'index']);
    Route::get('stations/{station}',   [AdminStationController::class, 'show'])->whereNumber('station');
});
Route::prefix('admin')->middleware(['auth:sanctum','role:superadmin,org_admin'])->group(function () {
    Route::post   ('stations',           [AdminStationController::class, 'store']);
    Route::put    ('stations/{station}', [AdminStationController::class, 'update'])->whereNumber('station');
    Route::delete ('stations/{station}', [AdminStationController::class, 'destroy'])->whereNumber('station');
});

// Sample Events: allow org_admin and contributor (read/write), superadmin (all). Controller enforces fine-grained rules.
Route::prefix('admin')->middleware(['auth:sanctum','role:superadmin,org_admin,contributor'])->group(function () {
    Route::get   ('sample-events',                              [AdminSamplingEventController::class, 'index']);
    Route::get   ('sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'show'])->whereNumber('samplingEvent');
    Route::post  ('sample-events',                              [AdminSamplingEventController::class, 'store']);
    Route::put   ('sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'update'])->whereNumber('samplingEvent');
    Route::delete('sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'destroy'])->whereNumber('samplingEvent');
    Route::post  ('sample-events/{samplingEvent}/toggle-publish',[AdminSamplingEventController::class, 'togglePublish'])->whereNumber('samplingEvent');
});

/*
|--------------------------------------------------------------------------
| Organization Admin (tenant-scoped)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum','tenant.scoped','role:org_admin,superadmin'])
    ->prefix('org/{tenant}')
    ->whereNumber('tenant')
    ->group(function () {
        Route::get('/whoami', fn() => ['ok' => true]);

        // Audit logs scoped to this tenant (org_admin visibility)
        Route::get('/audit-logs', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'index']);
        Route::get('/audit-logs/{id}', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'show'])->whereNumber('id');

        // Manage users inside this org
        Route::get('/users',                 [OrgUserController::class, 'index']);
        Route::post('/users',                [OrgUserController::class, 'store']);
        Route::get('/users/{user}',          [OrgUserController::class, 'show'])->whereNumber('user');
        Route::put('/users/{user}',          [OrgUserController::class, 'update'])->whereNumber('user');
        Route::delete('/users/{user}',       [OrgUserController::class, 'destroy'])->whereNumber('user');

    // Org KPIs (active members, tests logged, draft tests)
    Route::get('/kpis/members', [\App\Http\Controllers\Api\Org\KpiController::class, 'members']);
    Route::get('/kpis/tests', [\App\Http\Controllers\Api\Org\KpiController::class, 'tests']);
    Route::get('/kpis/tests/draft', [\App\Http\Controllers\Api\Org\KpiController::class, 'testsDraft']);

    // Tenant rename (org_admin scope)
    Route::patch('/tenant', [TenantController::class, 'orgScopedRename']);

        // Sampling Events (tenant scoped) accessible to org_admin + contributor + superadmin (superadmin passes role middleware automatically)
    Route::get   ('/sample-events',                              [AdminSamplingEventController::class, 'index']);
    Route::get   ('/sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'showOrg'])->whereNumber('samplingEvent');
    Route::post  ('/sample-events',                              [AdminSamplingEventController::class, 'store']);
    Route::put   ('/sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'updateOrg'])->whereNumber('samplingEvent');
    Route::delete('/sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'destroyOrg'])->whereNumber('samplingEvent');
    Route::post  ('/sample-events/{samplingEvent}/toggle-publish',[AdminSamplingEventController::class, 'togglePublishOrg'])->whereNumber('samplingEvent');
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
        // Sampling Events (limited contributor access). Reuse same controller; controller enforces fine-grained rules.
    Route::get   ('/sample-events',                              [AdminSamplingEventController::class, 'index']);
    Route::get   ('/sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'showOrg'])->whereNumber('samplingEvent');
    Route::post  ('/sample-events',                              [AdminSamplingEventController::class, 'store']);
    Route::put   ('/sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'updateOrg'])->whereNumber('samplingEvent');
    Route::delete('/sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'destroyOrg'])->whereNumber('samplingEvent');
    Route::post  ('/sample-events/{samplingEvent}/toggle-publish',[AdminSamplingEventController::class, 'togglePublishOrg'])->whereNumber('samplingEvent');

    // Contributor KPIs (duplicated under contrib prefix for frontend dashboard)
    Route::get('/kpis/my-tests', [\App\Http\Controllers\Api\Contrib\KpiController::class, 'myTests']);
    Route::get('/kpis/org-tests', [\App\Http\Controllers\Api\Contrib\KpiController::class, 'orgTests']);
    });

/*
|--------------------------------------------------------------------------
| Public & shared read endpoints
|--------------------------------------------------------------------------
*/
Route::get('/lakes',            [LakeController::class, 'index']);
Route::get('/lakes/{lake}',     [LakeController::class, 'show'])->whereNumber('lake');
Route::get('/public/lakes-geo', [LakeController::class, 'publicGeo']);
Route::get('/public/lakes/{lake}', [LakeController::class, 'publicShow']);

Route::get('/watersheds', [WatershedController::class, 'index']);

// Options
Route::get('/options/lakes',      [OptionsController::class, 'lakes']);
Route::get('/options/watersheds', [OptionsController::class, 'watersheds']);
Route::get('/options/roles',      [OptionsController::class, 'roles']);

/*
|--------------------------------------------------------------------------
| Layers (single canonical section)
|--------------------------------------------------------------------------
*/
// Public listing & show (visibility constrained internally)
Route::get('/public/layers', [ApiLayerController::class, 'publicIndex']);
Route::get('/public/layers/{id}', [ApiLayerController::class, 'publicShow']);

// Public guest feedback submission (unauthenticated)
Route::post('/public/feedback', [FeedbackController::class, 'publicStore'])->middleware('throttle:8,1');

// Authenticated layer operations
Route::middleware('auth:sanctum')->group(function () {
    // Audit logs (superadmin global, org_admin scoped)
    Route::get('/admin/audit-logs', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'index']);
    Route::get('/admin/audit-logs/{id}', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'show']);
    Route::get('/layers',           [ApiLayerController::class, 'index'])->name('layers.index');
    Route::get('/layers/active',    [ApiLayerController::class, 'active']);

    // User feedback submission & listing (own only)
    Route::post('/feedback',        [FeedbackController::class, 'store']);
    Route::get('/feedback/mine',    [FeedbackController::class, 'mine']);
    Route::get('/feedback/mine/{feedback}', [FeedbackController::class, 'show'])->whereNumber('feedback');

    // User self settings (name/password)
    Route::patch('/user/settings', [UserSettingsController::class, 'update']);

    // Creation & modifications restricted to superadmin (controller also validates)
    Route::post('/layers',            [ApiLayerController::class, 'store'])->middleware('role:superadmin,org_admin');
    Route::patch('/layers/{layer}',   [ApiLayerController::class, 'update'])->middleware('role:superadmin,org_admin')->whereNumber('layer');
    Route::delete('/layers/{layer}',  [ApiLayerController::class, 'destroy'])->middleware('role:superadmin,org_admin')->whereNumber('layer');

    // Tenant-scoped user lookup (org/contrib may view users in their own tenant); superadmin may view any
    Route::get('/users/{user}', [UserController::class, 'show'])->whereNumber('user');
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
// Public Water Quality Sampling Events (published only)
Route::get('/public/sample-events', [AdminSamplingEventController::class, 'publicIndex'] ?? function() {
    return response()->json(['data' => []]);
});
Route::get('/public/sample-events/{samplingEvent}', [AdminSamplingEventController::class, 'publicShow'] ?? function() {
    return response()->json(['data' => null], 404);
});

// Additional options endpoints (non-duplicated)
Route::get('/options/parameters', [OptionsController::class, 'parameters']);
Route::get('/options/wq-standards', [OptionsController::class, 'standards']);
Route::get('/options/water-quality-classes', [OptionsController::class, 'waterQualityClasses']);
Route::get('/options/regions', [OptionsController::class, 'regions']);
Route::get('/options/provinces', [OptionsController::class, 'provinces']);
Route::get('/options/municipalities', [OptionsController::class, 'municipalities']);
Route::get('/options/municipalities', [OptionsController::class, 'municipalities']);

// Stats & Population (public)
Route::get('/stats/depths', [StatsController::class, 'depths']);
Route::post('/stats/series', [StatsController::class, 'series']);
Route::get('/population/estimate', [PopulationController::class, 'estimate']);
Route::get('/tiles/pop/{z}/{x}/{y}', [PopulationController::class, 'tile'])
    ->where(['z' => '[0-9]+', 'x' => '[0-9]+', 'y' => '[0-9]+']);
Route::get('/population/points', [PopulationController::class, 'points']);
