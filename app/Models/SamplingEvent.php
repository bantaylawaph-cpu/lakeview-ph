<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SamplingEvent extends Model
{
    use HasFactory, \App\Support\Audit\Auditable;

    /**
     * The model should not manage created_at / updated_at timestamps
     * because the `sampling_events` table does not include those columns.
     *
     * @var bool
     */
    public $timestamps = false;


    protected $fillable = [
        'organization_id',
        'lake_id',
        'station_id',
        'applied_standard_id',
        'geom_point',
        'sampled_at',
        'sampler_name',
        'method',
        'weather',
        'notes',
        'status',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected $casts = [
        'sampled_at' => 'datetime',
        'status' => 'string',
    ];

    public function organization()
    {
        return $this->belongsTo(Tenant::class, 'organization_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function lake()
    {
        return $this->belongsTo(Lake::class);
    }

    public function station()
    {
        return $this->belongsTo(Station::class);
    }

    public function appliedStandard()
    {
        return $this->belongsTo(WqStandard::class, 'applied_standard_id');
    }

    public function results()
    {
        return $this->hasMany(SampleResult::class);
    }
}
