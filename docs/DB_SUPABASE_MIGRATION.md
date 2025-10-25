# Supabase Database Setup and Import Guide

This guide documents exactly what we did to move the database to a new Supabase project for smoke testing: enable required extensions, create the schema via Laravel migrations, import data (data-only), align sequences, and verify.

## Prerequisites

- Supabase project created (Postgres connection details available)
- Postgres client tools installed (pg_restore, psql)
  - Check with: `pg_restore --version` and `psql --version`
- Your backup file path (custom-format `.backup`/`.dump` preferred; plain `.sql` also supported)

Connection details you’ll need:
- Host: `db.<PROJECT_HASH>.supabase.co`
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: your Supabase DB password

Notes:
- For application DB_URL you must use `?sslmode=require` and URL-encode `+` as `%2B` in passwords. For psql/pg_restore, set `PGPASSWORD` without encoding.

## 1) Enable required extensions (run once in Supabase SQL editor)

```sql
create extension if not exists postgis;
create extension if not exists vector;
-- Optional for raster ingestion workflows (may require paid plan):
-- create extension if not exists postgis_raster;
```

## 2) Create schema via Laravel migrations (recommended)

Run from the project directory and point Laravel at Supabase. Example (Windows PowerShell):

```powershell
# Point the app at Supabase for this session
$env:DB_CONNECTION = "pgsql"
$env:DB_URL = "postgresql://postgres:YOURPASSWORD@db.<PROJECT_HASH>.supabase.co:5432/postgres?sslmode=require"

php artisan config:clear
php artisan migrate --force
```

This creates tables, indexes, constraints aligned to your current codebase.

## 3) Import data (data-only)

Prefer a custom-format dump (`.backup`/`.dump` from `pg_dump -Fc`) and do a data-only restore.

### Option A — Custom-format backup (preferred)

```powershell
$env:PGPASSWORD = "YOURPASSWORD"
pg_restore `
  --verbose `
  --no-owner `
  --no-acl `
  --data-only `
  -h db.<PROJECT_HASH>.supabase.co `
  -p 5432 `
  -U postgres `
  -d postgres `
  "D:\\path\\to\\your.backup" 2> "D:\\path\\to\\restore_errors.log"
```

Tips:
- Use `-t public.table_name` repeatedly to import a subset in a controlled order.
- You can parallelize with `-j 4` if your plan’s connection limits allow.

### Option B — Plain SQL backup (.sql)

Plain SQL often contains schema/privilege statements Supabase won’t allow. Two choices:
- Quick: run as-is; accept that schema statements will error but inserts will proceed.
- Cleaner: pre-filter out CREATE DATABASE/ROLE/EXTENSION, OWNER/GRANT lines, then run.

Run:
```powershell
$env:PGPASSWORD = "YOURPASSWORD"
psql -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres -f "D:\\path\\to\\file.sql" 2> "D:\\path\\to\\restore_errors.log"
```

## 4) Selective import / excluding tables

To avoid noise or conflicts, exclude operational or absent tables:
- Common excludes: `migrations`, `jobs`, `failed_jobs`, `cache`, `sessions`, `personal_access_tokens`, `pop_estimate_cache`
- Absent in current schema: `watersheds` (skip if not present)
- Schema mismatch: `layers` (your dump may have `geom` but your schema doesn’t). For smoke tests, skip; add later if needed.

Examples:
- “Everything except” (using `-T`):
  ```powershell
  $env:PGPASSWORD = "YOURPASSWORD"
  pg_restore --verbose --no-owner --no-acl --data-only `
    -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres `
    -T public.migrations -T public.jobs -T public.failed_jobs -T public.cache -T public.sessions `
    -T public.personal_access_tokens -T public.pop_estimate_cache -T public.watersheds -T public.layers `
    "D:\\path\\to\\your.backup" 2> "D:\\path\\to\\restore_errors.log"
  ```
- Staged order (references → core → children) using `-t`:
  ```powershell
  # References
  pg_restore --verbose --no-owner --no-acl --data-only `
    -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres `
    -t public.water_quality_classes -t public.wq_standards -t public.parameters -t public.parameter_thresholds `
    "D:\\path\\to\\your.backup"

  # Core
  pg_restore --verbose --no-owner --no-acl --data-only `
    -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres `
    -t public.roles -t public.tenants -t public.users -t public.lakes -t public.stations -t public.org_applications `
    -t public.kyc_profiles -t public.kyc_documents -t public.feedback `
    "D:\\path\\to\\your.backup"

  # Children
  pg_restore --verbose --no-owner --no-acl --data-only `
    -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres `
    -t public.user_tenants -t public.lake_flows -t public.sampling_events -t public.sample_results `
    "D:\\path\\to\\your.backup"
  ```

## 5) (Re)importing after duplicates — TRUNCATE first

If you hit duplicate key errors because rows already exist, TRUNCATE the target tables first, then re-import:

```powershell
$env:PGPASSWORD = "YOURPASSWORD"
psql -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c `
"begin;
  truncate table
    public.sample_results,
    public.sampling_events,
    public.lake_flows,
    public.stations,
    public.lakes,
    public.user_tenants,
    public.users,
    public.roles,
    public.tenants,
    public.parameters,
    public.parameter_thresholds,
    public.wq_standards,
    public.water_quality_classes
  restart identity cascade;
commit;"
```

Adjust the list based on what you intend to import.

## 6) Align sequences (recommended after restoring explicit IDs)

Run in Supabase SQL editor:

```sql
do $$
declare
  r record;
begin
  for r in
    select
      pg_get_serial_sequence(format('%I.%I','public',c.table_name), c.column_name) as seq,
      c.table_name, c.column_name
    from information_schema.columns c
    where c.table_schema='public'
      and c.column_default like 'nextval(%'
  loop
    execute format(
      'select setval(%L, coalesce((select max(%I) from %I.%I),0)+1, false);',
      r.seq, r.column_name, 'public', r.table_name
    );
  end loop;
end $$;
```

Note: A dedicated migration already fixes `lake_flows_id_seq`. The block above covers all sequences.

## 7) Verify

In Supabase SQL editor or via psql:

```sql
select count(*) from migrations;
select count(*) users from users;
select count(*) lakes from lakes;
select count(*) stations from stations;
```

PowerShell psql variant:
```powershell
$env:PGPASSWORD = "YOURPASSWORD"
psql -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres -c "select count(*) users from users;"
psql -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres -c "select count(*) lakes from lakes;"
psql -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres -c "select count(*) stations from stations;"
```

## 8) Common errors and resolutions

- permission denied: "RI_ConstraintTrigger_*" is a system trigger
  - Supabase won’t disable system FK triggers. Safe to ignore; avoid `--disable-triggers`.
- duplicate key value violates unique constraint
  - You already had rows; TRUNCATE then re-import, or use selective `-t` imports.
- relation "watersheds" does not exist
  - Not in your current schema; exclude it with `-T public.watersheds`.
- column "geom" of relation "layers" does not exist
  - Dump includes `layers.geom`; current schema doesn’t. For smoke test, skip layers. If needed later, add a migration to create `geom` and import layers.
- must be owner of table spatial_ref_sys
  - Managed Postgres: ignore. You don’t need to own extension tables.
- input file is not a valid archive
  - That file isn’t a custom-format dump; use Option B (.sql) or re-export with `pg_dump -Fc` from the source.

## 9) Optional: enabling layers.geom later

If you need to import layers with geometry:
- Add a migration to create `layers.geom` (e.g., `geometry(MultiPolygon,4326)`) and a GIST index
- Ensure PostGIS is enabled (done above)
- Then include `-t public.layers` in your restore steps

Example SQL (for reference):
```sql
alter table layers add column if not exists geom geometry(MultiPolygon,4326);
create index if not exists layers_geom_gix on layers using gist (geom);
```

## 10) One-liners (optional)

Single command run (no line continuations):
```powershell
$env:PGPASSWORD = "YOURPASSWORD"; pg_restore --verbose --no-owner --no-acl --data-only -h db.<PROJECT_HASH>.supabase.co -p 5432 -U postgres -d postgres "D:\\path\\to\\your.backup" 2> "D:\\path\\to\\restore_errors.log"
```

## Security notes

- Don’t commit DB credentials or full DB_URL values to source control
- Use environment variables in CI/CD (Render) and local `.env` files ignored by Git
