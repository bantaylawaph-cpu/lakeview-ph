<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Parameter extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'code',
        'name',
        'unit',
        'category',
        'group',
        'data_type',
        'evaluation_type',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function aliases()
    {
        return $this->hasMany(ParameterAlias::class);
    }

    public function thresholds()
    {
        return $this->hasMany(ParameterThreshold::class);
    }

    public function sampleResults()
    {
        return $this->hasMany(SampleResult::class);
    }
}
