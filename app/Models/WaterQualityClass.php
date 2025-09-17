<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WaterQualityClass extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'code',
        'name',
        'notes',
    ];

    public function thresholds()
    {
        return $this->hasMany(ParameterThreshold::class, 'class_code', 'code');
    }

    public function sampleResults()
    {
        return $this->hasMany(SampleResult::class, 'evaluated_class_code', 'code');
    }
}
