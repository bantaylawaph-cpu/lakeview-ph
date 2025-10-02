<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, SoftDeletes, \App\Support\Audit\Auditable;

    protected $fillable = ['name', 'type', 'phone', 'address', 'active', 'domain', 'contact_email', 'metadata', 'slug'];
    protected $casts = ['active' => 'boolean', 'metadata' => 'array'];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
