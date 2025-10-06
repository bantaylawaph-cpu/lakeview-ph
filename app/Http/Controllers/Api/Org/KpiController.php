<?php

namespace App\Http\Controllers\Api\Org;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\SamplingEvent;

class KpiController extends Controller
{
    /**
     * Active members: org_admin + contributor users (is_active=true) within the tenant.
     * GET /api/org/{tenant}/kpis/members
     */
    public function members(Request $request, int $tenant)
    {
        $roles = [Role::ORG_ADMIN, Role::CONTRIBUTOR];
        $count = User::query()
            ->where('tenant_id', $tenant)
            ->where('is_active', true)
            ->whereHas('role', fn($q) => $q->whereIn('name', $roles))
            ->count();
        return response()->json(['count' => $count]);
    }

    /**
     * Total sampling events logged by this organization.
     * GET /api/org/{tenant}/kpis/tests
     */
    public function tests(Request $request, int $tenant)
    {
        $count = SamplingEvent::query()->where('organization_id', $tenant)->count();
        return response()->json(['count' => $count]);
    }

    /**
     * Draft (pending approval) sampling events for this organization.
     * GET /api/org/{tenant}/kpis/tests/draft
     */
    public function testsDraft(Request $request, int $tenant)
    {
        $count = SamplingEvent::query()->where('organization_id', $tenant)->where('status', 'draft')->count();
        return response()->json(['count' => $count]);
    }
}
