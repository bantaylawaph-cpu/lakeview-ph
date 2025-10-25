#!/usr/bin/env bash
set -e

# Move to app root (Dockerfile already sets WORKDIR, but be safe)
cd /var/www/html

echo "[start] Clearing config cache (safe if not cached)"
php artisan config:clear || true

echo "[start] Running database migrations (idempotent)"
php artisan migrate --force || true

echo "[start] Starting Apache"
exec apache2-foreground
