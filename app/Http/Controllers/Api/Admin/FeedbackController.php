<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class FeedbackController extends Controller
{
    /**
     * List all feedback with pagination and filtering.
     * GET /api/admin/feedback
     * Query params: page, per_page, sort_by, sort_dir, status, search
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->query('per_page', 10), 100);
        $sortBy = $request->query('sort_by', 'created_at');
        $sortDir = $request->query('sort_dir', 'desc');
        $status = $request->query('status');
        $search = $request->query('search');

        $query = Feedback::query()->with(['user', 'tenant', 'lake']);

        // Filter by status
        if ($status && in_array($status, Feedback::ALL_STATUSES)) {
            $query->where('status', $status);
        }

        // Search in title, message, guest_name, guest_email
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                    ->orWhere('message', 'ilike', "%{$search}%")
                    ->orWhere('guest_name', 'ilike', "%{$search}%")
                    ->orWhere('guest_email', 'ilike', "%{$search}%");
            });
        }

        // Sort
        $allowedSort = ['id', 'created_at', 'updated_at', 'status', 'category', 'spam_score'];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * Show a single feedback item.
     * GET /api/admin/feedback/{id}
     */
    public function show(Feedback $feedback)
    {
        $feedback->load(['user', 'tenant', 'lake']);
        return response()->json(['data' => $feedback]);
    }

    /**
     * Update a single feedback item (status, admin_response, etc).
     * PATCH /api/admin/feedback/{id}
     */
    public function update(Request $request, Feedback $feedback)
    {
        $validator = Validator::make($request->all(), [
            'status' => ['sometimes', Rule::in(Feedback::ALL_STATUSES)],
            'admin_response' => 'sometimes|string|nullable|max:2000',
            'category' => 'sometimes|string|nullable|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // If status is being changed to resolved, set resolved_at
        if (isset($validated['status']) && $validated['status'] === Feedback::STATUS_RESOLVED && !$feedback->resolved_at) {
            $validated['resolved_at'] = now();
        }

        $feedback->update($validated);

        return response()->json([
            'data' => $feedback->fresh(['user', 'tenant', 'lake']),
            'message' => 'Feedback updated successfully',
        ]);
    }

    /**
     * Bulk update multiple feedback items.
     * POST /api/admin/feedback/bulk-update
     * Body: { ids: [1,2,3], status: 'resolved', admin_response: '...' }
     */
    public function bulkUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:feedback,id',
            'status' => ['sometimes', Rule::in(Feedback::ALL_STATUSES)],
            'admin_response' => 'sometimes|string|nullable|max:2000',
            'category' => 'sometimes|string|nullable|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $ids = $validated['ids'];
        unset($validated['ids']);

        $updateData = [];
        if (isset($validated['status'])) {
            $updateData['status'] = $validated['status'];
            // If changing to resolved, set resolved_at for items that don't have it
            if ($validated['status'] === Feedback::STATUS_RESOLVED) {
                $updateData['resolved_at'] = now();
            }
        }
        if (isset($validated['admin_response'])) {
            $updateData['admin_response'] = $validated['admin_response'];
        }
        if (isset($validated['category'])) {
            $updateData['category'] = $validated['category'];
        }

        $updated = Feedback::whereIn('id', $ids)->update($updateData);

        return response()->json([
            'message' => "Updated {$updated} feedback item(s)",
            'updated_count' => $updated,
        ]);
    }
}
