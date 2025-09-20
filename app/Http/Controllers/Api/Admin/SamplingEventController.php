<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\ResolvesTenantContext;
use App\Http\Controllers\Controller;
use App\Models\Lake;
use App\Models\Parameter;
use App\Models\SampleResult;
use App\Models\SamplingEvent;
use App\Models\Station;
use App\Services\WaterQualityEvaluator;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SamplingEventController extends Controller
{
    use ResolvesTenantContext;

    protected WaterQualityEvaluator $evaluator;

    public function __construct(WaterQualityEvaluator $evaluator)
    {
        $this->evaluator = $evaluator;
    }

    public function index(Request $request)
    {
        $requestedTenant = $request->input('organization_id');
        $requestedTenant = $requestedTenant !== null ? (int) $requestedTenant : null;

        $context = $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $requestedTenant, false);

        $query = $this->eventListQuery();

        $publicOnly = false;

        if ($context['has_membership'] || $context['is_superadmin']) {
            if ($context['tenant_id'] === null) {
                abort(422, 'organization_id is required.');
            }
            $tenantId = (int) $context['tenant_id'];
            $query->where('sampling_events.organization_id', $tenantId);
        } else {
            if ($requestedTenant === null) {
                abort(403, 'Forbidden');
            }
            $publicOnly = true;
            $query->where('sampling_events.organization_id', $requestedTenant)
                ->where('sampling_events.status', 'public');
        }

        if ($request->filled('status') && !$publicOnly) {
            $statuses = collect(Arr::wrap($request->input('status')))
                ->flatMap(fn ($value) => explode(',', $value))
                ->map(fn ($value) => trim(strtolower($value)))
                ->filter()
                ->unique()
                ->values();

            if ($statuses->isNotEmpty()) {
                $query->whereIn('sampling_events.status', $statuses->all());
            }
        }

        if ($request->filled('lake_id')) {
            $query->where('sampling_events.lake_id', (int) $request->input('lake_id'));
        }

        if ($request->filled('station_id')) {
            $query->where('sampling_events.station_id', (int) $request->input('station_id'));
        }

        if ($request->filled('sampled_from')) {
            $query->where('sampling_events.sampled_at', '>=', CarbonImmutable::parse($request->input('sampled_from')));
        }

        if ($request->filled('sampled_to')) {
            $query->where('sampling_events.sampled_at', '<=', CarbonImmutable::parse($request->input('sampled_to')));
        }

        $events = $query
            ->orderByDesc('sampling_events.sampled_at')
            ->orderBy('sampling_events.id', 'desc')
            ->get();

        return response()->json(['data' => $events]);
    }

    public function show(Request $request, SamplingEvent $samplingEvent)
    {
        if ($samplingEvent->status !== 'public') {
            $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $samplingEvent->organization_id);
        }

        $resource = $this->eventDetailQuery()->findOrFail($samplingEvent->id);

        return response()->json(['data' => $resource]);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request, false);

        $context = $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $data['organization_id'] ?? null);
        $tenantId = (int) $context['tenant_id'];

        if (($context['role'] ?? null) === 'contributor' && ($data['status'] ?? 'draft') === 'public') {
            abort(403, 'Contributors cannot publish events.');
        }

        $this->assertLakeExists($data['lake_id']);
        $this->assertStationOwnership($tenantId, $data['station_id'] ?? null);

    $event = DB::transaction(function () use ($tenantId, $data, $request) {
            $attributes = [
                'organization_id' => $tenantId,
                'lake_id' => $data['lake_id'],
                'station_id' => $data['station_id'] ?? null,
                'applied_standard_id' => $data['applied_standard_id'] ?? null,
                'sampled_at' => CarbonImmutable::parse($data['sampled_at']),
                'sampler_name' => $data['sampler_name'] ?? null,
                'method' => $data['method'] ?? null,
                'weather' => $data['weather'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => $data['status'] ?? 'draft',
                'created_by_user_id' => $request->user()->id ?? null,
            ];

            $event = SamplingEvent::create($attributes);

            $this->syncEventPoint($event->id, $data);
            $this->syncMeasurements($event, $data['measurements'] ?? []);

            return $event;
        });

        $resource = $this->eventDetailQuery()->findOrFail($event->id);

        return response()->json(['data' => $resource], 201);
    }

    public function update(Request $request, SamplingEvent $samplingEvent)
    {
        $data = $this->validatePayload($request, true);

        $context = $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $samplingEvent->organization_id);
        $tenantId = (int) $context['tenant_id'];

        if ($samplingEvent->organization_id !== $tenantId) {
            abort(403, 'Forbidden');
        }

        if (($context['role'] ?? null) === 'contributor' && isset($data['status']) && $data['status'] === 'public') {
            abort(403, 'Contributors cannot publish events.');
        }

        if (isset($data['lake_id'])) {
            $this->assertLakeExists($data['lake_id']);
        }

        if (array_key_exists('station_id', $data)) {
            $this->assertStationOwnership($tenantId, $data['station_id']);
        }

    DB::transaction(function () use ($samplingEvent, $data, $request) {
            $updates = [];

            foreach ([
                'lake_id',
                'station_id',
                'applied_standard_id',
                'sampler_name',
                'method',
                'weather',
                'notes',
                'status',
            ] as $field) {
                if (array_key_exists($field, $data)) {
                    $updates[$field] = $data[$field];
                }
            }

            if (array_key_exists('sampled_at', $data)) {
                $updates['sampled_at'] = CarbonImmutable::parse($data['sampled_at']);
            }

            if (!empty($updates)) {
                $updates['updated_by_user_id'] = $request->user()->id ?? null;
                $samplingEvent->update($updates);
            }

            if ($this->shouldSyncPoint($data)) {
                $this->syncEventPoint($samplingEvent->id, $data);
            }

            if (array_key_exists('measurements', $data)) {
                $this->syncMeasurements($samplingEvent, $data['measurements'] ?? []);
            }
        });

        $resource = $this->eventDetailQuery()->findOrFail($samplingEvent->id);

        return response()->json(['data' => $resource]);
    }

    public function destroy(Request $request, SamplingEvent $samplingEvent)
    {
        $this->resolveTenantMembership($request, ['org_admin'], $samplingEvent->organization_id);

        DB::transaction(function () use ($samplingEvent) {
            $samplingEvent->results()->delete();
            $samplingEvent->delete();
        });

        return response()->json(['message' => 'Sampling event deleted']);
    }

    protected function validatePayload(Request $request, bool $isUpdate): array
    {
        return $request->validate([
            'organization_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'lake_id' => [$isUpdate ? 'sometimes' : 'required', 'integer', 'exists:lakes,id'],
            'station_id' => ['sometimes', 'nullable', 'integer', 'exists:stations,id'],
            'applied_standard_id' => ['sometimes', 'nullable', 'integer', 'exists:wq_standards,id'],
            'sampled_at' => [$isUpdate ? 'sometimes' : 'required', 'date'],
            'sampler_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'method' => ['sometimes', 'nullable', 'string', 'max:255'],
            'weather' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'submitted', 'public'])],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'measurements' => ['sometimes', 'array'],
            'measurements.*.parameter_id' => ['required', 'integer', 'exists:parameters,id'],
            'measurements.*.value' => ['nullable', 'numeric'],
            'measurements.*.unit' => ['nullable', 'string', 'max:255'],
            'measurements.*.depth_m' => ['nullable', 'numeric'],
            'measurements.*.remarks' => ['nullable', 'string'],
        ]);
    }

    protected function eventListQuery()
    {
        return SamplingEvent::query()
            ->select('sampling_events.*')
            ->selectRaw('ST_Y(geom_point) as latitude')
            ->selectRaw('ST_X(geom_point) as longitude')
            ->with([
                'lake:id,name,class_code',
                'station:id,name',
                'appliedStandard:id,code,name',
                'createdBy:id,name',
                'updatedBy:id,name',
            ])
            ->withCount('results');
    }

    protected function eventDetailQuery()
    {
        return SamplingEvent::query()
            ->select('sampling_events.*')
            ->selectRaw('ST_Y(geom_point) as latitude')
            ->selectRaw('ST_X(geom_point) as longitude')
            ->with([
                'lake:id,name,class_code',
                'station:id,name',
                'appliedStandard:id,code,name',
                'results' => function ($query) {
                    $query->with(['parameter:id,code,name,unit']);
                },
                'createdBy:id,name',
                'updatedBy:id,name',
            ])
            ->withCount('results');
    }

    protected function syncEventPoint(int $eventId, array $data): void
    {
        $hasLat = array_key_exists('latitude', $data);
        $hasLon = array_key_exists('longitude', $data);

        if ($hasLat || $hasLon) {
            if (($data['latitude'] ?? null) !== null && ($data['longitude'] ?? null) !== null) {
                DB::update(
                    'UPDATE sampling_events SET geom_point = ST_SetSRID(ST_MakePoint(?, ?), 4326) WHERE id = ?',
                    [$data['longitude'], $data['latitude'], $eventId]
                );
            } else {
                DB::update('UPDATE sampling_events SET geom_point = NULL WHERE id = ?', [$eventId]);
            }
        }
    }

    protected function shouldSyncPoint(array $data): bool
    {
        return array_key_exists('latitude', $data) || array_key_exists('longitude', $data);
    }

    protected function syncMeasurements(SamplingEvent $event, array $measurements): void
    {
        $measurements = collect($measurements)
            ->map(function ($measurement) {
                return [
                    'parameter_id' => (int) $measurement['parameter_id'],
                    'value' => array_key_exists('value', $measurement) ? $measurement['value'] : null,
                    'unit' => $measurement['unit'] ?? null,
                    'depth_m' => $measurement['depth_m'] ?? null,
                    'remarks' => $measurement['remarks'] ?? null,
                ];
            });

        if ($measurements->isEmpty()) {
            $event->results()->delete();
            return;
        }

        $parameterIds = $measurements->pluck('parameter_id')->unique();
        $parameters = Parameter::whereIn('id', $parameterIds)->get()->keyBy('id');

        $existing = $event->results()->get()->keyBy('parameter_id');
        $processed = [];

        foreach ($measurements as $payload) {
            $parameterId = $payload['parameter_id'];
            $parameter = $parameters->get($parameterId);
            if (!$parameter) {
                continue;
            }

            $result = $existing->get($parameterId);
            if (!$result) {
                $result = new SampleResult([
                    'sampling_event_id' => $event->id,
                    'parameter_id' => $parameterId,
                ]);
            }

            $result->value = $payload['value'];
            $result->unit = $payload['unit'] ?? ($result->unit ?? $parameter->unit);
            $result->depth_m = $payload['depth_m'];
            $result->remarks = $payload['remarks'];

            $result->save();
            $this->evaluator->evaluate($result);

            $processed[] = $parameterId;
        }

        if (!empty($processed)) {
            $event->results()->whereNotIn('parameter_id', $processed)->delete();
        } else {
            $event->results()->delete();
        }
    }

    protected function assertLakeExists(int $lakeId): void
    {
        if (!Lake::whereKey($lakeId)->exists()) {
            abort(422, 'Invalid lake_id.');
        }
    }

    protected function assertStationOwnership(int $tenantId, ?int $stationId): void
    {
        if ($stationId === null) {
            return;
        }

        $station = Station::select('id', 'organization_id')->find($stationId);

        if (!$station) {
            abort(422, 'Invalid station_id.');
        }

        if ((int) $station->organization_id !== $tenantId) {
            abort(422, 'station_id must reference a station owned by the tenant.');
        }
    }
}
