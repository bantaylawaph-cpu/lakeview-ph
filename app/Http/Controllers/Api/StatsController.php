<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\Stats\TTestService;
use Carbon\Carbon;

class StatsController extends Controller
{
    /**
     * POST /api/stats/t-test
     * Body: {
     *   mode: compliance|improvement,
     *   test: one-sample|two-sample,
     *   parameter_code: string,
     *   lake_ids: [int,int]? (for two-sample),
     *   lake_id: int (for one-sample),
     *   class_code: string (for threshold lookup if one-sample),
     *   date_from?: YYYY-MM-DD,
     *   date_to?: YYYY-MM-DD,
     *   confidence_level: 0.9|0.95|0.99 (default 0.95),
     *   dl_rule: half|sqrt (censored substitution rule),
     *   min_n?: override minimum required (default 3 warn, 6 pass),
     *   eval_type?: optional override of evaluation type (min|max|range)
     * }
     */
    public function tTest(Request $request)
    {
        $data = $request->validate([
            'mode' => 'nullable|in:compliance,improvement',
            'test' => 'required|in:one-sample,two-sample',
            'parameter_code' => 'required|string',
            'lake_id' => 'required_if:test,one-sample|integer',
            'lake_ids' => 'required_if:test,two-sample|array|min:2|max:2',
            'lake_ids.*' => 'integer',
            'class_code' => 'nullable|string',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'confidence_level' => 'nullable|in:0.9,0.95,0.99',
            'dl_rule' => 'nullable|in:half,sqrt',
            'min_n' => 'nullable|integer|min:2',
            'eval_type' => 'nullable|in:min,max,range',
            'aggregation' => 'nullable|in:month,raw,daily',
            'station_ids' => 'nullable|array',
            'station_ids.*' => 'integer',
            'manual_mu0' => 'nullable|numeric'
        ]);

        $mode = $data['mode'] ?? 'compliance';
        $alpha = 1 - floatval($data['confidence_level'] ?? 0.95);
        $dlRule = $data['dl_rule'] ?? 'half';
        $minN = $data['min_n'] ?? 3; // show warning below 6
        $warnThreshold = 6;

        // Fetch parameter meta (evaluation_type)
        // Parameter lookup (case-insensitive to be resilient to UI casing)
        $param = DB::table('parameters')
            ->whereRaw('LOWER(code) = ?', [strtolower($data['parameter_code'])])
            ->first();
        if (!$param) {
            return response()->json(['error' => 'Parameter not found'], 404);
        }
        $evalType = $data['eval_type'] ?? $param->evaluation_type ?? null; // min|max|range

        // Date range
        $from = isset($data['date_from']) ? Carbon::parse($data['date_from'])->startOfDay() : null;
        $to = isset($data['date_to']) ? Carbon::parse($data['date_to'])->endOfDay() : null;

        $aggregation = $data['aggregation'] ?? 'month';

        $query = DB::table('sample_results as sr')
            ->join('sampling_events as se', 'sr.sampling_event_id', '=', 'se.id')
            ->join('parameters as p', 'sr.parameter_id', '=', 'p.id')
            ->where('p.code', '=', $data['parameter_code'])
            ->whereNotNull('sr.value');

        if (!empty($data['station_ids'])) {
            $query->whereIn('se.station_id', $data['station_ids']);
        }

        $driver = DB::getDriverName();
        if ($aggregation === 'month') {
            if ($driver === 'pgsql') {
                // Use date_trunc then format to canonical YYYY-MM-01 string
                $select = "se.lake_id, to_char(date_trunc('month', timezone('Asia/Manila', se.sampled_at)), 'YYYY-MM-01') as bucket_key, AVG(sr.value) as agg_value";
                $query->selectRaw($select)
                    ->groupByRaw("se.lake_id, date_trunc('month', timezone('Asia/Manila', se.sampled_at))")
                    ->orderBy('bucket_key');
            } else { // mysql / mariadb
                $query->selectRaw("se.lake_id, DATE_FORMAT(CONVERT_TZ(se.sampled_at, 'UTC', 'Asia/Manila'), '%Y-%m-01') as bucket_key, AVG(sr.value) as agg_value")
                    ->groupBy('se.lake_id', 'bucket_key')
                    ->orderBy('bucket_key');
            }
        } elseif ($aggregation === 'daily') {
            if ($driver === 'pgsql') {
                $select = "se.lake_id, to_char(date_trunc('day', timezone('Asia/Manila', se.sampled_at)), 'YYYY-MM-DD') as bucket_key, AVG(sr.value) as agg_value";
                $query->selectRaw($select)
                    ->groupByRaw("se.lake_id, date_trunc('day', timezone('Asia/Manila', se.sampled_at))")
                    ->orderBy('bucket_key');
            } else {
                $query->selectRaw("se.lake_id, DATE_FORMAT(CONVERT_TZ(se.sampled_at, 'UTC', 'Asia/Manila'), '%Y-%m-%d') as bucket_key, AVG(sr.value) as agg_value")
                    ->groupBy('se.lake_id', 'bucket_key')
                    ->orderBy('bucket_key');
            }
        } else { // raw
            if ($driver === 'pgsql') {
                $query->selectRaw("se.lake_id, timezone('Asia/Manila', se.sampled_at) as bucket_key, sr.value as agg_value")
                    ->orderByRaw("timezone('Asia/Manila', se.sampled_at)");
            } else {
                $query->selectRaw("se.lake_id, CONVERT_TZ(se.sampled_at, 'UTC', 'Asia/Manila') as bucket_key, sr.value as agg_value")
                    ->orderBy('bucket_key');
            }
        }

        if ($from) $query->where('se.sampled_at', '>=', $from->copy()->timezone('UTC'));
        if ($to) $query->where('se.sampled_at', '<=', $to->copy()->timezone('UTC'));

        if ($data['test'] === 'one-sample') {
            $query->where('se.lake_id', $data['lake_id']);
        } else {
            $lakeIds = $data['lake_ids'];
            $query->whereIn('se.lake_id', $lakeIds);
        }

    $rows = $query->get();

        // Partition into samples
        if ($data['test'] === 'one-sample') {
            $sample = collect($rows)->pluck('agg_value')->filter(fn($v) => is_numeric($v))->values()->all();
            // Lookup threshold
            $class = $data['class_code'] ?? DB::table('lakes')->where('id', $data['lake_id'])->value('class_code');
            // Robust threshold lookup (case-insensitive class, prioritize current standards, prefer rows with actual values)
            $thrQuery = DB::table('parameter_thresholds as pt')
                ->leftJoin('wq_standards as ws', 'pt.standard_id', '=', 'ws.id')
                ->where('pt.parameter_id', $param->id);
            if ($class) {
                $thrQuery->whereRaw('LOWER(pt.class_code) = ?', [strtolower($class)]);
            }
            $thrRow = $thrQuery
                ->orderByDesc('ws.is_current')
                ->orderBy('ws.priority')
                ->orderByRaw('pt.min_value IS NULL')
                ->orderByRaw('pt.max_value IS NULL')
                ->first(['pt.*', 'ws.code as standard_code', 'ws.is_current']);
            if (!$thrRow && $class) {
                // fallback WITHOUT class constraint
                $thrRow = DB::table('parameter_thresholds as pt')
                    ->leftJoin('wq_standards as ws', 'pt.standard_id', '=', 'ws.id')
                    ->where('pt.parameter_id', $param->id)
                    ->orderByDesc('ws.is_current')
                    ->orderBy('ws.priority')
                    ->orderByRaw('pt.min_value IS NULL')
                    ->orderByRaw('pt.max_value IS NULL')
                    ->first(['pt.*', 'ws.code as standard_code', 'ws.is_current']);
            }
            $thrMin = $thrRow->min_value ?? null;
            $thrMax = $thrRow->max_value ?? null;

            if (!$evalType) {
                // Derive from presence of min/max
                if ($thrMin != null && $thrMax != null) $evalType = 'range';
                elseif ($thrMin != null) $evalType = 'min';
                elseif ($thrMax != null) $evalType = 'max';
            } else {
                // If evalType explicitly set but corresponding threshold side missing,
                // attempt to flip to the available side (e.g., only min present but evalType='max')
                if ($evalType === 'min' && $thrMin === null && $thrMax !== null) {
                    $evalType = 'max';
                } elseif ($evalType === 'max' && $thrMax === null && $thrMin !== null) {
                    $evalType = 'min';
                }
            }

            if (count($sample) < $minN) {
                return response()->json([
                    'error' => 'insufficient_data',
                    'n' => count($sample),
                    'min_required' => $minN
                ], 422);
            }

            $autoAlt = 'two-sided';
            if ($evalType === 'min') {
                $autoAlt = $mode === 'compliance' ? 'less' : 'greater';
            } elseif ($evalType === 'max') {
                $autoAlt = $mode === 'compliance' ? 'greater' : 'less';
            }

            $result = null;
            if ($evalType === 'range') {
                if ($thrMin == null || $thrMax == null) {
                    return response()->json(['error' => 'Range evaluation requires both min and max'], 422);
                }
                $result = TTestService::tost($sample, $thrMin, $thrMax, $alpha);
            } else {
                // Determine comparison value (mu0)
                $mu0 = $evalType === 'min' ? $thrMin : $thrMax; // whichever applies
                // Allow manual override if provided
                if ($data['manual_mu0'] ?? null) {
                    $mu0 = (float)$data['manual_mu0'];
                }
                if ($mu0 === null) {
                    // As a last resort, if either side exists use it (useful for min-only or max-only thresholds)
                    $fallbackUsed = false;
                    if ($thrMin !== null) { $mu0 = $thrMin; $fallbackUsed = 'min'; }
                    elseif ($thrMax !== null) { $mu0 = $thrMax; $fallbackUsed = 'max'; }

                    if ($mu0 === null) {
                        return response()->json([
                            'error' => 'threshold_missing',
                            'message' => 'No threshold value available for this parameter/class and none supplied via manual_mu0',
                            'debug' => [
                                'class_requested' => $class,
                                'parameter_id' => $param->id,
                                'eval_type' => $evalType,
                                'found_any_threshold' => ($thrRow && ($thrRow->min_value !== null || $thrRow->max_value !== null)) ? true : false,
                                'threshold_row_sample' => $thrRow ? [
                                    'class_code' => $thrRow->class_code,
                                    'standard_code' => $thrRow->standard_code,
                                    'min_value' => $thrRow->min_value,
                                    'max_value' => $thrRow->max_value,
                                    'is_current_standard' => $thrRow->is_current
                                ] : null
                            ]
                        ], 422);
                    }
                    // if we fell back, include note in debug
                    if (!empty($fallbackUsed)) {
                        $fallbackNote = "used_available_{$fallbackUsed}";
                    } else {
                        $fallbackNote = null;
                    }
                }
                $result = TTestService::oneSample($sample, $mu0, $alpha, $autoAlt);
            }

            $result['sample_n'] = count($sample);
            $result['warn_low_n'] = count($sample) < $warnThreshold;
            $result['parameter_code'] = $data['parameter_code'];
            $result['mode'] = $mode;
            $result['evaluation_type'] = $evalType;
            $result['threshold_min'] = $thrMin;
            $result['threshold_max'] = $thrMax;
            $result['threshold_debug'] = [
                'class_used' => $thrRow->class_code ?? null,
                'requested_class' => $class,
                'standard_code' => $thrRow->standard_code ?? null,
                'min_value' => $thrMin,
                'max_value' => $thrMax,
                'fallback_note' => $fallbackNote ?? null,
            ];
            $result['aggregation'] = $aggregation;
            $result['interpretation_detail'] = $this->interpretOneSample($result, $evalType, $mode);
            return response()->json($result);
        }

        // two-sample
    $byLake = collect($rows)->groupBy('lake_id');
        $lakeIds = $data['lake_ids'];
    $sample1 = ($byLake[$lakeIds[0]] ?? collect())->pluck('agg_value')->filter(fn($v)=>is_numeric($v))->values()->all();
    $sample2 = ($byLake[$lakeIds[1]] ?? collect())->pluck('agg_value')->filter(fn($v)=>is_numeric($v))->values()->all();

        if (count($sample1) < $minN || count($sample2) < $minN) {
            return response()->json([
                'error' => 'insufficient_data',
                'n1' => count($sample1),
                'n2' => count($sample2),
                'min_required' => $minN
            ], 422);
        }

        $res = TTestService::twoSampleWelch($sample1, $sample2, $alpha, 'two-sided');
        $res['sample1_n'] = count($sample1);
        $res['sample2_n'] = count($sample2);
        $res['warn_low_n'] = (count($sample1) < $warnThreshold) || (count($sample2) < $warnThreshold);
        $res['parameter_code'] = $data['parameter_code'];
        $res['mode'] = $mode;
        $res['aggregation'] = $aggregation;
        $res['interpretation_detail'] = $this->interpretTwoSample($res);
        return response()->json($res);
    }

    private function interpretOneSample(array $r, ?string $evalType, string $mode): string
    {
        $mean = $r['mean'] ?? null; $mu0 = $r['mu0'] ?? null; $sig = $r['significant'] ?? false; $alt = $r['alternative'] ?? 'two-sided';
        if ($r['type'] === 'tost') {
            return $r['equivalent'] ? 'Mean parameter level statistically within the acceptable regulatory range.' : 'Unable to confirm the mean lies fully inside the required range.';
        }
        if ($evalType === 'min') {
            if ($mode === 'compliance') {
                if ($sig && $alt==='less') return 'Mean is statistically BELOW the minimum threshold (potential non-compliance).';
                if (!$sig && $alt==='less') return 'No statistical evidence the mean is below the minimum; compliance not disproven.';
            } else { // improvement
                if ($sig && $alt==='greater') return 'Mean is significantly ABOVE the minimum (improvement demonstrated).';
                if (!$sig && $alt==='greater') return 'Insufficient evidence that mean exceeds the minimum.';
            }
        } elseif ($evalType === 'max') {
            if ($mode === 'compliance') {
                if ($sig && $alt==='greater') return 'Mean exceeds the maximum limit (potential non-compliance).';
                if (!$sig && $alt==='greater') return 'No statistical evidence that mean exceeds the maximum; compliance not disproven.';
            } else {
                if ($sig && $alt==='less') return 'Mean is significantly BELOW the maximum (good performance).';
                if (!$sig && $alt==='less') return 'Insufficient evidence that mean is below the maximum.';
            }
        }
        // fallback generic
        return $sig ? 'Statistical difference detected.' : 'No statistical difference detected.';
    }

    private function interpretTwoSample(array $r): string
    {
        if (!isset($r['p_value'])) return '';
        if ($r['significant']) {
            $direction = ($r['mean1'] > $r['mean2']) ? 'first group higher' : 'second group higher';
            return 'Significant difference between groups (' . $direction . ').';
        }
        return 'No significant difference between the two group means.';
    }
}
