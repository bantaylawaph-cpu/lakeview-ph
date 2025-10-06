<?php

namespace App\Http\Controllers\Api\Contrib;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SamplingEvent;

class KpiController extends Controller
{
    /**
     * GET /api/contrib/{tenant}/kpis/my-tests
     * Returns counts of draft and published sampling events created by current contributor.
     */
    public function myTests(Request $request, int $tenant)
    {
        $userId = $request->user()?->id;
        if (!$userId) return response()->json(['draft' => 0, 'published' => 0]);

        $rows = SamplingEvent::query()
            ->selectRaw("status, COUNT(*) as c")
            ->where('organization_id', $tenant)
            ->where('created_by_user_id', $userId)
            ->whereIn('status', ['draft','public'])
            ->groupBy('status')
            ->pluck('c','status');

        return response()->json([
            'draft' => (int) ($rows['draft'] ?? 0),
            'published' => (int) ($rows['public'] ?? 0),
        ]);
    }

    /**
     * GET /api/contrib/{tenant}/kpis/org-tests
     * Returns total published sampling events for the organization.
     */
    public function orgTests(Request $request, int $tenant)
    {
        $count = SamplingEvent::query()
            ->where('organization_id', $tenant)
            ->where('status', 'public')
            ->count();
        return response()->json(['published' => $count]);
    }
}
