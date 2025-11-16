<?php

namespace Tests\Feature;

use App\Jobs\TenantHardDeleteJob;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class TenantDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure roles exist (simplified) - adapt if roles seeder present
        if (!Role::query()->where('name', Role::SUPERADMIN)->exists()) {
            Role::unguard();
            Role::create(['name' => Role::SUPERADMIN, 'scope' => 'system']);
        }
    }

    protected function superAdminUser(): User
    {
        $roleId = Role::where('name', Role::SUPERADMIN)->value('id');
        return User::factory()->create(['role_id' => $roleId]);
    }

    public function test_soft_delete_and_restore_flow(): void
    {
        $user = $this->superAdminUser();
        $tenant = Tenant::factory()->create();

        // Soft delete
        $resp = $this->actingAs($user)->deleteJson("/api/admin/tenants/{$tenant->id}");
        $resp->assertNoContent();
        $this->assertSoftDeleted('tenants', ['id' => $tenant->id]);

        // Restore
        $resp = $this->actingAs($user)->postJson("/api/admin/tenants/{$tenant->id}/restore");
        $resp->assertStatus(200);
        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'deleted_at' => null]);
    }

    public function test_hard_delete_requires_soft_delete_first(): void
    {
        Bus::fake();
        $user = $this->superAdminUser();
        $tenant = Tenant::factory()->create();

        // Attempt hard delete without soft delete
        $resp = $this->actingAs($user)->deleteJson("/api/admin/tenants/{$tenant->id}/hard", ['reason' => 'cleanup']);
        $resp->assertStatus(422); // validation error
        Bus::assertNothingDispatched();
    }

    public function test_hard_delete_dispatches_job_after_soft_delete(): void
    {
        Bus::fake();
        $user = $this->superAdminUser();
        $tenant = Tenant::factory()->create();
        // Soft delete first
        $this->actingAs($user)->deleteJson("/api/admin/tenants/{$tenant->id}")->assertNoContent();
        $this->assertSoftDeleted('tenants', ['id' => $tenant->id]);

        // Hard delete queue
        $resp = $this->actingAs($user)->deleteJson("/api/admin/tenants/{$tenant->id}/hard", ['reason' => 'duplicate']);
        $resp->assertStatus(202);
        Bus::assertDispatched(TenantHardDeleteJob::class, function ($job) use ($tenant, $user) {
            return $job->tenantId === $tenant->id && $job->actorUserId === $user->id;
        });
    }
}
