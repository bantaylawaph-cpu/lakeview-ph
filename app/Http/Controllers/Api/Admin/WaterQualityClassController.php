<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WaterQualityClass;
use Illuminate\Http\Request;

class WaterQualityClassController extends Controller
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

        $classes = WaterQualityClass::orderBy('code')->get();
        return response()->json(['data' => $classes]);
    }
}
