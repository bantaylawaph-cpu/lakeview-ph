<?php

namespace App\Http\Controllers;

use App\Models\Watershed;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WatershedController extends Controller
{
    public function index()
    {
        return Watershed::select('id','name','description','created_at','updated_at')
            ->orderBy('name')
            ->get();
    }

    public function show(Watershed $watershed)
    {
        $active = $watershed->activeLayer()
            ->select('id')
            ->selectRaw('ST_AsGeoJSON(geom) AS geom_geojson')
            ->first();

        return response()->json([
            'id' => $watershed->id,
            'name' => $watershed->name,
            'description' => $watershed->description,
            'geom_geojson' => $active->geom_geojson ?? null,
            'created_at' => $watershed->created_at,
            'updated_at' => $watershed->updated_at,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required','string','max:255','unique:watersheds,name'],
            'description' => ['nullable','string'],
        ]);

        $watershed = Watershed::create($data);

        return response()->json($watershed, 201);
    }

    public function update(Request $request, Watershed $watershed)
    {
        $data = $request->validate([
            'name' => ['required','string','max:255', Rule::unique('watersheds','name')->ignore($watershed->id)],
            'description' => ['nullable','string'],
        ]);

        $watershed->update($data);

        return $watershed;
    }

    public function destroy(Watershed $watershed)
    {
        $watershed->delete();

        return response()->json(['message' => 'Watershed deleted']);
    }
}