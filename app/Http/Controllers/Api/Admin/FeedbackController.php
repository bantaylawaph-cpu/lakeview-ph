<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFeedbackRequest;
use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FeedbackController extends Controller
{
    public function index(Request $request)
    {
    $q = Feedback::query()->with(['user:id,name,email','tenant:id,name','lake:id,name']);

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($search = $request->query('search')) {
            $fieldsParam = $request->query('search_fields');
            $allowed = ['name','title','message'];
            $fields = collect(explode(',', (string)$fieldsParam))
                ->map(fn($f) => trim(strtolower($f)))
                ->filter(fn($f) => in_array($f, $allowed))
                ->unique()
                ->values()
                ->all();
            if (empty($fields)) {
                $fields = ['name']; // default to name-only
            }
            $q->where(function($qq) use ($search, $fields) {
                if (in_array('name', $fields)) {
                    $qq->where(function($nameQ) use ($search) {
                        $nameQ->where(function($sub) use ($search) {
                            $sub->where('is_guest', true)
                                ->where('guest_name', 'ilike', "%$search%" );
                        })->orWhere(function($sub) use ($search) {
                            $sub->where('is_guest', false)
                                ->whereHas('user', function($u) use ($search) { $u->where('name','ilike',"%$search%"); });
                        });
                    });
                }
                if (in_array('title', $fields)) {
                    $qq->orWhere('title','ilike',"%$search%");
                }
                if (in_array('message', $fields)) {
                    $qq->orWhere('message','ilike',"%$search%");
                }
            });
        }
        if ($category = $request->query('category')) {
            $q->where('category', $category);
        }
        $roleParam = $request->query('role');
        if ($roleParam) {
            // role values: superadmin, public, contributor, org_admin, guest
            if ($roleParam === 'guest') {
                $q->where('is_guest', true);
            } else {
                $q->where('is_guest', false)->whereHas('user.role', function($qq) use ($roleParam) { $qq->where('name', $roleParam); });
            }
        }
        $q->orderByDesc('created_at');

        $rows = $q->paginate($request->integer('per_page', 20));
        return response()->json($rows);
    }

    public function show(Feedback $feedback)
    {
    $feedback->load(['user:id,name,email','tenant:id,name','lake:id,name']);
        return response()->json(['data' => $feedback]);
    }

    public function update(UpdateFeedbackRequest $request, Feedback $feedback)
    {
        $data = $request->validated();
        if (isset($data['status'])) {
            $feedback->status = $data['status'];
            if (in_array($feedback->status, [Feedback::STATUS_RESOLVED, Feedback::STATUS_WONT_FIX])) {
                $feedback->resolved_at = now();
            } else {
                $feedback->resolved_at = null;
            }
        }
        if (array_key_exists('admin_response', $data)) {
            $feedback->admin_response = $data['admin_response'];
        }
        $feedback->save();
        return response()->json(['data' => $feedback]);
    }

    /**
     * Bulk update status (and optionally admin_response) for multiple feedback IDs.
     * Request payload: { ids: number[], status: string, admin_response?: string }
     */
    public function bulkUpdate(Request $request)
    {
        $v = Validator::make($request->all(), [
            'ids' => ['required','array','min:1'],
            'ids.*' => ['integer','distinct','exists:feedback,id'],
            'status' => ['required','in:'.implode(',', Feedback::ALL_STATUSES)],
            'admin_response' => ['nullable','string','max:4000']
        ]);
        if ($v->fails()) {
            return response()->json(['message' => 'Validation failed','errors' => $v->errors()], 422);
        }
        $data = $v->validated();
        $now = now();

        // Determine resolved_at value based on status
        $resolvedAt = in_array($data['status'], [Feedback::STATUS_RESOLVED, Feedback::STATUS_WONT_FIX]) ? $now : null;

        $updatePayload = [
            'status' => $data['status'],
            'resolved_at' => $resolvedAt,
            'updated_at' => $now,
        ];
        if (array_key_exists('admin_response', $data)) {
            $updatePayload['admin_response'] = $data['admin_response'];
        }

        Feedback::whereIn('id', $data['ids'])->update($updatePayload);
        $rows = Feedback::query()->with(['user:id,name,email','tenant:id,name'])
            ->whereIn('id', $data['ids'])->get();
        return response()->json(['data' => $rows]);
    }

}
