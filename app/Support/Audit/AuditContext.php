<?php
namespace App\Support\Audit;

use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

class AuditContext
{
    private static ?string $requestId = null;
    private static ?int $actorId = null;
    private static ?int $tenantId = null;
    private static ?string $ip = null;
    private static array $local = [];

    public static function bootstrap(?int $actorId, ?int $tenantId): void
    {
        self::$requestId = (string) Str::uuid();
        self::$actorId = $actorId;
        self::$tenantId = $tenantId;
        self::$ip = Request::ip();
        self::$local = [];
    }

    public static function requestId(): ?string { return self::$requestId; }
    public static function actorId(): ?int { return self::$actorId; }
    public static function tenantId(): ?int { return self::$tenantId; }
    public static function ip(): ?string { return self::$ip; }

    public static function put(string $key, mixed $value): void { self::$local[$key] = $value; }
    public static function get(string $key, mixed $default=null): mixed { return self::$local[$key] ?? $default; }

    /**
     * Lazily hydrate actor & tenant from the current authenticated user if not already set.
     * This covers the case where the global middleware executes before auth:sanctum.
     */
    public static function hydrateFromAuthIfMissing(): void
    {
        if (self::$actorId === null) {
            try {
                $u = auth()->user();
                if ($u) {
                    self::$actorId  = $u->id;
                    // Only override tenant if we did not previously capture one
                    if (self::$tenantId === null) {
                        self::$tenantId = $u->tenant_id ?? null;
                    }
                }
            } catch (\Throwable) {
                // ignore silently; context remains system/null
            }
        }
    }
}
