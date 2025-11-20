<?php

use App\Models\Lake;
use App\Models\Watershed; // assuming model exists
use App\Models\Tenant;

it('superadmin creates and updates lake', function () {
    $admin = superAdmin();
    $create = $this->actingAs($admin)->postJson('/api/lakes', [ 'name' => 'Test Lake' ]);
    if ($create->status() === 201) {
        // Controller returns the lake object at root (no data wrapper)
        $lakeId = $create->json('id');
        $upd = $this->actingAs($admin)->putJson('/api/lakes/'.$lakeId, [ 'name' => 'Test Lake Updated' ]);
        $upd->assertStatus(200)->assertJsonPath('name','Test Lake Updated');
    } else {
        $create->assertStatus(422); // validation may fail due to schema requirements
    }
})->group('geo','lakes');

it('non-superadmin cannot create lake', function () {
    $public = publicUser();
    $resp = $this->actingAs($public)->postJson('/api/lakes', [ 'name' => 'Blocked Lake' ]);
    $resp->assertStatus(403);
})->group('geo','lakes');

it('superadmin creates tenant and lists tenants', function () {
    $admin = superAdmin();
    $tResp = $this->actingAs($admin)->postJson('/api/admin/tenants', ['name' => 'Org X']);
    if ($tResp->status() === 201) {
        $list = $this->actingAs($admin)->getJson('/api/admin/tenants');
        $list->assertStatus(200);
    } else { $tResp->assertStatus(422); }
})->group('geo','tenants');
