<?php

namespace App\Services;

use App\Models\Parameter;
use App\Models\ParameterThreshold;
use App\Models\SampleResult;
use App\Models\SamplingEvent;
use App\Models\WqStandard;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;

class WaterQualityEvaluator
{
    public function evaluate(SampleResult $result, bool $save = true): SampleResult
    {
        $result->loadMissing(['parameter', 'samplingEvent.lake', 'samplingEvent.appliedStandard']);

        $event = $result->samplingEvent;
        $parameter = $result->parameter;

        if (!$event || !$parameter) {
            return $this->markNotApplicable($result, $save, 'missing_event_or_parameter');
        }

        $lakeClass = $event->lake?->class_code;
        if (!$lakeClass) {
            return $this->markNotApplicable($result, $save, 'no_lake_class');
        }

        $standard = $this->resolveStandard($event);
    $threshold = $this->resolveThreshold($parameter->id, $lakeClass, $standard?->id);

        if (!$threshold) {
            return $this->markNotApplicable($result, $save, 'no_threshold');
        }

        // Normalize evaluation type to be robust against casing/spacing/synonyms
        $rawEvalType = $parameter->evaluation_type ?? null;
        $evalType = null;
        if ($rawEvalType !== null) {
            $s = strtolower(trim((string) $rawEvalType));
            // strip non-alphanumeric for matching (e.g. '>=', 'Less-Than' -> 'lessthan')
            $key = preg_replace('/[^a-z0-9]/', '', $s);
            // map common synonyms to canonical types
            $map = [
                'max' => 'max', 'maximum' => 'max', 'upper' => 'max', 'upperlimit' => 'max', 'lessthanorequal' => 'max', 'lessthan' => 'max', 'lte' => 'max', '>' => 'max', 'gt' => 'max',
                'min' => 'min', 'minimum' => 'min', 'lower' => 'min', 'lowerlimit' => 'min', 'greaterthanorequal' => 'min', 'greaterthan' => 'min', 'gte' => 'min', '<' => 'min', 'lt' => 'min',
                'range' => 'range', 'between' => 'range',
            ];
            if (isset($map[$key])) {
                $evalType = $map[$key];
            } elseif (isset($map[$s])) {
                $evalType = $map[$s];
            } else {
                // fallback: use the simple trimmed lowercase if it matches known canonical types
                if (in_array($s, ['min','max','range'], true)) {
                    $evalType = $s;
                }
            }
        }

        if ($result->value === null || $evalType === null) {
            Log::debug('No value or unknown evaluation_type', [
                'sample_result_id' => $result->id,
                'parameter_id' => $parameter->id,
                'raw_evaluation_type' => $parameter->evaluation_type,
                'normalized_evaluation_type' => $evalType,
                'value' => $result->value,
                'threshold_id' => $threshold?->id,
                'threshold_min' => $threshold?->min_value,
                'threshold_max' => $threshold?->max_value,
            ]);

            return $this->markNotApplicable($result, $save, 'no_value_or_eval_type', $threshold);
        }

        $outcome = $this->compare($evalType, (float) $result->value, $threshold->min_value, $threshold->max_value);

        if ($outcome === null) {
            // Log helpful debug info to aid fixing threshold/parameter data
            Log::debug('Evaluation incomplete', [
                'sample_result_id' => $result->id,
                'parameter_id' => $parameter->id,
                'parameter_code' => $parameter->code ?? null,
                'parameter_evaluation_type' => $parameter->evaluation_type,
                'normalized_eval_type' => $evalType,
                'value' => $result->value,
                'threshold_min' => $threshold?->min_value,
                'threshold_max' => $threshold?->max_value,
                'threshold_id' => $threshold?->id,
            ]);

            return $this->markNotApplicable($result, $save, 'incomplete_threshold', $threshold);
        }

        $result->evaluated_class_code = $lakeClass;
        $result->threshold_id = $threshold->id;
        $result->pass_fail = $outcome ? 'pass' : 'fail';
        $result->evaluated_at = CarbonImmutable::now();

        if ($save) {
            $result->save();
        }

        return $result;
    }

    protected function resolveStandard(SamplingEvent $event): ?WqStandard
    {
        if ($event->relationLoaded('appliedStandard') && $event->appliedStandard) {
            return $event->appliedStandard;
        }

        if ($event->applied_standard_id) {
            return WqStandard::find($event->applied_standard_id);
        }

        $current = WqStandard::where('is_current', true)
            ->orderByDesc('priority')
            ->orderByDesc('id')
            ->first();

        if ($current) {
            return $current;
        }

        return WqStandard::orderByDesc('priority')->orderByDesc('id')->first();
    }

    protected function resolveThreshold(int $parameterId, string $classCode, ?int $standardId): ?ParameterThreshold
    {
        $query = ParameterThreshold::where('parameter_id', $parameterId)
            ->where('class_code', $classCode);

        if ($standardId) {
            $threshold = (clone $query)->where('standard_id', $standardId)->first();
            if ($threshold) {
                return $threshold;
            }
        }

        return $query->whereNull('standard_id')->first();
    }

    protected function compare(string $evaluationType, float $value, ?float $min, ?float $max): ?bool
    {
        return match ($evaluationType) {
            'max' => $max !== null ? $value <= $max : null,
            'min' => $min !== null ? $value >= $min : null,
            'range' => $min !== null && $max !== null ? ($value >= $min && $value <= $max) : null,
            default => null,
        };
    }

    protected function markNotApplicable(SampleResult $result, bool $save, string $reason, ?ParameterThreshold $threshold = null): SampleResult
    {
        $result->pass_fail = 'not_applicable';
        $result->evaluated_at = CarbonImmutable::now();
        $result->evaluated_class_code = $threshold?->class_code;
        $result->threshold_id = $threshold?->id;

        if ($save) {
            $result->save();
        }

        Log::debug('SampleResult evaluation skipped', [
            'sample_result_id' => $result->id,
            'reason' => $reason,
        ]);

        return $result;
    }
}
