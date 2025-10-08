<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lake extends Model
{
    use HasFactory, \App\Support\Audit\Auditable;

    protected $fillable = [
        'watershed_id','name','alt_name','region','province','municipality',
        'surface_area_km2','elevation_m','mean_depth_m','class_code'
    ];

    // Cast location fields to array (will become JSON arrays after migration)
    protected $casts = [
        'region' => 'array',
        'province' => 'array',
        'municipality' => 'array',
    ];

    // Convenience accessors returning first item for backward compatibility
    public function getRegionNameAttribute()
    {
        $r = $this->region;
        return is_array($r) ? ($r[0] ?? null) : $r;
    }
    public function getProvinceNameAttribute()
    {
        $r = $this->province;
        return is_array($r) ? ($r[0] ?? null) : $r;
    }
    public function getMunicipalityNameAttribute()
    {
        $r = $this->municipality;
        return is_array($r) ? ($r[0] ?? null) : $r;
    }

    // A lake belongs to a watershed (nullable is okay)
    public function watershed()
    {
        return $this->belongsTo(Watershed::class, 'watershed_id', 'id');
        // If you want a non-null object even when missing:
        // return $this->belongsTo(Watershed::class, 'watershed_id', 'id')->withDefault();
    }

    public function layers()
    {
        return $this->morphMany(\App\Models\Layer::class, 'body');
    }
    
    public function activeLayer()
    {
        return $this->morphOne(\App\Models\Layer::class, 'body')->where('is_active', true);
    }

    public function waterQualityClass()
    {
        return $this->belongsTo(WaterQualityClass::class, 'class_code', 'code');
    }
}
