<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\AppConfig;

class AppConfigController extends Controller
{
    /**
     * GET /api/public/app-config
     * Returns public app configuration used by clients (e.g., default basemap)
     */
    public function show(Request $request)
    {
        try {
            $key = 'app-config:public';
            if ($hit = Cache::get($key)) return response()->json($hit);
            $defaultBasemap = optional(AppConfig::find('default_basemap'))->value ?? 'topographic';
            $payload = [ 'default_basemap' => $defaultBasemap ];
            Cache::put($key, $payload, now()->addMinutes(10));
            return response()->json($payload);
        } catch (\Throwable $e) {
            \Log::error('app-config.show error', ['error' => $e->getMessage()]);
            // Graceful fallback
            return response()->json(['default_basemap' => 'topographic']);
        }
    }

    /**
     * POST /api/admin/app-config
     * Update global app configuration (restricted to super admins)
     */
    public function update(Request $request)
    {
        // Simple role gate; adjust to your policy as needed
        try {
            $user = $request->user();
            // Gate: Only SUPERADMIN (Role model constant) may update
            if (!$user || ($user->role->name ?? null) !== \App\Models\Role::SUPERADMIN) {
                return response()->json(['error' => 'forbidden'], 403);
            }
            $value = (string) $request->input('default_basemap', 'topographic');
            // sanity whitelist
            $allowed = ['satellite','topographic','street','osm','stamen_terrain','worldcover_2021'];
            if (!in_array($value, $allowed, true)) {
                return response()->json(['error' => 'invalid_value'], 422);
            }
            AppConfig::updateOrCreate(['key' => 'default_basemap'], ['value' => $value]);
            // bust cache
            Cache::forget('app-config:public');
            return response()->json(['updated' => true, 'default_basemap' => $value]);
        } catch (\Throwable $e) {
            \Log::error('app-config.update error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'server_error'], 500);
        }
    }
}
