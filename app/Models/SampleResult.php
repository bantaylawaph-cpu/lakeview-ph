<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SampleResult extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'sampling_event_id',
        'parameter_id',
        'value',
        'unit',
        'depth_m',
        'evaluated_class_code',
        'threshold_id',
        'pass_fail',
        'evaluated_at',
        'remarks',
    ];

    protected $casts = [
        'value' => 'float',
        'depth_m' => 'float',
        'evaluated_at' => 'datetime',
    ];

    public function samplingEvent()
    {
        return $this->belongsTo(SamplingEvent::class);
    }

    public function parameter()
    {
        return $this->belongsTo(Parameter::class);
    }

    public function threshold()
    {
        return $this->belongsTo(ParameterThreshold::class, 'threshold_id');
    }

    public function evaluatedClass()
    {
        return $this->belongsTo(WaterQualityClass::class, 'evaluated_class_code', 'code');
    }
}
