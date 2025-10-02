<?php
namespace App\Support\Audit;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

trait Auditable
{
    public static function bootAuditable(): void
    {
        // Default to enabled=true if config key missing (e.g. stale config cache before audit.php existed)
        if (!Config::get('audit.enabled', true)) {
            return; // short circuit when explicitly disabled
        }

        static::created(function (Model $model) { self::auditEvent($model, 'created'); });
        static::updated(function (Model $model) { self::auditEvent($model, 'updated'); });
        static::deleted(function (Model $model) { self::auditEvent($model, $model->forceDeleting ?? false ? 'force_deleted' : 'deleted'); });
        if (method_exists(static::class, 'restored')) {
            static::restored(function (Model $model) { self::auditEvent($model, 'restored'); });
        }
    }

    protected static function auditEvent(Model $model, string $action): void
    {
        try {
            $conf = Config::get('audit');
            $modelClass = get_class($model);
            $modelConf = $conf['models'][$modelClass] ?? null;
            if ($modelConf === null) { return; }

            // Ensure auth user resolved after sanctum middleware (lazy hydration)
            \App\Support\Audit\AuditContext::hydrateFromAuthIfMissing();

            $exclude = array_unique(array_merge($conf['global_exclude'] ?? [], $modelConf['exclude'] ?? []));
            $attrs = $model->getAttributes();
            // Filter & clamp
            $filtered = [];
            foreach ($attrs as $k => $v) {
                if (in_array($k, $exclude, true)) { continue; }
                if (is_string($v) && strlen($v) > ($conf['max_column_length'] ?? 15000)) {
                    $filtered[$k] = substr($v, 0, ($conf['max_column_length'] ?? 15000));
                } else {
                    $filtered[$k] = $v;
                }
            }

            $before = null; $after = null; $diffKeys = [];
            if ($action === 'created' || $action === 'restored') {
                $after = $filtered;
                $diffKeys = array_keys($after);
            } elseif ($action === 'deleted' || $action === 'force_deleted') {
                $before = $filtered;
                $diffKeys = array_keys($before);
            } elseif ($action === 'updated') {
                $dirty = $model->getChanges();
                foreach ($dirty as $k => $v) {
                    if (in_array($k, $exclude, true)) { continue; }
                    $before[$k] = $model->getOriginal($k);
                    $after[$k] = $v;
                    $diffKeys[] = $k;
                }
                if (empty($diffKeys)) { return; }
            }

            $tenantId = self::resolveTenantId($model);
            $actorId = AuditContext::actorId();
            // Fallback: in some execution paths auth()->user() may still be null while request()->user() is set
            if ($actorId === null) {
                try {
                    $reqUser = request()->user();
                    if ($reqUser) { $actorId = $reqUser->id; }
                } catch (\Throwable $e) {
                    // ignore; will remain null (system actor)
                }
            }

            $hashBase = json_encode([
                $modelClass, (string)$model->getKey(), $action, $before, $after, $tenantId, $actorId
            ]);
            $hash = hash('sha256', $hashBase);

            DB::table('audit_logs')->insert([
                'event_at' => now(),
                'actor_id' => $actorId,
                'tenant_id' => $tenantId,
                'model_type' => $modelClass,
                'model_id' => (string)$model->getKey(),
                'action' => $action,
                'request_id' => AuditContext::requestId(),
                'ip_address' => $conf['capture_ip'] ? AuditContext::ip() : null,
                'user_agent' => $conf['capture_user_agent'] ? request()->userAgent() : null,
                'before' => $before ? json_encode($before) : null,
                'after' => $after ? json_encode($after) : null,
                'diff_keys' => json_encode($diffKeys),
                'meta' => null,
                'hash' => $hash,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Audit failed: ' . $e->getMessage(), ['ex' => $e]);
        }
    }

    protected static function resolveTenantId(Model $model): ?int
    {
        // Priority: model attribute -> relation -> actor context
        if (isset($model->tenant_id)) { return $model->tenant_id ?: null; }
        if (method_exists($model, 'tenant')) {
            try {
                $rel = $model->tenant();
                if ($rel && $rel->getResults()) { return $rel->getResults()->id ?? null; }
            } catch (\Throwable) { /* ignore */ }
        }
        return AuditContext::tenantId();
    }
}
