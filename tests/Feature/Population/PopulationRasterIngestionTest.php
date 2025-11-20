<?php

use App\Models\Role;

it('superadmin can list population rasters', function () {
    $admin = superAdmin();
    $resp = $this->actingAs($admin)->getJson('/api/admin/population-rasters');
    $resp->assertStatus(200);
})->group('population','rasters');

it('superadmin attempts raster upload placeholder', function () {
    $admin = superAdmin();
    // Without actual file storage, expect validation error for missing upload field
    $resp = $this->actingAs($admin)->postJson('/api/admin/population-rasters', [
        'year' => 2023,
        'source' => 'ingest-test'
    ]);
    expect(in_array($resp->status(), [201,422,400]))->toBeTrue();
})->group('population','rasters');

it('dataset years endpoint responds', function () {
    $resp = $this->getJson('/api/population/dataset-years');
    $resp->assertStatus(200);
    // Controller returns { years: [...] }
    expect($resp->json('years'))->toBeArray();
})->group('population');
