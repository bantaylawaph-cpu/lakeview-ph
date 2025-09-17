<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Parameter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ParameterController extends Controller
{
    protected function ensureSuperAdmin(): void
    {
        $user = auth()->user();
        if (!$user || ($user->highestRoleName() ?? 'public') !== 'superadmin') {
            abort(403, 'Forbidden');
        }
    }

    public function index(Request $request)
    {
        $this->ensureSuperAdmin();

        $query = Parameter::query()->with('aliases');

        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ilike', "%{$search}%")
                    ->orWhere('name', 'ilike', "%{$search}%")
                    ->orWhere('unit', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $parameters = $query->orderBy('name')->get();

        return response()->json(['data' => $parameters]);
    }

    public function store(Request $request)
    {
        $this->ensureSuperAdmin();

        $data = $this->validatePayload($request);
        $aliases = $data['aliases'] ?? [];
        unset($data['aliases']);

        $parameter = DB::transaction(function () use ($data, $aliases) {
            $parameter = Parameter::create($data);
            $this->syncAliases($parameter, $aliases);
            return $parameter;
        });

        return response()->json($parameter->load('aliases'), 201);
    }

    public function show(Request $request, Parameter $parameter)
    {
        $this->ensureSuperAdmin();

        return response()->json([
            'data' => $parameter->load(['aliases', 'thresholds' => function ($q) {
                $q->with(['standard', 'waterQualityClass']);
            }]),
        ]);
    }

    public function update(Request $request, Parameter $parameter)
    {
        $this->ensureSuperAdmin();

        $data = $this->validatePayload($request, $parameter->id);
        $aliases = $data['aliases'] ?? null;
        unset($data['aliases']);

        DB::transaction(function () use ($parameter, $data, $aliases) {
            $parameter->update($data);
            if ($aliases !== null) {
                $this->syncAliases($parameter, $aliases);
            }
        });

        return response()->json($parameter->fresh(['aliases']));
    }

    public function destroy(Request $request, Parameter $parameter)
    {
        $this->ensureSuperAdmin();

        $parameter->delete();
        return response()->json(['message' => 'Parameter deleted']);
    }

    protected function validatePayload(Request $request, ?int $parameterId = null): array
    {
        return $request->validate([
            'code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('parameters', 'code')->ignore($parameterId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'unit' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'group' => ['nullable', 'string', 'max:255'],
            'data_type' => ['nullable', 'string', 'max:255'],
            'evaluation_type' => ['nullable', Rule::in(['Max (≤)', 'Min (≥)', 'Range'])],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
            'aliases' => ['sometimes', 'array'],
            'aliases.*' => ['string', 'max:255'],
        ]);
    }

    protected function syncAliases(Parameter $parameter, array $aliases): void
    {
        $unique = collect($aliases)
            ->filter(fn ($alias) => is_string($alias) && trim($alias) !== '')
            ->map(fn ($alias) => trim($alias))
            ->unique()
            ->values();

        if ($unique->isEmpty()) {
            $parameter->aliases()->delete();
            return;
        }

        $parameter->aliases()->whereNotIn('alias', $unique)->delete();

        foreach ($unique as $alias) {
            $parameter->aliases()->firstOrCreate([
                'parameter_id' => $parameter->id,
                'alias' => $alias,
            ]);
        }
    }
}
