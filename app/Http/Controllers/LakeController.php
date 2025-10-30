<?php

namespace App\Http\Controllers;

use App\Models\Lake;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;


class LakeController extends Controller
{
    public function index()
    {
        $rows = Lake::select(
            'id','watershed_id','name','alt_name','region','province','municipality',
            'surface_area_km2','elevation_m','mean_depth_m','class_code','coordinates','created_at','updated_at',
            'flows_status'
        )->with(['watershed:id,name','waterQualityClass:code,name'])->orderBy('name')->get();

        return $rows->map(function($lake){
            $arr = $lake->toArray();
            // Provide legacy single-value compatibility (region, province, municipality)
            // but return comma-separated string for forms and keep full list as *_list
            if (is_array($arr['region'])) {
                $arr['region_list'] = $arr['region'];
                $arr['region'] = count($arr['region']) ? implode(', ', $arr['region']) : null;
            }
            if (is_array($arr['province'])) {
                $arr['province_list'] = $arr['province'];
                $arr['province'] = count($arr['province']) ? implode(', ', $arr['province']) : null;
            }
            if (is_array($arr['municipality'])) {
                $arr['municipality_list'] = $arr['municipality'];
                $arr['municipality'] = count($arr['municipality']) ? implode(', ', $arr['municipality']) : null;
            }
            // Extract lat/lon from coordinates geom
            $latLon = $lake->lat_lon;
            if ($latLon) {
                $arr['lat'] = $latLon[0];
                $arr['lon'] = $latLon[1];
            } else {
                $arr['lat'] = null;
                $arr['lon'] = null;
            }
            return $arr;
        });
    }

    public function show(Lake $lake)
    {
        // include GeoJSON from the active layer (default geometry)
        $lake->load('watershed:id,name','waterQualityClass:code,name');
        $active = $lake->activeLayer()
            ->select('id')
            ->selectRaw('ST_AsGeoJSON(geom) as geom_geojson')
            ->first();
        $arr = $lake->toArray();
        // Return comma-separated string for form fields and keep full list in *_list
        if (is_array($arr['region'])) {
            $arr['region_list'] = $arr['region'];
            $arr['region'] = count($arr['region']) ? implode(', ', $arr['region']) : null;
        }
        if (is_array($arr['province'])) {
            $arr['province_list'] = $arr['province'];
            $arr['province'] = count($arr['province']) ? implode(', ', $arr['province']) : null;
        }
        if (is_array($arr['municipality'])) {
            $arr['municipality_list'] = $arr['municipality'];
            $arr['municipality'] = count($arr['municipality']) ? implode(', ', $arr['municipality']) : null;
        }
        if (!$active || !$active->geom_geojson) {
            $row = DB::table('lakes')->where('id',$lake->id)->selectRaw('ST_AsGeoJSON(coordinates) as gj')->first();
            $coordGeo = $row->gj ?? null;
        } else {
            $coordGeo = $active->geom_geojson;
        }
        return array_merge($arr, ['geom_geojson' => $coordGeo]);
    }

    public function store(Request $req)
    {
        $data = $req->validate([
            'name' => ['required','string','max:255','unique:lakes,name'],
            'watershed_id' => ['nullable','exists:watersheds,id'],
            'alt_name' => ['nullable','string','max:255'],
            // Accept either a string (possibly comma-separated) or an array of strings
            'region' => ['nullable'],
            'province' => ['nullable'],
            'municipality' => ['nullable'],
            'surface_area_km2' => ['nullable','numeric'],
            'elevation_m' => ['nullable','numeric'],
            'mean_depth_m' => ['nullable','numeric'],
            'class_code' => ['nullable','string','max:10', Rule::exists('water_quality_classes','code')],
            'lat' => ['nullable','numeric','between:-90,90'],
            'lon' => ['nullable','numeric','between:-180,180'],
            'flows_status' => ['nullable', Rule::in(['unknown','none','present'])],
        ]);

        // Normalize multi-location fields
        foreach (['region','province','municipality'] as $field) {
            if (array_key_exists($field, $data)) {
                $val = $data[$field];
                if (is_string($val)) {
                    $val = trim($val);
                    $data[$field] = $val === '' ? null : array_values(array_unique(array_filter(array_map('trim', explode(',', $val)))));
                } elseif (is_array($val)) {
                    $data[$field] = array_values(array_unique(array_filter(array_map(function($v){return is_string($v)?trim($v):$v;}, $val))));
                    if (empty($data[$field])) $data[$field] = null;
                }
            }
        }
        $lat = $data['lat'] ?? null; $lon = $data['lon'] ?? null; unset($data['lat'],$data['lon']);
        if ($lat !== null && $lon !== null) {
            $data['coordinates'] = DB::raw("ST_SetSRID(ST_MakePoint($lon,$lat),4326)");
        }
        $lake = Lake::create($data);
        // Bust public lake caches
        try { $v = (int) Cache::get('ver:public:lakes', 1); Cache::forever('ver:public:lakes', $v + 1); } catch (\Throwable $e) {}
        return response()->json($lake->load('watershed:id,name','waterQualityClass:code,name'), 201);
    }

    public function update(Request $req, Lake $lake)
    {
        $data = $req->validate([
            'name' => ['required','string','max:255', Rule::unique('lakes','name')->ignore($lake->id)],
            'watershed_id' => ['nullable','exists:watersheds,id'],
            'alt_name' => ['nullable','string','max:255'],
            'region' => ['nullable'],
            'province' => ['nullable'],
            'municipality' => ['nullable'],
            'surface_area_km2' => ['nullable','numeric'],
            'elevation_m' => ['nullable','numeric'],
            'mean_depth_m' => ['nullable','numeric'],
            'class_code' => ['nullable','string','max:10', Rule::exists('water_quality_classes','code')],
            'lat' => ['nullable','numeric','between:-90,90'],
            'lon' => ['nullable','numeric','between:-180,180'],
            'flows_status' => ['nullable', Rule::in(['unknown','none','present'])],
        ]);
        foreach (['region','province','municipality'] as $field) {
            if (array_key_exists($field, $data)) {
                $val = $data[$field];
                if (is_string($val)) {
                    $val = trim($val);
                    $data[$field] = $val === '' ? null : array_values(array_unique(array_filter(array_map('trim', explode(',', $val)))));
                } elseif (is_array($val)) {
                    $data[$field] = array_values(array_unique(array_filter(array_map(function($v){return is_string($v)?trim($v):$v;}, $val))));
                    if (empty($data[$field])) $data[$field] = null;
                }
            }
        }
        $lat = $data['lat'] ?? null; $lon = $data['lon'] ?? null; unset($data['lat'],$data['lon']);
        if ($lat !== null && $lon !== null) {
            $data['coordinates'] = DB::raw("ST_SetSRID(ST_MakePoint($lon,$lat),4326)");
        }
        $lake->update($data);
        // Bust public lake caches
        try { $v = (int) Cache::get('ver:public:lakes', 1); Cache::forever('ver:public:lakes', $v + 1); } catch (\Throwable $e) {}
        return $lake->load('watershed:id,name','waterQualityClass:code,name');
    }

    public function destroy(Lake $lake)
    {
        $lake->delete();
        // Bust public lake caches
        try { $v = (int) Cache::get('ver:public:lakes', 1); Cache::forever('ver:public:lakes', $v + 1); } catch (\Throwable $e) {}
        return response()->json(['message' => 'Lake deleted']);
    }

    /**
     * Upload or replace a lake's image. Stores on public disk and saves relative path to image_path.
     */
    public function uploadImage(Request $request, Lake $lake)
    {
        $validated = $request->validate([
            'image' => ['required','file','mimes:jpg,jpeg,png,webp','max:5120'], // up to 5MB
        ]);

        $file = $request->file('image');
        $dir = 'lakes/' . $lake->id;
        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $safeName = Str::slug($lake->name ?: ('lake-'.$lake->id));
        $filename = $safeName . '-' . now()->format('Ymd-His') . '-' . substr(bin2hex(random_bytes(4)),0,8) . '.' . $ext;

        // Delete previous file if exists (best-effort)
        if ($lake->image_path) {
            try { Storage::disk('public')->delete($lake->image_path); } catch (\Throwable $e) { /* ignore */ }
        }

        $stored = Storage::disk('public')->putFileAs($dir, $file, $filename);
        $path = $stored ?: ($dir . '/' . $filename);
        $lake->image_path = $path;
        $lake->save();

        return response()->json([
            'id' => $lake->id,
            'image' => asset('storage/'.$path),
            'image_path' => $path,
            'message' => 'Image uploaded',
        ], 201);
    }
    
    public function publicGeo()
    {
        try {
            // Cache heavy public geo listing keyed by filters + a version bump.
            $ver = (int) Cache::get('ver:public:lakes', 1);
            $qs = request()->query(); ksort($qs);
            $cacheKey = 'public:lakes-geo:v'.$ver.':'.md5(json_encode($qs));
            $ttl = now()->addMinutes(30);
            $cached = Cache::get($cacheKey);
            if ($cached) return response()->json($cached);

            // Active + public layer geometry preferred; fallback to lake.coordinates (Point)
            $q = DB::table('lakes as l')
                ->leftJoin('layers as ly', function ($j) {
                    $j->on('ly.body_id', '=', 'l.id')
                      ->where('ly.body_type', 'lake')
                      ->where('ly.is_active', true)
                      ->where('ly.visibility', 'public');
                })
                ->leftJoin('watersheds as w', 'w.id', '=', 'l.watershed_id')
                // Any PUBLIC layer uploader tenant (for org filtering), independent of active layer
                ->leftJoin('layers as lypub', function ($j) {
                    $j->on('lypub.body_id', '=', 'l.id')
                      ->where('lypub.body_type', 'lake')
                      ->where('lypub.visibility', 'public');
                })
                ->leftJoin('users as upub', 'upub.id', '=', 'lypub.uploaded_by')
                ->leftJoin('roles as rpub', 'rpub.id', '=', 'upub.role_id')
                ->leftJoin('tenants as tpub', 'tpub.id', '=', 'upub.tenant_id')
                ->select(
                    'l.id','l.name','l.alt_name','l.region','l.province','l.municipality',
                    'l.surface_area_km2','l.elevation_m','l.mean_depth_m','l.class_code',
                    'l.created_at','l.updated_at',
                    'w.name as watershed_name',
                    'ly.id as layer_id',
                    DB::raw('CASE WHEN ly.geom IS NOT NULL THEN ST_AsGeoJSON(ly.geom) ELSE ST_AsGeoJSON(l.coordinates) END as geom_geojson')
                )
                ->where(function($qq){
                    $qq->whereNotNull('ly.geom')->orWhereNotNull('l.coordinates');
                });

            // Server-side filter parameters (all optional)
            $region = request()->query('region');
            $province = request()->query('province');
            $municipality = request()->query('municipality');
            $class_code = request()->query('class_code');

            $surface_min = request()->query('surface_area_min');
            $surface_max = request()->query('surface_area_max');
            $elevation_min = request()->query('elevation_min');
            $elevation_max = request()->query('elevation_max');
            $depth_min = request()->query('mean_depth_min');
            $depth_max = request()->query('mean_depth_max');

            // Robust JSON array filtering (Postgres) with graceful fallback
            $driver = DB::getDriverName();
            if ($region) {
                $q->where(function($qq) use ($region, $driver) {
                    if ($driver === 'pgsql') {
                        // When column is a JSONB array: l.region @> '["RegionName"]'
                        $qq->whereRaw("(jsonb_typeof(l.region) = 'array' AND l.region @> ?::jsonb)", [json_encode([$region])])
                           ->orWhereRaw("(jsonb_typeof(l.region) <> 'array' AND l.region::text = ?)", [$region]);
                    } else {
                        // MySQL / others: rely on whereJsonContains if available
                        $qq->whereJsonContains('l.region', $region)->orWhere('l.region', $region);
                    }
                });
            }
            if ($province) {
                $q->where(function($qq) use ($province, $driver) {
                    if ($driver === 'pgsql') {
                        $qq->whereRaw("(jsonb_typeof(l.province) = 'array' AND l.province @> ?::jsonb)", [json_encode([$province])])
                           ->orWhereRaw("(jsonb_typeof(l.province) <> 'array' AND l.province::text = ?)", [$province]);
                    } else {
                        $qq->whereJsonContains('l.province', $province)->orWhere('l.province', $province);
                    }
                });
            }
            if ($municipality) {
                $q->where(function($qq) use ($municipality, $driver) {
                    if ($driver === 'pgsql') {
                        $qq->whereRaw("(jsonb_typeof(l.municipality) = 'array' AND l.municipality @> ?::jsonb)", [json_encode([$municipality])])
                           ->orWhereRaw("(jsonb_typeof(l.municipality) <> 'array' AND l.municipality::text = ?)", [$municipality]);
                    } else {
                        $qq->whereJsonContains('l.municipality', $municipality)->orWhere('l.municipality', $municipality);
                    }
                });
            }
            if ($class_code) {
                $q->where('l.class_code', $class_code);
            }

            if (is_numeric($surface_min)) {
                $q->where('l.surface_area_km2', '>=', (float)$surface_min);
            }
            if (is_numeric($surface_max)) {
                $q->where('l.surface_area_km2', '<=', (float)$surface_max);
            }

            if (is_numeric($elevation_min)) {
                $q->where('l.elevation_m', '>=', (float)$elevation_min);
            }
            if (is_numeric($elevation_max)) {
                $q->where('l.elevation_m', '<=', (float)$elevation_max);
            }

            if (is_numeric($depth_min)) {
                $q->where('l.mean_depth_m', '>=', (float)$depth_min);
            }
            if (is_numeric($depth_max)) {
                $q->where('l.mean_depth_m', '<=', (float)$depth_max);
            }

            // Optional: filter by organization/tenant handling the active public layer
            $tenantId = request()->query('tenant_id');
            $orgName = request()->query('org');
            if (is_numeric($tenantId)) {
                $q->where('tpub.id', (int)$tenantId);
            } elseif ($orgName) {
                $q->where('tpub.name', 'ILIKE', '%' . $orgName . '%');
            }

            $rows = $q->get();

            $features = [];
            foreach ($rows as $r) {
                if (!$r->geom_geojson) continue;
                $geom = json_decode($r->geom_geojson, true);
                if (!$geom) continue;

                // Keep original array values and also provide comma-separated strings for form-friendly clients
                $propRegion = is_array($r->region) ? (count($r->region) ? implode(', ', $r->region) : null) : $r->region;
                $propProvince = is_array($r->province) ? (count($r->province) ? implode(', ', $r->province) : null) : $r->province;
                $propMunicipality = is_array($r->municipality) ? (count($r->municipality) ? implode(', ', $r->municipality) : null) : $r->municipality;

                $features[] = [
                    'type' => 'Feature',
                    'geometry' => $geom,
                    'properties' => [
                        'id'               => $r->id,
                        'name'             => $r->name,
                        'alt_name'         => $r->alt_name,
                        'region_list'      => $r->region,
                        'region'           => $propRegion,
                        'province_list'    => $r->province,
                        'province'         => $propProvince,
                        'municipality_list'=> $r->municipality,
                        'municipality'     => $propMunicipality,
                        'watershed_name'   => $r->watershed_name,
                        'surface_area_km2' => $r->surface_area_km2,
                        'elevation_m'      => $r->elevation_m,
                        'mean_depth_m'     => $r->mean_depth_m,
                        'geometry_source'  => $r->layer_id ? 'layer' : 'coordinates',
                        'layer_id'         => $r->layer_id,
                    ],
                ];
            }

            $payload = [
                'type' => 'FeatureCollection',
                'features' => $features,
            ];
            Cache::put($cacheKey, $payload, $ttl);
            return response()->json($payload);
        } catch (\Throwable $e) {
            Log::error('publicGeo failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to load public lakes',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // Public single-lake detail: mirrors show() but intended for unauthenticated clients
    public function publicShow(Lake $lake)
    {
        // Cache single-lake public detail (includes active layer geom)
        $ver = (int) Cache::get('ver:public:lakes', 1);
        $cacheKey = 'public:lake-detail:v'.$ver.':'.$lake->id;
        if ($hit = Cache::get($cacheKey)) return $hit;

        $lake->load('watershed:id,name','waterQualityClass:code,name');
        $active = $lake->activeLayer()
            ->select('id')
            ->selectRaw('ST_AsGeoJSON(geom) as geom_geojson')
            ->first();
        $arr = $lake->toArray();
        if (is_array($arr['region'])) {
            $arr['region_list'] = $arr['region'];
            $arr['region'] = $arr['region'][0] ?? null;
        }
        if (is_array($arr['province'])) {
            $arr['province_list'] = $arr['province'];
            $arr['province'] = $arr['province'][0] ?? null;
        }
        if (is_array($arr['municipality'])) {
            $arr['municipality_list'] = $arr['municipality'];
            $arr['municipality'] = $arr['municipality'][0] ?? null;
        }
        if (!$active || !$active->geom_geojson) {
            $row = DB::table('lakes')->where('id',$lake->id)->selectRaw('ST_AsGeoJSON(coordinates) as gj')->first();
            $coordGeo = $row->gj ?? null;
        } else {
            $coordGeo = $active->geom_geojson;
        }
        $res = array_merge($arr, ['geom_geojson' => $coordGeo]);
        Cache::put($cacheKey, $res, now()->addMinutes(30));
        return $res;
    }
}
