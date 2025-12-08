<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLayerRequest;
use App\Http\Requests\UpdateLayerRequest;
use App\Models\Layer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
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
            // Filters (all optional)
            'body_type'   => 'nullable|string|in:lake,watershed',
            'body_id'     => 'nullable|integer|min:1',
            'visibility'  => 'nullable|string|in:public,admin,organization,organization_admin',
            'downloadable'=> 'nullable|string', // yes|no|1|0|true|false
            'created_by'  => 'nullable|string',
            'q'           => 'nullable|string',
            'include'     => 'nullable|string',
            // Cursor pagination parameters are ignored; kept for backward compatibility
            'mode'        => 'nullable|string',
            'cursor'      => 'nullable|string',
            // Pagination + sorting
            'page'        => 'nullable|integer|min:1',
            'per_page'    => 'nullable|integer|min:1|max:100',
            'sort_by'     => 'nullable|string',
            'sort_dir'    => 'nullable|string|in:asc,desc',
        ]);

        $include = collect(explode(',', (string) $request->query('include')))
            ->map(fn($s) => trim($s))->filter()->values();

        $query = Layer::query();

        // Optional scoping by body
        $bt = $request->query('body_type');
        $bid = $request->query('body_id');
        if ($bt !== null && $bt !== '') {
            $query->where('layers.body_type', $bt);
        }
        if ($bid !== null && $bid !== '') {
            $query->where('layers.body_id', (int) $bid);
        }

        // Note: tenant-based scoping has been removed. Org Admins no longer create/manage layers.

        // Filters
        $vis = $request->query('visibility');
        if ($vis !== null && $vis !== '') {
            // Normalize legacy values to 'admin'
            $vv = strtolower(trim($vis));
            if (in_array($vv, ['organization','organization_admin'], true)) $vv = 'admin';
            $query->whereRaw("LOWER(TRIM(layers.visibility)) = ?", [$vv]);
        }
        $dl = $request->query('downloadable');
        if ($dl !== null && $dl !== '') {
            $yes = ['1','true','yes'];
            $no  = ['0','false','no'];
            $val = strtolower(trim((string)$dl));
            // Use Postgres-safe boolean comparisons
            if (in_array($val, $yes, true)) {
                $query->whereRaw('layers.is_downloadable IS TRUE');
            } elseif (in_array($val, $no, true)) {
                $query->whereRaw('layers.is_downloadable IS FALSE');
            }
        }
        $createdBy = $request->query('created_by');
        if ($createdBy !== null && $createdBy !== '') {
            // Use joined uploader column for exact match
            $query->whereRaw(
                "LOWER(COALESCE(u_uploaded.name, '')) = ?",
                [strtolower(trim($createdBy))]
            );
        }

        // Search
        if (($q = $request->query('q')) !== null && $q !== '') {
            $needle = '%' . strtolower(trim($q)) . '%';
            $query->where(function ($qq) use ($needle) {
                $qq->whereRaw("LOWER(COALESCE(layers.name, '')) LIKE ?", [$needle])
                   ->orWhereRaw("LOWER(COALESCE(layers.notes, '')) LIKE ?", [$needle])
                   ->orWhereRaw("LOWER(COALESCE(u_uploaded.name, '')) LIKE ?", [$needle])
                   ->orWhereRaw("LOWER(COALESCE(layers.body_type, '')) LIKE ?", [$needle])
                   ->orWhereRaw("LOWER(COALESCE(layers.visibility, '')) LIKE ?", [$needle]);
            });
        }

        // Join uploader once (faster than per-row subquery) and base select
        $query->leftJoin('users as u_uploaded', 'u_uploaded.id', '=', 'layers.uploaded_by');

        // Always use standard (offset) pagination selection for compatibility
        $query->select('layers.*');
        $query->addSelect(DB::raw("COALESCE(u_uploaded.name, '') AS uploaded_by_name"));
        if ($include->contains('geom'))   $query->selectRaw('ST_AsGeoJSON(geom)  AS geom_geojson');
        if ($include->contains('bounds')) $query->selectRaw('ST_AsGeoJSON(ST_Envelope(geom))  AS bbox_geojson');

        // Sorting (default newest first)
        $allowedSort = [
            'name' => 'layers.name',
            'body' => 'layers.body_type',
            'body_type' => 'layers.body_type',
            'visibility' => 'layers.visibility',
            'downloadable' => 'layers.is_downloadable',
            'is_downloadable' => 'layers.is_downloadable',
            // now that we join, sort using joined column
            'creator' => 'u_uploaded.name',
            'uploaded_by_name' => 'u_uploaded.name',
            'updated' => 'layers.updated_at',
            'updated_at' => 'layers.updated_at',
            'created_at' => 'layers.created_at',
        ];
        $sortBy  = $request->query('sort_by');
        $sortDir = strtolower($request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        if ($sortBy && isset($allowedSort[$sortBy])) {
            $query->orderBy($allowedSort[$sortBy], $sortDir);
        } else {
            $query->orderByDesc('layers.created_at');
        }

        // Legacy offset pagination path only
        $perPage = (int)($request->query('per_page') ?: 15);
        if ($perPage < 1) $perPage = 15;
        if ($perPage > 100) $perPage = 100;
        $paginator = $query->paginate($perPage);
        return response()->json($paginator);
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
            ->whereRaw("LOWER(TRIM(layers.visibility)) = 'public'")
            ->whereRaw("LOWER(TRIM(layers.body_type)) = ?", [strtolower($request->query('body_type'))])
            ->where('layers.body_id', (int)$request->query('body_id'))
            ->orderByDesc('layers.created_at');

    $query->select(['layers.id','layers.name','layers.notes','layers.is_downloadable','layers.created_at','layers.updated_at']);
        $query->addSelect(DB::raw("COALESCE(users.name, '') AS uploaded_by_name"));

    if ($include->contains('bounds')) $query->selectRaw('ST_AsGeoJSON(ST_Envelope(geom)) AS bbox_geojson');
        // Cache list per body + include with version bump
        $ver = (int) Cache::get('ver:public:layers', 1);
        $bt = strtolower((string)$request->query('body_type'));
        $bid = (int)$request->query('body_id');
        $inc = (string)$request->query('include');
        $key = sprintf('public:layers:list:v%d:%s:%d:%s', $ver, $bt, $bid, md5($inc));
        if ($cached = Cache::get($key)) return response()->json(['data' => $cached]);
        $rows = $query->get();
        Cache::put($key, $rows, now()->addMinutes(10));
        return response()->json(['data' => $rows]);
    }

    // NEW: Public show — returns geometry for a single PUBLIC layer
    public function publicShow(Request $request, int $id)
    {
        $include = collect(explode(',', (string) $request->query('include')))
            ->map(fn($s)=>trim($s))->filter()->values();
        $q = Layer::query()
            ->leftJoin('users', 'users.id', '=', 'layers.uploaded_by')
            ->where('layers.id', $id)
            ->where('layers.visibility', 'public');

    $q->select(['layers.id','layers.body_type','layers.body_id','layers.name','layers.notes','layers.is_downloadable','layers.created_at','layers.updated_at']);
        $q->addSelect(DB::raw("COALESCE(users.name, '') AS uploaded_by_name"));
        if ($include->contains('geom'))   $q->selectRaw('ST_AsGeoJSON(geom)  AS geom_geojson');
    if ($include->contains('bounds')) $q->selectRaw('ST_AsGeoJSON(ST_Envelope(geom))  AS bbox_geojson');
        $ver = (int) Cache::get('ver:public:layers', 1);
        $inc = (string)$request->query('include');
        $key = sprintf('public:layers:geo:v%d:%d:%s', $ver, (int)$id, md5($inc));
        if ($c = Cache::get($key)) return response()->json(['data' => $c]);
        $row = $q->first();
        if (!$row) return response()->json(['data' => null], 404);
        Cache::put($key, $row, now()->addHours(24));
        return response()->json(['data' => $row]);
    }


    public function active(Request $request)
    {
        $request->validate(['body_type'=>'required|string|in:lake,watershed','body_id'=>'required|integer|min:1']);
        $row = Layer::where('body_type', $request->query('body_type'))
            ->where('body_id', (int)$request->query('body_id'))
            ->select('*')
            ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
            ->first();
        return response()->json(['data' => $row]);
    }

    public function store(StoreLayerRequest $request)
    {
        $user = $request->user();
        $role = $this->resolveRole($user);
        if ($role !== Role::SUPERADMIN) {
            abort(403, 'Only Super Administrators may create layers.');
        }
                $data = $request->validated();
                $visibility = $data['visibility'] ?? 'public';
                if (in_array($visibility, ['organization','organization_admin'], true)) $visibility = 'admin';
                if (!in_array($visibility, ['public','admin'], true)) {
                        throw ValidationException::withMessages(['visibility' => ['Visibility must be Public or Admin.']]);
                }
                $data['visibility'] = $visibility;
                $data['is_downloadable'] = (bool)($data['is_downloadable'] ?? false);

                // Use transaction: create row first (without geom), then set geometry via PostGIS SQL
                return DB::transaction(function () use ($data, $user) {
                        $layer = new Layer();
            $layer->fill([
                                'body_type'   => $data['body_type'],
                                'body_id'     => (int)$data['body_id'],
                                'name'        => $data['name'],
                                'srid'        => (int)($data['srid']  ?? 4326),
                'visibility'  => $data['visibility']  ?? 'public',
                'is_downloadable' => (bool)($data['is_downloadable'] ?? false),
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

            // With one-layer-per-body enforced by DB, no need to toggle actives

                        $fresh = Layer::whereKey($layer->id)
                                ->select('*')
                                ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
                                ->first();
                        // Bump public caches for layers and lakes (active geometry may change)
                        try {
                            $v1 = (int) Cache::get('ver:public:layers', 1); Cache::forever('ver:public:layers', $v1 + 1);
                            $v2 = (int) Cache::get('ver:public:lakes', 1);  Cache::forever('ver:public:lakes',  $v2 + 1);
                        } catch (\Throwable $e) {}
                        return response()->json(['data' => $fresh], 201);
                });
    }

    public function update(UpdateLayerRequest $request, Layer $layer)
    {
        $user = $request->user();
        $role = $this->resolveRole($user);
        if ($role !== Role::SUPERADMIN) {
            abort(403, 'Only Super Administrators may update layers.');
        }
        $data = $request->validated();
        // Superadmin normalization for visibility
        $visibility = $data['visibility'] ?? $layer->visibility;
        if (in_array($visibility, ['organization','organization_admin'], true)) $visibility = 'admin';
        if (!in_array($visibility, ['public','admin'], true)) {
            throw ValidationException::withMessages(['visibility' => ['Visibility must be Public or Admin.']]);
        }
        $data['visibility'] = $visibility;
        if (array_key_exists('is_downloadable', $data)) {
            $data['is_downloadable'] = (bool)$data['is_downloadable'];
        }

                // Save basic fields first
                $layer->fill($data);

        return DB::transaction(function () use ($layer, $data, $role) {
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

            // No active toggling needed under one-layer-per-body

                        $fresh = Layer::whereKey($layer->id)
                                ->select('*')
                                ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
                                ->first();
                        // Bump public caches for layers and lakes
                        try {
                            $v1 = (int) Cache::get('ver:public:layers', 1); Cache::forever('ver:public:layers', $v1 + 1);
                            $v2 = (int) Cache::get('ver:public:lakes', 1);  Cache::forever('ver:public:lakes',  $v2 + 1);
                        } catch (\Throwable $e) {}
                        return response()->json(['data' => $fresh]);
                });
    }

    public function destroy(Request $request, Layer $layer)
    {
        $user = $request->user();
        $role = $this->resolveRole($user);
        if ($role !== Role::SUPERADMIN) abort(403);
        $layer->delete();
        try {
            $v1 = (int) Cache::get('ver:public:layers', 1); Cache::forever('ver:public:layers', $v1 + 1);
            $v2 = (int) Cache::get('ver:public:lakes', 1);  Cache::forever('ver:public:lakes',  $v2 + 1);
        } catch (\Throwable $e) {}
        return response()->json([], 204);
    }

    /**
     * Download a layer in a given vector format (geojson|kml).
     * Auth required; layer must be marked is_downloadable and visibility rules apply.
     */
    public function download(Request $request, int $id)
    {
        $format = strtolower($request->query('format', 'geojson'));
        if (!in_array($format, ['geojson','kml'], true)) {
            return response()->json(['error' => 'Unsupported format. Allowed: geojson,kml'], 422);
        }

        $user = $request->user();
        if (!$user) abort(401);
        $role = $this->resolveRole($user);

        $layer = Layer::query()->where('id', $id)->first();
        if (!$layer) return response()->json(['error' => 'Not found'], 404);
        if (!$layer->is_downloadable) abort(403, 'Downloads disabled for this layer.');

        // Visibility gate: public always ok; admin requires privileged role (superadmin/org_admin) or uploader tenant match.
        if ($layer->visibility !== Layer::VIS_PUBLIC) {
            if (!in_array($role, [Role::SUPERADMIN, Role::ORG_ADMIN], true)) {
                abort(403, 'Forbidden');
            }
        }

        // Build payload from DB.
        $row = Layer::whereKey($layer->id)
            ->select('*')
            ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
            ->first();
        if (!$row || !$row->geom_geojson) return response()->json(['error' => 'Geometry missing'], 500);

        if ($format === 'geojson') {
            $feature = [
                'type' => 'Feature',
                'geometry' => json_decode($row->geom_geojson, true),
                'properties' => [
                    'id' => $row->id,
                    'name' => $row->name,
                    'notes' => $row->notes,
                    'body_type' => $row->body_type,
                    'body_id' => $row->body_id,
                    'srid' => $row->srid,
                ],
            ];
            return response()->json($feature)
                ->header('Content-Disposition', 'attachment; filename="layer-'.$row->id.'.geojson"');
        }

                if ($format === 'kml') {
                        // Generate KML document. ST_AsKML returns only the geometry fragment, so we wrap it.
                        $kmlGeom = DB::table('layers')
                                ->where('id', $layer->id)
                                ->selectRaw('ST_AsKML(geom) AS kml')
                                ->value('kml');
                        if (!$kmlGeom) return response()->json(['error' => 'Geometry conversion failed'], 500);

                        $name = htmlspecialchars($row->name ?? ('Layer '.$row->id), ENT_XML1 | ENT_COMPAT, 'UTF-8');
                        // Build well‑formed KML (no stray literal \n sequences)
                        $kmlDoc = <<<KML
                                    <?xml version="1.0" encoding="UTF-8"?>
                                    <kml xmlns="http://www.opengis.net/kml/2.2">
                                        <Document>
                                            <name>{$name}</name>
                                            <Placemark>
                                                <name>{$name}</name>
                                                {$kmlGeom}
                                            </Placemark>
                                        </Document>
                                    </kml>
                                    KML;
                        return response($kmlDoc, 200, [
                                'Content-Type' => 'application/vnd.google-earth.kml+xml; charset=UTF-8',
                                'Content-Disposition' => 'attachment; filename="layer-'.$row->id.'.kml"'
                        ]);
                }

        abort(500, 'Unhandled format');
    }
}
