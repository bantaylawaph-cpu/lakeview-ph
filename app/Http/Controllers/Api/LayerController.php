<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLayerRequest;
use App\Http\Requests\UpdateLayerRequest;
use App\Models\Layer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LayerController extends Controller
{
    /* -------------------------- Helpers -------------------------- */
    protected function requireSuperAdmin(Request $request): void
    {
        $user = $request->user();
        $role = method_exists($user, 'highestRoleName') ? $user->highestRoleName() : null;
        if ($role !== 'superadmin') {
            abort(403, 'Only Super Administrators may modify layers.');
        }
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
            ->where([
                'body_type' => $request->query('body_type'),
                'body_id'   => (int) $request->query('body_id'),
            ])
            ->orderByDesc('is_active')
            ->orderByDesc('created_at');

        $role = $request->user() && method_exists($request->user(), 'highestRoleName')
            ? $request->user()->highestRoleName()
            : null;

        if ($role === 'org_admin') {
            $query->where('layers.uploaded_by', $request->user()->id);
        }

        $query->select('layers.*');
        $query->addSelect(DB::raw("COALESCE(users.name, '') AS uploaded_by_name"));
        $query->addSelect(DB::raw("(
            SELECT tenants.name
            FROM user_tenants ut
            INNER JOIN roles r ON r.id = ut.role_id
            INNER JOIN tenants ON tenants.id = ut.tenant_id
            WHERE ut.user_id = layers.uploaded_by
              AND ut.is_active = true
              AND r.name = 'org_admin'
            ORDER BY COALESCE(ut.joined_at, ut.created_at) DESC
            LIMIT 1
        ) AS uploaded_by_org"));

        if ($include->contains('geom'))   $query->selectRaw('ST_AsGeoJSON(geom)  AS geom_geojson');
        if ($include->contains('bounds')) $query->selectRaw('ST_AsGeoJSON(bbox)  AS bbox_geojson');

        $rows = $query->get();

        return response()->json([
            'data' => $rows,
        ]);
    }

    // Public list — robust to casing/whitespace
    public function publicIndex(Request $request)
    {
        $request->validate([
            'body_type' => 'required|string|in:lake,watershed',
            'body_id'   => 'required|integer|min:1',
            'include'   => 'nullable|string',
        ]);

        $include = collect(explode(',', (string) $request->query('include')))
            ->map(fn($s) => trim($s))->filter()->values();

        $query = Layer::query()
            ->whereRaw("LOWER(TRIM(layers.visibility)) = 'public'")
            ->whereRaw("LOWER(TRIM(layers.body_type)) = ?", [strtolower($request->query('body_type'))])
            ->where('layers.body_id', (int) $request->query('body_id'))
            ->orderByDesc('layers.is_active')
            ->orderByDesc('layers.created_at');

        $query->select([
            'layers.id',
            'layers.name',
            'layers.notes',
            'layers.is_active',
            'layers.created_at',
            'layers.updated_at',
        ]);

        $query->addSelect(DB::raw("COALESCE((
            SELECT tenants.name
            FROM user_tenants ut
            INNER JOIN roles r    ON r.id = ut.role_id
            INNER JOIN tenants    ON tenants.id = ut.tenant_id
            WHERE ut.user_id   = layers.uploaded_by
              AND ut.is_active = true
              AND r.name = 'org_admin'
            ORDER BY COALESCE(ut.joined_at, ut.created_at) DESC
            LIMIT 1
        ), 'LakeView') AS uploaded_by_org"));

        if ($include->contains('bounds')) {
            $query->selectRaw('ST_AsGeoJSON(bbox) AS bbox_geojson');
        }

        $rows = $query->get();

        return response()->json(['data' => $rows]);
    }

    // NEW: Public show — returns geometry for a single PUBLIC layer
    public function publicShow(Request $request, int $id)
    {
        $include = collect(explode(',', (string) $request->query('include')))
            ->map(fn($s) => trim($s))->filter()->values();

        $q = Layer::query()
            ->where('layers.id', $id)
            ->where('layers.visibility', 'public');

        $q->select([
            'layers.id',
            'layers.body_type',
            'layers.body_id',
            'layers.name',
            'layers.notes',
            'layers.is_active',
            'layers.created_at',
            'layers.updated_at',
        ]);

        // org label (or LakeView)
        $q->addSelect(DB::raw("COALESCE((
            SELECT tenants.name
            FROM user_tenants ut
            INNER JOIN roles r ON r.id = ut.role_id
            INNER JOIN tenants ON tenants.id = ut.tenant_id
            WHERE ut.user_id = layers.uploaded_by
            AND ut.is_active = true
            AND r.name = 'org_admin'
            ORDER BY COALESCE(ut.joined_at, ut.created_at) DESC
            LIMIT 1
        ), 'LakeView') AS uploaded_by_org"));

        if ($include->contains('geom'))   $q->selectRaw('ST_AsGeoJSON(geom)  AS geom_geojson');
        if ($include->contains('bounds')) $q->selectRaw('ST_AsGeoJSON(bbox)  AS bbox_geojson');

        $row = $q->first();

        if (!$row) return response()->json(['data' => null], 404);
        return response()->json(['data' => $row]);
    }


    public function active(Request $request)
    {
        $request->validate([
            'body_type' => 'required|string|in:lake,watershed',
            'body_id'   => 'required|integer|min:1',
        ]);

        $row = Layer::where('body_type', $request->query('body_type'))
            ->where('body_id', (int) $request->query('body_id'))
            ->where('is_active', true)
            ->select('*')
            ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
            ->first();

        return response()->json(['data' => $row]);
    }

    public function store(StoreLayerRequest $request)
    {
        $user = $request->user();
        $role = method_exists($user, 'highestRoleName') ? $user->highestRoleName() : null;

        if (!in_array($role, ['superadmin', 'org_admin'], true)) {
            abort(403, 'Only Super Administrators or Organization Administrators may create layers.');
        }

        $data = $request->validated();

        $visibility = $data['visibility'] ?? null;
        if (in_array($visibility, ['organization', 'organization_admin'], true)) {
            $visibility = 'admin';
        }
        $visibility = $visibility ?? 'public';

        if (!in_array($visibility, ['public', 'admin'], true)) {
            throw ValidationException::withMessages([
                'visibility' => ['Visibility must be Public or Admin.'],
            ]);
        }

        $data['visibility'] = $visibility;

        if ($role !== 'superadmin') {
            $data['is_active'] = false;
        }

        return DB::transaction(function () use ($request, $data, $role) {
            if ($role === 'superadmin' && !empty($data['is_active'])) {
                Layer::where('body_type', $data['body_type'])
                    ->where('body_id', (int) $data['body_id'])
                    ->update(['is_active' => false]);
            }

            $layer = new Layer();
            $layer->fill([
                'body_type'       => $data['body_type'],
                'body_id'         => (int) $data['body_id'],
                'uploaded_by'     => $request->user()->id ?? null,
                'name'            => $data['name'],
                'type'            => $data['type']        ?? 'base',
                'category'        => $data['category']    ?? null,
                'srid'            => (int)($data['srid']  ?? 4326),
                'visibility'      => $data['visibility']  ?? 'admin',
                'is_active'       => $role === 'superadmin' ? (bool)($data['is_active'] ?? false) : false,
                'status'          => $data['status']      ?? 'ready',
                'version'         => (int)($data['version'] ?? 1),
                'notes'           => $data['notes']       ?? null,
                'source_type'     => $data['source_type'] ?? 'geojson',
            ]);
            $layer->save();

            $geomJson = $this->extractGeometryJson($data['geom_geojson']);
            $srid     = (int)($data['srid'] ?? 4326);

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

    public function update(UpdateLayerRequest $request, int $id)
    {
        $layer = Layer::findOrFail($id);

        $user = $request->user();
        $role = method_exists($user, 'highestRoleName') ? $user->highestRoleName() : null;

        if (!in_array($role, ['superadmin', 'org_admin'], true)) {
            abort(403, 'Only Super Administrators or Organization Administrators may modify layers.');
        }

        if ($role === 'org_admin' && $layer->uploaded_by !== ($user->id ?? null)) {
            abort(403, 'You may only modify layers that your organization created.');
        }

        $data = $request->validated();

        if (array_key_exists('visibility', $data)) {
            $visibility = $data['visibility'];
            if (in_array($visibility, ['organization', 'organization_admin'], true)) {
                $visibility = 'admin';
            }
            if (!in_array($visibility, ['public', 'admin'], true)) {
                throw ValidationException::withMessages([
                    'visibility' => ['Visibility must be Public or Admin.'],
                ]);
            }
            $data['visibility'] = $visibility;
        }

        if ($role === 'org_admin') {
            unset($data['is_active']);
        }

        $layer->fill([
            'name'        => $data['name']        ?? $layer->name,
            'type'        => $data['type']        ?? $layer->type,
            'category'    => $data['category']    ?? $layer->category,
            'visibility'  => $data['visibility']  ?? $layer->visibility,
            'status'      => $data['status']      ?? $layer->status,
            'version'     => isset($data['version']) ? (int)$data['version'] : $layer->version,
            'notes'       => $data['notes']       ?? $layer->notes,
            'is_active'   => isset($data['is_active']) ? (bool)$data['is_active'] : $layer->is_active,
        ]);

        return DB::transaction(function () use ($layer, $data, $role) {
            $activating = $role === 'superadmin'
                && array_key_exists('is_active', $data)
                && (bool)$data['is_active'] === true;

            $layer->save();

            if (!empty($data['geom_geojson'])) {
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

    public function destroy(Request $request, int $id)
    {
        $layer = Layer::findOrFail($id);

        $user = $request->user();
        $role = method_exists($user, 'highestRoleName') ? $user->highestRoleName() : null;

        if ($role === 'org_admin') {
            if ($layer->uploaded_by !== ($user->id ?? null)) {
                abort(403, 'You may only delete layers that your organization created.');
            }
        } elseif ($role !== 'superadmin') {
            abort(403, 'Only Super Administrators may delete layers.');
        }

        $layer->delete();

        return response()->json([], 204);
    }
}
