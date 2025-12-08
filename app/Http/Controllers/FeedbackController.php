<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class FeedbackController extends Controller
{
    /**
     * Build a publicly accessible URL for a stored feedback attachment path.
     */
    protected function publicImageUrl(string $relativePath): string
    {
        $disk = env('FEEDBACK_IMAGES_DISK', config('filesystems.default', 'public'));
        try {
            if (Storage::disk($disk)->exists($relativePath)) {
                $driver = config("filesystems.disks.$disk.driver");
                
                // For S3-compatible storage, use temporary signed URL
                if (in_array($driver, ['s3', 'minio'], true) && method_exists(Storage::disk($disk), 'temporaryUrl')) {
                    try {
                        return Storage::disk($disk)->temporaryUrl($relativePath, now()->addMinutes(30));
                    } catch (\Throwable $e) {
                        // Fall through
                    }
                }
                
                // Try direct URL for public storage
                if (method_exists(Storage::disk($disk), 'url')) {
                    $url = Storage::disk($disk)->url($relativePath);
                    if (is_string($url) && str_starts_with($url, 'http')) {
                        return $url;
                    }
                }
            }
        } catch (\Throwable $e) {
            // Fallback
        }
        
        return asset('storage/'.$relativePath);
    }

    /**
     * Submit feedback as a guest (public, unauthenticated).
     * POST /api/public/feedback
     */
    public function publicStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:4000'],
            'category' => ['nullable', 'string', 'in:bug,suggestion,data,ui,org_petition,other,missing_information,incorrect_data'],
            'lake_id' => ['nullable', 'integer', 'exists:lakes,id'],
            'images' => ['nullable', 'array', 'max:6'],
            'images.*' => ['image', 'max:25600'], // 25MB max per image
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        
        // Handle image uploads
        $uploadedPaths = [];
        if (isset($data['images']) && is_array($data['images'])) {
            $disk = env('FEEDBACK_IMAGES_DISK', config('filesystems.default', 'public'));
            foreach ($data['images'] as $image) {
                if ($image->isValid()) {
                    $path = $image->store('feedback', $disk);
                    if ($path) {
                        $uploadedPaths[] = $path;
                    }
                }
            }
        }

        $feedback = Feedback::create([
            'is_guest' => true,
            'guest_name' => $data['guest_name'] ?? null,
            'guest_email' => $data['guest_email'] ?? null,
            'title' => $data['title'],
            'message' => $data['message'],
            'category' => $data['category'] ?? 'other',
            'lake_id' => $data['lake_id'] ?? null,
            'images' => $uploadedPaths,
            'status' => Feedback::STATUS_OPEN,
            'metadata' => [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return response()->json([
            'message' => 'Feedback submitted successfully',
            'data' => $feedback
        ], 201);
    }

    /**
     * Submit feedback as an authenticated user.
     * POST /api/feedback
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:4000'],
            'category' => ['nullable', 'string', 'in:bug,suggestion,data,ui,org_petition,other,missing_information,incorrect_data'],
            'lake_id' => ['nullable', 'integer', 'exists:lakes,id'],
            'images' => ['nullable', 'array', 'max:6'],
            'images.*' => ['image', 'max:25600'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        $user = $request->user();
        
        // Handle image uploads
        $uploadedPaths = [];
        if (isset($data['images']) && is_array($data['images'])) {
            $disk = env('FEEDBACK_IMAGES_DISK', config('filesystems.default', 'public'));
            foreach ($data['images'] as $image) {
                if ($image->isValid()) {
                    $path = $image->store('feedback', $disk);
                    if ($path) {
                        $uploadedPaths[] = $path;
                    }
                }
            }
        }

        $feedback = Feedback::create([
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id ?? null,
            'is_guest' => false,
            'title' => $data['title'],
            'message' => $data['message'],
            'category' => $data['category'] ?? 'other',
            'lake_id' => $data['lake_id'] ?? null,
            'images' => $uploadedPaths,
            'status' => Feedback::STATUS_OPEN,
            'metadata' => [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return response()->json([
            'message' => 'Feedback submitted successfully',
            'data' => $feedback
        ], 201);
    }

    /**
     * Get authenticated user's own feedback submissions with pagination.
     * GET /api/feedback/mine
     */
    public function mine(Request $request)
    {
        $user = $request->user();
        
        $perPage = min(max((int) $request->query('per_page', 10), 1), 100);
        $page = max((int) $request->query('page', 1), 1);
        
        $query = Feedback::query()
            ->where('user_id', $user->id)
            ->with(['lake:id,name'])
            ->orderBy('created_at', 'desc');
        
        $total = $query->count();
        $items = $query->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get()
            ->map(function ($fb) {
                // Transform image paths to public URLs
                $fb->images = array_map(
                    fn($p) => $this->publicImageUrl((string)$p),
                    is_array($fb->images) ? $fb->images : []
                );
                return $fb;
            });
        
        $lastPage = max(1, (int) ceil($total / $perPage));
        
        return response()->json([
            'data' => $items,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => $lastPage,
        ]);
    }

    /**
     * Get a specific feedback item owned by the authenticated user.
     * GET /api/feedback/mine/{id}
     */
    public function show(Request $request, Feedback $feedback)
    {
        $user = $request->user();
        
        // Ensure user can only view their own feedback
        if ($feedback->user_id !== $user->id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }
        
        $feedback->load(['lake:id,name']);
        
        // Transform images to public URLs
        $feedback->images = array_map(
            fn($p) => $this->publicImageUrl((string)$p),
            is_array($feedback->images) ? $feedback->images : []
        );
        
        return response()->json(['data' => $feedback]);
    }
}
