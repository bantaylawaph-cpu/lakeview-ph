<?php

return [
    // Base URL of the embedding service. Example: http://localhost:11434 (Ollama)
    // or a small local service you run (e.g., http://127.0.0.1:8088).
    'embedding_endpoint' => env('SEMANTIC_EMBEDDING_ENDPOINT', ''),

    // Embedding model name to pass to the embedding service (if applicable)
    'embedding_model' => env('SEMANTIC_EMBEDDING_MODEL', 'all-MiniLM-L6-v2'),

    // Embedding dimension; all-MiniLM-L6-v2 is 384
    'embedding_dimension' => env('SEMANTIC_EMBEDDING_DIM', 384),

    // Safety and performance
    'timeout_seconds' => env('SEMANTIC_HTTP_TIMEOUT', 6),

    // Similarity thresholds
    'intent_min_similarity' => env('SEMANTIC_INTENT_MIN_SIMILARITY', 0.62),
];
