<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WqStandard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WqStandardController extends Controller
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

        $query = WqStandard::query();

        if ($request->boolean('only_current')) {
            $query->where('is_current', true);
        }

        $standards = $query->orderByDesc('is_current')
            ->orderByDesc('priority')
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $standards]);
    }

    public function store(Request $request)
    {
        $this->ensureSuperAdmin();

        $data = $this->validatePayload($request);

        $standard = DB::transaction(function () use ($data) {
            $standard = WqStandard::create($data);
            if ($standard->is_current) {
                $this->ensureCurrentConsistency($standard->id);
            }
            return $standard;
        });

        return response()->json($standard, 201);
    }

    public function show(Request $request, WqStandard $wqStandard)
    {
        $this->ensureSuperAdmin();

        return response()->json(['data' => $wqStandard]);
    }

    public function update(Request $request, WqStandard $wqStandard)
    {
        $this->ensureSuperAdmin();

        $data = $this->validatePayload($request, $wqStandard->id);

        DB::transaction(function () use ($wqStandard, $data) {
            $wqStandard->update($data);
            if ($wqStandard->is_current) {
                $this->ensureCurrentConsistency($wqStandard->id);
            }
        });

        return response()->json($wqStandard->refresh());
    }

    public function destroy(Request $request, WqStandard $wqStandard)
    {
        $this->ensureSuperAdmin();

        $wqStandard->delete();
        return response()->json(['message' => 'Standard deleted']);
    }

    protected function validatePayload(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:255', Rule::unique('wq_standards', 'code')->ignore($id)],
            'name' => ['nullable', 'string', 'max:255'],
            'is_current' => ['sometimes', 'boolean'],
            'priority' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string'],
        ]);
    }

    protected function ensureCurrentConsistency(int $currentId): void
    {
        WqStandard::where('id', '!=', $currentId)->update(['is_current' => false]);
    }
}
