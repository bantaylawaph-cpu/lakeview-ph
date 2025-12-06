<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class Layer extends Model
{
    use HasFactory, \App\Support\Audit\Auditable;
    protected $table = 'layers';

    public const VIS_PUBLIC = 'public';
    public const VIS_ADMIN  = 'admin';

    protected $fillable = [
        'body_type','body_id','uploaded_by',
        'name','srid',
        'visibility','is_downloadable','notes',
        'source_type',    ];

    protected $casts = [
        'body_id'   => 'integer',
        'srid'      => 'integer',
        'is_downloadable' => 'string',
        'created_at'=> 'datetime',
        'updated_at'=> 'datetime',
    ];

    public function setIsDownloadableAttribute($value): void
    {
        $bool = filter_var($value, FILTER_VALIDATE_BOOLEAN);
        $this->attributes['is_downloadable'] = $bool ? 'true' : 'false';
    }

    public function getIsDownloadableAttribute($value): bool
    {
        if (is_bool($value)) return $value;
        if (is_int($value)) return $value === 1;
        if (is_string($value)) {
            $v = strtolower($value);
            return in_array($v, ['1','true','t','yes','on'], true);
        }
        return (bool) $value;
    }

    /* -------------------------- Relationships -------------------------- */

    // Polymorphic parent (Lake or Watershed, and future bodies)
    public function body(): MorphTo
    {
        return $this->morphTo();
    }
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function scopePublic($q)   { return $q->where('visibility', self::VIS_PUBLIC); }
    public function scopeFor($q, string $type, int $id) { return $q->where(['body_type'=>$type,'body_id'=>$id]); }

    public function organizationName(): string
    {
        if (!$this->uploaded_by) {
            return 'LakeView';
        }

        $row = DB::table('users')
            ->leftJoin('tenants', 'tenants.id', '=', 'users.tenant_id')
            ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->where('users.id', $this->uploaded_by)
            ->select('tenants.name AS tname', 'roles.scope AS rscope')
            ->first();

        if ($row && $row->rscope === 'tenant' && $row->tname) {
            return $row->tname;
        }

        return 'LakeView';
    }
}
