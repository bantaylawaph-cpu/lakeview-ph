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

        if ($result->value === null || $parameter->evaluation_type === null) {
            return $this->markNotApplicable($result, $save, 'no_value_or_eval_type', $threshold);
        }

        $outcome = $this->compare($parameter->evaluation_type, (float) $result->value, $threshold->min_value, $threshold->max_value);

        if ($outcome === null) {
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
