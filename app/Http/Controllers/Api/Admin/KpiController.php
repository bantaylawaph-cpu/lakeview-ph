<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Role;

class KpiController extends Controller
{
    /**
     * Return total number of organizations (tenants).
     * GET /api/admin/kpis/orgs
     */
    public function orgs(Request $request)
    {
        $total = Tenant::query()->count();
        return response()->json(['count' => $total]);
    }

    /**
     * Return total number of registered users (public, contributor, org_admin).
     * GET /api/admin/kpis/users
     */
    public function users(Request $request)
    {
        $roles = [Role::PUBLIC, Role::CONTRIBUTOR, Role::ORG_ADMIN];
        $roleIds = Role::query()->whereIn('name', $roles)->pluck('id')->toArray();
        $total = User::whereIn('role_id', $roleIds)->count();
        return response()->json(['count' => $total]);
    }
}
