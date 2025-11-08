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
        $q = LakeFlow::query()->with(['lake:id,name', 'creator:id,name']);

        // Search
        if ($search = $request->query('q')) {
            $q->where(function ($query) use ($search) {
                $query->where(DB::raw('LOWER(name)'), 'like', strtolower("%{$search}%"))
                    ->orWhere(DB::raw('LOWER(source)'), 'like', strtolower("%{$search}%"))
                    ->orWhereHas('lake', function ($q) use ($search) {
                        $q->where(DB::raw('LOWER(name)'), 'like', strtolower("%{$search}%"));
                    });
            });
        }

        // Filters
        if ($t = $request->query('type')) {
            $q->where('flow_type', $t);
        }
        if ($lake = $request->query('lake_id')) {
            $q->where('lake_id', $lake);
        }
        if ($primary = $request->query('primary')) {
            $q->where('is_primary', filter_var($primary, FILTER_VALIDATE_BOOLEAN));
        }

        $isCursor = ($request->query('mode') === 'cursor') || $request->filled('cursor');

        if ($isCursor) {
            // Canonical keyset ordering: updated_at DESC, id DESC
            $q->orderByDesc('updated_at')->orderByDesc('id');

            // Apply cursor if provided; format: ISO8601|timestamp:id
            if ($cursor = $request->query('cursor')) {
                $parts = explode(':', $cursor, 2);
                if (count($parts) === 2) {
                    [$cUpdated, $cId] = $parts;
                    // Accept both ISO8601 strings and SQL timestamps
                    if (strtotime($cUpdated) !== false && ctype_digit($cId)) {
                        $q->where(function ($w) use ($cUpdated, $cId) {
                            $w->where('updated_at', '<', $cUpdated)
                              ->orWhere(function ($w2) use ($cUpdated, $cId) {
                                  $w2->where('updated_at', $cUpdated)
                                     ->where('id', '<', (int) $cId);
                              });
                        });
                    }
                }
            }

            $perPage = (int) $request->query('per_page', 10);
            if ($perPage <= 0) $perPage = 10;
            if ($perPage > 100) $perPage = 100;

            $rows = $q->limit($perPage + 1)->get();
            $hasNext = $rows->count() > $perPage;
            $nextCursor = null;
            if ($hasNext) {
                $last = $rows[$perPage - 1];
                $nextCursor = ($last->updated_at ? $last->updated_at->format('Y-m-d H:i:s') : now()->format('Y-m-d H:i:s')).':'.$last->id;
                $rows = $rows->slice(0, $perPage)->values();
            }

            $data = $rows->map(fn($r) => $this->serialize($r));
            return response()->json(['data' => $data, 'meta' => ['per_page' => $perPage, 'next_cursor' => $nextCursor, 'mode' => 'cursor']]);
        }

        // Sort (legacy offset pagination)
        $sortBy = $request->query('sort_by', 'lake_id');
        $sortDir = $request->query('sort_dir', 'asc');
        if ($sortBy === 'lake') {
            $q->orderBy(
                Lake::select('name')->whereColumn('lakes.id', 'lake_flows.lake_id'),
                $sortDir
            );
        } elseif ($sortBy) {
            $q->orderBy($sortBy, $sortDir);
        } else {
            $q->orderBy('lake_id')->orderByDesc('is_primary')->orderBy('flow_type')->orderBy('id');
        }

        // Pagination (legacy)
        $perPage = $request->query('per_page', 10);
        $flows = $q->paginate($perPage);

        // Serialize items
        $flows->getCollection()->transform(fn($r) => $this->serialize($r));

        return $flows;
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
            // latitude/longitude columns removed; derive on the fly when serializing
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
            // latitude/longitude columns removed; derive on the fly when serializing
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
