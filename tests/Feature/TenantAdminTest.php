<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Role;
use App\Models\User;
use App\Models\Tenant;

class TenantAdminTest extends TestCase
{
    use RefreshDatabase;

    private function roleId(string $name): int
    {
        return (int) Role::where('name', $name)->value('id');
    }

    private function superadmin(): User
    {
        return User::factory()->create(['role_id' => $this->roleId(Role::SUPERADMIN)]);
    }

    private function orgAdmin(Tenant $tenant): User
    {
        return User::factory()->create([
            'role_id' => $this->roleId(Role::ORG_ADMIN),
            'tenant_id' => $tenant->id,
        ]);
    }

    public function test_superadmin_can_assign_org_admin()
    {
        $tenant = Tenant::factory()->create();
        $super = $this->superadmin();
        $user = User::factory()->create(['role_id' => $this->roleId(Role::PUBLIC)]);

        $resp = $this->actingAs($super)->postJson(route('tenants.assignAdmin', $tenant), [
            'user_id' => $user->id,
        ]);
        $resp->assertStatus(200)->assertJsonPath('data.role_id', $this->roleId(Role::ORG_ADMIN));
    }

    public function test_org_admin_cannot_assign_other_tenant_user()
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = $this->orgAdmin($tenantA);
        $contribRole = $this->roleId(Role::CONTRIBUTOR);
        $foreign = User::factory()->create(['role_id' => $contribRole, 'tenant_id' => $tenantB->id]);

        $resp = $this->actingAs($adminA)->postJson(route('tenants.assignAdmin', $tenantA), ['user_id' => $foreign->id]);
        // Authorization now blocks with 403 (forbidden) instead of validation 422
        $resp->assertStatus(403);
    }
}
