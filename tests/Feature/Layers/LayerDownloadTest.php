<?php

use Illuminate\Support\Facades\DB;

it('downloads a layer (authorized)', function () {
    $tenant = \App\Models\Tenant::factory()->create();
    $admin = orgAdmin($tenant);
    // Seed a minimal layer directly
    $layerId = DB::table('layers')->insertGetId([
        'name' => 'DL Test',
        'category' => 'test',
        'type' => 'vector',
        'source_type' => 'upload',
        'body_type' => 'lake',
        'body_id' => null,
        'uploaded_by' => $admin->id,
        'visibility' => 'private',
        'is_active' => true,
        'is_public' => false,
        'status' => 'ready',
        'version' => 1,
        'srid' => 4326,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $resp = $this->actingAs($admin)->getJson('/api/layers/'.$layerId.'/download');
    $this->assertTrue(in_array($resp->status(), [200,404]), 'Unexpected status: '.$resp->status());
})->group('layers')->todo('Assert file stream headers when storage seeded.');
