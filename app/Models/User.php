<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'tenant_id',
        'is_active'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    // Convenience
    public function isSuperAdmin(): bool
    {
        return ($this->role?->name) === Role::SUPERADMIN;
    }

    public function isOrgAdmin(): bool
    {
        return ($this->role?->name) === Role::ORG_ADMIN;
    }

    public function isContributor(): bool
    {
        return ($this->role?->name) === Role::CONTRIBUTOR;
    }

    public function highestRoleName(): string
    {
        return $this->role?->name ?? Role::PUBLIC;
    }

    public function hasRole(string $name): bool
    {
        return $this->role?->name === $name;
    }

    protected static function booted()
    {
        static::saving(function (User $user) {
            // Enforce tenant/role pairing (secondary to DB trigger)
            $roleName = $user->role?->name;
            if (in_array($roleName, [Role::CONTRIBUTOR, Role::ORG_ADMIN]) && !$user->tenant_id) {
                throw new \RuntimeException('tenant_id is required for tenant-scoped role.');
            }
            if (in_array($roleName, [Role::SUPERADMIN, Role::PUBLIC]) && $user->tenant_id) {
                // Allow superadmin to temporarily switch? Business rule says must be null.
                throw new \RuntimeException('tenant_id must be null for system role.');
            }
        });
    }
}
