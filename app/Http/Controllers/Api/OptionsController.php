<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Lake;
use App\Models\Watershed;
use App\Models\WaterQualityClass;
use App\Models\Parameter;
use App\Models\WqStandard;
use App\Models\Tenant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
// Removed dynamic schema detection for tenants 'active' vs 'is_active'. Assume unified schema.

class OptionsController extends Controller
{
    /**
     * GET /api/options/roles
     * Returns ["public", "contributor", ...] for role dropdowns.
     */
    public function roles(Request $request)
    {
        // Optionally filter by scope if needed
        $roles = \App\Models\Role::query()
            ->orderBy('id')
            ->pluck('name')
            ->values();
        return response()->json($roles);
    }
    /**
     * GET /api/options/lakes?q=&limit=&has_data=
     * Returns [{ id, name, class_code }, ...] for lightweight dropdowns.
     * If has_data=1, only return lakes that have sampling events.
     */
    public function lakes(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $limit = (int) $request->query('limit', 500);
        $limit = max(1, min($limit, 2000)); // cap for safety
        $hasData = $request->query('has_data') === '1' || $request->query('has_data') === 'true';

        $query = Lake::query()
            ->select(['lakes.id', 'lakes.name', 'lakes.class_code'])
            ->when($q !== '', function ($qb) use ($q) {
                // Postgres: ILIKE for case-insensitive search
                $qb->where('lakes.name', 'ILIKE', "%{$q}%");
            })
            ->when($hasData, function ($qb) {
                // Only include lakes that have at least one sampling event
                $qb->whereExists(function ($sub) {
                    $sub->select(DB::raw(1))
                        ->from('sampling_events')
                        ->whereColumn('sampling_events.lake_id', 'lakes.id');
                });
            })
            ->orderBy('lakes.name')
            ->limit($limit);

        $rows = $query->get();

        return response()->json($rows);
    }

    /**
     * GET /api/options/watersheds?q=&limit=
     * Returns [{ id, name }, ...] for lightweight dropdowns.
     */
    public function watersheds(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $limit = (int) $request->query('limit', 500);
        $limit = max(1, min($limit, 2000));

        $rows = Watershed::query()
            ->select(['id', 'name'])
            ->when($q !== '', function ($qb) use ($q) {
                $qb->where('name', 'ILIKE', "%{$q}%");
            })
            ->orderBy('name')
            ->limit($limit)
            ->get();

        return response()->json($rows);
    }

    /**
     * GET /api/options/parameters?q=&limit=
     * Returns lightweight parameter records for dropdowns.
     */
    public function parameters(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $limit = (int) $request->query('limit', 500);
        $limit = max(1, min($limit, 2000));

        $rows = Parameter::query()
            ->select(['id', 'code', 'name', 'unit', 'evaluation_type', 'desc'])
            ->when($q !== '', function ($qb) use ($q) {
                $like = "%{$q}%";
                $qb->where(function ($inner) use ($like) {
                    $inner->where('code', 'ILIKE', $like)
                        ->orWhere('name', 'ILIKE', $like);
                });
            })
            ->orderBy('code')
            ->limit($limit)
            ->get();

        return response()->json($rows);
    }

    /**
     * GET /api/options/wq-standards
     * Returns available standards ordered by current then code.
     */
    public function standards()
    {
        $rows = WqStandard::query()
            ->select(['id', 'code', 'name', 'is_current'])
            ->orderByDesc('is_current')
            ->orderBy('code')
            ->get();

        return response()->json($rows);
    }

    /**
     * GET /api/options/water-quality-classes
     * Returns [{ code, name }, ...] ordered by code.
     */
    public function waterQualityClasses()
    {
        $key = 'options:wq-classes:v2';
        if ($hit = Cache::get($key)) return response()->json($hit);
        $rows = WaterQualityClass::query()
            ->select(['code', 'name'])
            ->orderBy('code')
            ->get();
        Cache::put($key, $rows, now()->addDays(7));
        return response()->json($rows);
    }

    /**
     * GET /api/options/regions
     * Returns distinct region names from lakes
     */
    public function regions()
    {
        $rows = Lake::query()
            ->selectRaw('distinct region')
            ->whereNotNull('region')
            ->orderBy('region')
            ->pluck('region')
            ->filter()
            ->values();

        return response()->json($rows);
    }

    /**
     * GET /api/options/provinces
     * Returns distinct province names from lakes
     */
    public function provinces()
    {
        $rows = Lake::query()
            ->selectRaw('distinct province')
            ->whereNotNull('province')
            ->orderBy('province')
            ->pluck('province')
            ->filter()
            ->values();

        return response()->json($rows);
    }

    /**
     * GET /api/options/municipalities
     * Returns distinct municipality names from lakes
     */
    public function municipalities()
    {
        $rows = Lake::query()
            ->selectRaw('distinct municipality')
            ->whereNotNull('municipality')
            ->orderBy('municipality')
            ->pluck('municipality')
            ->filter()
            ->values();

        return response()->json($rows);
    }

    /**
     * GET /api/options/tenants?q=&limit=
     * Lightweight list of active tenants for dropdowns. Returns { data: [{ id, name }, ...] }
     */
    public function tenants(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $limit = (int) $request->query('limit', 1000);
        $limit = max(1, min($limit, 5000));
        // Simplified: do not filter by status; return all tenants for selector.
        // If an exception occurs, log and return empty list gracefully.
        try {
            $rows = Tenant::query()
                ->select(['id','name'])
                ->when($q !== '', function ($qb) use ($q) { $qb->where('name', 'ILIKE', "%{$q}%"); })
                ->orderBy('name')
                ->limit($limit)
                ->get();
            return response()->json(['data' => $rows]);
        } catch (\Throwable $e) {
            \Log::error('options.tenants error', [ 'error' => $e->getMessage() ]);
            return response()->json(['data' => [], 'error' => 'tenants_unavailable'], 200);
        }
    }
}
