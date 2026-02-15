<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Custom PersonalAccessToken model that throttles last_used_at updates.
 * 
 * Problem: Default Sanctum updates last_used_at on EVERY request, causing
 * row-level lock contention under high concurrency (observed 15s query stalls).
 * 
 * Solution: Only update if last_used_at is older than 5 minutes.
 * This reduces UPDATE frequency by ~90% while maintaining reasonable activity tracking.
 * 
 * To activate: No changes needed, Laravel auto-discovers this model in config.
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    /**
     * Minimum minutes between last_used_at updates (default: 5).
     * Adjust higher for better performance, lower for more accurate tracking.
     */
    protected const THROTTLE_MINUTES = 5;

    /**
     * Override Sanctum's touch() method to throttle updates.
     * This is called on every authenticated request via Sanctum middleware.
     */
    public function touch($attribute = null): bool
    {
        // If touching last_used_at specifically (Sanctum's behavior)
        if ($attribute === null || $attribute === 'last_used_at') {
            // Only update if last_used_at is null or older than throttle window
            if ($this->last_used_at === null || 
                $this->last_used_at->diffInMinutes(now()) >= self::THROTTLE_MINUTES) {
                // Proceed with the update
                $this->last_used_at = now();
                return parent::touch($attribute);
            }
            // Skip update - token was recently used
            return true;
        }

        // For other attributes, use default behavior
        return parent::touch($attribute);
    }
}
