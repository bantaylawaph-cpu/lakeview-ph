<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StatsController extends Controller
{
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
        ]);

        $param = \DB::table('parameters')
            ->whereRaw('LOWER(code) = ?', [strtolower($data['parameter_code'])])
            ->first();
        if (!$param) return response()->json(['error' => 'Parameter not found'], 404);

        $from = isset($data['date_from']) ? Carbon::parse($data['date_from'])->startOfDay() : null;
        $to = isset($data['date_to']) ? Carbon::parse($data['date_to'])->endOfDay() : null;

        $query = \DB::table('sample_results as sr')
            ->join('sampling_events as se', 'sr.sampling_event_id', '=', 'se.id')
            ->leftJoin('stations as st', 'se.station_id', '=', 'st.id')
            ->join('parameters as p', 'sr.parameter_id', '=', 'p.id')
            ->where('p.code', '=', $data['parameter_code'])
            ->whereNotNull('sr.value');

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

        $driver = \DB::getDriverName();
        if ($driver === 'pgsql') {
            // include station_id, station name and the localized sampled_at (bucket_key) so the client can show event rows
            $query->selectRaw("se.lake_id, se.station_id, st.name as station_name, timezone('Asia/Manila', se.sampled_at) as bucket_key, sr.value as agg_value")
                ->orderByRaw("timezone('Asia/Manila', se.sampled_at)");
        } else {
            $query->selectRaw("se.lake_id, se.station_id, st.name as station_name, CONVERT_TZ(se.sampled_at,'UTC','Asia/Manila') as bucket_key, sr.value as agg_value")
                ->orderBy('bucket_key');
        }

        $rows = $query->get();

        if (!$isTwo) {
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
            $class = \DB::table('lakes')->where('id', $data['lake_id'])->value('class_code');
            $requestedStdId = $data['applied_standard_id'] ?? null;
            $thrRow = self::findThresholdRow($param->id, $class, $requestedStdId);
            $thrMin = $thrRow->min_value ?? null; $thrMax = $thrRow->max_value ?? null;
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
                'standard_code' => $thrRow->standard_code ?? null,
                'class_code_used' => $thrRow->class_code ?? $class,
                'applied_standard_id_requested' => $requestedStdId,
                'applied_standard_id_used' => $thrRow->standard_id ?? null,
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

    private static function findThresholdRow(int $parameterId, ?string $class, ?int $requestedStdId)
    {
        $base = function($withClass) use ($parameterId, $class){
            $q = \DB::table('parameter_thresholds as pt')
                ->leftJoin('wq_standards as ws','pt.standard_id','=','ws.id')
                ->where('pt.parameter_id',$parameterId);
            if ($withClass && $class) $q->whereRaw('LOWER(pt.class_code)=?', [strtolower($class)]);
            return $q;
        };
        $thrRow = null; $classFallback=false;
        if ($requestedStdId) {
            $thrRow = $base(true)->where('pt.standard_id',$requestedStdId)->first(['pt.*','ws.code as standard_code','ws.is_current']);
            if (!$thrRow) { $thrRow = $base(false)->where('pt.standard_id',$requestedStdId)->first(['pt.*','ws.code as standard_code','ws.is_current']); $classFallback = (bool)$thrRow; }
        }
        if (!$thrRow) {
            $thrRow = $base(true)
                ->orderByDesc('ws.is_current')
                ->orderBy('ws.priority')
                ->orderByRaw('pt.min_value IS NULL')
                ->orderByRaw('pt.max_value IS NULL')
                ->first(['pt.*','ws.code as standard_code','ws.is_current']);
        }
        if (!$thrRow && $class) {
            $thrRow = $base(false)
                ->orderByDesc('ws.is_current')
                ->orderBy('ws.priority')
                ->orderByRaw('pt.min_value IS NULL')
                ->orderByRaw('pt.max_value IS NULL')
                ->first(['pt.*','ws.code as standard_code','ws.is_current']);
        }
        return $thrRow;
    }

    // Interpretation helpers removed with legacy endpoints.
}