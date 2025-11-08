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
use Illuminate\Support\Facades\Cache;
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
        // Accept organization_id from query OR fallback to route parameter {tenant} for org/contrib prefixed routes.
        $requestedTenant = $request->input('organization_id');
        if ($requestedTenant === null) {
            $routeTenant = $request->route('tenant');
            if ($routeTenant !== null) {
                $requestedTenant = (int) $routeTenant;
            }
        }
        $requestedTenant = $requestedTenant !== null ? (int) $requestedTenant : null;

        $context = $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $requestedTenant, false);

    $isCursor = ($request->query('mode') === 'cursor') || $request->filled('cursor');
    $query = $this->eventListQuery($isCursor);

        $publicOnly = false;

        if ($context['has_membership']) {
            if ($context['tenant_id'] === null) {
                abort(422, 'organization_id is required.');
            }
            $tenantId = (int) $context['tenant_id'];
            $query->where('sampling_events.organization_id', $tenantId);
        } elseif ($context['is_superadmin']) {
            if ($requestedTenant !== null) {
                $query->where('sampling_events.organization_id', (int) $requestedTenant);
            }
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

        // Optional: filter events by the applied water quality standard
        if ($request->filled('applied_standard_id')) {
            $query->where('sampling_events.applied_standard_id', (int) $request->input('applied_standard_id'));
        }

        // Optional: filter events that have at least one sample result using a given parameter
        if ($request->filled('parameter_id')) {
            $parameterId = (int) $request->input('parameter_id');
            $query->whereExists(function ($q) use ($parameterId) {
                $q->select(DB::raw('1'))
                  ->from('sample_results')
                  ->whereColumn('sample_results.sampling_event_id', 'sampling_events.id')
                  ->where('sample_results.parameter_id', $parameterId);
            });
        }
        // Year/Quarter/Month server-side filtering
        // Prefer explicit sampled_from/to if provided; otherwise interpret these helpers.
        $hasFrom = $request->filled('sampled_from');
        $hasTo = $request->filled('sampled_to');
        if (!$hasFrom && !$hasTo) {
            $year = (int) $request->query('year', 0);
            $quarter = (int) $request->query('quarter', 0);
            $month = (int) $request->query('month', 0);

            if ($year > 0) {
                // If year is supplied, optionally narrow by quarter or month using an inclusive date range.
                if ($month >= 1 && $month <= 12) {
                    $start = CarbonImmutable::create($year, $month, 1, 0, 0, 0);
                    $end = $start->endOfMonth();
                    $query->whereBetween('sampling_events.sampled_at', [$start, $end]);
                } elseif ($quarter >= 1 && $quarter <= 4) {
                    $startMonth = (($quarter - 1) * 3) + 1; // 1,4,7,10
                    $start = CarbonImmutable::create($year, $startMonth, 1, 0, 0, 0);
                    $end = $start->addMonths(2)->endOfMonth();
                    $query->whereBetween('sampling_events.sampled_at', [$start, $end]);
                } else {
                    $start = CarbonImmutable::create($year, 1, 1, 0, 0, 0);
                    $end = CarbonImmutable::create($year, 12, 31, 23, 59, 59);
                    $query->whereBetween('sampling_events.sampled_at', [$start, $end]);
                }
            } else {
                // No year provided: allow standalone month/quarter filters across all years
                if ($month >= 1 && $month <= 12) {
                    $query->whereMonth('sampling_events.sampled_at', $month);
                }
                if ($quarter >= 1 && $quarter <= 4) {
                    // Use ANSI/Postgres EXTRACT for compatibility
                    $query->whereRaw('EXTRACT(QUARTER FROM sampling_events.sampled_at) = ?', [$quarter]);
                }
            }
        }

        if ($request->filled('sampled_from')) {
            $query->where('sampling_events.sampled_at', '>=', CarbonImmutable::parse($request->input('sampled_from')));
        }

        if ($request->filled('sampled_to')) {
            $query->where('sampling_events.sampled_at', '<=', CarbonImmutable::parse($request->input('sampled_to')));
        }

        // Optional created_by_user_id filter (for member filter in org/contrib views)
        if ($request->filled('created_by_user_id')) {
            $query->where('sampling_events.created_by_user_id', (int) $request->input('created_by_user_id'));
        }

        // Text search: match station, lake, or organization names using joined columns
        if ($request->filled('q')) {
            $qtxt = trim((string) $request->input('q'));
            if ($qtxt !== '') {
                $like = '%'.mb_strtolower($qtxt).'%';
                $query->where(function ($qq) use ($like) {
                    $qq->orWhereRaw('LOWER(s.name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(l.name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(t.name) LIKE ?', [$like]);
                });
            }
        }

        $perPage = (int) $request->query('per_page', 10);
        if ($perPage <= 0) $perPage = 10;
        if ($perPage > 100) $perPage = 100;

        // Server-side sorting
        $sortBy = (string) $request->query('sort_by', 'month_day');
        $sortDir = strtolower((string) $request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $sortMap = [
            'organization' => 't.name',
            'lake_name' => 'l.name',
            'station_name' => 's.name',
            'status' => 'sampling_events.status',
            'logged_by' => 'u.name',
            'updated_by' => 'u2.name',
            'logged_at' => 'sampling_events.created_at',
            'updated_at' => 'sampling_events.updated_at',
            'year' => DB::raw('EXTRACT(YEAR FROM sampling_events.sampled_at)'),
            'quarter' => DB::raw('EXTRACT(QUARTER FROM sampling_events.sampled_at)'),
            'month_day' => 'sampling_events.sampled_at',
            'sampled_at' => 'sampling_events.sampled_at',
        ];
        $expr = $sortMap[$sortBy] ?? 'sampling_events.sampled_at';

        if ($isCursor) {
            // Force canonical ordering for keyset pagination
            $query->orderByDesc('sampling_events.sampled_at')->orderByDesc('sampling_events.id');
            if ($cursor = $request->query('cursor')) {
                $parts = explode(':', $cursor, 2);
                if (count($parts) === 2) {
                    [$cSampled, $cId] = $parts;
                    if (strtotime($cSampled) !== false && ctype_digit($cId)) {
                        $query->where(function ($w) use ($cSampled, $cId) {
                            $w->where('sampling_events.sampled_at', '<', $cSampled)
                              ->orWhere(function ($w2) use ($cSampled, $cId) {
                                  $w2->where('sampling_events.sampled_at', $cSampled)
                                     ->where('sampling_events.id', '<', (int) $cId);
                              });
                        });
                    }
                }
            }
            $rows = $query->limit($perPage + 1)->get();
            $hasNext = $rows->count() > $perPage;
            $nextCursor = null;
            if ($hasNext) {
                $last = $rows[$perPage - 1];
                $nextCursor = $last->sampled_at.':'.$last->id;
                $rows = $rows->slice(0, $perPage)->values();
            }
            return response()->json([
                'data' => $rows,
                'meta' => [
                    'per_page' => $perPage,
                    'next_cursor' => $nextCursor,
                    'mode' => 'cursor'
                ]
            ]);
        }

        $events = $query
            ->when($expr instanceof \Illuminate\Database\Query\Expression, function ($q) use ($expr, $sortDir) {
                $q->orderBy($expr, $sortDir);
            }, function ($q) use ($expr, $sortDir) {
                $q->orderBy($expr, $sortDir);
            })
            ->orderBy('sampling_events.id', 'desc')
            ->paginate($perPage);
        return $events;
    }

    public function show(Request $request, SamplingEvent $samplingEvent)
    {
        if ($samplingEvent->status !== 'public') {
            $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $samplingEvent->organization_id);
        }

        $resource = $this->eventDetailQuery()->findOrFail($samplingEvent->id);

        return response()->json(['data' => $resource]);
    }

    public function showOrg(Request $request, $tenant, SamplingEvent $samplingEvent)
    {
        return $this->show($request, $samplingEvent);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request, false);
        $explicitTenant = $data['organization_id'] ?? $request->route('tenant');
        $context = $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $explicitTenant !== null ? (int)$explicitTenant : null);
        $tenantId = (int) $context['tenant_id'];

        if (($context['role'] ?? null) === 'contributor' && ($data['status'] ?? 'draft') === 'public') {
            abort(403, 'Contributors cannot publish events.');
        }

    $this->assertLakeExists($data['lake_id']);
    $this->assertStationOwnership($tenantId, $data['station_id'] ?? null);

    $event = DB::transaction(function () use ($tenantId, $data, $request) {
        // sampled_at is date-only (YYYY-MM-DD). No timezone handling needed.
        $sampledAt = (string) ($data['sampled_at'] ?? '');

            $attributes = [
                'organization_id' => $tenantId,
                'lake_id' => $data['lake_id'],
                'station_id' => $data['station_id'],
                'applied_standard_id' => $data['applied_standard_id'] ?? null,
                'sampled_at' => $sampledAt,
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

        // Bump public sample-events cache version
        try { $v = (int) Cache::get('ver:public:sample-events', 1); Cache::forever('ver:public:sample-events', $v + 1); } catch (\Throwable $e) {}
        $resource = $this->eventDetailQuery()->findOrFail($event->id);

        return response()->json(['data' => $resource], 201);
    }

    public function update(Request $request, SamplingEvent $samplingEvent)
    {
        $data = $this->validatePayload($request, true);
        $context = $this->resolveTenantMembership($request, ['org_admin', 'contributor'], (int)$samplingEvent->organization_id);
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


        if ($samplingEvent->station_id === null && !array_key_exists('station_id', $data)) {
            abort(422, 'station_id is required for all sampling events.');
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
                    // sampled_at is date-only (YYYY-MM-DD). Store the string as-is.
                    $updates['sampled_at'] = (string) $data['sampled_at'];
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

        try { $v = (int) Cache::get('ver:public:sample-events', 1); Cache::forever('ver:public:sample-events', $v + 1); } catch (\Throwable $e) {}
        $resource = $this->eventDetailQuery()->findOrFail($samplingEvent->id);

        return response()->json(['data' => $resource]);
    }

    // Wrapper for tenant-scoped routes to satisfy route parameter order: /org/{tenant}/sample-events/{samplingEvent}
    public function updateOrg(Request $request, $tenant, SamplingEvent $samplingEvent)
    {
        return $this->update($request, $samplingEvent);
    }

    public function destroy(Request $request, SamplingEvent $samplingEvent)
    {

        $context = $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $samplingEvent->organization_id);
        $tenantId = (int) $context['tenant_id'];

        if ($samplingEvent->organization_id !== $tenantId) {
            abort(403, 'Forbidden');
        }

        $role = $context['role'] ?? null;

        if ($role === 'org_admin' || $context['is_superadmin'] === true) {
            // allowed
        } elseif ($role === 'contributor') {
            // contributors may delete only their own non-public events
            if (($samplingEvent->created_by_user_id ?? null) !== ($request->user()->id ?? null)) {
                abort(403, 'Forbidden');
            }
            if ($samplingEvent->status === 'public') {
                abort(403, 'Contributors cannot delete published events.');
            }
        } else {
            abort(403, 'Forbidden');
        }

        DB::transaction(function () use ($samplingEvent) {
            $samplingEvent->results()->delete();
            $samplingEvent->delete();
        });
        try { $v = (int) Cache::get('ver:public:sample-events', 1); Cache::forever('ver:public:sample-events', $v + 1); } catch (\Throwable $e) {}
        return response()->json(['message' => 'Sampling event deleted']);
    }

    public function destroyOrg(Request $request, $tenant, SamplingEvent $samplingEvent)
    {
        return $this->destroy($request, $samplingEvent);
    }

    protected function validatePayload(Request $request, bool $isUpdate): array
    {
        return $request->validate([
            'organization_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'lake_id' => [$isUpdate ? 'sometimes' : 'required', 'integer', 'exists:lakes,id'],
            'station_id' => [$isUpdate ? 'sometimes' : 'required', 'integer', 'exists:stations,id'],
            'applied_standard_id' => ['sometimes', 'nullable', 'integer', 'exists:wq_standards,id'],
            'sampled_at' => [$isUpdate ? 'sometimes' : 'required', 'date'],
            'sampler_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'method' => ['sometimes', 'nullable', 'string', 'max:255'],
            'weather' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'submitted', 'public'])],
            'measurements' => ['sometimes', 'array'],
            'measurements.*.parameter_id' => ['required', 'integer', 'exists:parameters,id'],
            'measurements.*.value' => ['nullable', 'numeric'],
            'measurements.*.unit' => ['nullable', 'string', 'max:255'],
            'measurements.*.depth_m' => ['nullable', 'numeric'],
            'measurements.*.remarks' => ['nullable', 'string'],
        ]);
    }

    protected function eventListQuery(bool $slim = false)
    {
        $base = SamplingEvent::query()
            ->leftJoin('stations as s', 's.id', '=', 'sampling_events.station_id')
            ->leftJoin('lakes as l', 'l.id', '=', 'sampling_events.lake_id')
            ->leftJoin('tenants as t', 't.id', '=', 'sampling_events.organization_id')
            ->leftJoin('users as u', 'u.id', '=', 'sampling_events.created_by_user_id')
            ->leftJoin('users as u2', 'u2.id', '=', 'sampling_events.updated_by_user_id');

        if ($slim) {
            // Minimal columns for list performance
            $base->select([
                'sampling_events.id',
                'sampling_events.organization_id',
                'sampling_events.lake_id',
                'sampling_events.station_id',
                'sampling_events.sampled_at',
                'sampling_events.status',
                DB::raw('ST_Y(s.geom_point) as latitude'),
                DB::raw('ST_X(s.geom_point) as longitude'),
                DB::raw("COALESCE(s.name,'') as station_name"),
                DB::raw("COALESCE(l.name,'') as lake_name"),
                DB::raw("COALESCE(t.name,'') as organization_name"),
                DB::raw("COALESCE(u.name,'') as created_by_name"),
            ]);
            // Only need result count in slim mode
            $base->withCount('results');
        } else {
            $base->select([
                'sampling_events.*',
                DB::raw('ST_Y(s.geom_point) as latitude'),
                DB::raw('ST_X(s.geom_point) as longitude'),
                DB::raw("COALESCE(s.name,'') as station_name"),
                DB::raw("COALESCE(l.name,'') as lake_name"),
                DB::raw("COALESCE(t.name,'') as organization_name"),
                DB::raw("COALESCE(u.name,'') as created_by_name"),
                DB::raw("COALESCE(u2.name,'') as updated_by_name"),
            ])
            ->with([
                'organization:id,name',
                'lake:id,name,class_code',
                'station:id,name',
                'appliedStandard:id,code,name',
                'createdBy:id,name',
                'updatedBy:id,name',
            ])
            ->withCount('results');
        }
        return $base;
    }

    protected function eventDetailQuery()
    {
        return SamplingEvent::query()
            ->select('sampling_events.*')
            ->addSelect(DB::raw('(SELECT ST_Y(s.geom_point) FROM stations s WHERE s.id = sampling_events.station_id) as latitude'))
            ->addSelect(DB::raw('(SELECT ST_X(s.geom_point) FROM stations s WHERE s.id = sampling_events.station_id) as longitude'))
            ->addSelect(DB::raw("COALESCE((SELECT t.name FROM tenants t WHERE t.id = sampling_events.organization_id), '') AS organization_name"))
            ->addSelect(DB::raw("COALESCE((SELECT u.name FROM users u WHERE u.id = sampling_events.created_by_user_id), '') AS created_by_name"))
            ->addSelect(DB::raw("COALESCE((SELECT u2.name FROM users u2 WHERE u2.id = sampling_events.updated_by_user_id), '') AS updated_by_name"))
            ->with([
                'organization:id,name',
                'lake:id,name,class_code',
                'station:id,name',
                'appliedStandard:id,code,name',
                'results' => function ($query) {
                    $query->with([
                        // Include parameter metadata (desc) for client explanations
                        'parameter:id,code,name,unit,desc',
                        // Ensure the threshold's standard (code/name) is available to consumers
                        'threshold:id,parameter_id,class_code,standard_id,min_value,max_value,notes',
                        'threshold.standard:id,code,name',
                    ]);
                },
                'createdBy:id,name',
                'updatedBy:id,name',
            ])
            ->withCount('results');
    }

    public function publicIndex(Request $request)
    {
        $lakeId = (int) $request->query('lake_id', 0);
        if ($lakeId <= 0) {
            abort(422, 'lake_id is required');
        }

        $orgId = $request->filled('organization_id') ? (int) $request->query('organization_id') : null;
        $limit = (int) ($request->query('limit', 1000));
        if ($limit <= 0) { $limit = 1000; }
        if ($limit > 5000) { $limit = 5000; }

        $query = $this->eventDetailQuery()
            ->where('sampling_events.status', 'public')
            ->where('sampling_events.lake_id', $lakeId);

        if ($orgId) {
            $query->where('sampling_events.organization_id', $orgId);
        }

        if ($request->filled('sampled_from')) {
            $query->where('sampling_events.sampled_at', '>=', CarbonImmutable::parse($request->query('sampled_from')));
        }

        if ($request->filled('sampled_to')) {
            $query->where('sampling_events.sampled_at', '<=', CarbonImmutable::parse($request->query('sampled_to')));
        }

        // Cache per lake/org/date window with short TTL and version bump
        $ver = (int) Cache::get('ver:public:sample-events', 1);
        $qs = $request->query(); ksort($qs);
        $key = 'public:sample-events:v'.$ver.':'.md5(json_encode($qs));
        if ($hit = Cache::get($key)) {
            return response()->json(['data' => $hit]);
        }

        $events = $query
            ->orderByDesc('sampling_events.sampled_at')
            ->orderBy('sampling_events.id', 'desc')
            ->limit($limit)
            ->get();

        Cache::put($key, $events, now()->addMinutes(2));
        return response()->json(['data' => $events]);
    }


    public function publicShow(Request $request, SamplingEvent $samplingEvent)
    {
        if ($samplingEvent->status !== 'public') {
            abort(404);
        }
        $key = 'public:sample-event:item:'.$samplingEvent->id;
        if ($hit = Cache::get($key)) return response()->json(['data' => $hit]);
        $resource = $this->eventDetailQuery()->findOrFail($samplingEvent->id);
        Cache::put($key, $resource, now()->addMinutes(5));
        return response()->json(['data' => $resource]);
    }

    protected function syncEventPoint(int $eventId, array $data): void { /* no-op */ }
    protected function shouldSyncPoint(array $data): bool { return false; }

    // Dynamic options for Year/Quarter/Month based on existing sampling events matching current filters
    public function options(Request $request)
    {
        // Accept organization_id from query OR fallback to route parameter {tenant}
        $requestedTenant = $request->input('organization_id');
        if ($requestedTenant === null) {
            $routeTenant = $request->route('tenant');
            if ($routeTenant !== null) { $requestedTenant = (int) $routeTenant; }
        }
        $requestedTenant = $requestedTenant !== null ? (int) $requestedTenant : null;

        $context = $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $requestedTenant, false);
        $q = $this->eventListQuery();

        $publicOnly = false;
        if ($context['has_membership']) {
            if ($context['tenant_id'] === null) { abort(422, 'organization_id is required.'); }
            $tenantId = (int) $context['tenant_id'];
            $q->where('sampling_events.organization_id', $tenantId);
        } elseif ($context['is_superadmin']) {
            if ($requestedTenant !== null) { $q->where('sampling_events.organization_id', (int) $requestedTenant); }
        } else {
            if ($requestedTenant === null) { abort(403, 'Forbidden'); }
            $publicOnly = true;
            $q->where('sampling_events.organization_id', $requestedTenant)
              ->where('sampling_events.status', 'public');
        }

        // Apply same basic filters (status if not publicOnly), lake, station, created_by_user_id, date window, and text q
        if ($request->filled('status') && !$publicOnly) {
            $statuses = collect(Arr::wrap($request->input('status')))
                ->flatMap(fn($v) => explode(',', $v))
                ->map(fn($v) => trim(strtolower($v)))
                ->filter()->unique()->values();
            if ($statuses->isNotEmpty()) { $q->whereIn('sampling_events.status', $statuses->all()); }
        }
        if ($request->filled('lake_id')) { $q->where('sampling_events.lake_id', (int) $request->input('lake_id')); }
        if ($request->filled('station_id')) { $q->where('sampling_events.station_id', (int) $request->input('station_id')); }
        if ($request->filled('created_by_user_id')) { $q->where('sampling_events.created_by_user_id', (int) $request->input('created_by_user_id')); }
        if ($request->filled('sampled_from')) { $q->where('sampling_events.sampled_at', '>=', CarbonImmutable::parse($request->input('sampled_from'))); }
        if ($request->filled('sampled_to')) { $q->where('sampling_events.sampled_at', '<=', CarbonImmutable::parse($request->input('sampled_to'))); }
        if ($request->filled('q')) {
            $txt = trim((string) $request->input('q'));
            if ($txt !== '') {
                $like = '%'.mb_strtolower($txt).'%';
                $q->where(function ($qq) use ($like) {
                    $qq->orWhereRaw("LOWER(COALESCE((SELECT s.name FROM stations s WHERE s.id = sampling_events.station_id), '')) LIKE ?", [$like])
                       ->orWhereRaw("LOWER(COALESCE((SELECT l.name FROM lakes l WHERE l.id = sampling_events.lake_id), '')) LIKE ?", [$like])
                       ->orWhereRaw("LOWER(COALESCE((SELECT t.name FROM tenants t WHERE t.id = sampling_events.organization_id), '')) LIKE ?", [$like]);
                });
            }
        }

        // Optional narrowing by selected year/quarter for months/quarters computation
        $selectedYear = $request->filled('year') ? (int) $request->query('year') : null;
        $selectedQuarter = $request->filled('quarter') ? (int) $request->query('quarter') : null;

        $yearsQuery = (clone $q)
            ->select(DB::raw('DISTINCT CAST(EXTRACT(YEAR FROM sampling_events.sampled_at) AS INT) AS year'))
            ->orderBy('year', 'desc');

        $quartersQuery = (clone $q)
            ->select(DB::raw('DISTINCT CAST(EXTRACT(QUARTER FROM sampling_events.sampled_at) AS INT) AS quarter'));
        if ($selectedYear) { $quartersQuery->whereRaw('EXTRACT(YEAR FROM sampling_events.sampled_at) = ?', [$selectedYear]); }
        $quartersQuery->orderBy('quarter', 'asc');

        $monthsQuery = (clone $q)
            ->select(DB::raw('DISTINCT CAST(EXTRACT(MONTH FROM sampling_events.sampled_at) AS INT) AS month'));
        if ($selectedYear) { $monthsQuery->whereRaw('EXTRACT(YEAR FROM sampling_events.sampled_at) = ?', [$selectedYear]); }
        if ($selectedQuarter) { $monthsQuery->whereRaw('EXTRACT(QUARTER FROM sampling_events.sampled_at) = ?', [$selectedQuarter]); }
        $monthsQuery->orderBy('month', 'asc');

        $years = $yearsQuery->pluck('year')->filter(fn($v) => $v !== null)->values();
        $quarters = $quartersQuery->pluck('quarter')->filter(fn($v) => $v !== null)->values();
        $months = $monthsQuery->pluck('month')->filter(fn($v) => $v !== null)->values();

        return response()->json(['data' => [
            'years' => $years,
            'quarters' => $quarters,
            'months' => $months,
        ]]);
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

    public function togglePublish(Request $request, SamplingEvent $samplingEvent)
    {
        $context = $this->resolveTenantMembership($request, ['org_admin', 'contributor'], $samplingEvent->organization_id);
        $tenantId = (int) $context['tenant_id'];

        if ($samplingEvent->organization_id !== $tenantId) {
            abort(403, 'Forbidden');
        }

        if (($context['role'] ?? null) === 'contributor' && $samplingEvent->status !== 'public') {
            abort(403, 'Contributors cannot publish events.');
        }

        DB::transaction(function () use ($samplingEvent) {
            $samplingEvent->status = ($samplingEvent->status === 'public') ? 'draft' : 'public';
            $samplingEvent->save();
        });
        try { $v = (int) Cache::get('ver:public:sample-events', 1); Cache::forever('ver:public:sample-events', $v + 1); } catch (\Throwable $e) {}
        $resource = $this->eventDetailQuery()->findOrFail($samplingEvent->id);
        return response()->json(['data' => $resource]);
    }

    public function togglePublishOrg(Request $request, $tenant, SamplingEvent $samplingEvent)
    {
        return $this->togglePublish($request, $samplingEvent);
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
