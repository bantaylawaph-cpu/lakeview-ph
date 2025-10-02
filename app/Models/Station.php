<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Station extends Model
{
    use HasFactory, \App\Support\Audit\Auditable;

    /**
     * Stations table is managed without Laravel's automatic timestamps.
     * Disable Eloquent timestamps to avoid inserting `created_at`/`updated_at`.
     */
    public $timestamps = false;

    protected $fillable = [
        'organization_id',
        'lake_id',
        'name',
        'description',
        'geom_point',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function organization()
    {
        return $this->belongsTo(Tenant::class, 'organization_id');
    }

    public function lake()
    {
        return $this->belongsTo(Lake::class);
    }

    public function samplingEvents()
    {
        return $this->hasMany(SamplingEvent::class);
    }
}
