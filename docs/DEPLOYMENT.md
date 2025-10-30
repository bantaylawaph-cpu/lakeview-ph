# LakeView-PH Production Deployment Guide

This guide documents a full production deployment on Render (Docker) with Supabase (Postgres), including Web + Worker + Cron, persistent storage, SMTP, and optional ingestion tooling.

## Architecture overview

- App: Laravel 12 (PHP 8.2) + Vite (React)
- DB: Supabase Postgres (direct connections on 5432)
- Services on Render (paid tier recommended):
  - Web: serves app, runs migrations on start, handles file uploads (persistent disk)
  - Worker: runs `queue:work` with database-backed queues
  - Cron: runs `schedule:run` every minute (only needed if you add schedules)
  - Optional: Redis service for cache/session/queue if you choose to move off database-backed queues

## Prerequisites

- GitHub repo connected to Render
- Dockerfile at repo root (exists)
- Startup script `docker/start.sh` (exists) — runs config:clear and migrations; add `storage:link` step for file uploads
- Supabase project with required extensions

## Supabase configuration

Detailed step-by-step DB setup, data import, and troubleshooting are in `docs/DB_SUPABASE_MIGRATION.md`.

1) Create a Supabase project and collect DB creds:
   - Host: `db.<PROJECT_HASH>.supabase.co`
   - Port: `5432`
   - DB: `postgres`
   - User: `postgres`
   - Password: your project password
2) Extensions (SQL editor):
   ```sql
   create extension if not exists postgis;
   create extension if not exists vector;
   -- Optional for raster ingestion workflows (may require paid):
   -- create extension if not exists postgis_raster;
   ```
3) Build DB_URL (encode + as %2B):
   `postgresql://postgres:<PASSWORD>@db.<PROJECT_HASH>.supabase.co:5432/postgres?sslmode=require`

## Docker image requirements (production)

The included image serves the app and runs migrations. If you plan to use raster ingestion (`IngestPopulationRaster` job), add client tools:

- Add Postgres client and PostGIS utilities (package names vary by Debian release):
  - `postgresql-client`
  - `postgis` (provides raster2pgsql)
  - Optional: `gdal-bin` for broader geospatial tooling

Example layer (for your Dockerfile’s runtime stage):

```Dockerfile
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    postgresql-client postgis gdal-bin \
 && rm -rf /var/lib/apt/lists/*
```

Note: Verify `raster2pgsql -v` in a local build before deploying. Keep DB_URL on port 5432 with `sslmode=require`.

## Render services (recommended configuration)

You can configure via UI or a `render.yaml`. Below covers both.

### Important: Build context and Docker ignore

- In Render, set Root Directory to `lakeview-ph` and Docker Build Context Directory to `lakeview-ph`.
- This prevents uploading large non-app folders (e.g., backups) and keeps builds fast/stable.
- The project includes `lakeview-ph/.dockerignore` and a top-level `.dockerignore` to trim the context. Do not ignore `composer.lock` or `Dockerfile` in the app context; they’re required for deterministic and cached builds.

### Web service

- Runtime: Docker
- Instance type: Start with a small paid instance; scale based on traffic
- Health Check Path: `/robots.txt`
- Persistent Disk: attach to `/var/www/html/storage` (10–50 GB+ based on uploads)
- Start script runs:
  - `php artisan config:clear`
  - `php artisan migrate --force`
  - `php artisan storage:link` (idempotent; add to `docker/start.sh`)
  - starts Apache
- Environment (see “Environment variables” section)

### Worker service

- Same Docker image
- Start command:
  `php artisan queue:work --sleep=3 --tries=1 --max-time=3600`
- Scale: 1+ instances; increase as background load grows
- Ensure queue tables exist (see “First deploy checklist”)

### Cron job (only if you add schedules)

- Command: `php artisan schedule:run`
- Frequency: every minute (*/1)

### Optional: Redis cache/session/queue

- You can start with database-backed queues/cache/session
- For higher scale, provision a managed Redis and set `REDIS_URL`

## Environment variables (production)

Set on Web, Worker, and Cron as applicable.

```env
# Core
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.tld
ASSET_URL=https://your-domain.tld
APP_KEY=base64:PASTE_GENERATED_KEY

# Database
DB_CONNECTION=pgsql
DB_URL=postgresql://postgres:YOUR%2BPASSWORD@db.<PROJECT_HASH>.supabase.co:5432/postgres?sslmode=require

# Queues / Cache / Session
QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database
SESSION_LIFETIME=120

# Filesystems
FILESYSTEM_DISK=local

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=YOUR_SENDGRID_API_KEY
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=no-reply@your-domain.tld
MAIL_FROM_NAME="LakeView"

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=info
```

Notes:
- Generate `APP_KEY` locally:
  `php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"`
- If you opt for Redis: set `CACHE_STORE=redis`, `SESSION_DRIVER=redis`, provide `REDIS_URL=redis://:password@host:6379`

## First deploy checklist

1) Migrations and queue tables
   - Ensure the `jobs` and `failed_jobs` tables exist. If not present, generate locally and commit:
     - `php artisan queue:table` and `php artisan queue:failed-table`
     - Run `php artisan migrate` locally, commit the new migration files
2) Storage symlink
   - Add `php artisan storage:link` to `docker/start.sh` so it runs on every boot (safe if already linked)
3) Persistent disk
   - Attach disk to Web at `/var/www/html/storage`
   - Ensure ownership/permissions allow web user to write (Apache runs as `www-data` in Debian images)
4) Domains/HTTPS
   - Add your custom domain in Render, switch `APP_URL` and `ASSET_URL` to https domain
5) Deploy
   - Clear build cache & deploy; migrations will run automatically on start

## Verifications

- App loads over https with no mixed-content warnings
- API basic check (example): `GET /api/lakes` returns JSON (likely `[]` initially)
- Supabase SQL:
  - `SELECT to_regclass('public.migrations');` → `migrations`
  - `SELECT count(*) FROM migrations;` → > 0
  - If using database queues: `SELECT count(*) FROM jobs;` (should exist, possibly 0 rows)

## Data migration (after first deploy)

Prefer data-only restores after migrations.

Custom-format backup (`.backup`/`.dump`) from Windows PowerShell:

```powershell
$env:PGPASSWORD = "YOUR_SUPABASE_DB_PASSWORD"
pg_restore `
  --verbose `
  --no-owner `
  --no-acl `
  --data-only `
  --disable-triggers `
  -h db.<PROJECT_HASH>.supabase.co `
  -p 5432 `
  -U postgres `
  -d postgres `
  "D:\\path\\to\\backup.backup" 2> "D:\\path\\to\\restore_errors.log"
```

Tips:
- Enable `postgis` and `vector` before restoring any data that references them
- Use `-t public.table_name` to target specific tables

## Observability & operations

- Logs: Render build/runtime logs + `storage/logs/laravel.log`
- Health check: `/robots.txt`
- 500s on auth or DB access often mean migrations pending or DB_URL/SSL mismatch
- Slow queries: consider Postgres EXPLAIN, indexes, or moving cache/session to Redis

## Disaster recovery

- Supabase automated backups (plan-dependent); validate retention meets your needs
- Optional: periodic `pg_dump` data-only exports to cloud storage
- Keep infrastructure as code (`render.yaml`) for quick redeploys

## render.yaml (example)

You can codify the setup below. Adjust instance types, disk sizes, and envs.

```yaml
services:
  - type: web
    name: lakeview-web
    runtime: docker
    plan: starter
    autoDeploy: true
    envVars:
      - key: APP_ENV
        value: production
      # ... add the rest from the env block above
    healthCheckPath: /robots.txt
    disk:
      name: storage
      mountPath: /var/www/html/storage
      sizeGB: 20

  - type: worker
    name: lakeview-worker
    runtime: docker
    plan: starter
    autoDeploy: true
    startCommand: php artisan queue:work --sleep=3 --tries=1 --max-time=3600
    envVars:
      - key: APP_ENV
        value: production
      # mirror DB and other shared envs

  - type: cron
    name: lakeview-cron
    runtime: docker
    schedule: "*/1 * * * *"
    startCommand: php artisan schedule:run
    envVars:
      - key: APP_ENV
        value: production
      # mirror DB and other shared envs
```

## Appendix: smoke test (free plan)

For a minimal smoke test on the free plan, deploy only the Web service with:

- `QUEUE_CONNECTION=sync`
- No persistent disk
- `MAIL_MAILER=log`
- Set both `APP_URL` and `ASSET_URL` to the Render URL (https)

Migrations are auto-run by `docker/start.sh` on container start.
