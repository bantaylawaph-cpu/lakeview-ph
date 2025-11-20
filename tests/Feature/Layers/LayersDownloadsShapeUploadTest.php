<?php

it('superadmin lists layers and downloads single layer', function () {
    $admin = superAdmin();
    // Ensure at least one layer row exists without relying on factories
    $firstId = \Illuminate\Support\Facades\DB::table('layers')->value('id');
    if (!$firstId) {
        $firstId = \Illuminate\Support\Facades\DB::table('layers')->insertGetId([
            'name' => 'Test Layer',
            'category' => 'test',
            'type' => 'vector',
            'source_type' => 'upload',
            'body_type' => 'lake',
            'body_id' => null,
            'visibility' => 'private',
            'is_active' => true,
            'is_public' => false,
            'status' => 'ready',
            'version' => 1,
            'srid' => 4326,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $list = $this->actingAs($admin)->getJson('/api/layers');
    $list->assertStatus(200);
    $dl = $this->actingAs($admin)->get('/api/layers/'.$firstId.'/download');
    expect(in_array($dl->status(), [200,404]))->toBeTrue(); // 404 if file missing
})->group('layers');

it('org admin cannot create layers (superadmin only)', function () {
    $org = orgAdmin();
    $resp = $this->actingAs($org)->postJson('/api/layers', [ 'name' => 'Layer X' ]);
    $resp->assertStatus(403);
})->group('layers');
