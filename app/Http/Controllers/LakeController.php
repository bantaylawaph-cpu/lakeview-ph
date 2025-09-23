<?php

namespace App\Http\Controllers;

use App\Models\Lake;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;


class LakeController extends Controller
{
    public function index()
    {
        return Lake::select(
            'id','watershed_id','name','alt_name','region','province','municipality',
            'surface_area_km2','elevation_m','mean_depth_m','class_code','created_at','updated_at'
        )->with(['watershed:id,name','waterQualityClass:code,name'])->orderBy('name')->get();
    }

    public function show(Lake $lake)
    {
        // include GeoJSON from the active layer (default geometry)
        $lake->load('watershed:id,name','waterQualityClass:code,name');
        $active = $lake->activeLayer()
            ->select('id')
            ->selectRaw('ST_AsGeoJSON(geom) as geom_geojson')
            ->first();
        return array_merge($lake->toArray(), ['geom_geojson' => $active->geom_geojson ?? null]);
    }

    public function store(Request $req)
    {
        $data = $req->validate([
            'name' => ['required','string','max:255','unique:lakes,name'],
            'watershed_id' => ['nullable','exists:watersheds,id'],
            'alt_name' => ['nullable','string','max:255'],
            'region' => ['nullable','string','max:255'],
            'province' => ['nullable','string','max:255'],
            'municipality' => ['nullable','string','max:255'],
            'surface_area_km2' => ['nullable','numeric'],
            'elevation_m' => ['nullable','numeric'],
            'mean_depth_m' => ['nullable','numeric'],
            'class_code' => ['nullable','string','max:10', Rule::exists('water_quality_classes','code')],
        ]);
        $lake = Lake::create($data);
        return response()->json($lake->load('watershed:id,name','waterQualityClass:code,name'), 201);
    }

    public function update(Request $req, Lake $lake)
    {
        $data = $req->validate([
            'name' => ['required','string','max:255', Rule::unique('lakes','name')->ignore($lake->id)],
            'watershed_id' => ['nullable','exists:watersheds,id'],
            'alt_name' => ['nullable','string','max:255'],
            'region' => ['nullable','string','max:255'],
            'province' => ['nullable','string','max:255'],
            'municipality' => ['nullable','string','max:255'],
            'surface_area_km2' => ['nullable','numeric'],
            'elevation_m' => ['nullable','numeric'],
            'mean_depth_m' => ['nullable','numeric'],
            'class_code' => ['nullable','string','max:10', Rule::exists('water_quality_classes','code')],
        ]);
        $lake->update($data);
        return $lake->load('watershed:id,name','waterQualityClass:code,name');
    }

    public function destroy(Lake $lake)
    {
        $lake->delete();
        return response()->json(['message' => 'Lake deleted']);
    }
    
    public function publicGeo()
    {
        try {
            // ACTIVE + PUBLIC default layer per lake
            $q = DB::table('lakes as l')
                ->join('layers as ly', function ($j) {
                    $j->on('ly.body_id', '=', 'l.id')
                    ->where('ly.body_type', 'lake')
                    ->where('ly.is_active', true)
                    ->where('ly.visibility', 'public');
                })
                ->leftJoin('watersheds as w', 'w.id', '=', 'l.watershed_id')
                ->whereNotNull('ly.geom')
                ->select(
                    'l.id','l.name','l.alt_name','l.region','l.province','l.municipality',
                    'l.surface_area_km2','l.elevation_m','l.mean_depth_m','l.class_code',
                    'l.created_at','l.updated_at',
                    'w.name as watershed_name',
                    'ly.id as layer_id',
                    DB::raw('ST_AsGeoJSON(ly.geom) as geom_geojson')
                );

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

            if ($region) {
                $q->where('l.region', $region);
            }
            if ($province) {
                $q->where('l.province', $province);
            }
            if ($municipality) {
                $q->where('l.municipality', $municipality);
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

            $rows = $q->get();

            $features = [];
            foreach ($rows as $r) {
                if (!$r->geom_geojson) continue;
                $geom = json_decode($r->geom_geojson, true);
                if (!$geom) continue;

                $features[] = [
                    'type' => 'Feature',
                    'geometry' => $geom,
                    'properties' => [
                        'id'               => $r->id,
                        'name'             => $r->name,
                        'alt_name'         => $r->alt_name,
                        'region'           => $r->region,
                        'province'         => $r->province,
                        'municipality'     => $r->municipality,
                        'watershed_name'   => $r->watershed_name,
                        'surface_area_km2' => $r->surface_area_km2,
                        'elevation_m'      => $r->elevation_m,
                        'mean_depth_m'     => $r->mean_depth_m,
                    ],
                ];
            }

            return response()->json([
                'type' => 'FeatureCollection',
                'features' => $features,
            ]);
        } catch (\Throwable $e) {
            Log::error('publicGeo failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to load public lakes',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}

