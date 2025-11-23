<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LakeFiltersController;
use Illuminate\Support\Facades\DB;
// use Illuminate\Support\Facades\DB;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\LakeController;
use App\Http\Controllers\WatershedController;
use App\Http\Controllers\LakeOptionsController;
use App\Http\Controllers\Api\LayerController as ApiLayerController;
use App\Http\Controllers\Api\OptionsController;
use App\Http\Controllers\EmailOtpController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\UserController;       // superadmin, site-wide
use App\Http\Controllers\Api\OrgUserController;     // org_admin, tenant-scoped
use App\Http\Controllers\Api\UserSettingsController;
use App\Http\Controllers\Api\KycController;
use App\Http\Controllers\Api\KycProfileController;
use App\Http\Controllers\Api\OrgApplicationController;
use App\Http\Controllers\FeedbackController; // user feedback
use App\Http\Controllers\Api\Admin\FeedbackController as AdminFeedbackController; // admin feedback mgmt
use App\Http\Controllers\Api\Admin\FeedbackStreamController as AdminFeedbackStreamController; // SSE stream for feedback
use App\Http\Controllers\TileController;
use App\Http\Controllers\ElevationController;

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
use App\Http\Controllers\Api\Admin\PopulationRasterController;
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

    // Admin KPIs (lightweight counts)
    Route::get('/kpis/summary', [\App\Http\Controllers\Api\Admin\KpiController::class, 'summary']);
    Route::get('/kpis/orgs', [\App\Http\Controllers\Api\Admin\KpiController::class, 'orgs']);
    Route::get('/kpis/users', [\App\Http\Controllers\Api\Admin\KpiController::class, 'users']);
    Route::get('/kpis/lakes', [\App\Http\Controllers\Api\Admin\KpiController::class, 'lakes']);
    Route::get('/kpis/tests', [\App\Http\Controllers\Api\Admin\KpiController::class, 'tests']);

    // Feedback management
    Route::get('/feedback',         [AdminFeedbackController::class, 'index']);
    Route::get('/feedback/{feedback}', [AdminFeedbackController::class, 'show'])->whereNumber('feedback');
    Route::patch('/feedback/{feedback}', [AdminFeedbackController::class, 'update'])->whereNumber('feedback');
    Route::post('/feedback/bulk-update', [AdminFeedbackController::class, 'bulkUpdate']);
    Route::get('/feedback/stream', [AdminFeedbackStreamController::class, 'stream']);

    // Tenants
    Route::get('/tenants',               [TenantController::class, 'index']);
    Route::post('/tenants',              [TenantController::class, 'store']);
    Route::get('/tenants/{tenant}',      [TenantController::class, 'show'])->whereNumber('tenant');
    Route::put('/tenants/{tenant}',      [TenantController::class, 'update'])->whereNumber('tenant');
    Route::delete('/tenants/{tenant}',   [TenantController::class, 'destroy'])->whereNumber('tenant');
    Route::post('/tenants/{id}/restore', [TenantController::class, 'restore'])->whereNumber('id');
    Route::delete('/tenants/{tenant}/hard', [TenantController::class, 'hardDelete'])->whereNumber('tenant');
    Route::get('/tenants/{tenant}/audit', [TenantController::class, 'audit'])->whereNumber('tenant');

    

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
    // Org Applications (admin)
    Route::get('/org-applications', [OrgApplicationController::class, 'indexAdmin']);
    Route::post('/org-applications/{id}/decision', [OrgApplicationController::class, 'decideAdmin'])->whereNumber('id');
    // Per-user applications (for admin modal)
    Route::get('/users/{userId}/org-applications', [OrgApplicationController::class, 'adminUserApplications'])->whereNumber('userId');

    // Audit logs (superadmin only here; org_admin has implicit scoping below if added later)
    Route::get('/audit-logs', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'index']);
    Route::get('/audit-logs/{id}', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'show'])->whereNumber('id');

    // Population Rasters (upload + list)
    Route::get('/population-rasters', [PopulationRasterController::class, 'index']);
    Route::post('/population-rasters', [PopulationRasterController::class, 'store']);
    Route::post('/population-rasters/{id}/process', [PopulationRasterController::class, 'process'])->whereNumber('id');
    Route::post('/population-rasters/{id}/make-default', [PopulationRasterController::class, 'makeDefault'])->whereNumber('id');
    Route::delete('/population-rasters/{id}', [PopulationRasterController::class, 'destroy'])->whereNumber('id');
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
    Route::get   ('sample-events/options',                      [AdminSamplingEventController::class, 'options']);
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

    // Tenant details (org_admin scope)
    Route::get('/tenant', [TenantController::class, 'orgScopedShow']);
    // Tenant update (supports name + contact fields)
    Route::patch('/tenant', [TenantController::class, 'orgScopedUpdate']);

        // Sampling Events (tenant scoped) accessible to org_admin + contributor + superadmin (superadmin passes role middleware automatically)
    Route::get   ('/sample-events',                              [AdminSamplingEventController::class, 'index']);
    Route::get   ('/sample-events/options',                      [AdminSamplingEventController::class, 'options']);
    Route::get   ('/sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'showOrg'])->whereNumber('samplingEvent');
    Route::post  ('/sample-events',                              [AdminSamplingEventController::class, 'store']);
    Route::put   ('/sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'updateOrg'])->whereNumber('samplingEvent');
    Route::delete('/sample-events/{samplingEvent}',              [AdminSamplingEventController::class, 'destroyOrg'])->whereNumber('samplingEvent');
    Route::post  ('/sample-events/{samplingEvent}/toggle-publish',[AdminSamplingEventController::class, 'togglePublishOrg'])->whereNumber('samplingEvent');

        // Org Applications (org_admin) - manage applications to this tenant
        Route::get('/applications', [OrgApplicationController::class, 'indexOrg']);
        Route::post('/applications/{id}/decision', [OrgApplicationController::class, 'decideOrg'])->whereNumber('id');

        // KYC docs viewer for a specific user (used by application tables modal)
        Route::get('/users/{user}/kyc-docs', function ($tenant, $user) {
            return app(\App\Http\Controllers\Api\KycProfileController::class)->adminShowUser($user);
        })->whereNumber('user');
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
    Route::get   ('/sample-events/options',                      [AdminSamplingEventController::class, 'options']);
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
Route::get('/lakes/count',      [LakeController::class, 'count']);
Route::get('/lakes/{lake}',     [LakeController::class, 'show'])->whereNumber('lake');
Route::get('/public/lakes-geo', [LakeController::class, 'publicGeo']);
Route::get('/public/lakes/{lake}', [LakeController::class, 'publicShow']);
// Faceted filter options for lakes (public)
Route::get('/filters/lakes', [LakeFiltersController::class, 'index']);
// Public lake flows
Route::get('/public/lake-flows', [\App\Http\Controllers\LakeFlowController::class, 'publicIndex']);
Route::get('/public/lake-flows/{flow}', [\App\Http\Controllers\LakeFlowController::class, 'publicShow'])->whereNumber('flow');

Route::get('/watersheds', [WatershedController::class, 'index']);

// Options
Route::get('/options/lakes',      [OptionsController::class, 'lakes']);
Route::get('/options/watersheds', [OptionsController::class, 'watersheds']);
Route::get('/options/roles',      [OptionsController::class, 'roles']);
Route::get('/options/tenants',    [OptionsController::class, 'tenants']);

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
    // KYC minimal status (placeholder)
    Route::get('/kyc/status', [KycController::class, 'status']);

    // Unified KPI endpoint (role-aware). Replaces multiple granular /admin/... /org/... /contrib/... kpi routes on frontend.
    Route::get('/kpis', [\App\Http\Controllers\Api\KpiController::class, 'summary']);

    // KYC profile (user)
    Route::get('/kyc/profile', [KycProfileController::class, 'show']);
    Route::patch('/kyc/profile', [KycProfileController::class, 'update']);
    Route::post('/kyc/submit', [KycProfileController::class, 'submit']);
    Route::post('/kyc/documents', [KycProfileController::class, 'upload']);
    Route::delete('/kyc/documents/{id}', [KycProfileController::class, 'destroyDoc'])->whereNumber('id');

    // Org Applications (user submission) - only public users can submit
    Route::post('/org-applications', [OrgApplicationController::class, 'store'])->middleware('role:public');
    Route::get('/org-applications/mine', [OrgApplicationController::class, 'mine']);
    Route::get('/org-applications/mine/all', [OrgApplicationController::class, 'mineAll']);
    Route::get('/org-applications/mine/count', [OrgApplicationController::class, 'mineCount']);
    Route::post('/org-applications/{id}/accept', [OrgApplicationController::class, 'accept'])->whereNumber('id');
    // Audit logs (superadmin global, org_admin scoped)
    Route::get('/admin/audit-logs', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'index']);
    Route::get('/admin/audit-logs/{id}', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'show']);
    Route::get('/layers',           [ApiLayerController::class, 'index'])->name('layers.index');
    Route::get('/layers/active',    [ApiLayerController::class, 'active']);
    Route::get('/layers/{id}/download', [ApiLayerController::class, 'download'])->whereNumber('id');

    // User feedback submission & listing (own only)
    Route::post('/feedback',        [FeedbackController::class, 'store']);
    Route::get('/feedback/mine',    [FeedbackController::class, 'mine']);
    Route::get('/feedback/mine/{feedback}', [FeedbackController::class, 'show'])->whereNumber('feedback');

    // User self settings (name/password)
    Route::patch('/user/settings', [UserSettingsController::class, 'update']);

    // Creation restricted to superadmin (controller also validates)
    Route::post('/layers',            [ApiLayerController::class, 'store'])->middleware('role:superadmin');
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
    // Lake flows (write operations restricted same as lakes for now)
    Route::get('/lake-flows', [\App\Http\Controllers\LakeFlowController::class, 'index']);
    Route::get('/lake-flows/{flow}', [\App\Http\Controllers\LakeFlowController::class, 'show'])->whereNumber('flow');
    Route::post('/lake-flows', [\App\Http\Controllers\LakeFlowController::class, 'store']);
    Route::put('/lake-flows/{flow}', [\App\Http\Controllers\LakeFlowController::class, 'update'])->whereNumber('flow');
    Route::delete('/lake-flows/{flow}', [\App\Http\Controllers\LakeFlowController::class, 'destroy'])->whereNumber('flow');
    // KYC review (superadmin)
    Route::get('/admin/kyc-profiles', [KycProfileController::class, 'adminIndex']);
    Route::post('/admin/kyc-profiles/{id}/decision', [KycProfileController::class, 'adminDecision'])->whereNumber('id');
    // View a user's KYC docs (for modals)
    Route::get('/admin/kyc-profiles/user/{userId}', [KycProfileController::class, 'adminShowUser'])->whereNumber('userId');
    // Watersheds CRUD
    Route::post('/watersheds', [WatershedController::class, 'store']);
    Route::put('/watersheds/{watershed}', [WatershedController::class, 'update'])->whereNumber('watershed');
    Route::delete('/watersheds/{watershed}', [WatershedController::class, 'destroy'])->whereNumber('watershed');
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
// Public semantic search
Route::post('/search', [\App\Http\Controllers\SearchController::class, 'query']);
// New lake-specific distinct location endpoints supporting JSON arrays (can migrate frontend later)
Route::get('/options/lake-regions', [LakeOptionsController::class, 'regions']);
Route::get('/options/lake-provinces', [LakeOptionsController::class, 'provinces']);
Route::get('/options/lake-municipalities', [LakeOptionsController::class, 'municipalities']);

// Stats & Population (public)
Route::get('/stats/depths', [StatsController::class, 'depths']);
Route::get('/stats/stations', [StatsController::class, 'stations']);
Route::post('/stats/series', [StatsController::class, 'series']);
// Lightweight threshold metadata lookup for custom datasets (no lake required)
Route::post('/stats/thresholds', [StatsController::class, 'thresholds']);
Route::get('/population/estimate', [PopulationController::class, 'estimate']);
Route::get('/tiles/pop/{z}/{x}/{y}', [PopulationController::class, 'tile'])
    ->where(['z' => '[0-9]+', 'x' => '[0-9]+', 'y' => '[0-9]+']);
Route::get('/population/points', [PopulationController::class, 'points']);
Route::get('/population/dataset-years', [PopulationController::class, 'datasetYears']);
Route::get('/population/dataset-info', [PopulationController::class, 'datasetInfo']);

// Vector tile endpoint for contours (PostGIS -> MVT)
Route::get('/tiles/contours/{z}/{x}/{y}.pbf', [TileController::class, 'contours'])
    ->where(['z' => '[0-9]+', 'x' => '[0-9]+', 'y' => '[0-9]+']);

// Contour labels (points for labeling index contours) - only meaningful for z >= 14
Route::get('/contours/labels', [TileController::class, 'contourLabels']);

// Elevation profile (public)
Route::post('/elevation/profile', [ElevationController::class, 'profile'])
    ->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| Simple DB health check (public)
|--------------------------------------------------------------------------
| Returns DB connectivity and migrations count for quick smoke tests.
*/
Route::get('/healthz/db', function () {
    try {
        $one = DB::select('select 1 as ok');
        $migrations = DB::select('select count(*) as cnt from migrations');
        return response()->json([
            'ok' => true,
            'db' => ($one[0]->ok ?? 0) == 1,
            'migrations' => (int) ($migrations[0]->cnt ?? 0),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'ok' => false,
            'error' => $e->getMessage(),
        ], 500);
    }
});

/*
|--------------------------------------------------------------------------
| Tenants read health check (public)
|--------------------------------------------------------------------------
| Helps diagnose 500s on /api/options/tenants by running a minimal SQL read
| without Eloquent. Returns a small sample and count or the error message.
*/
Route::get('/healthz/tenants', function () {
    try {
        $rows = DB::select('select id, name from tenants where active = true order by name limit 5');
        return response()->json([
            'ok' => true,
            'count' => count($rows),
            'sample' => $rows,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'ok' => false,
            'error' => $e->getMessage(),
        ], 500);
    }
});
