<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lake extends Model
{
    use HasFactory, \App\Support\Audit\Auditable;

    protected $fillable = [
        'watershed_id','name','alt_name','region','province','municipality',
        'surface_area_km2','elevation_m','mean_depth_m','class_code','coordinates',
        'flows_status'
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

    public function flows()
    {
        return $this->hasMany(LakeFlow::class);
    }

    /**
     * Recompute flows_status from actual relationships.
     * Will set to 'present' if any flows exist; otherwise remains as-is unless optional $setUnknownWhenEmpty=true.
     */
    public function recomputeFlowsStatus(bool $setUnknownWhenEmpty = false): void
    {
        $count = $this->flows()->count();
        if ($count > 0) {
            $this->flows_status = 'present';
            $this->saveQuietly();
        } elseif ($setUnknownWhenEmpty && $this->flows_status !== 'none') {
            $this->flows_status = 'unknown';
            $this->saveQuietly();
        }
    }

    /**
     * Get coordinates as [lat, lon] array (null if missing)
     */
    public function getLatLonAttribute()
    {
        // Raw geometry access requires custom select; fallback to querying directly if relation loaded
        if (!array_key_exists('coordinates', $this->attributes) || !$this->attributes['coordinates']) {
            return null;
        }
        try {
            $wkt = $this->getConnection()->selectOne('SELECT ST_AsText(?) as wkt', [$this->attributes['coordinates']]);
            if (!$wkt || !isset($wkt->wkt)) return null;
            if (preg_match('/POINT\((-?\d+\.?\d*) (-?\d+\.?\d*)\)/', $wkt->wkt, $m)) {
                // WKT is lon lat order
                return [ (float)$m[2], (float)$m[1] ];
            }
        } catch (\Throwable $e) { /* ignore */ }
        return null;
    }

    /** Return coordinates GeoJSON (Point) or null */
    public function getCoordinatesGeojsonAttribute()
    {
        if (!array_key_exists('coordinates', $this->attributes) || !$this->attributes['coordinates']) return null;
        try {
            $row = $this->getConnection()->selectOne('SELECT ST_AsGeoJSON(?) as gj', [$this->attributes['coordinates']]);
            return $row?->gj ?? null;
        } catch (\Throwable $e) { return null; }
    }
}
