<?php

namespace App\Http\Controllers;

use App\Models\Lake;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LakeController extends Controller
{
    public function index()
    {
        return Lake::select(
            'id','watershed_id','name','alt_name','region','province','municipality',
            'surface_area_km2','elevation_m','mean_depth_m','created_at','updated_at'
        )->with('watershed:id,name')->orderBy('name')->get();
    }

    public function show(Lake $lake)
    {
        // include GeoJSON from the active layer (default geometry)
        $lake->load('watershed:id,name');
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
        ]);
        $lake = Lake::create($data);
        return response()->json($lake->load('watershed:id,name'), 201);
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
        ]);
        $lake->update($data);
        return $lake->load('watershed:id,name');
    }

    public function destroy(Lake $lake)
    {
        $lake->delete();
        return response()->json(['message' => 'Lake deleted']);
    }
}
