<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Lake;
use App\Models\Watershed;
use App\Models\WaterQualityClass;
use App\Models\Parameter;
use App\Models\WqStandard;

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
     * GET /api/options/lakes?q=&limit=
     * Returns [{ id, name, class_code }, ...] for lightweight dropdowns.
     */
    public function lakes(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $limit = (int) $request->query('limit', 500);
        $limit = max(1, min($limit, 2000)); // cap for safety

        $rows = Lake::query()
            ->select(['id', 'name', 'class_code'])
            ->when($q !== '', function ($qb) use ($q) {
                // Postgres: ILIKE for case-insensitive search
                $qb->where('name', 'ILIKE', "%{$q}%");
            })
            ->orderBy('name')
            ->limit($limit)
            ->get();

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
            ->select(['id', 'code', 'name', 'unit', 'evaluation_type', 'is_active'])
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
     * Returns available standards ordered by current + priority.
     */
    public function standards()
    {
        $rows = WqStandard::query()
            ->select(['id', 'code', 'name', 'is_current', 'priority'])
            ->orderByDesc('is_current')
            ->orderByDesc('priority')
            ->orderBy('code')
            ->get();

        return response()->json($rows);
    }

    /**
     * GET /api/options/water-quality-classes
     * Returns [{ code, name, notes }, ...] ordered by code.
     */
    public function waterQualityClasses()
    {
        $rows = WaterQualityClass::query()
            ->select(['code', 'name', 'notes'])
            ->orderBy('code')
            ->get();

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
}
