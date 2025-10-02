<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParameterThreshold extends Model
{
    use HasFactory, \App\Support\Audit\Auditable;

    public $timestamps = false;

    protected $fillable = [
        'parameter_id',
        'class_code',
        'standard_id',
        'min_value',
        'max_value',
        'notes',
    ];

    protected $casts = [
        'min_value' => 'float',
        'max_value' => 'float',
    ];

    public function parameter()
    {
        return $this->belongsTo(Parameter::class);
    }

    public function waterQualityClass()
    {
        return $this->belongsTo(WaterQualityClass::class, 'class_code', 'code');
    }

    public function standard()
    {
        return $this->belongsTo(WqStandard::class, 'standard_id');
    }

    public function sampleResults()
    {
        return $this->hasMany(SampleResult::class, 'threshold_id');
    }
}
