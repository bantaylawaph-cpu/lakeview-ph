<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['name','scope'];

    public const PUBLIC = 'public';
    public const CONTRIBUTOR = 'contributor';
    public const ORG_ADMIN = 'org_admin';
    public const SUPERADMIN = 'superadmin';

    public function scopeSystem($q) { return $q->where('scope', 'system'); }
    public function scopeTenant($q) { return $q->where('scope', 'tenant'); }
}
