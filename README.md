<h1 align="center">LakeView Platform (Backend)</h1>
<p align="center"><strong>Single-tenant user model • Role-scoped authorization • Auditable tenant / role transitions</strong></p>

## Overview

LakeView is a Laravel 12 API powering water quality data, geospatial layers, organizations (tenants) and role‑scoped access. The system was refactored from a pseudo multi‑tenant pivot (user_tenants) to a strict single-tenant user model (one user → zero or one tenant) with explicit role scoping.

Core design goals:
1. Simpler invariants (no multi-association explosion) while preserving future extensibility.
2. Deterministic authorization – a user has exactly one role; roles define scope (system vs tenant).
3. Transparent, queryable audit trail of role / tenant transitions.
4. Test portability (Postgres production with spatial; SQLite for CI) via guarded migrations and stub tables.

## Data Model Shift (September 2025)

| Before (Legacy) | After (Current) |
|-----------------|-----------------|
| users ⇄ user_tenants ⇄ tenants (many to many) | users.tenant_id nullable (direct) |
| roles linked through pivot state | users.role_id (FK) |
| Pivot carried historical admin changes implicitly | Explicit `user_tenant_changes` audit table |

Legacy pivot model `UserTenant` has been removed. All code must use `users.tenant_id` + `users.role_id`.

## Roles & Scopes

Roles define scope classification:

| Role (example) | Scope | Tenant Required? | Notes |
|----------------|-------|------------------|-------|
| superadmin | system | No | Full platform visibility. |
| org_admin | tenant | Yes | Manages their tenant’s members & layers. |
| contributor | tenant | Yes | Limited create/upload within tenant. |
| public | system | No | Read-only public endpoints. |

Constraints enforced (runtime + integrity command):
* Tenant-scoped roles MUST have non-null `tenant_id`.
* System-scoped roles MUST have null `tenant_id`.
* Each user MUST have a valid `role_id`.

## Audit Trail (`user_tenant_changes`)

Columns (simplified): user_id, old_role_id, new_role_id, old_tenant_id, new_tenant_id, changed_by_user_id, created_at.

Recorded when role or tenant association changes via service/controller helpers. Use it to trace historical privilege or organization membership. Orphan role references are flagged by verification.

## Tenancy Verification Command

Run integrity checks:

```bash
php artisan tenancy:verify        # human readable summary
php artisan tenancy:verify --json # machine-readable JSON
```

Checks performed:
1. Tenant-scoped roles missing tenant.
2. System-scoped roles that wrongly have a tenant.
3. Users missing a role assignment.
4. Audit rows whose new_role_id is missing / orphaned.

Exit codes: 0 (OK), 1 (issues found).

## Migrations & Test Portability

Spatial / Postgres specific statements are wrapped with driver guards. SQLite test database uses lightweight stub migrations (e.g., lakes, layers) sufficient for factories and feature tests.

## Feature Tests

Key suites cover:
* Tenancy flows (assign/demote admin, contributor restrictions, cross-tenant access denial, system role constraints).
* Layer visibility differences between organization admins and superadmins.
* Integrity command success & failure paths.

## Development

Install dependencies & run tests:
```bash
composer install
cp .env.example .env
php artisan key:generate
# Adjust DB credentials (.env) for Postgres dev; tests default to sqlite memory
php artisan migrate --seed
php artisan test
```

Reset database:
```bash
php artisan migrate:fresh --seed
```

## Conventions
* Always manipulate role / tenant transitions through provided services or controllers that log audits.
* Pivot model (`UserTenant`) fully removed – do not reintroduce.
* Use middleware `EnsureRole` for route-level role gating (single role param or pipe/list supported).

## Roadmap (Short Term)
* (Done) Remove placeholder `UserTenant.php`; consider pruning the legacy pivot migration file after release tag.
* Expand JSON API docs (OpenAPI spec) for tenancy endpoints.
* Add permission matrix to documentation.

## User Feedback API

Authenticated users can submit feedback (bugs, suggestions, general comments). Superadmins can triage, respond, and resolve.

Endpoints (all JSON):

User (auth:sanctum):
* `POST /api/feedback` – body: `{ title, message, category?, metadata? }` -> 201 `{ data: Feedback }`
* `GET /api/feedback/mine` – paginated list (own submissions)
* `GET /api/feedback/mine/{id}` – show single (own) feedback

Admin (auth:sanctum + role:superadmin):
* `GET /api/admin/feedback?status=&category=&search=&unresolved=1&per_page=20` – filtered, paginated
* `GET /api/admin/feedback/{id}` – show with user + tenant context
* `PATCH /api/admin/feedback/{id}` – body: `{ status?, admin_response? }`

Statuses:
* `open` (default)
* `in_progress`
* `resolved` (auto sets `resolved_at`)
* `wont_fix` (also sets `resolved_at`)

Notes:
* If the submitting user has a tenant-scoped role their `tenant_id` is stored for contextual analysis.
* Simple text search (`search`) performs ILIKE on `title` and `message` (Postgres).
* `unresolved=1` excludes `resolved` and `wont_fix`.
* `metadata` is arbitrary JSON (optional) for client environment info (browser, app version, etc.).

Future Enhancements (suggested):
* File attachment / screenshot support (separate table + signed upload URLs).
* Event broadcasting / notifications when status changes.
* Rate limiting for feedback submission endpoint.
* Tagging or priority field for triage.


## License
Proprietary – internal project (update if licensing changes).

