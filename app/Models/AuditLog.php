<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false; // using event_at only
    protected $fillable = [];
    protected $casts = [
        'before' => 'array',
        'after' => 'array',
        'diff_keys' => 'array',
        'meta' => 'array',
        'event_at' => 'datetime',
    ];

    protected $table = 'audit_logs';

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
