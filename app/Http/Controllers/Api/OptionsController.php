<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Lake;
use App\Models\Watershed;

class OptionsController extends Controller
{
    /**
     * GET /api/options/lakes?q=&limit=
     * Returns [{ id, name }, ...] for lightweight dropdowns.
     */
    public function lakes(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $limit = (int) $request->query('limit', 500);
        $limit = max(1, min($limit, 2000)); // cap for safety

        $rows = Lake::query()
            ->select(['id', 'name'])
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
}
