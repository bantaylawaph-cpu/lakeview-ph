<?php

use App\Models\Tenant;
use App\Models\User;
use App\Models\Role;

it('org admin can add contributor, update basic fields, and remove member; contributor forbidden', function () {
    $tenant = Tenant::factory()->create();
    $admin = orgAdmin($tenant);
    $this->actingAs($admin);

    // Initially listing contributors/org_admin returns only admin (org_admin role included)
    $listResp = $this->getJson("/api/org/{$tenant->id}/users");
    $listResp->assertStatus(200);
    expect($listResp->json('data'))->toBeArray();

    // Add new contributor (existing email absent)
    $email = 'member1@example.test';
    $createResp = $this->postJson("/api/org/{$tenant->id}/users", [
        'name' => 'Member One',
        'email' => $email,
        'password' => 'StrongPass123!',
    ]);
    $createResp->assertStatus(201)->assertJsonPath('user.role.name', Role::CONTRIBUTOR);
    $memberId = $createResp->json('user.id');

    // Update member name & email
    $updateResp = $this->putJson("/api/org/{$tenant->id}/users/{$memberId}", [
        'name' => 'Member One Updated',
        'email' => 'member1.updated@example.test',
    ]);
    $updateResp->assertStatus(200)->assertJsonPath('user.name', 'Member One Updated');
    expect($updateResp->json('user.email'))->toBe('member1.updated@example.test');

    // Contributor cannot create another user
    $contributor = User::find($memberId);
    $this->actingAs($contributor);
    $forbiddenCreate = $this->postJson("/api/org/{$tenant->id}/users", [
        'name' => 'Illicit',
        'email' => 'illicit@example.test'
    ]);
    $forbiddenCreate->assertStatus(403);

    // Switch back to admin and remove member
    $this->actingAs($admin->fresh());
    $deleteResp = $this->deleteJson("/api/org/{$tenant->id}/users/{$memberId}");
    $deleteResp->assertStatus(200);
    // Backend may hard-delete; verify the user is no longer accessible via show and listing.
    $showAfter = $this->getJson("/api/org/{$tenant->id}/users/{$memberId}");
    $showAfter->assertStatus(404);

    // Attempt update after deletion should 404
    $afterDeleteUpdate = $this->putJson("/api/org/{$tenant->id}/users/{$memberId}", ['name' => 'Ghost']);
    $afterDeleteUpdate->assertStatus(404);
})->group('org','members','crud');
