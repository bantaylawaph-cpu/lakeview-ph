<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WqStandard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WqStandardController extends Controller
{
    protected function ensureSuperAdmin(): void
    {
        $user = Auth::user();
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

        $query = $query->orderByDesc('is_current')
            ->orderBy('code');

        // Support optional server-side pagination. If per_page is provided, return a paginator
        $perPage = $request->integer('per_page');
        if ($perPage !== null && $perPage > 0) {
            // Cap page size to a sane maximum
            if ($perPage > 100) { $perPage = 100; }
            return $query->paginate($perPage);
        }

        // Default (legacy) response: full list under data[]
        $standards = $query->get();
        return response()->json(['data' => $standards]);
    }

    public function store(Request $request)
    {
        $this->ensureSuperAdmin();

        $data = $this->validatePayload($request);
        // Hard cast booleans to avoid Postgres integer literal mismatch ("0" vs false)
        if (array_key_exists('is_current', $data)) {
            $data['is_current'] = (bool) $data['is_current'];
        }

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
        if (array_key_exists('is_current', $data)) {
            $data['is_current'] = (bool) $data['is_current'];
        }

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
        $out = $request->validate([
            'code' => ['required', 'string', 'max:255', Rule::unique('wq_standards', 'code')->ignore($id)],
            'name' => ['nullable', 'string', 'max:255'],
            'is_current' => ['sometimes', 'boolean'],
            // priority and notes removed
        ]);
        // Normalize string/integer forms ("0","1",0,1) into real booleans for safety.
        if (array_key_exists('is_current', $out)) {
            $out['is_current'] = filter_var($out['is_current'], FILTER_VALIDATE_BOOLEAN);
        }
        return $out;
    }

    protected function ensureCurrentConsistency(int $currentId): void
    {
        // Use a PostgreSQL boolean literal to avoid integer 0/1 binding
        // (bulk updates bypass model mutators/casts).
        WqStandard::where('id', '!=', $currentId)
            ->update(['is_current' => DB::raw('false')]);
    }
}
