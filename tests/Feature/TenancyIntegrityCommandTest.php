<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Role;
use App\Models\User;
use App\Models\Tenant;
use Illuminate\Support\Facades\Artisan;

class TenancyIntegrityCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        if (class_exists(\Database\Seeders\RolesSeeder::class)) {
            $this->seed(\Database\Seeders\RolesSeeder::class);
        }
    }

    public function test_command_reports_ok_when_consistent()
    {
        // Create a valid tenant-scoped user
        $tenant = Tenant::factory()->create();
        $orgAdminRoleId = Role::where('name', Role::ORG_ADMIN)->value('id');
        User::factory()->create(['role_id' => $orgAdminRoleId, 'tenant_id' => $tenant->id]);

        $exit = Artisan::call('tenancy:verify');
        $output = Artisan::output();
        $this->assertSame(0, $exit, 'Expected success exit code');
        $this->assertStringContainsString('OK', $output);
    }

    public function test_command_reports_failure_on_inconsistent_user()
    {
        // Insert invalid row directly (bypass model boot "saving" hook)
        $orgAdminRoleId = Role::where('name', Role::ORG_ADMIN)->value('id');
        \DB::table('users')->insert([
            'name' => 'Bad OrgAdmin',
            'email' => 'bad-org-admin@example.test',
            'password' => bcrypt('password'),
            'role_id' => $orgAdminRoleId,
            'tenant_id' => null,
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $exit = Artisan::call('tenancy:verify --json');
        $output = Artisan::output();
        $this->assertSame(1, $exit, 'Expected failure exit code');
        $this->assertStringContainsString('ISSUES_FOUND', $output);
        $this->assertStringContainsString('tenant_scoped_without_tenant', $output);
    }
}
