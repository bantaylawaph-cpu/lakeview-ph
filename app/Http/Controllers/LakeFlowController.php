<?php

namespace App\Http\Controllers;

use App\Models\LakeFlow;
use App\Models\Lake;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class LakeFlowController extends Controller
{
    // Public list (optionally by lake)
    public function publicIndex(Request $request)
    {
        $lakeId = $request->query('lake_id');
        $q = LakeFlow::query()->with(['lake:id,name']);
        if ($lakeId) $q->where('lake_id', $lakeId);
        $rows = $q->orderBy('lake_id')->orderBy('flow_type')->get();
        return $rows->map(fn($r) => $this->serialize($r));
    }

    public function publicShow(LakeFlow $flow)
    {
        $flow->load('lake:id,name');
        return $this->serialize($flow);
    }

    // Admin list
    public function index(Request $request)
    {
        $q = LakeFlow::query()->with(['lake:id,name','creator:id,name']);
        if ($t = $request->query('type')) $q->where('flow_type', $t);
        if ($lake = $request->query('lake_id')) $q->where('lake_id', $lake);
        if ($primary = $request->query('primary')) $q->where('is_primary', filter_var($primary, FILTER_VALIDATE_BOOLEAN));
        $rows = $q->orderBy('lake_id')->orderByDesc('is_primary')->orderBy('flow_type')->orderBy('id')->get();
        return [ 'data' => $rows->map(fn($r) => $this->serialize($r)) ];
    }

    public function show(LakeFlow $flow)
    {
        $flow->load(['lake:id,name','creator:id,name']);
        return $this->serialize($flow);
    }

    public function store(Request $req)
    {
        $data = $req->validate([
            'lake_id' => ['required','exists:lakes,id'],
            'flow_type' => ['required','in:inflow,outflow'],
            'name' => ['required','string','max:255'],
            'alt_name' => ['nullable','string','max:255'],
            'source' => ['required','string','max:255'],
            'is_primary' => ['boolean'],
            'notes' => ['nullable','string'],
            'lat' => ['required','numeric','between:-90,90'],
            'lon' => ['required','numeric','between:-180,180'],
        ]);
        $lat = $data['lat'] ?? null; $lon = $data['lon'] ?? null; unset($data['lat'],$data['lon']);
        if ($lat !== null && $lon !== null) {
            $data['coordinates'] = DB::raw("ST_SetSRID(ST_MakePoint($lon,$lat),4326)");
            $data['latitude'] = $lat; $data['longitude'] = $lon;
        }
        $data['created_by'] = Auth::id();
        $flow = LakeFlow::create($data);
        $flow->load(['lake:id,name','creator:id,name']);
        return response()->json($this->serialize($flow), 201);
    }

    public function update(Request $req, LakeFlow $flow)
    {
        $data = $req->validate([
            'lake_id' => ['required','exists:lakes,id'],
            'flow_type' => ['required','in:inflow,outflow'],
            'name' => ['required','string','max:255'],
            'alt_name' => ['nullable','string','max:255'],
            'source' => ['required','string','max:255'],
            'is_primary' => ['boolean'],
            'notes' => ['nullable','string'],
            'lat' => ['required','numeric','between:-90,90'],
            'lon' => ['required','numeric','between:-180,180'],
        ]);
        $lat = $data['lat'] ?? null; $lon = $data['lon'] ?? null; unset($data['lat'],$data['lon']);
        if ($lat !== null && $lon !== null) {
            $data['coordinates'] = DB::raw("ST_SetSRID(ST_MakePoint($lon,$lat),4326)");
            $data['latitude'] = $lat; $data['longitude'] = $lon;
        }
        $flow->update($data);
        $flow->load(['lake:id,name','creator:id,name']);
        return $this->serialize($flow);
    }

    public function destroy(LakeFlow $flow)
    {
        $flow->delete();
        return response()->json(['message' => 'Flow deleted']);
    }

    protected function serialize(LakeFlow $flow)
    {
        $arr = $flow->toArray();
        // Add lat/lon if geometry exists but lat/lon not stored (fallback extraction)
        if ((!isset($arr['latitude']) || !$arr['latitude'] || !isset($arr['longitude']) || !$arr['longitude']) && $flow->coordinates) {
            try {
                $row = DB::selectOne('SELECT ST_Y(coordinates) as lat, ST_X(coordinates) as lon FROM lake_flows WHERE id = ?', [$flow->id]);
                if ($row) { $arr['latitude'] = $row->lat; $arr['longitude'] = $row->lon; }
            } catch (\Throwable $e) {}
        }
        return $arr;
    }
}
