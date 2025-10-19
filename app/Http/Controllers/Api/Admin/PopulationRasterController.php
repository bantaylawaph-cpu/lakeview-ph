<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PopulationRaster;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Jobs\IngestPopulationRaster;
use Illuminate\Support\Facades\Schema;

class PopulationRasterController extends Controller
{
    /** List uploaded population raster files (superadmin only via route middleware) */
    public function index(Request $request)
    {
        $baseQuery = PopulationRaster::query()->orderByDesc('population_rasters.created_at');
        if ($request->query('year')) {
            $baseQuery->where('population_rasters.year', (int)$request->query('year'));
        }

        $rows = collect();
        $attemptJoin = false;
        $hasCatalog = false;
        $hasDatasetColumn = false;
        try { DB::select('SELECT 1 FROM pop_dataset_catalog LIMIT 1'); $hasCatalog = true; } catch (\Throwable $e) { $hasCatalog = false; }
        try { $hasDatasetColumn = Schema::hasColumn('population_rasters', 'dataset_id'); } catch (\Throwable $e) { $hasDatasetColumn = false; }
        $attemptJoin = $hasCatalog && $hasDatasetColumn;

        if ($attemptJoin) {
            try {
                $q = clone $baseQuery;
                $q->leftJoin('pop_dataset_catalog', 'pop_dataset_catalog.id', '=', 'population_rasters.dataset_id')
                  ->addSelect('population_rasters.*')
                  ->addSelect(DB::raw('COALESCE(pop_dataset_catalog.is_default, FALSE) AS is_default'))
                  ->addSelect(DB::raw('COALESCE(pop_dataset_catalog.is_enabled, FALSE) AS is_enabled'));
                $rows = $q->limit(500)->get();
            } catch (\Throwable $e) {
                // Fallback silently without join (column or table actually missing despite schema probe)
                $attemptJoin = false;
            }
        }

        if (! $attemptJoin) {
            $q = clone $baseQuery;
            $q->select('population_rasters.*');
            // Provide placeholder flags so UI doesn't break when expecting them
            $rows = $q->limit(500)->get()->map(function ($r) {
                $r->is_default = false;
                $r->is_enabled = false;
                return $r;
            });
        }

        return response()->json(['data' => $rows]);
    }

    /**
     * Upload one new raster (GeoTIFF or ZIP of rasters).
     * Note: This only stores the artifact; ingestion into PostGIS / function wiring is a separate process.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if ($user?->role?->name !== Role::SUPERADMIN) {
            abort(403, 'Only Super Administrators can upload population rasters.');
        }

        $validated = $request->validate([
            'year' => 'required|integer|min:1990|max:2100',
            'raster' => 'required|file|max:512000' // ~500MB limit, adjust if needed
                . '|mimetypes:image/tiff,application/zip,application/x-zip-compressed'
                . '|mimes:tif,tiff,zip',
            'srid' => 'nullable|integer|min:2000|max:999999',
            'notes' => 'nullable|string|max:1000',
            'link' => 'nullable|string|max:2048',
        ]);

        $file = $request->file('raster');
        $year = (int)$validated['year'];
        $origName = $file->getClientOriginalName();
        $safeName = Str::slug(pathinfo($origName, PATHINFO_FILENAME));
        $ext = strtolower($file->getClientOriginalExtension());
        if (!$ext) $ext = 'tif';
        $finalName = $safeName . '-' . now()->format('YmdHis') . '.' . $ext;
        $dir = "population_rasters/$year";
        $path = $file->storeAs($dir, $finalName, ['disk' => 'local']);

        // Basic placeholder for pixel metadata; real ingestion can update later
        $record = null;
        DB::transaction(function () use (&$record, $validated, $user, $origName, $path, $finalName) {
            $record = PopulationRaster::create([
                'year' => (int)$validated['year'],
                'filename' => $origName,
                'disk' => 'local',
                'path' => $path,
                'srid' => $validated['srid'] ?? 4326,
                'pixel_size_x' => null,
                'pixel_size_y' => null,
                'uploaded_by' => $user?->id,
                'status' => 'uploaded',
                'notes' => $validated['notes'] ?? null,
                'link' => $validated['link'] ?? null,
                'error_message' => null,
            ]);
        });

        return response()->json(['data' => $record], 201);
    }

    /** Queue ingestion (process) of an uploaded raster */
    public function process(Request $request, int $id)
    {
        $user = $request->user();
        if ($user?->role?->name !== Role::SUPERADMIN) abort(403);
        $r = PopulationRaster::findOrFail($id);
        if (!in_array($r->status, ['uploaded','error'], true)) {
            return response()->json(['message' => 'Raster not in a processable state.'], 422);
        }
        $makeDefault = filter_var($request->query('make_default'), FILTER_VALIDATE_BOOLEAN) ?? false;
        IngestPopulationRaster::dispatch($r->id, $makeDefault);
        return response()->json(['queued' => true, 'id' => $r->id]);
    }

    /** Force make default for a ready dataset */
    public function makeDefault(Request $request, int $id)
    {
        $user = $request->user();
        if ($user?->role?->name !== Role::SUPERADMIN) abort(403);
        $r = PopulationRaster::findOrFail($id);
        if (!$r->dataset_id || $r->status !== 'ready') {
            return response()->json(['message' => 'Dataset not ready.'], 422);
        }
        try {
            DB::statement('SELECT pop_enable_dataset(?, TRUE)', [$r->dataset_id]);
            // Cache invalidation: remove any cached estimates for the same year
            try {
                // Invalidate all cached estimates for the year (simpler + covers new method format)
                DB::statement('DELETE FROM pop_estimate_cache WHERE year = ?', [$r->year]);
            } catch (\Throwable $e) { /* ignore if cache table absent */ }
            return response()->json(['ok' => true]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /** Delete a population raster (and drop dataset if registered) */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        if ($user?->role?->name !== Role::SUPERADMIN) abort(403);
        $r = PopulationRaster::findOrFail($id);
        if ($r->status === 'ingesting') {
            return response()->json(['message' => 'Cannot delete while ingesting.'], 422);
        }
        DB::transaction(function () use ($r) {
            if ($r->dataset_id) {
                try { DB::statement('SELECT pop_drop_dataset(?)', [$r->dataset_id]); } catch (\Throwable $e) { /* ignore */ }
            }
            try { if ($r->path && $r->disk && \Illuminate\Support\Facades\Storage::disk($r->disk)->exists($r->path)) { \Illuminate\Support\Facades\Storage::disk($r->disk)->delete($r->path); } } catch (\Throwable $e) {}
            $r->delete();
        });
        return response()->json(['deleted' => true]);
    }
}
