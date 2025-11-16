# Organization (Tenant) Admin Revamp Specification

Date: 2025-11-16
Owner: Revamp Initiative

## 1. Goals
- Improve scanability and performance of Org (Tenant) listing.
- Consolidate management actions into a focused modal with clear information architecture.
- Introduce safe deletion workflow (soft delete default, gated hard delete) and restore ability.
- Provide consistent server-side search for both page and manage modal.
- Reduce cognitive load by removing non-critical columns and surfacing deeper attributes in Settings tab.
- Establish extensible foundation (feature flags, audit trail, bulk operations).

## 2. Current Observations
- Model: `App\\Models\\Tenant` uses `SoftDeletes`; fillable: name, type, phone, address, active, contact_email, slug.
- Frontend API patterns present in `resources/js/lib/api.js` (admin tenant admin endpoints, options list).
- No dedicated blade/org view references found (likely SPA or deferred work). Need creation/design.
- Existing API uses `/admin/tenants/...` prefix for tenant-scoped admin operations.

## 3. Information Architecture (Manage Modal Tabs)
| Tab | Purpose | Initial Fields |
|-----|---------|----------------|
| Overview | High-level summary + metrics | Name, Active toggle (read-only), User count, Created date, Last activity |
| Members | List + role badges + quick add/remove admins | Search, pagination, role filters |
| Settings (NEW) | Editable identity & configuration | Name, Slug (readonly or editable behind permission), Contact Email, Type, Phone, Address, Feature Flags, Active toggle |
| Activity / Audit | Recent changes & deletion events | Timestamp, actor, change summary |
| Integrations (Future) | External connectors + tokens | Placeholders |

Danger Zone (inside Settings): Soft Delete, Restore (if deleted), Hard Delete (expanded panel with reason + confirmation phrase).

## 4. Table (Org Listing) Redesign
Columns (initial):
- Name (links to Manage)
- Active Users (# cached metric)
- Created Date (sortable)
- Actions (kebab dropdown)

Removed: Type, Address, Status (moved to Settings).

Responsive Behavior:
- < 900px: Collapse Created Date into row secondary line.
- < 600px: Actions become single icon; metadata accessible via modal.

Performance:
- Backend returns condensed row DTO: `{id, name, active_users, created_at, active}`.
- Avoid COUNT(*) per request: maintain nightly/materialized `tenant_user_counts` or cache updates on membership changes.

## 5. Server-Side Search & Filtering
Unified endpoint powering page + modal.

Endpoint: `GET /admin/tenants`
Params:
- `q` (string; matches name, slug, contact_email)
- `page` (int)
- `per_page` (int; default 25)
- `sort` (enum: name|created_at|active_users, optional `-` prefix for desc)
- `filter[active]` (bool)
- `filter[min_users]` (int)
- `with_deleted` (bool; privileged roles only)

Response:
```json
{
  "data": [
    {"id":1,"name":"LakeOrg","active":true,"active_users":12,"created_at":"2025-09-10T..."}
  ],
  "meta": {"page":1,"per_page":25,"total":120,"has_more":true}
}
```

Index Recommendations:
- BTREE composite `(name, slug)`
- Partial index for active tenants if volume high.
- GIN trigram index (Postgres) on name for fuzzy search (optional enhancement).

## 6. Deletion & Restore Flows
Soft Delete:
- Action: `DELETE /admin/tenants/{id}` sets `deleted_at`.
- Audit entry: `{action:'soft_delete', tenant_id, user_id, reason}`.

Restore:
- Action: `POST /admin/tenants/{id}/restore` clears `deleted_at`.
- Audit entry: `{action:'restore', ...}`.

Hard Delete:
- Action: `DELETE /admin/tenants/{id}/hard` (requires `canHardDeleteTenant` policy ability).
- Pre-flight: ensure no protected dependencies; queue deep purge job for related data if needed.
- Audit entry snapshot: serialized previous attributes + reason.
- Response: `202 Accepted` if asynchronous purge.

Danger Zone UX:
- Expand panel with explanation, requirement to type tenant name or confirmation phrase.
- Hard delete hidden behind second confirmation.

## 7. Backend Endpoint Additions
| Method | Path | Purpose |
|--------|------|---------|
| GET | /admin/tenants | Listing + search |
| GET | /admin/tenants/{id} | Full detail for modal tabs |
| PATCH | /admin/tenants/{id} | Update Settings fields |
| DELETE | /admin/tenants/{id} | Soft delete |
| POST | /admin/tenants/{id}/restore | Restore soft-deleted |
| DELETE | /admin/tenants/{id}/hard | Hard delete (danger zone) |
| GET | /admin/tenants/{id}/audit | Paginated audit trail |
| GET | /admin/tenants/{id}/members | Members listing (search, pagination) |
| POST | /admin/tenants/{id}/members | Add member/admin (future) |
| DELETE | /admin/tenants/{id}/members/{userId} | Remove member/admin |

## 8. Frontend Interaction Patterns
Search Inputs:
- Debounce 300ms; cancel previous fetch via AbortController.
- Display loading skeleton rows.

State Management:
- Central store (e.g., module) caching last query & page.
- Optimistic UI for name/active toggle updates (rollback on error).

Actions Menu:
- Kebab icon (`<button aria-haspopup="true" aria-expanded="false">⋮</button>`)
- Menu items: Manage, Members, Soft Delete / Restore, (Hard Delete only inside modal).

Scrollbar Styling:
- Apply `resources/css/util/scrollbars.css` class to modal scroll container only to avoid global override.

Accessibility:
- Focus trap in modal.
- `aria-live="polite"` region for search results count updates.
- Keyboard navigation: Arrow keys within actions menu.

## 9. Validation & Audit
Audit model/service extension capturing before/after diff for PATCH.
Rate limiting deletion endpoints (to avoid misuse).

## 10. Bulk & Extensions (Phase 2)
- Bulk selection checkbox column (hidden on mobile).
- Bulk actions: Activate/Deactivate, Soft Delete, Export list (CSV).
- Metrics card row above table (Total Orgs, Active, Soft Deleted, Avg Users).

## 11. Performance Considerations
- Avoid N+1 in members tab via eager loading limited fields.
- Consider caching counts (Redis) with TTL or event-driven updates.
- Use lightweight DTO transformers (avoid returning large relationship graphs).

## 12. Rollout Plan
Phase 0: Implement backend listing + search + soft delete/restore endpoints.
Phase 1: Replace table columns & actions menu; introduce Manage modal scaffold.
Phase 2: Add Settings tab + Danger Zone.
Phase 3: Members tab with role management.
Phase 4: Audit tab + feature flags integration.
Phase 5: Bulk actions + metrics.
Phase 6: Hard delete gating & asynchronous purge job.
Phase 7: Performance tuning & accessibility audit.

Feature Flags:
- `orgRevampCore` (Phase 1)
- `orgRevampSettings` (Phase 2)
- `orgRevampMembers` (Phase 3)
- `orgRevampAudit` (Phase 4)
- `orgRevampBulk` (Phase 5)
- `orgHardDelete` (Phase 6)

## 13. Open Questions
- Slug mutability: DECIDED immutable after creation (implementation default).
- Billing/plan attributes: Deferred (none surfaced in Phase 0-2).
- Retention policy: Indefinite soft-deletion until manual hard delete (no auto purge yet).
- Maximum per_page: Capped at 100 (implemented).

## 14. Acceptance Criteria (Initial Phases)
Phase 0:
- Listing returns paginated JSON with query filter.
- Soft delete hides tenant from default listing (unless `with_deleted=true`).
- Restore reinstates visibility.

Phase 1:
- UI table only shows defined columns.
- Actions dropdown replaces inline buttons.
- Manage modal opens and loads Overview basic data.

Phase 2:
- Settings tab updates name/contact_email and reflects changes without full reload.
- Danger Zone soft delete & restore actions functional; Hard delete hidden.

## 15. Risks & Mitigations
## 16a. Implemented Decisions Summary
- Added JSON `feature_flags` column migration (2025_11_16_120000...).
- Added `TenantHardDeleteJob` for asynchronous purge & logging.
- Added route `DELETE /admin/tenants/{tenant}/hard` and controller `hardDelete` method.
- Soft delete endpoint now only performs soft delete (force parameter removed).
- Listing capped at 100 per page; returns compact DTO (id, name, slug, active, deleted_at, created_at).
- Frontend API helpers: listTenants, getTenant, updateTenant, softDeleteTenant, restoreTenant, hardDeleteTenant.
- Added debounced orgStore for listing cache & search.
- Added accessible actions menu component skeleton.
- Decisions appended: slug immutable; indefinite retention until manual hard delete.

- Accidental Hard Delete: Double confirmation + feature flag + role check.
- Slow search on large dataset: Add indexes; implement caching layer if needed.
- Inconsistent counts: Event-driven cache invalidation on membership changes.
- Permission leakage: Strict policy methods for each endpoint; never rely solely on frontend hiding.

---
End of Spec

## 16. Detailed Backend Endpoint Specifications

### GET /admin/tenants (Listing/Search)
Request Params:
- `q` (string; fuzzy contains on name, slug, contact_email)
- `page` (int >=1)
- `per_page` (int 1-100; default 25)
- `sort` (string; `name`, `created_at`, `active_users`; prefix `-` for desc)
- `filter[active]` (bool)
- `filter[min_users]` (int >=0) FUTURE (requires user count source)
- `with_deleted` (bool; superadmin only)

Response (200):
```json
{
  "data":[{"id":1,"name":"LakeOrg","active":true,"active_users":12,"created_at":"2025-09-10T12:34:00Z"}],
  "meta":{"page":1,"per_page":25,"total":120,"has_more":true}
}
```
Errors:
- 400 invalid param (format)
- 403 unauthorized scope (with_deleted)

Policy: `viewAnyTenant` checks role (superadmin or org_admin). `with_deleted` limited to superadmin.

### GET /admin/tenants/{id}
Returns enriched detail for modal. Include soft-deleted tenants if superadmin and `with_deleted=1`.
Add optional `?include=counts,flags,audit_preview`.

### PATCH /admin/tenants/{id}
Allowed fields Phase 2: `name`, `contact_email`, `active`, feature flags, contact metadata.
Validation mirrors existing controller constraints. Slug immutable (unless business decides phase change).
Audit: store before/after diff.

### DELETE /admin/tenants/{id}
Soft delete only (no `force` query). Returns 204. Blocks if dependent users exist (or optionally reassign strategy later).
Audit action: `soft_delete` with actor & reason (body optional: `{reason:"cleanup"}`).

### POST /admin/tenants/{id}/restore
Restores soft-deleted tenant; 200 with minimal resource payload.
Audit action: `restore`.

### DELETE /admin/tenants/{id}/hard
Superadmin only; requires JSON body: `{"reason":"duplicate test tenant"}` and confirmation header `X-Confirm-Delete: tenant-name-slug`.
Workflow: enqueue `TenantHardDeleteJob` returning 202; job purges related tables (users, logs, domain data) then audit snapshot.

### GET /admin/tenants/{id}/audit
Pagination params: `page`, `per_page`; filter by `action` (enum). Response includes actor (id, name) + diff summary.

### Members Endpoints
`GET /admin/tenants/{id}/members` -> supports `q`, `role`, pagination.
`POST /admin/tenants/{id}/members` -> add existing user (future multi-tenant support rules).
`DELETE /admin/tenants/{id}/members/{userId}` -> remove membership or demote.

## 17. Frontend Interaction Specification

### State Shape (Pseudo)
```js
orgStore = {
  list: { rows: [], page: 1, perPage: 25, total: 0, q: '', sort: 'name', loading: false, withDeleted: false },
  selected: { id: null, data: null, tabsLoaded: { overview: true, members: false, settings: false, audit: false } },
  flags: { orgRevampCore: true, orgRevampSettings: false },
  cache: Map(/* key => {timestamp,data} */)
}
```

### Search Flow (Listing & Modal Members)
1. User types -> debounced handler (300ms).
2. Generate key: `q|page|sort|withDeleted`.
3. If cached and fresh (<30s) use cached; else issue fetch with AbortController.
4. On new request start: set `loading=true`; cancel prior by calling `abort()`.
5. On success: update rows, meta; set `loading=false`; update cache.
6. On error: display toast; fallback to last known data.

### Actions Menu Accessibility
Markup (conceptual):
```html
<div class="actions">
  <button class="kebab" aria-haspopup="true" aria-expanded="false" aria-controls="tenant-menu-1">⋮<span class="sr-only">Actions</span></button>
  <ul id="tenant-menu-1" role="menu" hidden>
    <li role="menuitem"><button data-action="manage">Manage</button></li>
    <li role="menuitem"><button data-action="soft-delete">Soft Delete</button></li>
    <li role="menuitem"><button data-action="restore">Restore</button></li>
  </ul>
</div>
```
Keyboard: Enter/Space opens; Arrow Down focuses first item; Escape closes.

### Manage Modal Behavior
- Fetch detail on open if not cached.
- Lazy load Members, Settings, Audit on first visit of tab.
- Display skeleton components while loading.
- Apply `scrollbars.css` to container: `.manage-modal__content`.

### Optimistic Updates
- Name change: update local `selected.data.name` immediately; revert if 4xx/5xx.
- Active toggle: disable control while request in flight; show inline spinner.

### Error Handling
- Central `handleApiError(err, context)` producing user-friendly message.
- 401 triggers re-auth flow; 403 shows permission toast; 422 validation surfaces field-level messages in Settings tab.

### Performance
- Virtualize members list when > 100 using windowed rendering.
- Pre-fetch next page of org listing when scrolling near bottom (if `has_more`).
- Use `prefetch` link relation for Manage modal route when user hovers action.

### Security & Permissions (Frontend Guardrails)
- Hide hard delete UI unless `orgHardDelete` flag and user role = superadmin; never rely solely on this—backend enforces.
- Disable restore button if tenant not soft-deleted.

### Telemetry (Optional)
- Log search latency (duration between keyup and response) to monitoring endpoint.
- Track usage of Manage modal tabs for prioritizing optimization.

### Testing Strategy (Frontend)
- Unit: debounce & abort logic; actions menu keyboard navigation.
- Integration: mock API for search & update flows.
- E2E: soft delete -> disappears from listing -> restore -> reappears.

