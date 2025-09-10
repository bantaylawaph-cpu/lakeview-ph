<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Layer extends Model
{
    protected $table = 'layers';

    protected $fillable = [
        'body_type','body_id','uploaded_by',
        'name','type','category','srid',
        'visibility','is_active','status','version','notes',
        'source_type','file_hash','file_size_bytes','metadata',
        // 'geom','bbox','area_km2' are managed via PostGIS/trigger; leave out of mass-assign by default
    ];

    protected $casts = [
        'is_active'        => 'boolean',
        'file_size_bytes'  => 'integer',
        'version'          => 'integer',
        'metadata'         => 'array',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    // Polymorphic parent (Lake or Watershed, and future bodies)
    public function body(): MorphTo
    {
        return $this->morphTo();
    }

    // Convenience: scope active/public
    public function scopeActive($q)   { return $q->where('is_active', true); }
    public function scopePublic($q)   { return $q->where('visibility', 'public'); }
    public function scopeFor($q, string $type, int $id) { return $q->where(['body_type'=>$type,'body_id'=>$id]); }

    // Tip: when returning to the frontend map, select GeoJSON from the DB:
    // Layer::select('*')->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')->get();
}
