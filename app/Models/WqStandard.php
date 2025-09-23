<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WqStandard extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'code',
        'name',
        'is_current',
        'priority',
        'notes',
    ];

    protected $casts = [
        'is_current' => 'boolean',
    ];

    public function thresholds()
    {
        return $this->hasMany(ParameterThreshold::class, 'standard_id');
    }

    public function samplingEvents()
    {
        return $this->hasMany(SamplingEvent::class, 'applied_standard_id');
    }
}
