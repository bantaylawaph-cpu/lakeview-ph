<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ParameterThreshold;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ParameterThresholdController extends Controller
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

        $query = ParameterThreshold::query()->with(['parameter', 'standard', 'waterQualityClass']);

        if ($request->filled('parameter_id')) {
            $query->where('parameter_id', $request->input('parameter_id'));
        }

        if ($request->filled('class_code')) {
            $query->where('class_code', $request->input('class_code'));
        }

        if ($request->filled('standard_id')) {
            $query->where('standard_id', $request->input('standard_id'));
        }

        $thresholds = $query->orderBy('parameter_id')->orderBy('class_code')->get();

        return response()->json(['data' => $thresholds]);
    }

    public function store(Request $request)
    {
        $this->ensureSuperAdmin();

        $data = $this->validatePayload($request);
        $threshold = ParameterThreshold::create($data);

        return response()->json($threshold->load(['parameter', 'standard', 'waterQualityClass']), 201);
    }

    public function show(Request $request, ParameterThreshold $parameterThreshold)
    {
        $this->ensureSuperAdmin();

        return response()->json([
            'data' => $parameterThreshold->load(['parameter', 'standard', 'waterQualityClass']),
        ]);
    }

    public function update(Request $request, ParameterThreshold $parameterThreshold)
    {
        $this->ensureSuperAdmin();

        $data = $this->validatePayload($request, $parameterThreshold->id);
        $parameterThreshold->update($data);

        return response()->json($parameterThreshold->load(['parameter', 'standard', 'waterQualityClass']));
    }

    public function destroy(Request $request, ParameterThreshold $parameterThreshold)
    {
        $this->ensureSuperAdmin();

        $parameterThreshold->delete();
        return response()->json(['message' => 'Threshold deleted']);
    }

    protected function validatePayload(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'parameter_id' => ['required', 'integer', Rule::exists('parameters', 'id')],
            'class_code' => ['required', 'string', Rule::exists('water_quality_classes', 'code')],
            'standard_id' => ['nullable', 'integer', Rule::exists('wq_standards', 'id')],
            'unit' => ['nullable', 'string', 'max:255'],
            'min_value' => ['nullable', 'numeric'],
            'max_value' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string'],
        ]);
    }
}
