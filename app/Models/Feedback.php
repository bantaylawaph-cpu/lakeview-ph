<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Feedback extends Model
{
    protected $table = 'feedback';

    protected $fillable = [
        'user_id','tenant_id','title','message','category','status','metadata','admin_response','resolved_at',
        'is_guest','guest_name','guest_email','spam_score'
    ];

    protected $casts = [
        'metadata' => 'array',
        'resolved_at' => 'datetime',
        'is_guest' => 'boolean',
        'spam_score' => 'integer',
    ];

    public const STATUS_OPEN = 'open';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_WONT_FIX = 'wont_fix';
    public const ALL_STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_IN_PROGRESS,
        self::STATUS_RESOLVED,
        self::STATUS_WONT_FIX,
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function tenant(): BelongsTo { return $this->belongsTo(Tenant::class); }

    public function getSubmitterNameAttribute(): string
    {
        if ($this->is_guest) {
            return $this->guest_name ?: 'Guest';
        }
        return $this->user?->name ?? 'User';
    }
}
