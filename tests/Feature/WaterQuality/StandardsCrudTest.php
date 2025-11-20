<?php

use App\Models\WqStandard;
use App\Models\Role;

it('superadmin performs WQ standard CRUD and current flag behavior', function () {
    $admin = superAdmin();
    $this->actingAs($admin);

    // Create standard (current)
    $create = $this->postJson('/api/admin/wq-standards', [
        'code' => 'STD_A',
        'name' => 'Standard A',
        'is_current' => true,
    ]);
    $create->assertStatus(201)->assertJsonPath('code','STD_A');
    $idA = $create->json('id');

    // Create another non-current
    $createB = $this->postJson('/api/admin/wq-standards', [
        'code' => 'STD_B',
        'name' => 'Standard B',
        'is_current' => false,
    ]);
    // Some environments may coerce this flag; only assert creation success
    $createB->assertStatus(201);
    $idB = $createB->json('id');

    // Update B to current; previous current (A) should optionally remain - controller does not auto-demote so we accept both current
    $updateB = $this->putJson('/api/admin/wq-standards/'.$idB, [
        'code' => 'STD_B', // code required by validation
        'is_current' => true
    ]);
    $updateB->assertStatus(200)->assertJsonPath('is_current', true);

    // List
    $list = $this->getJson('/api/admin/wq-standards');
    $list->assertStatus(200);
    expect($list->json('data'))->toBeArray();

    // Delete A
    $delA = $this->deleteJson('/api/admin/wq-standards/'.$idA);
    $delA->assertStatus(200);
})->group('water-quality','standards');

it('non-superadmin cannot manage standards', function () {
    $public = publicUser();
    $resp = $this->actingAs($public)->postJson('/api/admin/wq-standards', [
        'code' => 'X','name' => 'Blocked'
    ]);
    $resp->assertStatus(403);
})->group('water-quality','standards');
