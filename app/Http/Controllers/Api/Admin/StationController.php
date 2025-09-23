<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\ResolvesTenantContext;
use App\Http\Controllers\Controller;
use App\Models\Lake;
use App\Models\Station;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StationController extends Controller
{
    use ResolvesTenantContext;

    public function index(Request $request)
    {
        $context = $this->resolveTenantMembership(
            $request,
            ['org_admin', 'contributor'],
            $request->input('organization_id') ? (int) $request->input('organization_id') : null,
            false
        );

        if (!$context['has_membership'] && !$context['is_superadmin']) {
            abort(403, 'Forbidden');
        }

        if ($context['tenant_id'] === null) {
            abort(422, 'organization_id is required.');
        }

        $tenantId = (int) $context['tenant_id'];

        $query = $this->stationQuery()
            ->where('stations.organization_id', $tenantId)
            ->with('lake:id,name');

        if ($request->filled('lake_id')) {
            $query->where('lake_id', (int) $request->input('lake_id'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        // Org members (org_admin and contributor) see all stations for the organization.
        $stations = $query->orderBy('name')->get();

        return response()->json(['data' => $stations]);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request, false);

        $context = $this->resolveTenantMembership($request, ['org_admin'], $data['organization_id'] ?? null);
        $tenantId = (int) $context['tenant_id'];

        $this->assertLakeExists($data['lake_id']);

        $station = DB::transaction(function () use ($tenantId, $data, $request) {
            $attributes = [
                'organization_id' => $tenantId,
                'lake_id' => $data['lake_id'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ];

            // record creator intentionally omitted — not tracking creator on stations

            $station = Station::create($attributes);

            $this->syncPoint($station->id, $data['latitude'] ?? null, $data['longitude'] ?? null);

            return $station;
        });

        $resource = $this->stationQuery()->with('lake:id,name')->findOrFail($station->id);

        return response()->json(['data' => $resource], 201);
    }

    public function show(Request $request, Station $station)
    {
        $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $station->organization_id);

        $resource = $this->stationQuery()->with('lake:id,name')->findOrFail($station->id);

        return response()->json(['data' => $resource]);
    }

    public function update(Request $request, Station $station)
    {
        $data = $this->validatePayload($request, true);

        $context = $this->resolveTenantMembership($request, ['org_admin'], $station->organization_id);
        $tenantId = (int) $context['tenant_id'];

        if ($station->organization_id !== $tenantId) {
            abort(403, 'Forbidden');
        }

        // org_admins (checked by resolveTenantMembership) may update any station in their org

        if (isset($data['lake_id'])) {
            $this->assertLakeExists($data['lake_id']);
        }

        DB::transaction(function () use ($station, $data) {
            $updates = [];

            if (array_key_exists('lake_id', $data)) {
                $updates['lake_id'] = $data['lake_id'];
            }
            if (array_key_exists('name', $data)) {
                $updates['name'] = $data['name'];
            }
            if (array_key_exists('description', $data)) {
                $updates['description'] = $data['description'];
            }
            if (array_key_exists('is_active', $data)) {
                $updates['is_active'] = $data['is_active'];
            }

            if (!empty($updates)) {
                $station->update($updates);
            }

            if ($this->shouldSyncPoint($data)) {
                $this->syncPoint($station->id, $data['latitude'] ?? null, $data['longitude'] ?? null);
            }
        });

        $resource = $this->stationQuery()->with('lake:id,name')->findOrFail($station->id);

        return response()->json(['data' => $resource]);
    }

    public function destroy(Request $request, Station $station)
    {
        $context = $this->resolveTenantMembership($request, ['org_admin'], $station->organization_id);

        // org_admins (checked by resolveTenantMembership) may delete any station in their org
        $station->delete();

        return response()->json(['message' => 'Station deleted']);
    }

    protected function validatePayload(Request $request, bool $isUpdate): array
    {
        $rules = [
            'organization_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'lake_id' => [$isUpdate ? 'sometimes' : 'required', 'integer', 'exists:lakes,id'],
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
        ];

        return $request->validate($rules);
    }

    protected function stationQuery()
    {
        return Station::query()
            ->select('stations.*')
            ->selectRaw('ST_Y(geom_point) as latitude')
            ->selectRaw('ST_X(geom_point) as longitude');
    }

    protected function syncPoint(int $stationId, ?float $latitude, ?float $longitude): void
    {
        if ($latitude !== null && $longitude !== null) {
            DB::update(
                'UPDATE stations SET geom_point = ST_SetSRID(ST_MakePoint(?, ?), 4326) WHERE id = ?',
                [$longitude, $latitude, $stationId]
            );
        } else {
            DB::update('UPDATE stations SET geom_point = NULL WHERE id = ?', [$stationId]);
        }
    }

    protected function shouldSyncPoint(array $data): bool
    {
        return array_key_exists('latitude', $data) || array_key_exists('longitude', $data);
    }

    protected function assertLakeExists(int $lakeId): void
    {
        if (!Lake::whereKey($lakeId)->exists()) {
            abort(422, 'Invalid lake_id.');
        }
    }
}
