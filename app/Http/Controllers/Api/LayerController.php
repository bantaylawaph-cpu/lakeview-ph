<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLayerRequest;
use App\Http\Requests\UpdateLayerRequest;
use App\Models\Layer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Models\Role;

class LayerController extends Controller
{
    protected function resolveRole($user): ?string { return $user?->role?->name; }

    /* -------------------------- Helpers -------------------------- */
    protected function requireSuperAdmin(Request $request): void
    {
        $role = $this->resolveRole($request->user());
        if ($role !== Role::SUPERADMIN) abort(403, 'Only Super Administrators may modify layers.');
    }

    protected function extractGeometryJson(string $geojson): string
    {
        $decoded = json_decode($geojson, true);
        if (!$decoded || !is_array($decoded)) {
            abort(422, 'Invalid GeoJSON.');
        }
        if (($decoded['type'] ?? '') === 'Feature') {
            if (empty($decoded['geometry'])) abort(422, 'GeoJSON Feature has no geometry.');
            $geom = $decoded['geometry'];
        }
        elseif (isset($decoded['type']) && isset($decoded['coordinates'])) {
            $geom = $decoded;
        }
        elseif (($decoded['type'] ?? '') === 'FeatureCollection') {
            abort(422, 'FeatureCollection not supported yet. Please upload a dissolved Polygon/MultiPolygon GeoJSON.');
        }
        else {
            abort(422, 'Unsupported GeoJSON structure.');
        }
        $t = strtolower($geom['type'] ?? '');
        if (!in_array($t, ['polygon', 'multipolygon'])) {
            abort(422, 'Only Polygon or MultiPolygon geometries are supported.');
        }
        return json_encode($geom);
    }

    /* -------------------------- Endpoints -------------------------- */

    public function index(Request $request)
    {
        $request->validate([
            'body_type' => 'required|string|in:lake,watershed',
            'body_id'   => 'required|integer|min:1',
            'include'   => 'nullable|string'
        ]);

        $include = collect(explode(',', (string) $request->query('include')))
            ->map(fn($s) => trim($s))->filter()->values();

        $query = Layer::query()
            ->leftJoin('users', 'users.id', '=', 'layers.uploaded_by')
            ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->leftJoin('tenants', 'tenants.id', '=', 'users.tenant_id')
            ->where([
                'body_type' => $request->query('body_type'),
                'body_id'   => (int) $request->query('body_id'),
            ])
            ->orderByDesc('is_active')
            ->orderByDesc('layers.created_at');

        $role = $this->resolveRole($request->user());
        if ($role === Role::ORG_ADMIN) {
            // Show all layers uploaded by users in same tenant
            $tenantId = $request->user()->tenant_id;
            if ($tenantId) {
                $query->where(function($w) use ($tenantId) {
                    $w->where('users.tenant_id', $tenantId);
                });
            } else {
                // Fallback: if somehow org_admin lacks tenant, restrict to own uploads
                $query->where('layers.uploaded_by', $request->user()->id);
            }
        }

        $query->select('layers.*');
        $query->addSelect(DB::raw("COALESCE(users.name, '') AS uploaded_by_name"));
        $query->addSelect(DB::raw("COALESCE(CASE WHEN roles.scope = 'tenant' THEN tenants.name END, 'LakeView') AS uploaded_by_org"));

        if ($include->contains('geom'))   $query->selectRaw('ST_AsGeoJSON(geom)  AS geom_geojson');
        if ($include->contains('bounds')) $query->selectRaw('ST_AsGeoJSON(bbox)  AS bbox_geojson');

        $rows = $query->get();
        return response()->json(['data' => $rows]);
    }

    // Public list — robust to casing/whitespace
    public function publicIndex(Request $request)
    {
        $request->validate([
            'body_type' => 'required|string|in:lake,watershed',
            'body_id'   => 'required|integer|min:1',
            'include'   => 'nullable|string',
        ]);
        $include = collect(explode(',', (string)$request->query('include')))->map(fn($s)=>trim($s))->filter()->values();

        $query = Layer::query()
            ->leftJoin('users', 'users.id', '=', 'layers.uploaded_by')
            ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->leftJoin('tenants', 'tenants.id', '=', 'users.tenant_id')
            ->whereRaw("LOWER(TRIM(layers.visibility)) = 'public'")
            ->whereRaw("LOWER(TRIM(layers.body_type)) = ?", [strtolower($request->query('body_type'))])
            ->where('layers.body_id', (int)$request->query('body_id'))
            ->orderByDesc('layers.is_active')
            ->orderByDesc('layers.created_at');

        $query->select(['layers.id','layers.name','layers.notes','layers.is_active','layers.created_at','layers.updated_at']);
        $query->addSelect(DB::raw("COALESCE(CASE WHEN roles.scope = 'tenant' THEN tenants.name END, 'LakeView') AS uploaded_by_org"));

        if ($include->contains('bounds')) $query->selectRaw('ST_AsGeoJSON(bbox) AS bbox_geojson');
        $rows = $query->get();
        return response()->json(['data' => $rows]);
    }

    // NEW: Public show — returns geometry for a single PUBLIC layer
    public function publicShow(Request $request, int $id)
    {
        $include = collect(explode(',', (string) $request->query('include')))
            ->map(fn($s)=>trim($s))->filter()->values();
        $q = Layer::query()
            ->leftJoin('users', 'users.id', '=', 'layers.uploaded_by')
            ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->leftJoin('tenants', 'tenants.id', '=', 'users.tenant_id')
            ->where('layers.id', $id)
            ->where('layers.visibility', 'public');

        $q->select(['layers.id','layers.body_type','layers.body_id','layers.name','layers.notes','layers.is_active','layers.created_at','layers.updated_at']);
        $q->addSelect(DB::raw("COALESCE(CASE WHEN roles.scope = 'tenant' THEN tenants.name END, 'LakeView') AS uploaded_by_org"));
        if ($include->contains('geom'))   $q->selectRaw('ST_AsGeoJSON(geom)  AS geom_geojson');
        if ($include->contains('bounds')) $q->selectRaw('ST_AsGeoJSON(bbox)  AS bbox_geojson');
        $row = $q->first();
        if (!$row) return response()->json(['data' => null], 404);
        return response()->json(['data' => $row]);
    }


    public function active(Request $request)
    {
        $request->validate(['body_type'=>'required|string|in:lake,watershed','body_id'=>'required|integer|min:1']);
        $row = Layer::where('body_type', $request->query('body_type'))
            ->where('body_id', (int)$request->query('body_id'))
            ->where('is_active', true)
            ->select('*')
            ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
            ->first();
        return response()->json(['data' => $row]);
    }

    public function store(StoreLayerRequest $request)
    {
        $user = $request->user();
        $role = $this->resolveRole($user);
        if (!in_array($role, [Role::SUPERADMIN, Role::ORG_ADMIN], true)) {
            abort(403, 'Only Super Administrators or Organization Administrators may create layers.');
        }
                $data = $request->validated();
                $visibility = $data['visibility'] ?? 'public';
                if (in_array($visibility, ['organization','organization_admin'], true)) $visibility = 'admin';
                if (!in_array($visibility, ['public','admin'], true)) {
                        throw ValidationException::withMessages(['visibility' => ['Visibility must be Public or Admin.']]);
                }
                $data['visibility'] = $visibility;
                if ($role !== Role::SUPERADMIN) $data['is_active'] = false;

                // Use transaction: create row first (without geom), then set geometry via PostGIS SQL
                return DB::transaction(function () use ($data, $user) {
                        $layer = new Layer();
                        $layer->fill([
                                'body_type'   => $data['body_type'],
                                'body_id'     => (int)$data['body_id'],
                                'name'        => $data['name'],
                                'type'        => $data['type']        ?? 'base',
                                'category'    => $data['category']    ?? null,
                                'srid'        => (int)($data['srid']  ?? 4326),
                                'visibility'  => $data['visibility']  ?? 'public',
                                'is_active'   => (bool)($data['is_active'] ?? false),
                                'notes'       => $data['notes']       ?? null,
                                'source_type' => $data['source_type'] ?? 'geojson',
                        ]);
                        $layer->uploaded_by = $user->id ?? null;
                        $layer->save();

                        // Persist geometry: accept GeoJSON geometry or Feature
                        if (!empty($data['geom_geojson'])) {
                                $geomJson = $this->extractGeometryJson($data['geom_geojson']);
                                $srid = (int)($data['srid'] ?? 4326);

                                DB::update(
                                        // Set SRID first, then transform when needed. Extract polygons (type=3) and force Multi.
                                        "UPDATE layers
                                             SET geom =
                                                        CASE
                                                            WHEN ? = 4326 THEN
                                                                ST_Multi(
                                                                    ST_CollectionExtract(
                                                                        ST_ForceCollection(
                                                                            ST_MakeValid(
                                                                                ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)
                                                                            )
                                                                        ), 3
                                                                    )
                                                                )
                                                            ELSE
                                                                ST_Transform(
                                                                    ST_Multi(
                                                                        ST_CollectionExtract(
                                                                            ST_ForceCollection(
                                                                                ST_MakeValid(
                                                                                    ST_SetSRID(ST_GeomFromGeoJSON(?), ?)
                                                                                )
                                                                            ), 3
                                                                        )
                                                                    ),
                                                                    4326
                                                                )
                                                        END,
                                                     srid = 4326,
                                                     updated_at = now()
                                         WHERE id = ?",
                                        [$srid, $geomJson, $geomJson, $srid, $layer->id]
                                );
                        }

                        // If requested active, deactivate siblings (no DB trigger dependency)
                        if ($layer->is_active) {
                                Layer::where('body_type', $layer->body_type)
                                        ->where('body_id', $layer->body_id)
                                        ->where('id', '!=', $layer->id)
                                        ->update(['is_active' => false]);
                        }

                        $fresh = Layer::whereKey($layer->id)
                                ->select('*')
                                ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
                                ->first();

                        return response()->json(['data' => $fresh], 201);
                });
    }

    public function update(UpdateLayerRequest $request, Layer $layer)
    {
        $user = $request->user();
        $role = $this->resolveRole($user);
        $data = $request->validated();

        // Enforce field-level permissions
        $super = ($role === Role::SUPERADMIN);
        if (!$super) {
            // Org admin can only modify a subset of fields
            $allowed = collect($data)->only(['name','type','category','srid','notes','source_type'])->toArray();
            $data = $allowed;

            // Also restrict scope: org_admin can only edit layers uploaded by their tenant or themselves
            $tenantId = $user->tenant_id ?? null;
            if (!$tenantId || !$layer->uploaded_by) {
                abort(403, 'Forbidden');
            }
            $uploader = \App\Models\User::query()->select(['tenant_id'])->where('id', $layer->uploaded_by)->first();
            if (!$uploader || (int)$uploader->tenant_id !== (int)$tenantId) {
                abort(403, 'Forbidden');
            }
        } else {
            // Superadmin normalization for visibility
            $visibility = $data['visibility'] ?? $layer->visibility;
            if (in_array($visibility, ['organization','organization_admin'], true)) $visibility = 'admin';
            if (!in_array($visibility, ['public','admin'], true)) {
                throw ValidationException::withMessages(['visibility' => ['Visibility must be Public or Admin.']]);
            }
            $data['visibility'] = $visibility;
        }

                // Save basic fields first
                $layer->fill($data);

                return DB::transaction(function () use ($layer, $data, $role) {
                        $activating = array_key_exists('is_active', $data) && (bool)$data['is_active'] === true;
                        $layer->save();

                        // Optional geometry replacement: only superadmins may replace geometry via this endpoint
                        if ($role === Role::SUPERADMIN && !empty($data['geom_geojson'])) {
                                $geomJson = $this->extractGeometryJson($data['geom_geojson']);
                                $srid     = (int)($data['srid'] ?? $layer->srid ?? 4326);

                                DB::update(
                                        "UPDATE layers
                                                SET geom =
                                                        CASE
                                                            WHEN ? = 4326 THEN
                                                                ST_Multi(
                                                                    ST_CollectionExtract(
                                                                        ST_ForceCollection(
                                                                            ST_MakeValid(
                                                                                ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)
                                                                            )
                                                                        ), 3
                                                                    )
                                                                )
                                                            ELSE
                                                                ST_Transform(
                                                                    ST_Multi(
                                                                        ST_CollectionExtract(
                                                                            ST_ForceCollection(
                                                                                ST_MakeValid(
                                                                                    ST_SetSRID(ST_GeomFromGeoJSON(?), ?)
                                                                                )
                                                                            ), 3
                                                                        )
                                                                    ),
                                                                    4326
                                                                )
                                                        END,
                                                        srid = 4326,
                                                        updated_at = now()
                                            WHERE id = ?",
                                        [$srid, $geomJson, $geomJson, $srid, $layer->id]
                                );
                        }

                        if ($activating) {
                                Layer::where('body_type', $layer->body_type)
                                        ->where('body_id', $layer->body_id)
                                        ->where('id', '!=', $layer->id)
                                        ->update(['is_active' => false]);
                        }

                        $fresh = Layer::whereKey($layer->id)
                                ->select('*')
                                ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
                                ->first();

                        return response()->json(['data' => $fresh]);
                });
    }

    public function destroy(Request $request, Layer $layer)
    {
        $user = $request->user();
        $role = $this->resolveRole($user);
        if ($role === Role::SUPERADMIN) {
            $layer->delete();
            return response()->json([], 204);
        }
        if ($role === Role::ORG_ADMIN) {
            $tenantId = $user->tenant_id ?? null;
            if (!$tenantId || !$layer->uploaded_by) abort(403);
            $uploader = \App\Models\User::query()->select(['tenant_id'])->where('id', $layer->uploaded_by)->first();
            if (!$uploader || (int)$uploader->tenant_id !== (int)$tenantId) abort(403);
            $layer->delete();
            return response()->json([], 204);
        }
        abort(403);
    }
}
