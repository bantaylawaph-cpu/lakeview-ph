<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Cache;

class GeocodeController extends Controller
{
    public function nominatimSearch(Request $request)
    {
        $q = $request->query('q');
        $limit = (int) $request->query('limit', 5);
        if (!$q) return response()->json([], 400);

        $cacheKey = 'nominatim:' . md5($q) . ':' . $limit;
        $cached = Cache::get($cacheKey);
        if ($cached) return response()->json($cached);

        $client = new Client([
            'base_uri' => 'https://nominatim.openstreetmap.org',
            'timeout' => 10,
        ]);

        try {
            $res = $client->get('/search', [
                'query' => [
                    'format' => 'json',
                    'polygon_geojson' => 1,
                    'addressdetails' => 1,
                    'limit' => $limit,
                    'q' => $q,
                ],
                'headers' => [
                    'User-Agent' => 'LakeviewPH/1.0 (contact: admin@example.com)',
                    'Accept' => 'application/json',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Upstream request failed', 'message' => $e->getMessage()], 502);
        }

        $body = json_decode($res->getBody()->getContents(), true);
        Cache::put($cacheKey, $body, now()->addHour());
        return response()->json($body);
    }
}
