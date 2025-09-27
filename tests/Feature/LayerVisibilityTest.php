<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\Layer;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LayerVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        if (class_exists(\Database\Seeders\RolesSeeder::class)) {
            $this->seed(\Database\Seeders\RolesSeeder::class);
        }
    }

    protected function superAdmin(): User
    {
        $roleId = Role::where('name', Role::SUPERADMIN)->value('id');
        return User::factory()->create(['role_id' => $roleId]);
    }

    protected function orgAdmin(Tenant $tenant): User
    {
        $roleId = Role::where('name', Role::ORG_ADMIN)->value('id');
        return User::factory()->create(['role_id' => $roleId, 'tenant_id' => $tenant->id]);
    }

    protected function contributor(Tenant $tenant): User
    {
        $roleId = Role::where('name', Role::CONTRIBUTOR)->value('id');
        return User::factory()->create(['role_id' => $roleId, 'tenant_id' => $tenant->id]);
    }

    public function test_org_admin_sees_all_tenant_layers()
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->orgAdmin($tenant);
        $contributor = $this->contributor($tenant);
        Layer::factory()->count(2)->create(['uploaded_by' => $admin->id, 'body_type' => 'lake', 'body_id' => 1]);
        Layer::factory()->count(3)->create(['uploaded_by' => $contributor->id, 'body_type' => 'lake', 'body_id' => 1]);
        $resp = $this->actingAs($admin)->getJson(route('layers.index', ['body_type'=>'lake','body_id'=>1]));
        $resp->assertStatus(200)->assertJsonCount(5, 'data');
    }

    public function test_superadmin_sees_all_layers_across_tenants()
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = $this->orgAdmin($tenantA);
        $adminB = $this->orgAdmin($tenantB);
        Layer::factory()->create(['uploaded_by' => $adminA->id, 'body_type' => 'lake', 'body_id' => 1]);
        Layer::factory()->create(['uploaded_by' => $adminB->id, 'body_type' => 'lake', 'body_id' => 1]);
        $resp = $this->actingAs($this->superAdmin())->getJson(route('layers.index', ['body_type'=>'lake','body_id'=>1]));
        $resp->assertStatus(200)->assertJsonCount(2, 'data');
    }
}
