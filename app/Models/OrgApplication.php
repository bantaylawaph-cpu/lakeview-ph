<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrgApplication extends Model
{
    use HasFactory, \App\Support\Audit\Auditable;

    protected $fillable = ['user_id', 'tenant_id', 'desired_role', 'status', 'reviewer_notes', 'accepted_at', 'archived_at', 'archived_reason'];

    protected $casts = [
        'accepted_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
