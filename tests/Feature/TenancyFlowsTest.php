<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Role;
use App\Models\User;
use App\Models\Tenant;
use App\Services\UserRoleAuditLogger;
use Illuminate\Support\Facades\DB;

class TenancyFlowsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed roles if a seeder exists in project (defensive)
        if (class_exists(\Database\Seeders\RolesSeeder::class)) {
            $this->seed(\Database\Seeders\RolesSeeder::class);
        }
    }

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

    private function contributor(Tenant $tenant): User
    {
        return User::factory()->create([
            'role_id' => $this->roleId(Role::CONTRIBUTOR),
            'tenant_id' => $tenant->id,
        ]);
    }

    public function test_superadmin_assigns_org_admin_creates_audit_row()
    {
        $tenant = Tenant::factory()->create();
        $super = $this->superadmin();
        $user = User::factory()->create(['role_id' => $this->roleId(Role::PUBLIC)]);

        $resp = $this->actingAs($super)->postJson(route('tenants.assignAdmin', ['tenant' => $tenant->id]), [
            'user_id' => $user->id,
        ]);
        $resp->assertStatus(200)->assertJsonPath('data.role_id', $this->roleId(Role::ORG_ADMIN));

        // Audit row should exist
        $auditExists = DB::table('user_tenant_changes')
            ->where('user_id', $user->id)
            ->where('new_role_id', $this->roleId(Role::ORG_ADMIN))
            ->exists();
        $this->assertTrue($auditExists, 'Expected audit trail for assigning org admin');
    }

    public function test_superadmin_demotes_org_admin_to_contributor()
    {
        $tenant = Tenant::factory()->create();
        $super = $this->superadmin();
        $admin = $this->orgAdmin($tenant);

        $resp = $this->actingAs($super)->deleteJson(route('tenants.removeAdmin', ['tenant' => $tenant->id, 'user' => $admin->id]));
        $resp->assertStatus(200)->assertJsonPath('data.role_id', $this->roleId(Role::CONTRIBUTOR));

        $auditExists = DB::table('user_tenant_changes')
            ->where('user_id', $admin->id)
            ->where('new_role_id', $this->roleId(Role::CONTRIBUTOR))
            ->exists();
        $this->assertTrue($auditExists, 'Expected audit trail for demotion');
    }

    public function test_contributor_cannot_assign_org_admin()
    {
        $tenant = Tenant::factory()->create();
        $contrib = $this->contributor($tenant);
        $target = User::factory()->create(['role_id' => $this->roleId(Role::PUBLIC)]);

        $resp = $this->actingAs($contrib)->postJson(route('tenants.assignAdmin', ['tenant' => $tenant->id]), [
            'user_id' => $target->id,
        ]);
        $resp->assertStatus(403);
    }

    public function test_superadmin_cannot_have_tenant_id_set_via_update()
    {
        $super = $this->superadmin();
        $tenant = Tenant::factory()->create();

        $resp = $this->actingAs($super)->putJson('/api/admin/users/' . $super->id, [
            'name' => $super->name,
            'email' => $super->email,
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => Role::SUPERADMIN,
            'tenant_id' => $tenant->id,
        ]);
        $resp->assertStatus(422)->assertJson(['message' => 'tenant_id must be null for system role']);
    }

    public function test_contributor_cannot_access_other_tenant_admin_area()
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $contribA = $this->contributor($tenantA);

        $resp = $this->actingAs($contribA)->getJson('/api/org/' . $tenantB->id . '/users');
        $resp->assertStatus(403);
    }
}
