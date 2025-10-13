<?php

namespace App\Http\Controllers;

use App\Services\Semantic\SemanticSearch;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(private SemanticSearch $search) {}

    public function query(Request $request)
    {
        $q = (string) $request->input('query', '');
        if (trim($q) === '') return response()->json(['error' => 'query is required'], 422);

        $opts = [
            'limit' => (int) $request->input('limit', 20),
        ];

        // SemanticSearch::search returns an associative array with keys: results, intent, diagnostics
        $out = $this->search->search($q, $opts);
        return response()->json([
            'data' => $out['results'] ?? [],
            'intent' => $out['intent'] ?? null,
            'diagnostics' => $out['diagnostics'] ?? null,
        ]);
    }
}
