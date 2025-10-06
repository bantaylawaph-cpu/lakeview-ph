<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Models\KycProfile;
use App\Models\KycDocument;

class KycProfileController extends Controller
{
    public function show(Request $request)
    {
        $u = $request->user();
        $profile = KycProfile::firstOrCreate(['user_id' => $u->id], ['status' => 'draft']);
        $docs = KycDocument::where('kyc_profile_id', $profile->id)
            ->select(['id','doc_type as type','storage_path as path','mime','size_bytes','created_at'])
            ->orderBy('id')->get();
        // Attach a public URL for each doc based on the configured disk
        $docs->transform(function ($d) {
            $d->url = asset('storage/'.$d->path);
            return $d;
        });
        return response()->json(['data' => $profile, 'documents' => $docs]);
    }

    public function update(Request $request)
    {
        $u = $request->user();
        $data = $request->validate([
            'full_name' => ['nullable','string','max:200'],
            'dob'       => ['nullable','date'],
            'id_type'   => ['nullable','string','max:100'],
            'id_number' => ['nullable','string','max:100'],
            'address_line1' => ['nullable','string','max:200'],
            'address_line2' => ['nullable','string','max:200'],
            'city'          => ['nullable','string','max:100'],
            'province'      => ['nullable','string','max:100'],
            'postal_code'   => ['nullable','string','max:20'],
        ]);
        $profile = KycProfile::firstOrCreate(['user_id' => $u->id], ['status' => 'draft']);
        $profile->fill($data);
        if ($profile->status === 'rejected') { $profile->status = 'draft'; }
        $profile->save();
        return response()->json(['data' => $profile]);
    }

    public function submit(Request $request)
    {
        $u = $request->user();
        $profile = KycProfile::firstOrCreate(['user_id' => $u->id], ['status' => 'draft']);
        if (in_array($profile->status, ['submitted','verified','approved'], true)) {
            return response()->json(['message' => 'KYC already submitted.'], 422);
        }
        $profile->status = 'submitted';
        $profile->submitted_at = now();
        $profile->save();
        // Notify user
        try {
            \Illuminate\Support\Facades\Mail::to($u->email)->queue(new \App\Mail\KycSubmitted($u));
        } catch (\Throwable $e) { /* swallow mail errors */ }
        return response()->json(['data' => $profile, 'message' => 'KYC submitted for review.']);
    }

    public function upload(Request $request)
    {
        $u = $request->user();
        $validated = $request->validate([
            'type' => ['required', Rule::in(['id_front','id_back','supporting'])],
            'file' => ['required','file','mimes:jpg,jpeg,png,pdf','max:5120'],
        ]);
        $profile = KycProfile::firstOrCreate(['user_id' => $u->id], ['status' => 'draft']);
        $file = $request->file('file');
        // Build friendly and unique filename: <user-slug>-<doc-type>-<timestamp>-<rand>.<ext>
        $userSlug = Str::slug($u->name ?: ("user-{$u->id}"));
        $docTypeSlug = match ($validated['type']) {
            'id_front'   => 'front-id',
            'id_back'    => 'back-id',
            default      => 'supporting',
        };
        $ext = strtolower($file->getClientOriginalExtension() ?: 'bin');
        $timestamp = now()->format('Ymd-His');
        try { $rand = substr(bin2hex(random_bytes(4)), 0, 8); } catch (\Throwable $e) { $rand = Str::random(8); }
        $filename = "$userSlug-$docTypeSlug-$timestamp-$rand.$ext";
        $dir = "kyc/{$u->id}"; // keep existing directory to avoid breaking prior uploads
        $stored = Storage::disk('public')->putFileAs($dir, $file, $filename);
        $path = $stored ?: "$dir/$filename";
        $doc = KycDocument::create([
            'kyc_profile_id' => $profile->id,
            'user_id' => $u->id,
            'doc_type' => $validated['type'],
            'storage_path' => $path,
            'mime' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize(),
        ]);
        return response()->json([
            'data' => [
                'id' => $doc->id,
                'type' => $doc->doc_type,
                'path' => $doc->storage_path,
                'mime' => $doc->mime,
                'size_bytes' => $doc->size_bytes,
                'created_at' => $doc->created_at,
                'url' => asset('storage/'.$doc->storage_path),
            ],
        ]);
    }

    public function destroyDoc($id, Request $request)
    {
        $u = $request->user();
        $doc = KycDocument::findOrFail($id);
        if ($doc->user_id !== $u->id) return response()->json(['message' => 'Forbidden'], 403);
        Storage::disk('public')->delete($doc->storage_path);
        $doc->delete();
        return response()->json(['ok' => true]);
    }

    // Admin endpoints
    public function adminIndex(Request $request)
    {
        $status = $request->query('status');
        $q = KycProfile::with(['user:id,name,email']);
        // Order by submitted_at when available, else fallback to updated_at to avoid SQL errors on older schemas
        if (Schema::hasColumn('kyc_profiles', 'submitted_at')) {
            $q->orderByDesc('submitted_at');
        } else {
            $q->orderByDesc('updated_at');
        }
        if ($status) $q->where('status', $status);
        return response()->json(['data' => $q->limit(200)->get()]);
    }

    public function adminDecision($id, Request $request)
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['approve','reject'])],
            'notes' => ['nullable','string','max:2000'],
        ]);
        $profile = KycProfile::findOrFail($id);
        $profile->status = $data['action'] === 'approve' ? 'verified' : 'rejected';
        $profile->reviewed_at = now();
        $profile->reviewer_id = $request->user()->id;
        $profile->reviewer_notes = $data['notes'] ?? null;
        $profile->save();
        // Notify user of decision
        try {
            \Illuminate\Support\Facades\Mail::to($profile->user?->email)->queue(new \App\Mail\KycDecision($profile->user, $profile->status, $profile->reviewer_notes));
        } catch (\Throwable $e) { /* swallow mail errors */ }
        return response()->json(['data' => $profile]);
    }

    // Admin/Org Admin: View a user's KYC profile and documents
    public function adminShowUser($userId)
    {
        $profile = KycProfile::where('user_id', $userId)->first();
        if (!$profile) {
            return response()->json([
                'data' => null,
                'documents' => [],
            ]);
        }
        $docs = KycDocument::where('kyc_profile_id', $profile->id)
            ->select(['id','doc_type as type','storage_path as path','mime','size_bytes','created_at'])
            ->orderBy('id')
            ->get();
        $docs->transform(function ($d) {
            $d->url = asset('storage/'.$d->path);
            return $d;
        });
        return response()->json([
            'data' => $profile,
            'documents' => $docs,
        ]);
    }
}
