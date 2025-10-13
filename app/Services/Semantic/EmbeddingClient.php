<?php

namespace App\Services\Semantic;

use Illuminate\Support\Facades\Http;

class EmbeddingClient
{
    private string $baseUrl;
    private string $model;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('semantic.embedding_endpoint', ''), '/');
        $this->model = config('semantic.embedding_model', 'all-MiniLM-L6-v2');
        $this->timeout = (int) config('semantic.timeout_seconds', 6);
    }

    /**
     * Return embedding vector (array of floats) for the input text.
     * Assumes a local embedding service that accepts POST /embed { text, model }
     */
    public function embed(string $text): ?array
    {
        if ($this->baseUrl === '') return null;
        try {
            $resp = Http::timeout($this->timeout)
                ->acceptJson()
                ->post($this->baseUrl . '/embed', [
                    'text' => $text,
                    'model' => $this->model,
                ]);
            if ($resp->successful()) {
                $data = $resp->json();
                if (is_array($data) && isset($data['embedding']) && is_array($data['embedding'])) {
                    return array_map('floatval', $data['embedding']);
                }
            }
        } catch (\Throwable $e) {
            // swallow errors to allow fallback
        }
        return null;
    }
}
