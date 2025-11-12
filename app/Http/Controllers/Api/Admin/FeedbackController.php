<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFeedbackRequest;
use App\Models\Feedback;
use App\Events\FeedbackUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class FeedbackController extends Controller
{
    /**
     * Return the appropriate case-insensitive LIKE operator for the current DB driver.
     * Postgres supports ILIKE; others (MySQL, SQLite, SQL Server) use LIKE.
     */
    protected function likeOp(): string
    {
        try {
            return DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
        } catch (\Throwable $e) {
            return 'like';
        }
    }
    /**
     * Build a publicly accessible URL for a stored feedback attachment path.
     * Uses the public disk by default; falls back to asset('storage/...').
     * This mirrors KYC doc URL logic so the frontend no longer depends on a storage symlink existing.
     */
    protected function publicImageUrl(string $relativePath): string
    {
        $disk = env('FEEDBACK_IMAGES_DISK', 'public');
        try {
            if (\Storage::disk($disk)->exists($relativePath)) {
                // Prefer direct URL if supported
                if (method_exists(\Storage::disk($disk), 'url')) {
                    $u = \Storage::disk($disk)->url($relativePath);
                    if (is_string($u) && str_starts_with($u, 'http')) {
                        return $u;
                    }
                }
            }
        } catch (\Throwable $e) {
            // swallow and fallback
        }
        return asset('storage/'.$relativePath);
    }
    public function index(Request $request)
    {
        $q = Feedback::query()->with(['user:id,name,email','tenant:id,name','lake:id,name']);
        $like = $this->likeOp();

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
            $q->where(function($qq) use ($search, $fields, $like) {
                if (in_array('name', $fields)) {
                    $qq->where(function($nameQ) use ($search, $like) {
                        $nameQ->where(function($sub) use ($search, $like) {
                            $sub->where('is_guest', true)
                                ->where('guest_name', $like, "%$search%" );
                        })->orWhere(function($sub) use ($search, $like) {
                            $sub->where('is_guest', false)
                                ->whereHas('user', function($u) use ($search, $like) { $u->where('name', $like, "%$search%"); });
                        });
                    });
                }
                if (in_array('title', $fields)) {
                    $qq->orWhere('title', $like, "%$search%");
                }
                if (in_array('message', $fields)) {
                    $qq->orWhere('message', $like, "%$search%");
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
        // Transform attachment image paths to fully qualified public URLs for frontend preview reliability.
        $rows->getCollection()->transform(function ($fb) {
            // images: safe copy-modify-assign
            $imgs = is_array($fb->images) ? $fb->images : [];
            $fb->images = array_map(fn($p) => $this->publicImageUrl((string)$p), $imgs);

            // metadata.files: avoid by-reference modification on Eloquent cast attributes
            $meta = is_array($fb->metadata) ? $fb->metadata : [];
            if (isset($meta['files']) && is_array($meta['files'])) {
                $files = $meta['files'];
                foreach ($files as $i => $f) {
                    if (isset($f['path']) && !isset($f['url'])) {
                        $files[$i]['url'] = $this->publicImageUrl((string)$f['path']);
                    }
                }
                $meta['files'] = $files;
                $fb->metadata = $meta; // reassign after mutation
            }
            return $fb;
        });
        return response()->json($rows);
    }

    public function show(Feedback $feedback)
    {
        $feedback->load(['user:id,name,email','tenant:id,name','lake:id,name']);
        // Transform images to public URLs
        $feedback->images = array_map(fn($p) => $this->publicImageUrl((string)$p), is_array($feedback->images) ? $feedback->images : []);
        // metadata.files: copy-modify-assign to avoid indirect modification errors
        $meta = is_array($feedback->metadata) ? $feedback->metadata : [];
        if (isset($meta['files']) && is_array($meta['files'])) {
            $files = $meta['files'];
            foreach ($files as $i => $f) {
                if (isset($f['path']) && !isset($f['url'])) {
                    $files[$i]['url'] = $this->publicImageUrl((string)$f['path']);
                }
            }
            $meta['files'] = $files;
            $feedback->metadata = $meta;
        }
        return response()->json(['data' => $feedback]);
    }

    public function update(UpdateFeedbackRequest $request, Feedback $feedback)
    {
        $data = $request->validated();
        $oldStatus = $feedback->status;
        $oldResponse = $feedback->admin_response;
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

        // Dispatch a single consolidated event after save when anything changed
        $statusChanged = isset($data['status']) && $oldStatus !== $feedback->status;
        $replyChanged = array_key_exists('admin_response', $data) && $oldResponse !== $feedback->admin_response;
        if ($statusChanged || $replyChanged) {
            event(new FeedbackUpdated(
                $feedback,
                $oldStatus,
                $feedback->status,
                $oldResponse,
                (string) $feedback->admin_response,
                $request->user()?->id
            ));
        }
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

        $rows = Feedback::query()->with(['user:id,name,email','tenant:id,name'])
            ->whereIn('id', $data['ids'])->get();

        $updated = [];
        foreach ($rows as $row) {
            $oldStatus = $row->status;
            $oldResponse = $row->admin_response;
            $row->status = $data['status'];
            $row->resolved_at = $resolvedAt;
            if (array_key_exists('admin_response', $data)) {
                $row->admin_response = $data['admin_response'];
            }
            $row->updated_at = $now;
            $row->save();

            $statusChanged = $oldStatus !== $row->status;
            $replyChanged = array_key_exists('admin_response', $data) && $oldResponse !== $row->admin_response;
            if ($statusChanged || $replyChanged) {
                event(new FeedbackUpdated(
                    $row,
                    $oldStatus,
                    $row->status,
                    $oldResponse,
                    (string) $row->admin_response,
                    $request->user()?->id
                ));
            }
            $updated[] = $row;
        }

        return response()->json(['data' => $updated]);
    }

}
