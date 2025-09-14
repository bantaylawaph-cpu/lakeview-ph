<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLayerRequest;
use App\Http\Requests\UpdateLayerRequest;
use App\Models\Layer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    // Accepts geometry GeoJSON or a Feature wrapping geometry. (FeatureCollection is not supported in this MVP.)
    protected function extractGeometryJson(string $geojson): string
    {
        $decoded = json_decode($geojson, true);
        if (!$decoded || !is_array($decoded)) {
            abort(422, 'Invalid GeoJSON.');
        }

        // If Feature: take its geometry
        if (($decoded['type'] ?? '') === 'Feature') {
            if (empty($decoded['geometry'])) abort(422, 'GeoJSON Feature has no geometry.');
            $geom = $decoded['geometry'];
        }
        // If geometry object directly
        elseif (isset($decoded['type']) && isset($decoded['coordinates'])) {
            $geom = $decoded;
        }
        // FeatureCollection not handled in MVP (to keep SQL simple).
        elseif (($decoded['type'] ?? '') === 'FeatureCollection') {
            abort(422, 'FeatureCollection not supported yet. Please upload a dissolved Polygon/MultiPolygon GeoJSON.');
        }
        else {
            abort(422, 'Unsupported GeoJSON structure.');
        }

        // Only Polygon / MultiPolygon for main geometries
        $t = strtolower($geom['type'] ?? '');
        if (!in_array($t, ['polygon', 'multipolygon'])) {
            abort(422, 'Only Polygon or MultiPolygon geometries are supported.');
        }

        return json_encode($geom);
    }

    /* -------------------------- Endpoints -------------------------- */

    // GET /api/layers?body_type=lake&body_id=1&include=geom,bounds
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

        // Select base columns
        $query->select('layers.*');
        $query->addSelect(DB::raw("COALESCE(users.name, '') AS uploaded_by_name"));

        // Optionally include GeoJSON (for preview) and bbox as GeoJSON
        if ($include->contains('geom'))   $query->selectRaw('ST_AsGeoJSON(geom)  AS geom_geojson');
        if ($include->contains('bounds')) $query->selectRaw('ST_AsGeoJSON(bbox)  AS bbox_geojson');

        $rows = $query->get();

        return response()->json([
            'data' => $rows,
        ]);
    }

    // GET /api/layers/active?body_type=lake&body_id=1
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

    // POST /api/layers
    public function store(StoreLayerRequest $request)
    {
        $this->requireSuperAdmin($request);

        $data = $request->validated();

        return DB::transaction(function () use ($request, $data) {
            // Create row without geometry first
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
                'is_active'       => (bool)($data['is_active'] ?? false),
                'status'          => $data['status']      ?? 'ready',
                'version'         => (int)($data['version'] ?? 1),
                'notes'           => $data['notes']       ?? null,
                'source_type'     => $data['source_type'] ?? 'geojson',
            ]);
            $layer->save();

            // Geometry: accept GeoJSON geometry or Feature
            $geomJson = $this->extractGeometryJson($data['geom_geojson']);
            $srid     = (int)($data['srid'] ?? 4326);

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

    // PATCH /api/layers/{id}
    public function update(UpdateLayerRequest $request, int $id)
    {
        $this->requireSuperAdmin($request);

        $layer = Layer::findOrFail($id);
        $data  = $request->validated();

        // Basic fields
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

        return DB::transaction(function () use ($layer, $data) {
            $activating = array_key_exists('is_active', $data) && (bool)$data['is_active'] === true;
            $layer->save();

            // Optional geometry replacement
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

    // DELETE /api/layers/{id}
    public function destroy(Request $request, int $id)
    {
        $this->requireSuperAdmin($request);

        $layer = Layer::findOrFail($id);
        $layer->delete();

        return response()->json([], 204);
    }
}
