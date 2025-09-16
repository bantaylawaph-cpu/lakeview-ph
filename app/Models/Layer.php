<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class Layer extends Model
{
    protected $table = 'layers';

    public const VIS_PUBLIC = 'public';
    public const VIS_ADMIN  = 'admin';

    protected $fillable = [
        'body_type','body_id','uploaded_by',
        'name','type','category','srid',
        'visibility','is_active','status','version','notes',
        'source_type',
        // 'geom','bbox','area_km2' are managed via PostGIS/trigger; leave out of mass-assign by default
    ];

    protected $casts = [
        'body_id'   => 'integer',
        'srid'      => 'integer',
        'is_active' => 'boolean',
        'version'   => 'integer',
        'created_at'=> 'datetime',
        'updated_at'=> 'datetime',
    ];

    /* -------------------------- Relationships -------------------------- */

    // Polymorphic parent (Lake or Watershed, and future bodies)
    public function body(): MorphTo
    {
        return $this->morphTo();
    }

    // User who uploaded the layer
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /* -------------------------- Scopes -------------------------- */

    public function scopeActive($q)   { return $q->where('is_active', true); }
    public function scopePublic($q)   { return $q->where('visibility', self::VIS_PUBLIC); }
    public function scopeFor($q, string $type, int $id) { return $q->where(['body_type'=>$type,'body_id'=>$id]); }

    /* -------------------------- Helpers -------------------------- */

    /**
     * Convenience helper to compute the organization label for UI use.
     * Mirrors the SQL used in controllers; returns "LakeView" when uploader is superadmin or no tenant.
     * This method does not affect JSON unless you explicitly call/append it.
     */
    public function organizationName(): string
    {
        if (!$this->uploaded_by) {
            return 'LakeView';
        }

        $name = DB::table('user_tenants AS ut')
            ->join('roles AS r', 'r.id', '=', 'ut.role_id')
            ->join('tenants', 'tenants.id', '=', 'ut.tenant_id')
            ->where('ut.user_id', $this->uploaded_by)
            ->where('ut.is_active', true)
            ->where('r.name', 'org_admin')
            ->orderByRaw('COALESCE(ut.joined_at, ut.created_at) DESC')
            ->limit(1)
            ->value('tenants.name');

        return $name ?: 'LakeView';
    }

    // Tip: when returning to the frontend map, select GeoJSON from the DB:
    // Layer::select('*')->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')->get();
}
