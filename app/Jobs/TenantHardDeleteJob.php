<?php

namespace App\Jobs;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class TenantHardDeleteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tenantId;
    public string $reason;
    public int $actorUserId;

    public function __construct(int $tenantId, int $actorUserId, string $reason = '')
    {
        $this->tenantId = $tenantId;
        $this->actorUserId = $actorUserId;
        $this->reason = $reason;
    }

    public function handle(): void
    {
        $tenant = Tenant::withTrashed()->find($this->tenantId);
        if (!$tenant) {
            Log::warning('TenantHardDeleteJob: tenant missing', ['tenant_id' => $this->tenantId]);
            return;
        }

        // Capture snapshot for audit logging (simple log for now; extend with Audit model if needed)
        $snapshot = $tenant->toArray();

        // Purge related data stubs (extend as needed)
        // Example: $tenant->users()->delete(); (Depending on cascade strategy)

        $tenant->forceDelete();

        Log::info('Tenant hard deleted', [
            'tenant_id' => $this->tenantId,
            'actor_user_id' => $this->actorUserId,
            'reason' => $this->reason,
            'snapshot' => $snapshot,
        ]);
    }
}
