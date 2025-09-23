<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use SoftDeletes;

    protected $fillable = ['name','type','phone','address','active','domain','contact_email','metadata','slug'];
    protected $casts = ['active' => 'boolean', 'metadata' => 'array'];

    public function memberships() { return $this->hasMany(UserTenant::class); }
    public function users() {
        return $this->belongsToMany(User::class, 'user_tenants')
            ->withPivot(['role_id','is_active'])
            ->withTimestamps();
    }
}
