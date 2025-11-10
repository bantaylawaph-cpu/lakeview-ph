<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StatsController extends Controller
{
    /**
     * POST /api/stats/thresholds
     * Returns threshold metadata for a parameter given an optional class and optional standard.
     * Request:
     *   parameter_code (required) string
     *   class_code (optional) string
     *   applied_standard_id (optional) int
     * Response: { evaluation_type: 'min'|'max'|'range'|null, threshold_min?: number, threshold_max?: number, standard_code?: string, applied_standard_id_used?: number }
     */
    public function thresholds(Request $request)
    {
        $data = $request->validate([
            'parameter_code' => 'required|string',
            'class_code' => 'nullable|string',
            'applied_standard_id' => 'nullable|integer|exists:wq_standards,id',
        ]);

        $param = DB::table('parameters')
            ->whereRaw('LOWER(code) = ?', [strtolower($data['parameter_code'])])
            ->first();
        if (!$param) return response()->json(['error' => 'Parameter not found'], 404);

    // Treat missing or empty class_code as null so we can fall back to non-class rows
    $class = isset($data['class_code']) ? trim((string)$data['class_code']) : null;
    if ($class === '') $class = null;
        $requestedStdId = $data['applied_standard_id'] ?? null;
        // Since client explicitly provides class_code, do not fallback to no-class rows unless necessary
        $thrRow = self::findThresholdRow($param->id, $class, $requestedStdId, /* allowClassFallback */ true);
        $thrMin = $thrRow ? ($thrRow->min_value ?? null) : null;
        $thrMax = $thrRow ? ($thrRow->max_value ?? null) : null;
        $evalType = null;
        if ($thrMin !== null && $thrMax !== null) $evalType = 'range';
        elseif ($thrMin !== null) $evalType = 'min';
        elseif ($thrMax !== null) $evalType = 'max';

        return response()->json([
            'threshold_min' => $thrMin,
            'threshold_max' => $thrMax,
            'evaluation_type' => $evalType,
            'standard_code' => $thrRow ? ($thrRow->standard_code ?? null) : null,
            'applied_standard_id_used' => $thrRow ? ($thrRow->standard_id ?? null) : null,
            'class_code_used' => $thrRow ? ($thrRow->class_code ?? $class) : $class,
        ]);
    }
    /**
     * GET /api/stats/depths
     * Returns distinct sample depths (depth_m) for a parameter (by code) optionally filtered by lake and date range.
     * Query params:
     *   parameter_code (required) string
     *   lake_id (optional) int
     *   date_from/date_to (optional) YYYY-MM-DD
     *   organization_id (optional) int (scopes sampling events like series does)
     * Response: { depths: number[] }
     */
    public function depths(Request $request)
    {
        $data = $request->validate([
            'parameter_code' => 'required|string',
            'lake_id' => 'nullable|integer',
            'lake_ids' => 'nullable|array|min:2|max:2',
            'lake_ids.*' => 'integer',
            'organization_id' => 'nullable|integer',
            'station_id' => 'nullable|integer',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $param = DB::table('parameters')
            ->whereRaw('LOWER(code) = ?', [strtolower($data['parameter_code'])])
            ->first(['id']);
        if (!$param) return response()->json(['depths' => []]);

        $from = isset($data['date_from']) ? Carbon::parse($data['date_from'])->startOfDay() : null;
        $to = isset($data['date_to']) ? Carbon::parse($data['date_to'])->endOfDay() : null;

        $q = DB::table('sample_results as sr')
            ->join('sampling_events as se', 'sr.sampling_event_id', '=', 'se.id')
            ->join('parameters as p', 'sr.parameter_id', '=', 'p.id')
            ->where('p.code', '=', $data['parameter_code'])
            ->whereNotNull('sr.depth_m')
            ->whereNotNull('sr.value');

        if (!empty($data['lake_ids']) && is_array($data['lake_ids'])) {
            $q->whereIn('se.lake_id', $data['lake_ids']);
        } elseif (!empty($data['lake_id'])) {
            $q->where('se.lake_id', (int)$data['lake_id']);
        }
        if (!empty($data['organization_id'])) $q->where('se.organization_id', (int)$data['organization_id']);
        if (!empty($data['station_id'])) $q->where('se.station_id', (int)$data['station_id']);
        if ($from) $q->where('se.sampled_at', '>=', $from->copy()->timezone('UTC'));
        if ($to) $q->where('se.sampled_at', '<=', $to->copy()->timezone('UTC'));

        // Round depths to 2 decimals for grouping stability (avoid floating drift)
    $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            $q->selectRaw('ROUND(sr.depth_m::numeric, 2) as d')
              ->groupBy('d')
              ->orderBy('d');
        } else {
            $q->selectRaw('ROUND(sr.depth_m, 2) as d')
              ->groupBy('d')
              ->orderBy('d');
        }

        // Important: do not drop depth 0.0 (filter() without callback removes falsy values like 0)
        $depths = $q->pluck('d')
            ->map(fn($v)=> is_numeric($v) ? (float)$v : null)
            ->filter(fn($v)=> $v !== null) // keep 0.0
            ->values()
            ->all();
        return response()->json(['depths' => $depths]);
    }

    /**
     * GET /api/stats/stations
     * Returns distinct stations for a parameter, lake, and date range.
     * Query params:
     *   parameter_code (required) string
     *   lake_id (optional) int
     *   organization_id (optional) int
     *   date_from/date_to (optional) YYYY-MM-DD
     * Response: { stations: {id: int, name: string}[] }
     */
    public function stations(Request $request)
    {
        $data = $request->validate([
            'parameter_code' => 'nullable|string',
            'lake_id' => 'nullable|integer',
            'organization_id' => 'nullable|integer',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $from = isset($data['date_from']) ? Carbon::parse($data['date_from'])->startOfDay() : null;
        $to = isset($data['date_to']) ? Carbon::parse($data['date_to'])->endOfDay() : null;

        $q = DB::table('sample_results as sr')
            ->join('sampling_events as se', 'sr.sampling_event_id', '=', 'se.id')
            ->join('stations as st', 'se.station_id', '=', 'st.id')
            ->whereNotNull('sr.value')
            ->select('st.id', 'st.name')
            ->distinct();

        // If a parameter_code was provided, restrict to that parameter
        if (!empty($data['parameter_code'])) {
            $q->join('parameters as p', 'sr.parameter_id', '=', 'p.id')
              ->where('p.code', '=', $data['parameter_code']);
        }

        if (!empty($data['lake_id'])) {
            $q->where('se.lake_id', (int)$data['lake_id']);
        }
        if (!empty($data['organization_id'])) $q->where('se.organization_id', (int)$data['organization_id']);
        if ($from) $q->where('se.sampled_at', '>=', $from->copy()->timezone('UTC'));
        if ($to) $q->where('se.sampled_at', '<=', $to->copy()->timezone('UTC'));

        $stations = $q->orderBy('st.name')->get()->map(fn($s) => ['id' => $s->id, 'name' => $s->name]);

        return response()->json(['stations' => $stations]);
    }
    /**
     * POST /api/stats/series
     * Returns raw numeric series filtered by parameter, lake(s), and date range.
    * Body (JSON):
     * {
     *   parameter_code: string,
    *   organization_id?: int,      // optional: scope to a tenant/organization
     *   lake_id?: int,                // one-sample
     *   lake_ids?: [int,int],         // two-sample
     *   date_from?: YYYY-MM-DD,
     *   date_to?: YYYY-MM-DD,
     *   applied_standard_id?: int     // optional: include threshold lookup metadata
     * }
     *
     * Response (one-sample):
     * { sample_values: number[], n: number, threshold_min?: number, threshold_max?: number, evaluation_type?: string, standard_code?: string, class_code_used?: string, applied_standard_id_used?: number }
     * Response (two-sample):
     * { sample1_values: number[], n1: number, sample2_values: number[], n2: number }
     */
    public function series(Request $request)
    {
        $data = $request->validate([
            'parameter_code' => 'required|string',
            'organization_id' => 'nullable|integer',
            // For two-sample requests clients may provide per-lake organization filters using organization_ids
            'organization_ids' => 'nullable|array|min:2|max:2',
            'organization_ids.*' => 'nullable|integer',
            'lake_id' => 'nullable|integer',
            'lake_ids' => 'nullable|array|min:2|max:2',
            'lake_ids.*' => 'integer',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'applied_standard_id' => 'nullable|integer|exists:wq_standards,id',
            'depth_m' => 'nullable|numeric', // optional depth filter applied equally to all selected lakes
            'station_id' => 'nullable|integer',
            // Optional override: when client compares a lake to a target class threshold, allow explicit class_code
            'class_code' => 'nullable|string',
        ]);

        $param = DB::table('parameters')
            ->whereRaw('LOWER(code) = ?', [strtolower($data['parameter_code'])])
            ->first();
        if (!$param) return response()->json(['error' => 'Parameter not found'], 404);

        $from = isset($data['date_from']) ? Carbon::parse($data['date_from'])->startOfDay() : null;
        $to = isset($data['date_to']) ? Carbon::parse($data['date_to'])->endOfDay() : null;

        $query = DB::table('sample_results as sr')
            ->join('sampling_events as se', 'sr.sampling_event_id', '=', 'se.id')
            ->leftJoin('stations as st', 'se.station_id', '=', 'st.id')
            ->join('parameters as p', 'sr.parameter_id', '=', 'p.id')
            ->where('p.code', '=', $data['parameter_code'])
            ->whereNotNull('sr.value');
        $driver = DB::getDriverName();
        if (isset($data['depth_m']) && $data['depth_m'] !== null) {
            $target = (float)$data['depth_m'];
            if ($driver === 'pgsql') {
                // Cast to numeric for ROUND in PostgreSQL
                $query->whereRaw('ROUND(sr.depth_m::numeric, 2) = ROUND(?::numeric, 2)', [$target]);
            } else {
                // MySQL / MariaDB ROUND(double,2) signature exists
                $query->whereRaw('ROUND(sr.depth_m, 2) = ROUND(?, 2)', [$target]);
            }
        }

        if (!empty($data['station_id'])) $query->where('se.station_id', (int)$data['station_id']);

        if ($from) $query->where('se.sampled_at', '>=', $from->copy()->timezone('UTC'));
        if ($to) $query->where('se.sampled_at', '<=', $to->copy()->timezone('UTC'));

        $isTwo = !empty($data['lake_ids']) && is_array($data['lake_ids']);
        if ($isTwo) {
            $ids = $data['lake_ids'];
            // If client provided per-lake organization filters, apply them per-lake
            if (!empty($data['organization_ids']) && is_array($data['organization_ids']) && count($data['organization_ids']) === 2) {
                $orgs = $data['organization_ids'];
                $query->where(function($q) use ($ids, $orgs) {
                    // build OR clauses for each lake: either (lake_id = id AND organization_id = org)
                    // or (lake_id = id) if org is not provided for that lake
                    for ($i = 0; $i < 2; $i++) {
                        $lid = $ids[$i];
                        $oid = $orgs[$i] ?? null;
                        if ($oid !== null && $oid !== '') {
                            $q->orWhere(function($q2) use ($lid, $oid) {
                                $q2->where('se.lake_id', $lid)->where('se.organization_id', (int) $oid);
                            });
                        } else {
                            $q->orWhere('se.lake_id', $lid);
                        }
                    }
                });
            } else {
                // no per-lake org filters provided — fall back to selecting rows for either lake
                $query->whereIn('se.lake_id', $ids);
                // if a global organization_id was provided, apply it to both lakes
                if (!empty($data['organization_id'])) {
                    $query->where('se.organization_id', (int) $data['organization_id']);
                }
            }
        } else {
            if (empty($data['lake_id'])) {
                return response()->json(['error' => 'lake_id required for one-sample or provide lake_ids for two-sample'], 422);
            }
            $query->where('se.lake_id', $data['lake_id']);
            // Optional: scope by organization/tenant if provided. This lets the client request
            // series restricted to a specific organization's dataset (useful in multi-tenant UIs).
            if (!empty($data['organization_id'])) {
                $query->where('se.organization_id', (int) $data['organization_id']);
            }
        }

    // driver already determined above
        if ($driver === 'pgsql') {
            $query->selectRaw("se.lake_id, se.station_id, st.name as station_name, sr.depth_m, timezone('Asia/Manila', se.sampled_at) as bucket_key, sr.value as agg_value")
                ->orderByRaw("timezone('Asia/Manila', se.sampled_at)");
        } else {
            $query->selectRaw("se.lake_id, se.station_id, st.name as station_name, sr.depth_m, CONVERT_TZ(se.sampled_at,'UTC','Asia/Manila') as bucket_key, sr.value as agg_value")
                ->orderBy('bucket_key');
        }

        $rows = $query->get();

        if (!$isTwo) {
            // Optional depth filter (applied post-query if necessary, but try to apply in SQL first)
            if (isset($data['depth_m']) && $data['depth_m'] !== null) {
                // Apply filtering in memory if not already applied (in case of rounding differences)
                $target = round((float)$data['depth_m'], 2);
                $rows = $rows->filter(function($r) use ($target){
                    if (!isset($r->agg_value)) return false;
                    if (!property_exists($r, 'depth_m') && !isset($r->depth_m)) return true; // depth not selected earlier
                    // depth wasn't selected in selectRaw; fetch via lazy? Simpler: re-query depth inline if needed (skip). For now assume not selected; we did not select depth_m.
                    return true; // Already filtered at SQL level below when depth provided.
                });
            }
            $sample = collect($rows)->pluck('agg_value')->filter(fn($v)=>is_numeric($v))->values()->all();

            // include raw event rows so the frontend can display the sampled_at, station and value for each event
            $events = collect($rows)->map(function($r){
                return [
                    'lake_id' => $r->lake_id ?? null,
                    'station_id' => $r->station_id ?? null,
                    'station_name' => $r->station_name ?? null,
                    'sampled_at' => isset($r->bucket_key) ? (string)$r->bucket_key : null,
                    'value' => is_numeric($r->agg_value) ? (float)$r->agg_value : null,
                ];
            })->values()->all();

            // Threshold metadata (optional)
            // Determine which class to use for threshold lookup: explicit override wins; else lake's own class
            $class = $data['class_code'] ?? null;
            if (!$class) {
                $class = DB::table('lakes')->where('id', $data['lake_id'])->value('class_code');
            }
            $requestedStdId = $data['applied_standard_id'] ?? null;
            $allowClassFallback = empty($data['class_code']);
            $thrRow = self::findThresholdRow($param->id, $class, $requestedStdId, $allowClassFallback);
            $thrMin = $thrRow ? ($thrRow->min_value ?? null) : null; 
            $thrMax = $thrRow ? ($thrRow->max_value ?? null) : null;
            $evalType = null;
            if ($thrMin !== null && $thrMax !== null) $evalType = 'range';
            elseif ($thrMin !== null) $evalType = 'min';
            elseif ($thrMax !== null) $evalType = 'max';

            return response()->json([
                'sample_values' => $sample,
                'n' => count($sample),
                'threshold_min' => $thrMin,
                'threshold_max' => $thrMax,
                'evaluation_type' => $evalType,
                'standard_code' => $thrRow ? ($thrRow->standard_code ?? null) : null,
                'class_code_used' => $thrRow ? ($thrRow->class_code ?? $class) : $class,
                'applied_standard_id_requested' => $requestedStdId,
                'applied_standard_id_used' => $thrRow ? ($thrRow->standard_id ?? null) : null,
                'events' => $events,
            ]);
        }

        // Two-sample
        $byLake = collect($rows)->groupBy('lake_id');
        $ids = $data['lake_ids'];
        $x = ($byLake[$ids[0]] ?? collect())->pluck('agg_value')->filter(fn($v)=>is_numeric($v))->values()->all();
        $y = ($byLake[$ids[1]] ?? collect())->pluck('agg_value')->filter(fn($v)=>is_numeric($v))->values()->all();

        // include flat event rows for both lakes so the frontend can present the original sampled_at and station
        $events = collect($rows)->map(function($r){
            return [
                'lake_id' => $r->lake_id ?? null,
                'station_id' => $r->station_id ?? null,
                'station_name' => $r->station_name ?? null,
                'sampled_at' => isset($r->bucket_key) ? (string)$r->bucket_key : null,
                'value' => is_numeric($r->agg_value) ? (float)$r->agg_value : null,
            ];
        })->values()->all();

        return response()->json([
            'sample1_values' => $x,
            'n1' => count($x),
            'sample2_values' => $y,
            'n2' => count($y),
            'events' => $events,
        ]);
    }
    // Removed legacy server-side endpoints (tTest/adaptive/manual) in favor of client-side computation.

    private static function findThresholdRow(int $parameterId, ?string $class, ?int $requestedStdId, bool $allowClassFallback = true)
    {
        $base = function($withClass) use ($parameterId, $class){
            // Use facade import (DB) for clarity instead of global \DB
            $q = DB::table('parameter_thresholds as pt')
                ->leftJoin('wq_standards as ws','pt.standard_id','=','ws.id')
                ->where('pt.parameter_id',$parameterId);
            if ($withClass && $class) $q->whereRaw('LOWER(pt.class_code)=?', [strtolower($class)]);
            return $q;
        };
        $thrRow = null; $classFallback=false;
        if ($requestedStdId) {
            $thrRow = $base(true)->where('pt.standard_id',$requestedStdId)->first(['pt.*','ws.code as standard_code','ws.is_current']);
            if (!$thrRow && $allowClassFallback) { 
                $thrRow = $base(false)->where('pt.standard_id',$requestedStdId)->first(['pt.*','ws.code as standard_code','ws.is_current']); 
                $classFallback = (bool)$thrRow; 
            }
        }
        if (!$thrRow) {
            $thrRow = $base(true)
                ->orderByDesc('ws.is_current')
                ->orderByDesc('ws.id')
                ->orderByRaw('pt.min_value IS NULL')
                ->orderByRaw('pt.max_value IS NULL')
                ->first(['pt.*','ws.code as standard_code','ws.is_current']);
        }
        if (!$thrRow && $class && $allowClassFallback) {
            $thrRow = $base(false)
                ->orderByDesc('ws.is_current')
                ->orderByDesc('ws.id')
                ->orderByRaw('pt.min_value IS NULL')
                ->orderByRaw('pt.max_value IS NULL')
                ->first(['pt.*','ws.code as standard_code','ws.is_current']);
        }
        return $thrRow;
    }

    // Interpretation helpers removed with legacy endpoints.
}
