<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\OrgApplication;
use App\Models\KycProfile;
use App\Models\User;
use App\Models\Role;

class OrgApplicationController extends Controller
{
    // Current user's latest application (if any)
    public function mine(Request $request)
    {
        $u = $request->user();
        $app = OrgApplication::with(['tenant:id,name'])
            ->where('user_id', $u->id)
            ->orderByDesc('id')
            ->first();
        return response()->json(['data' => $app]);
    }

    // Current user's all applications (if any)
    public function mineAll(Request $request)
    {
        $u = $request->user();
        $apps = OrgApplication::with(['tenant:id,name'])
            ->where('user_id', $u->id)
            ->orderByDesc('id')
            ->get();
        return response()->json(['data' => $apps]);
    }

    // Current user's application count (fast check)
    public function mineCount(Request $request)
    {
        $u = $request->user();
        $count = OrgApplication::where('user_id', $u->id)->count();
        return response()->json(['data' => ['count' => $count]]);
    }

    public function store(Request $request)
    {
        $u = $request->user();
        $data = $request->validate([
            'tenant_id'    => ['required','integer','exists:tenants,id'],
            'desired_role' => ['required', Rule::in(['contributor','org_admin'])],
        ]);

        // Enforce one application per user per organization
        $existing = OrgApplication::where('user_id', $u->id)
            ->where('tenant_id', $data['tenant_id'])
            ->orderByDesc('id')
            ->first();
        if ($existing) {
            return response()->json([
                'message' => 'You have already applied to this organization.',
                'data' => $existing,
            ], 409);
        }

        // Determine initial status based on KYC
        $kyc = KycProfile::firstOrCreate(['user_id' => $u->id], ['status' => 'draft']);
        $initialStatus = in_array($kyc->status, ['verified','approved'], true)
            ? 'pending_org_review'
            : 'pending_kyc';

        // Minimal: single active submission per user+tenant (not strict yet)
        $app = OrgApplication::create([
            'user_id'      => $u->id,
            'tenant_id'    => $data['tenant_id'],
            'desired_role' => $data['desired_role'],
            'status'       => $initialStatus,
        ]);

        $meta = [];
        // Unified, clearer message for user toast
        $meta['message'] = "Application received. We’ll email you our response.";

        // Notify applicant
        try {
            $app->loadMissing('tenant:id,name');
            \Illuminate\Support\Facades\Mail::to($u->email)->queue(new \App\Mail\OrgApplicationSubmitted($u, $app->tenant, $initialStatus));
        } catch (\Throwable $e) { /* ignore mail failures */ }
        return response()->json(['data' => $app, ...$meta], 201);
    }

    public function indexAdmin(Request $request)
    {
        // Minimal list for admins (scoping rules to be tightened later)
        $status = $request->query('status');
        $q = OrgApplication::query()->with(['user:id,name,email','tenant:id,name']);
        if ($status) $q->where('status', $status);
        $rows = $q->orderByDesc('id')->limit(100)->get();
        return response()->json(['data' => $rows]);
    }

    // Admin: list applications for a specific user (for per-user modal)
    public function adminUserApplications(Request $request, int $userId)
    {
        $actor = $request->user();
        if (!$actor || !$actor->isSuperAdmin()) return response()->json(['message' => 'Forbidden'], 403);
        $rows = OrgApplication::with(['tenant:id,name'])
            ->where('user_id', $userId)
            ->orderByDesc('id')
            ->get();
        return response()->json(['data' => $rows]);
    }

    public function decideAdmin($id, Request $request)
    {
        return response()->json(['message' => 'Decisions must be made by an organization admin.'], 403);
    }

    // Org admin (tenant-scoped via route): list applications for this tenant
    public function indexOrg(Request $request, int $tenant)
    {
        $actor = $request->user();
        if (!$actor || (!$actor->isSuperAdmin() && (!$actor->isOrgAdmin() || $actor->tenant_id !== $tenant))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $status = $request->query('status');
        $q = OrgApplication::query()->with(['user:id,name,email'])
            ->where('tenant_id', $tenant)
            ->whereNull('archived_at');
        if ($status) $q->where('status', $status);
        $rows = $q->orderByDesc('id')->limit(100)->get();
        return response()->json(['data' => $rows]);
    }

    // Org admin (tenant-scoped) decide on an application
    public function decideOrg(int $tenant, int $id, Request $request)
    {
        $actor = $request->user();
        if (!$actor || (!$actor->isSuperAdmin() && (!$actor->isOrgAdmin() || $actor->tenant_id !== $tenant))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'action' => ['required', Rule::in(['approve','needs_changes','reject'])],
            'notes'  => ['nullable','string','max:2000'],
        ]);
        $app = OrgApplication::where('tenant_id', $tenant)->findOrFail($id);
        $map = [
            'approve'       => 'approved',
            'needs_changes' => 'needs_changes',
            'reject'        => 'rejected',
        ];
        $app->status = $map[$data['action']];
        $app->reviewer_notes = $data['notes'] ?? null;
        $app->save();

        // Note: membership is no longer applied on approve. It will be applied when user accepts the offer.

        // Notify applicant of decision
        try {
            $user = $app->user()->first();
            if ($user && $user->email) {
                $tenantName = optional($app->tenant()->first())->name;
                \Illuminate\Support\Facades\Mail::to($user->email)->queue(new \App\Mail\OrgApplicationDecision($user, $app->status, $data['notes'] ?? null, $tenantName));
            }
        } catch (\Throwable $e) { /* ignore mail failures */ }

        return response()->json(['data' => $app]);
    }

    // User acceptance: finalize membership and void other applications
    public function accept(int $id, Request $request)
    {
        $u = $request->user();
        $app = OrgApplication::with('tenant')->findOrFail($id);
        if ($app->user_id !== $u->id) return response()->json(['message' => 'Forbidden'], 403);
        if ($app->status !== 'approved') return response()->json(['message' => 'Application is not approved.'], 422);
        if ($app->accepted_at) return response()->json(['data' => $app, 'message' => 'Already accepted.']);

        // Optional guard: prevent switching if already member elsewhere
        if (!empty($u->tenant_id) && $u->tenant_id !== $app->tenant_id) {
            return response()->json(['message' => 'You are already a member of another organization.'], 409);
        }

        // Apply updates atomically
        \DB::beginTransaction();
        try {
            // Apply membership
            $targetRole = Role::where('name', $app->desired_role)->first();
            if (!$targetRole) {
                \DB::rollBack();
                return response()->json(['message' => 'Target role not found'], 500);
            }
            $u->tenant_id = $app->tenant_id;
            $u->role_id = $targetRole->id;
            $u->save();

            // Mark accepted and archive this app
            $now = now();
            $app->accepted_at = $now;
            $app->archived_at = $now;
            $app->archived_reason = 'accepted';
            $app->save();

            // Reset other applications
            OrgApplication::where('user_id', $u->id)
                ->where('id', '<>', $app->id)
                ->whereNull('archived_at')
                ->update(['status' => 'accepted_another_org']);

            \DB::commit();
        } catch (\Throwable $e) {
            \DB::rollBack();
            return response()->json(['message' => 'Failed to finalize acceptance.'], 500);
        }

        return response()->json(['data' => $app, 'message' => 'Membership confirmed.']);
    }
}
