<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Cache;

class GeocodeController extends Controller
{
    public function nominatimSearch(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $limit = (int) $request->query('limit', 5);
        if ($limit < 1 || $limit > 10) $limit = 5; // small sane bounds
        if ($q === '' || mb_strlen($q) < 2) {
            return response()->json(['error' => 'Query too short'], 400);
        }

        $cacheKey = 'nominatim:' . md5($q) . ':' . $limit;
        if (Cache::has($cacheKey)) {
            return response()->json(Cache::get($cacheKey));
        }

        $base = config('services.nominatim.base_url', 'https://nominatim.openstreetmap.org');
        $email = config('services.nominatim.email'); // optional for heavy usage

        $client = new Client([
            'base_uri' => $base,
            'timeout' => 12,
            'http_errors' => false, // we will map status codes ourselves
        ]);

        try {
            $query = [
                'format' => 'json',
                'polygon_geojson' => 1,
                'addressdetails' => 1,
                'limit' => $limit,
                'q' => $q,
                'dedupe' => 1,
            ];
            if ($email) $query['email'] = $email; // comply with usage policy when provided

            $res = $client->get('/search', [
                'query' => $query,
                'headers' => [
                    'User-Agent' => 'LakeviewPH/1.0 (contact: admin@example.com)',
                    'Accept' => 'application/json',
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Upstream connection failed',
                'message' => $e->getMessage(),
            ], 503);
        }

        $status = $res->getStatusCode();
        $raw = (string) $res->getBody();
        $json = json_decode($raw, true);

        if ($status >= 400) {
            // Cache empty result for short period to avoid hammering if repeated bad query
            if ($status === 404 || $status === 429) {
                Cache::put($cacheKey, [], now()->addMinutes(5));
            }
            return response()->json([
                'error' => 'Upstream error',
                'status' => $status,
                'message' => $json['error'] ?? $json['message'] ?? $raw,
            ], $status);
        }

        if (!is_array($json)) {
            return response()->json([
                'error' => 'Malformed upstream response',
            ], 502);
        }

        // Successful response; cache for an hour
        Cache::put($cacheKey, $json, now()->addHour());
        return response()->json($json);
    }
}
