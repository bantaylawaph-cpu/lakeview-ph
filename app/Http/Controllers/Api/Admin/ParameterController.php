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

    $query = Parameter::query();

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
    // aliases feature removed (parameter_aliases table dropped)

        $parameter = DB::transaction(function () use ($data) {
            $parameter = Parameter::create($data);
            return $parameter;
        });

        return response()->json($parameter, 201);
    }

    public function show(Request $request, Parameter $parameter)
    {
        $this->ensureSuperAdmin();

        return response()->json([
            'data' => $parameter->load(['thresholds' => function ($q) {
                $q->with(['standard', 'waterQualityClass']);
            }]),
        ]);
    }

    public function update(Request $request, Parameter $parameter)
    {
        $this->ensureSuperAdmin();

        $data = $this->validatePayload($request, $parameter->id);
    // aliases feature removed

        DB::transaction(function () use ($parameter, $data) {
            $parameter->update($data);
        });

        return response()->json($parameter->fresh());
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
            'evaluation_type' => ['nullable', Rule::in(['Max (≤)', 'Min (≥)', 'Range'])],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
            // aliases removed
        ]);
    }
}
