#!/usr/bin/env bash
set -e

# Move to app root (Dockerfile already sets WORKDIR, but be safe)
cd /var/www/html

echo "[start] Clearing caches (config, app)"
# Full clear sequence to avoid stale env/driver after redeploy
php artisan config:clear || true
php artisan cache:clear || true

echo "[start] Running database migrations (idempotent)"
php artisan migrate --force || true

echo "[start] Ensuring storage symlink exists (idempotent)"
php artisan storage:link || true

# Cache framework artifacts for performance (after successful migrations)
echo "[start] Caching config, routes, and views"
# Rebuild config cache after clears/migrations so new env vars take effect
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Optionally start an in-process queue worker so Web+Worker share the same filesystem
if [ "${RUN_QUEUE_IN_WEB:-false}" = "true" ]; then
	echo "[start] Starting in-process queue worker (RUN_QUEUE_IN_WEB=true)"
	QUEUE_CONN=${QUEUE_CONNECTION:-database}
	QNAME=${DB_QUEUE:-${REDIS_QUEUE:-ingest}}
	MEM_MB=${WORKER_MEMORY_MB:-1024}
	TIMEOUT=${WORKER_TIMEOUT:-1900}
	SLEEP=${WORKER_SLEEP:-3}
	TRIES=${WORKER_TRIES:-1}
	php artisan queue:work "$QUEUE_CONN" --queue="$QNAME" --sleep="$SLEEP" --tries="$TRIES" --timeout="$TIMEOUT" --memory="$MEM_MB" &
fi

echo "[start] Starting Apache"
exec apache2-foreground
