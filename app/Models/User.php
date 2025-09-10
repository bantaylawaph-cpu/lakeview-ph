<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = ['name','email','password'];
    protected $hidden = ['password', 'remember_token'];

    public function memberships()
    {
        return $this->hasMany(UserTenant::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_tenants')
            ->withPivot(['tenant_id','is_active'])
            ->withTimestamps();
    }

    public function highestRoleName(): string
    {
        $order = ['superadmin'=>4,'org_admin'=>3,'contributor'=>2,'public'=>1];
        $best = 'public'; $rank = 0;

        foreach ($this->roles as $role) {
            $r = $order[$role->name] ?? 0;
            if ($r > $rank) { $rank = $r; $best = $role->name; }
        }
        return $best;
    }
}