<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Role;
use App\Models\Feedback;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeedbackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // seed roles if seeder exists
        if (class_exists(\Database\Seeders\RolesSeeder::class)) {
            $this->seed(\Database\Seeders\RolesSeeder::class);
        } else {
            Role::query()->insert([
                ['name' => Role::SUPERADMIN, 'scope' => 'system'],
                ['name' => Role::ORG_ADMIN, 'scope' => 'tenant'],
                ['name' => Role::CONTRIBUTOR, 'scope' => 'tenant'],
                ['name' => Role::PUBLIC, 'scope' => 'system'],
            ]);
        }
    }

    public function test_user_can_submit_feedback_and_superadmin_can_update()
    {
        $userRole = Role::where('name', Role::PUBLIC)->first();
        $adminRole = Role::where('name', Role::SUPERADMIN)->first();

        $user = User::factory()->create(['role_id' => $userRole->id]);
        $admin = User::factory()->create(['role_id' => $adminRole->id]);

        $resp = $this->actingAs($user)->postJson('/api/feedback', [
            'title' => 'Sample Feedback',
            'message' => 'This is a test message',
            'category' => 'test'
        ]);
        $resp->assertCreated();
        $id = $resp->json('data.id');

        $this->assertDatabaseHas('feedback', ['id' => $id, 'status' => Feedback::STATUS_OPEN]);

        $update = $this->actingAs($admin)->patchJson("/api/admin/feedback/$id", [
            'status' => Feedback::STATUS_RESOLVED,
            'admin_response' => 'Fixed in latest release.'
        ]);
        $update->assertOk()->assertJsonPath('data.status', Feedback::STATUS_RESOLVED);
    }
}
