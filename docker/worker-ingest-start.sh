#!/usr/bin/env bash
set -euo pipefail
cd /var/www/html

# Basic boot steps similar to web start (but no server)
echo "[worker] Clearing config cache (safe if not cached)"
php artisan config:clear || true

# Do not run migrations here to avoid race with web service
# echo "[worker] Migrations are managed by web service"

# Queue worker tuned for ingest queue
# --memory is a self-restart limit per process (MB); set below container limit
# --timeout should exceed the Job::$timeout (1800s)
QUEUE=${QUEUE:-ingest}
MEM_MB=${WORKER_MEMORY_MB:-3000}
TIMEOUT=${WORKER_TIMEOUT:-1900}
SLEEP=${WORKER_SLEEP:-3}
TRIES=${WORKER_TRIES:-1}
CONNECTION=${QUEUE_CONNECTION:-redis}

# If using DB queues initially, CONNECTION may be 'database'

echo "[worker] Starting queue:work on queue=$QUEUE connection=$CONNECTION"
exec php artisan queue:work "$CONNECTION" \
  --queue="$QUEUE" \
  --sleep="$SLEEP" \
  --tries="$TRIES" \
  --timeout="$TIMEOUT" \
  --memory="$MEM_MB"
